const fs = require("fs");
const path = require("path");
const mm = require("music-metadata");
const { promisify } = require("util");
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const readFileAsync = promisify(fs.readFile);

class SmartPlaylistGenerator {
  constructor(musicDir, outputDir, options = {}) {
    this.musicDir = musicDir;
    this.outputDir = outputDir;
    this.options = {
      minTracksPerPlaylist: options.minTracksPerPlaylist || 30,
      maxTracksPerPlaylist: options.maxTracksPerPlaylist || 50,
      maxTracksPerArtistInPlaylist: options.maxTracksPerArtistInPlaylist || 5,
      numberOfPlaylists: options.numberOfPlaylists || 8,
      smartMixRatio: options.smartMixRatio || 0.7, // Pourcentage de pistes similaires vs variété
      includeYearBasedPlaylists: options.includeYearBasedPlaylists || true,
      includeRecentlyAdded: options.includeRecentlyAdded || true,
      includeTopRated: options.includeTopRated || true,
      similarityFactors: options.similarityFactors || {
        genre: 0.5, // Poids du genre dans la similarité
        folder: 0.3, // Poids du dossier dans la similarité
        artistName: 0.2, // Poids de la similarité du nom d'artiste
      },
      playlistTemplates: options.playlistTemplates || [],
      ...options,
    };

    this.tracks = [];
    this.artists = new Map(); // Map<artistName, {tracks: [], genres: Set<>, years: Set<>}>
    this.genres = new Map(); // Map<genreName, Set<artistName>>
    this.playlists = [];
    this.recentlyAdded = [];
    this.playlistGenerators = new Map();
    this.similarityCache = new Map(); // Cache pour les calculs de similarité

    // Registre des stratégies de génération de playlists
    this._registerDefaultGenerators();

    // Cache pour accélérer les performances
    this.folderCache = new Map(); // Chemin -> artistes dans ce dossier
  }

  /**
   * Enregistre une nouvelle stratégie de génération de playlist
   * @param {string} name - Nom de la stratégie
   * @param {Function} generatorFn - Fonction de génération
   * @param {Object} options - Options spécifiques à cette stratégie
   */
  registerPlaylistGenerator(name, generatorFn, options = {}) {
    this.playlistGenerators.set(name, {
      generate: generatorFn,
      options: options,
      enabled: options.enabled !== undefined ? options.enabled : true,
    });
    return this; // Pour chaîner les appels
  }

  /**
   * Désactive une stratégie de génération
   * @param {string} name - Nom de la stratégie à désactiver
   */
  disableGenerator(name) {
    if (this.playlistGenerators.has(name)) {
      this.playlistGenerators.get(name).enabled = false;
    }
    return this;
  }

  /**
   * Active une stratégie de génération
   * @param {string} name - Nom de la stratégie à activer
   */
  enableGenerator(name) {
    if (this.playlistGenerators.has(name)) {
      this.playlistGenerators.get(name).enabled = true;
    }
    return this;
  }

  /**
   * Enregistre les générateurs de playlists par défaut
   * @private
   */
  _registerDefaultGenerators() {
    // Générateur basé sur les genres
    this.registerPlaylistGenerator(
      "genres",
      (generator) => {
        return generator._generateGenrePlaylists();
      },
      { priority: 10 }
    );

    // Générateur basé sur les dossiers
    this.registerPlaylistGenerator(
      "folders",
      (generator) => {
        return generator._generateFolderPlaylists();
      },
      { priority: 20 }
    );

    // Générateur pour les morceaux récemment ajoutés
    this.registerPlaylistGenerator(
      "recentlyAdded",
      (generator) => {
        return generator._generateRecentlyAddedPlaylist();
      },
      {
        priority: 30,
        enabled: this.options.includeRecentlyAdded,
      }
    );

    // Générateur basé sur les années/décennies
    this.registerPlaylistGenerator(
      "decades",
      (generator) => {
        return generator._generateDecadePlaylists();
      },
      {
        priority: 40,
        enabled: this.options.includeYearBasedPlaylists,
      }
    );

    // Générateur de mix aléatoires mais intelligents
    this.registerPlaylistGenerator(
      "smartMix",
      (generator) => {
        return generator._generateSmartMixPlaylists();
      },
      { priority: 50 }
    );

    // Générateur pour s'assurer que tous les artistes sont couverts
    this.registerPlaylistGenerator(
      "coverage",
      (generator) => {
        return generator._ensureAllArtistsCovered();
      },
      { priority: 100 }
    ); // Priorité la plus basse, s'exécute en dernier
  }

  /**
   * Analyse la bibliothèque musicale
   */
  async scanLibrary() {
    console.log(`Scanning music directory: ${this.musicDir}`);
    await this._scanDirectory(this.musicDir);
    console.log(
      `Found ${this.tracks.length} tracks from ${this.artists.size} artists`
    );

    // Extraire et organiser les genres et autres métadonnées
    this._organizeMetadata();

    // Trier les pistes récemment ajoutées par date de modification du fichier
    this._sortRecentlyAdded();

    return this;
  }

  /**
   * Scanne récursivement un répertoire à la recherche de fichiers audio
   * @param {string} dir - Chemin du répertoire à scanner
   * @private
   */
  async _scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this._scanDirectory(fullPath);
      } else {
        const ext = path.extname(fullPath).toLowerCase();
        const audioExts = [".mp3", ".flac", ".m4a", ".wav", ".ogg", ".aac"];

        if (audioExts.includes(ext)) {
          try {
            const stats = fs.statSync(fullPath);
            const metadata = await mm.parseFile(fullPath);
            const track = {
              path: fullPath,
              title: metadata.common.title || path.basename(fullPath, ext),
              artist: metadata.common.artist || "Unknown Artist",
              album: metadata.common.album || "Unknown Album",
              albumArtist:
                metadata.common.albumartist ||
                metadata.common.artist ||
                "Unknown Artist",
              genres: metadata.common.genre || [],
              year: metadata.common.year || null,
              bpm: metadata.common.bpm || null,
              folder: path.dirname(fullPath),
              trackNumber: metadata.common.track.no || null,
              discNumber: metadata.common.disk.no || null,
              duration: metadata.format.duration || 0,
              rating: metadata.common.rating || 0,
              modifiedTime: stats.mtime,
              createdTime: stats.birthtime,
            };

            this.tracks.push(track);

            // Ajouter à la Map des artistes
            if (!this.artists.has(track.artist)) {
              this.artists.set(track.artist, {
                tracks: [],
                genres: new Set(),
                years: new Set(),
                folders: new Set(),
              });
            }

            const artistData = this.artists.get(track.artist);
            artistData.tracks.push(track);

            // Ajouter les genres à l'artiste
            for (const genre of track.genres) {
              artistData.genres.add(genre);
            }

            // Ajouter l'année à l'artiste
            if (track.year) {
              artistData.years.add(track.year);
            }

            // Ajouter le dossier à l'artiste
            artistData.folders.add(track.folder);

            // Ajouter aux pistes récemment ajoutées
            this.recentlyAdded.push(track);
          } catch (err) {
            console.warn(
              `Couldn't read metadata for ${fullPath}: ${err.message}`
            );
          }
        }
      }
    }
  }

  /**
   * Organise les métadonnées extraites
   * @private
   */
  _organizeMetadata() {
    // Créer la map des genres -> artistes
    for (const [artist, data] of this.artists.entries()) {
      for (const genre of data.genres) {
        if (!this.genres.has(genre)) {
          this.genres.set(genre, new Set());
        }
        this.genres.get(genre).add(artist);
      }
    }

    // Si certains artistes n'ont pas de genre, utiliser le dossier parent comme pseudo-genre
    for (const [artist, data] of this.artists.entries()) {
      if (data.genres.size === 0 && data.tracks.length > 0) {
        for (const folder of data.folders) {
          const folderName = path.basename(folder);
          const pseudoGenre = `folder:${folderName}`;

          data.genres.add(pseudoGenre);

          if (!this.genres.has(pseudoGenre)) {
            this.genres.set(pseudoGenre, new Set());
          }
          this.genres.get(pseudoGenre).add(artist);
        }
      }
    }

    // Construire le cache de dossiers
    for (const track of this.tracks) {
      const folder = track.folder;

      if (!this.folderCache.has(folder)) {
        this.folderCache.set(folder, new Set());
      }

      this.folderCache.get(folder).add(track.artist);
    }
  }

  /**
   * Trie les pistes par date de modification
   * @private
   */
  _sortRecentlyAdded() {
    this.recentlyAdded.sort((a, b) => b.modifiedTime - a.modifiedTime);
  }

  /**
   * Génère toutes les playlists en utilisant les stratégies enregistrées
   */
  generatePlaylists() {
    console.log("Generating playlists...");

    // Trier les générateurs par priorité
    const sortedGenerators = [...this.playlistGenerators.entries()]
      .filter(([_, generator]) => generator.enabled)
      .sort((a, b) => a[1].options.priority - b[1].options.priority);

    // Exécuter chaque générateur dans l'ordre
    for (const [name, generator] of sortedGenerators) {
      console.log(`Running playlist generator: ${name}`);
      generator.generate(this);

      // Vérifier si on a atteint le nombre maximum de playlists
      if (this.playlists.length >= this.options.numberOfPlaylists) {
        console.log(
          `Reached maximum number of playlists (${this.options.numberOfPlaylists})`
        );
        break;
      }
    }

    // Gérer les templates personnalisés
    this._handleCustomTemplates();

    console.log(`Generated ${this.playlists.length} playlists`);
    return this;
  }

  /**
   * Génère des playlists basées sur les genres
   * @private
   */
  _generateGenrePlaylists() {
    // Trier les genres par nombre d'artistes (du plus grand au plus petit)
    const sortedGenres = [...this.genres.entries()]
      .filter(([_, artists]) => artists.size >= 3) // Au moins 3 artistes par genre
      .sort((a, b) => b[1].size - a[1].size);

    for (const [genre, artistsSet] of sortedGenres) {
      if (this.playlists.length >= this.options.numberOfPlaylists) break;

      const artists = [...artistsSet];
      if (artists.length < 3) continue; // Passer les genres avec trop peu d'artistes

      // Créer une nouvelle playlist pour ce genre
      const playlistName = genre.startsWith("folder:")
        ? `Mix ${genre.substring(7)}`
        : `Mix ${genre}`;

      const tracks = this._selectTracksFromArtists(
        artists,
        this.options.maxTracksPerArtistInPlaylist,
        this.options.maxTracksPerPlaylist
      );

      if (tracks.length >= this.options.minTracksPerPlaylist) {
        this.playlists.push({
          name: playlistName,
          description: `A mix of ${genre} tracks from various artists`,
          tracks: tracks,
          artists: new Set(tracks.map((t) => t.artist)),
          generatedBy: "genres",
        });
      }
    }
  }

  /**
   * Génère des playlists basées sur les dossiers
   * @private
   */
  _generateFolderPlaylists() {
    // Créer des playlists pour les dossiers contenant suffisamment de pistes
    for (const [folder, artistsSet] of this.folderCache.entries()) {
      if (this.playlists.length >= this.options.numberOfPlaylists) break;

      const folderArtists = [...artistsSet];
      if (folderArtists.length < 3) continue; // Besoin de variété

      // Collecter toutes les pistes de ce dossier
      const folderTracks = this.tracks.filter(
        (track) => track.folder === folder
      );

      // Éviter les dossiers qui contiennent trop peu de pistes
      if (folderTracks.length < this.options.minTracksPerPlaylist) continue;

      const folderName = path.basename(folder);
      const playlistName = `Folder Mix: ${folderName}`;

      const selectedTracks = this._selectTracksFromArtists(
        folderArtists,
        this.options.maxTracksPerArtistInPlaylist,
        this.options.maxTracksPerPlaylist,
        folderTracks // Limiter aux pistes de ce dossier
      );

      if (selectedTracks.length >= this.options.minTracksPerPlaylist) {
        // Éviter les playlists dupliquées
        const isDuplicate = this.playlists.some((playlist) => {
          const intersection = selectedTracks.filter((track) =>
            playlist.tracks.some((pTrack) => pTrack.path === track.path)
          );
          return intersection.length > selectedTracks.length * 0.7; // 70% de similarité
        });

        if (!isDuplicate) {
          this.playlists.push({
            name: playlistName,
            description: `Tracks from the ${folderName} folder`,
            tracks: selectedTracks,
            artists: new Set(selectedTracks.map((t) => t.artist)),
            generatedBy: "folders",
          });
        }
      }
    }
  }

  /**
   * Génère une playlist des morceaux récemment ajoutés
   * @private
   */
  _generateRecentlyAddedPlaylist() {
    if (this.recentlyAdded.length === 0) return;

    // Prendre les N morceaux les plus récents, limité par maxTracksPerPlaylist
    const recentTracks = this.recentlyAdded.slice(
      0,
      this.options.maxTracksPerPlaylist
    );

    if (recentTracks.length >= this.options.minTracksPerPlaylist) {
      this.playlists.push({
        name: "Recently Added",
        description: "Tracks that were recently added to your library",
        tracks: recentTracks,
        artists: new Set(recentTracks.map((t) => t.artist)),
        generatedBy: "recentlyAdded",
      });
    }
  }

  /**
   * Génère des playlists basées sur les décennies
   * @private
   */
  _generateDecadePlaylists() {
    // Collecter toutes les années
    const tracksByYear = new Map();

    for (const track of this.tracks) {
      if (!track.year) continue;

      // Calculer la décennie (1970, 1980, 1990, etc.)
      const decade = Math.floor(track.year / 10) * 10;

      if (!tracksByYear.has(decade)) {
        tracksByYear.set(decade, []);
      }

      tracksByYear.get(decade).push(track);
    }

    // Créer une playlist pour chaque décennie avec suffisamment de pistes
    for (const [decade, tracks] of tracksByYear.entries()) {
      if (this.playlists.length >= this.options.numberOfPlaylists) break;

      if (tracks.length < this.options.minTracksPerPlaylist) continue;

      // Collecter les artistes uniques pour cette décennie
      const artists = [...new Set(tracks.map((t) => t.artist))];

      // S'assurer qu'il y a suffisamment d'artistes pour créer une playlist variée
      if (artists.length < 3) continue;

      const selectedTracks = this._selectTracksFromArtists(
        artists,
        this.options.maxTracksPerArtistInPlaylist,
        this.options.maxTracksPerPlaylist,
        tracks
      );

      if (selectedTracks.length >= this.options.minTracksPerPlaylist) {
        this.playlists.push({
          name: `${decade}s Mix`,
          description: `Music from the ${decade}s`,
          tracks: selectedTracks,
          artists: new Set(selectedTracks.map((t) => t.artist)),
          generatedBy: "decades",
        });
      }
    }
  }

  /**
   * Génère des mix intelligents basés sur la similarité
   * @private
   */
  _generateSmartMixPlaylists() {
    // Nombre de mix intelligents à créer
    const smartMixCount = Math.min(
      5,
      Math.ceil(this.options.numberOfPlaylists / 4)
    );
    let mixesCreated = 0;

    // Sélectionner quelques artistes "seed" qui ont suffisamment de morceaux
    const eligibleArtists = [...this.artists.entries()]
      .filter(([_, data]) => data.tracks.length >= 5)
      .map(([artist, _]) => artist);

    if (eligibleArtists.length === 0) return;

    // Choisir aléatoirement des artistes "seed"
    const seedArtists = this._shuffleArray(eligibleArtists).slice(
      0,
      smartMixCount * 2
    );

    for (const seedArtist of seedArtists) {
      if (mixesCreated >= smartMixCount) break;
      if (this.playlists.length >= this.options.numberOfPlaylists) break;

      // Trouver des artistes similaires
      const similarArtists = this._findSimilarArtists(seedArtist, 10);

      if (similarArtists.length < 3) continue; // Pas assez d'artistes similaires

      // Inclure l'artiste seed dans la liste
      similarArtists.unshift(seedArtist);

      // Collecter les tracks pour cette playlist
      const tracks = this._selectTracksFromArtists(
        similarArtists,
        this.options.maxTracksPerArtistInPlaylist,
        this.options.maxTracksPerPlaylist
      );

      if (tracks.length >= this.options.minTracksPerPlaylist) {
        // Trouver un nom approprié pour la playlist
        const seedArtistGenres = [...this.artists.get(seedArtist).genres];
        const mainGenre =
          seedArtistGenres.length > 0 ? seedArtistGenres[0] : "Mix";

        this.playlists.push({
          name: `${seedArtist} & Similar Artists`,
          description: `A mix of ${seedArtist} and similar artists in the ${mainGenre} genre`,
          tracks: tracks,
          artists: new Set(tracks.map((t) => t.artist)),
          generatedBy: "smartMix",
        });

        mixesCreated++;
      }
    }
  }

  /**
   * S'assure que tous les artistes sont inclus dans au moins une playlist
   * @private
   */
  _ensureAllArtistsCovered() {
    // Trouver les artistes qui ne sont pas encore dans une playlist
    const coveredArtists = new Set();
    for (const playlist of this.playlists) {
      for (const artist of playlist.artists) {
        coveredArtists.add(artist);
      }
    }

    const uncoveredArtists = [...this.artists.keys()].filter(
      (artist) => !coveredArtists.has(artist)
    );

    if (uncoveredArtists.length === 0) return;

    console.log(
      `Found ${uncoveredArtists.length} artists not yet in any playlist`
    );

    // Créer des playlists supplémentaires pour inclure ces artistes
    let currentPlaylist = [];
    let currentArtists = new Set();
    let playlistCount = 1;

    for (const artist of uncoveredArtists) {
      const artistTracks = this.artists.get(artist).tracks;
      if (artistTracks.length === 0) continue;

      const selectedTracks = this._selectRandomTracks(
        artistTracks,
        Math.min(this.options.maxTracksPerArtistInPlaylist, artistTracks.length)
      );

      // Vérifier si ajouter ces pistes dépasserait la taille maximum
      if (
        currentPlaylist.length + selectedTracks.length >
        this.options.maxTracksPerPlaylist
      ) {
        // Sauvegarder la playlist actuelle et en commencer une nouvelle
        if (currentPlaylist.length >= this.options.minTracksPerPlaylist) {
          this.playlists.push({
            name: `Discover Mix ${playlistCount}`,
            description: "A mix of artists you might not listen to often",
            tracks: currentPlaylist,
            artists: currentArtists,
            generatedBy: "coverage",
          });
          playlistCount++;
        }

        currentPlaylist = [...selectedTracks];
        currentArtists = new Set([artist]);
      } else {
        currentPlaylist.push(...selectedTracks);
        currentArtists.add(artist);
      }
    }

    // Ajouter la dernière playlist si elle contient suffisamment de pistes
    if (currentPlaylist.length >= this.options.minTracksPerPlaylist) {
      this.playlists.push({
        name: `Discover Mix ${playlistCount}`,
        description: "A mix of artists you might not listen to often",
        tracks: currentPlaylist,
        artists: currentArtists,
        generatedBy: "coverage",
      });
    }
  }

  /**
   * Gère les templates de playlists personnalisés
   * @private
   */
  _handleCustomTemplates() {
    for (const template of this.options.playlistTemplates) {
      try {
        this._generateFromTemplate(template);
      } catch (error) {
        console.warn(
          `Error generating playlist from template ${template.name}: ${error.message}`
        );
      }
    }
  }

  /**
   * Génère une playlist à partir d'un template
   * @param {Object} template - Template de playlist
   * @private
   */
  _generateFromTemplate(template) {
    if (!template.name || !template.rules) {
      throw new Error("Template must have a name and rules property");
    }

    // Filtrer les pistes selon les règles du template
    let filteredTracks = [...this.tracks];

    for (const rule of template.rules) {
      switch (rule.type) {
        case "genre":
          filteredTracks = filteredTracks.filter((track) =>
            track.genres.some((genre) =>
              genre.toLowerCase().includes(rule.value.toLowerCase())
            )
          );
          break;
        case "artist":
          filteredTracks = filteredTracks.filter((track) =>
            track.artist.toLowerCase().includes(rule.value.toLowerCase())
          );
          break;
        case "year":
          if (rule.operator === "<") {
            filteredTracks = filteredTracks.filter(
              (track) => track.year < rule.value
            );
          } else if (rule.operator === ">") {
            filteredTracks = filteredTracks.filter(
              (track) => track.year > rule.value
            );
          } else if (rule.operator === "=") {
            filteredTracks = filteredTracks.filter(
              (track) => track.year === rule.value
            );
          } else if (rule.operator === "between") {
            filteredTracks = filteredTracks.filter(
              (track) =>
                track.year >= rule.value[0] && track.year <= rule.value[1]
            );
          }
          break;
        case "folder":
          filteredTracks = filteredTracks.filter((track) =>
            track.folder.toLowerCase().includes(rule.value.toLowerCase())
          );
          break;
        // Autres types de règles peuvent être ajoutés ici
      }
    }

    // Si pas assez de pistes après filtrage, ne pas créer la playlist
    if (filteredTracks.length < this.options.minTracksPerPlaylist) {
      console.log(
        `Not enough tracks (${filteredTracks.length}) for template "${template.name}"`
      );
      return;
    }

    // Collecter les artistes uniques
    const artists = [...new Set(filteredTracks.map((t) => t.artist))];

    // Sélectionner les pistes pour la playlist
    const selectedTracks = this._selectTracksFromArtists(
      artists,
      this.options.maxTracksPerArtistInPlaylist,
      this.options.maxTracksPerPlaylist,
      filteredTracks
    );

    // Créer la playlist
    this.playlists.push({
      name: template.name,
      description: template.description || `Custom playlist: ${template.name}`,
      tracks: selectedTracks,
      artists: new Set(selectedTracks.map((t) => t.artist)),
      generatedBy: "template",
    });
  }

  /**
   * Trouve des artistes similaires à un artiste donné
   * @param {string} artist - Nom de l'artiste
   * @param {number} limit - Nombre maximum d'artistes à retourner
   * @returns {Array<string>} - Liste des artistes similaires
   * @private
   */
  _findSimilarArtists(artist, limit = 10) {
    // Vérifier dans le cache
    const cacheKey = `similar_${artist}_${limit}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey);
    }

    if (!this.artists.has(artist)) {
      return [];
    }

    const artistData = this.artists.get(artist);
    const similarities = [];

    // Calculer la similarité avec tous les autres artistes
    for (const [otherArtist, otherData] of this.artists.entries()) {
      if (otherArtist === artist) continue;

      let similarity = 0;

      // Facteur 1: Genre commun
      const genreWeight = this.options.similarityFactors.genre;
      if (genreWeight > 0) {
        const commonGenres = [...artistData.genres].filter((genre) =>
          otherData.genres.has(genre)
        );
        similarity +=
          genreWeight *
          (commonGenres.length /
            Math.max(
              1,
              Math.max(artistData.genres.size, otherData.genres.size)
            ));
      }

      // Facteur 2: Dossier commun
      const folderWeight = this.options.similarityFactors.folder;
      if (folderWeight > 0) {
        const commonFolders = [...artistData.folders].filter((folder) =>
          otherData.folders.has(folder)
        );
        similarity +=
          folderWeight *
          (commonFolders.length /
            Math.max(
              1,
              Math.max(artistData.folders.size, otherData.folders.size)
            ));
      }

      // Facteur 3: Nom d'artiste
      const nameWeight = this.options.similarityFactors.artistName;
      if (nameWeight > 0) {
        // Similarité basée sur les préfixes communs (pour les groupes similaires)
        const words1 = artist.toLowerCase().split(/\s+/);
        const words2 = otherArtist.toLowerCase().split(/\s+/);

        let nameMatch = 0;
        if (words1.length > 0 && words2.length > 0) {
          // Vérifier si les premiers mots correspondent
          if (words1[0] === words2[0] && words1[0].length > 2) {
            nameMatch = 0.8;
          }
          // Rechercher des mots communs
          else {
            const commonWords = words1.filter(
              (w) => words2.includes(w) && w.length > 3
            );
            if (commonWords.length > 0) {
              nameMatch =
                0.5 *
                (commonWords.length / Math.max(words1.length, words2.length));
            }
          }
        }

        similarity += nameWeight * nameMatch;
      }

      similarities.push({
        artist: otherArtist,
        similarity: similarity,
      });
    }

    // Trier par similarité décroissante et prendre les N premiers
    const result = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .filter((s) => s.similarity > 0.1) // Ignorer les similarités trop faibles
      .map((s) => s.artist);

    // Mettre en cache
    this.similarityCache.set(cacheKey, result);

    return result;
  }

  /**
   * Sélectionne des pistes à partir d'une liste d'artistes
   * @param {Array<string>} artists - Liste des artistes
   * @param {number} maxPerArtist - Nombre maximum de pistes par artiste
   * @param {number} maxTotal - Nombre maximum de pistes au total
   * @param {Array<Object>} trackPool - Ensemble de pistes dans lequel effectuer la sélection
   * @returns {Array<Object>} - Liste des pistes sélectionnées
   * @private
   */
  _selectTracksFromArtists(artists, maxPerArtist, maxTotal, trackPool = null) {
    const result = [];
    const shuffledArtists = this._shuffleArray([...artists]);

    // Premier passage: prendre quelques pistes de chaque artiste
    for (const artist of shuffledArtists) {
      if (result.length >= maxTotal) break;

      const artistTracks =
        this.artists
          .get(artist)
          ?.tracks?.filter((track) =>
            trackPool ? trackPool.includes(track) : true
          ) || [];

      if (artistTracks.length === 0) continue;

      const tracksToAdd = this._selectRandomTracks(
        artistTracks,
        Math.min(maxPerArtist, artistTracks.length)
      );

      // Limiter au maximum total
      const remainingSlots = maxTotal - result.length;
      result.push(...tracksToAdd.slice(0, remainingSlots));

      if (result.length >= maxTotal) break;
    }

    // Mélanger les pistes pour une meilleure variété
    return this._shuffleArray(result);
  }

  /**
   * Sélectionne aléatoirement des pistes parmi une liste
   * @param {Array<Object>} tracks - Liste des pistes
   * @param {number} count - Nombre de pistes à sélectionner
   * @returns {Array<Object>} - Liste des pistes sélectionnées
   * @private
   */
  _selectRandomTracks(tracks, count) {
    const shuffled = this._shuffleArray([...tracks]);
    return shuffled.slice(0, count);
  }

  /**
   * Mélange aléatoirement un tableau
   * @param {Array} array - Tableau à mélanger
   * @returns {Array} - Tableau mélangé
   * @private
   */
  _shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Exporte les playlists générées au format M3U
   */
  async exportPlaylists() {
    console.log(
      `Exporting ${this.playlists.length} playlists to ${this.outputDir}`
    );

    // Créer le répertoire de sortie s'il n'existe pas
    if (!fs.existsSync(this.outputDir)) {
      await mkdirAsync(this.outputDir, { recursive: true });
    }

    // Créer un fichier de configuration JSON
    const configPath = path.join(this.outputDir, "playlist_config.json");
    const configData = {
      generated: new Date().toISOString(),
      playlists: this.playlists.map((playlist) => ({
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.tracks.length,
        artistCount: playlist.artists.size,
        generatedBy: playlist.generatedBy,
      })),
    };

    await writeFileAsync(
      configPath,
      JSON.stringify(configData, null, 2),
      "utf8"
    );

    // Exporter chaque playlist au format M3U
    for (const playlist of this.playlists) {
      const playlistContent = this._formatM3UPlaylist(playlist);
      const fileName = `${playlist.name.replace(/[\/\\?%*:|"<>]/g, "_")}.m3u`;
      const filePath = path.join(this.outputDir, fileName);

      await writeFileAsync(filePath, playlistContent, "utf8");
      console.log(
        `Exported playlist: ${fileName} with ${playlist.tracks.length} tracks`
      );
    }

    return this;
  }

  /**
   * Formate une playlist au format M3U
   * @param {Object} playlist - Playlist à formater
   * @returns {string} - Contenu au format M3U
   * @private
   */
  _formatM3UPlaylist(playlist) {
    let content = "#EXTM3U\n";

    // Ajouter des commentaires avec les métadonnées de la playlist
    content += `#PLAYLIST:${playlist.name}\n`;
    if (playlist.description) {
      content += `#EXTGENRE:${playlist.description}\n`;
    }

    for (const track of playlist.tracks) {
      // Format: #EXTINF:duration,artist - title
      const duration = track.duration ? Math.round(track.duration) : -1;
      content += `#EXTINF:${duration},${track.artist} - ${track.title}\n`;

      // Ajouter éventuellement d'autres métadonnées
      if (track.album) {
        content += `#EXTALB:${track.album}\n`;
      }
      if (track.year) {
        content += `#EXTDATE:${track.year}\n`;
      }
      if (track.genres && track.genres.length > 0) {
        content += `#EXTGENRE:${track.genres.join(", ")}\n`;
      }

      // Chemin du fichier
      content += `${track.path}\n`;
    }

    return content;
  }

  /**
   * Sauvegarde les playlists dans un fichier JSON pour pouvoir les modifier plus tard
   * @param {string} filePath - Chemin du fichier de sauvegarde
   */
  async savePlaylistsToJson(filePath) {
    // Convertir les playlists en format JSON-friendly
    const jsonData = this.playlists.map((playlist) => ({
      name: playlist.name,
      description: playlist.description,
      generatedBy: playlist.generatedBy,
      tracks: playlist.tracks.map((track) => ({
        path: track.path,
        title: track.title,
        artist: track.artist,
        album: track.album,
        year: track.year,
        genres: Array.isArray(track.genres) ? track.genres : [],
        duration: track.duration,
      })),
    }));

    await writeFileAsync(filePath, JSON.stringify(jsonData, null, 2), "utf8");
    console.log(`Saved playlists to ${filePath}`);

    return this;
  }

  /**
   * Charge des playlists à partir d'un fichier JSON
   * @param {string} filePath - Chemin du fichier JSON
   */
  async loadPlaylistsFromJson(filePath) {
    try {
      const jsonContent = await readFileAsync(filePath, "utf8");
      const jsonData = JSON.parse(jsonContent);

      // Convertir les données JSON en playlists
      this.playlists = jsonData.map((playlist) => ({
        name: playlist.name,
        description: playlist.description || "",
        generatedBy: playlist.generatedBy || "imported",
        tracks: playlist.tracks.map((track) => ({
          path: track.path,
          title: track.title,
          artist: track.artist,
          album: track.album || "",
          year: track.year || null,
          genres: Array.isArray(track.genres) ? track.genres : [],
          duration: track.duration || -1,
        })),
        artists: new Set(playlist.tracks.map((track) => track.artist)),
      }));

      console.log(`Loaded ${this.playlists.length} playlists from ${filePath}`);

      return this;
    } catch (error) {
      console.error(
        `Error loading playlists from ${filePath}: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Ajoute un modèle de playlist personnalisé
   * @param {Object} template - Modèle de playlist
   */
  addPlaylistTemplate(template) {
    this.options.playlistTemplates.push(template);
    return this;
  }

  /**
   * Configure les facteurs de similarité pour les playlists intelligentes
   * @param {Object} factors - Facteurs de similarité (poids de 0 à 1)
   */
  setSimilarityFactors(factors) {
    this.options.similarityFactors = {
      ...this.options.similarityFactors,
      ...factors,
    };

    // Vider le cache de similarité puisque les facteurs ont changé
    this.similarityCache.clear();

    return this;
  }

  /**
   * Affiche un résumé des playlists générées
   */
  printSummary() {
    console.log("\n===== Playlist Generation Summary =====");
    console.log(`Total tracks in library: ${this.tracks.length}`);
    console.log(`Total artists: ${this.artists.size}`);
    console.log(`Total genres: ${this.genres.size}`);
    console.log(`Total playlists created: ${this.playlists.length}`);

    console.log("\nPlaylists details:");
    const playlistsByGenerator = {};

    for (const playlist of this.playlists) {
      console.log(
        `- ${playlist.name}: ${playlist.tracks.length} tracks from ${playlist.artists.size} artists`
      );

      // Compter les playlists par générateur
      const generator = playlist.generatedBy || "unknown";
      playlistsByGenerator[generator] =
        (playlistsByGenerator[generator] || 0) + 1;
    }

    console.log("\nPlaylists by generator:");
    for (const [generator, count] of Object.entries(playlistsByGenerator)) {
      console.log(`- ${generator}: ${count} playlists`);
    }

    return this;
  }
}

// Fonction principale
async function main() {
  const musicDir = process.argv[2] || "./music";
  const outputDir = process.argv[3] || "./playlists";

  if (!fs.existsSync(musicDir)) {
    console.error(`Error: Music directory "${musicDir}" does not exist.`);
    process.exit(1);
  }

  const options = {
    minTracksPerPlaylist: 20,
    maxTracksPerPlaylist: 50,
    maxTracksPerArtistInPlaylist: 4,
    numberOfPlaylists: 10,
    includeYearBasedPlaylists: true,
    includeRecentlyAdded: true,
    includeTopRated: true,
    smartMixRatio: 0.7,
    similarityFactors: {
      genre: 0.5,
      folder: 0.3,
      artistName: 0.2,
    },
    // Exemple de templates personnalisés
    playlistTemplates: [
      {
        name: "80s Rock Classics",
        description: "Classic rock tracks from the 1980s",
        rules: [
          { type: "genre", value: "rock" },
          { type: "year", operator: "between", value: [1980, 1989] },
        ],
      },
      {
        name: "Acoustic Chill",
        description: "Relaxing acoustic tracks",
        rules: [{ type: "genre", value: "acoustic" }],
      },
    ],
  };

  try {
    const generator = new SmartPlaylistGenerator(musicDir, outputDir, options);

    // Exemple de désactivation d'un générateur
    // generator.disableGenerator('decades');

    // Exemple de configuration des facteurs de similarité
    // generator.setSimilarityFactors({ genre: 0.7, folder: 0.1, artistName: 0.2 });

    // Exemple d'ajout d'un template personnalisé
    // generator.addPlaylistTemplate({
    //   name: "French Music",
    //   description: "Music from French artists",
    //   rules: [
    //     { type: 'folder', value: 'french' }
    //   ]
    // });

    await generator.scanLibrary();
    generator.generatePlaylists();
    await generator.exportPlaylists();

    // Sauvegarder les playlists pour modification ultérieure
    await generator.savePlaylistsToJson(path.join(outputDir, "playlists.json"));

    generator.printSummary();

    console.log("\nPlaylists generated successfully!");
  } catch (error) {
    console.error("Error generating playlists:", error);
  }
}

// Exécuter le programme si appelé directement
if (require.main === module) {
  main();
}

module.exports = SmartPlaylistGenerator;
