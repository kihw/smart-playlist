const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const SmartPlaylistGenerator = require("./index.js");

class PlaylistEditorUI {
  constructor(options = {}) {
    this.options = {
      port: options.port || 3000,
      musicDir: options.musicDir || "./music",
      playlistsDir: options.playlistsDir || "./playlists",
      ...options,
    };

    this.app = express();
    this.configureApp();
    this.registerRoutes();

    this.generator = new SmartPlaylistGenerator(
      this.options.musicDir,
      this.options.playlistsDir,
      options.generatorOptions || {}
    );
  }

  configureApp() {
    // Configuration du serveur Express
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Dossier pour les fichiers statiques
    this.app.use(express.static(path.join(__dirname, "public")));

    // Configuration des vues
    this.app.set("view engine", "ejs");
    this.app.set("views", path.join(__dirname, "views"));
  }

  registerRoutes() {
    // Page d'accueil
    this.app.get("/", (req, res) => {
      res.render("index", {
        title: "Smart Playlist Generator",
        musicDir: this.options.musicDir,
        playlistsDir: this.options.playlistsDir,
      });
    });

    // API pour scanner la bibliothèque
    this.app.post("/api/scan", async (req, res) => {
      try {
        await this.generator.scanLibrary();

        res.json({
          success: true,
          stats: {
            tracks: this.generator.tracks.length,
            artists: this.generator.artists.size,
            genres: this.generator.genres.size,
          },
        });
      } catch (error) {
        console.error("Error scanning library:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // API pour générer les playlists
    this.app.post("/api/generate", async (req, res) => {
      try {
        // Mise à jour des options si fournies
        if (req.body.options) {
          Object.assign(this.generator.options, req.body.options);
        }

        // Activer/désactiver des générateurs
        if (req.body.generators) {
          for (const [name, enabled] of Object.entries(req.body.generators)) {
            if (enabled) {
              this.generator.enableGenerator(name);
            } else {
              this.generator.disableGenerator(name);
            }
          }
        }

        // Ajouter des templates personnalisés
        if (req.body.templates && Array.isArray(req.body.templates)) {
          // Réinitialiser les templates existants si demandé
          if (req.body.resetTemplates) {
            this.generator.options.playlistTemplates = [];
          }

          for (const template of req.body.templates) {
            this.generator.addPlaylistTemplate(template);
          }
        }

        // Génération des playlists
        this.generator.generatePlaylists();

        // Export des playlists
        await this.generator.exportPlaylists();

        res.json({
          success: true,
          playlists: this.generator.playlists.map((playlist) => ({
            name: playlist.name,
            description: playlist.description,
            tracks: playlist.tracks.length,
            artists: Array.from(playlist.artists).length,
            generatedBy: playlist.generatedBy,
          })),
        });
      } catch (error) {
        console.error("Error generating playlists:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // API pour obtenir les artistes
    this.app.get("/api/artists", (req, res) => {
      const artists = Array.from(this.generator.artists.keys()).sort();
      res.json({ artists });
    });

    // API pour obtenir les genres
    this.app.get("/api/genres", (req, res) => {
      const genres = Array.from(this.generator.genres.keys()).sort();
      res.json({ genres });
    });

    // API pour obtenir les playlists
    this.app.get("/api/playlists", (req, res) => {
      const playlists = this.generator.playlists.map((playlist) => ({
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.tracks.length,
        artists: Array.from(playlist.artists),
        generatedBy: playlist.generatedBy,
      }));

      res.json({ playlists });
    });

    // API pour obtenir les détails d'une playlist
    this.app.get("/api/playlists/:index", (req, res) => {
      const index = parseInt(req.params.index);

      if (
        isNaN(index) ||
        index < 0 ||
        index >= this.generator.playlists.length
      ) {
        return res.status(404).json({
          success: false,
          error: "Playlist not found",
        });
      }

      const playlist = this.generator.playlists[index];

      res.json({
        success: true,
        playlist: {
          name: playlist.name,
          description: playlist.description,
          tracks: playlist.tracks.map((track) => ({
            title: track.title,
            artist: track.artist,
            album: track.album,
            path: track.path,
            genres: track.genres,
          })),
          generatedBy: playlist.generatedBy,
        },
      });
    });

    // API pour modifier une playlist
    this.app.put("/api/playlists/:index", async (req, res) => {
      const index = parseInt(req.params.index);

      if (
        isNaN(index) ||
        index < 0 ||
        index >= this.generator.playlists.length
      ) {
        return res.status(404).json({
          success: false,
          error: "Playlist not found",
        });
      }

      const playlist = this.generator.playlists[index];

      // Mettre à jour les propriétés de la playlist
      if (req.body.name) {
        playlist.name = req.body.name;
      }

      if (req.body.description) {
        playlist.description = req.body.description;
      }

      // Mettre à jour les pistes si fournies
      if (req.body.tracks) {
        // Garder uniquement les pistes qui existent dans la bibliothèque
        playlist.tracks = req.body.tracks
          .map((trackPath) =>
            this.generator.tracks.find((t) => t.path === trackPath)
          )
          .filter((track) => track !== undefined);

        // Mettre à jour l'ensemble des artistes
        playlist.artists = new Set(
          playlist.tracks.map((track) => track.artist)
        );
      }

      // Réexporter les playlists
      await this.generator.exportPlaylists();

      res.json({
        success: true,
        message: "Playlist updated successfully",
      });
    });

    // API pour obtenir les options actuelles
    this.app.get("/api/options", (req, res) => {
      // Retourner une copie des options pour éviter les modifications directes
      const options = { ...this.generator.options };

      // Obtenir l'état des générateurs
      const generators = {};
      for (const [
        name,
        generator,
      ] of this.generator.playlistGenerators.entries()) {
        generators[name] = generator.enabled;
      }

      res.json({
        success: true,
        options,
        generators,
      });
    });

    // API pour modifier les options
    this.app.put("/api/options", (req, res) => {
      if (req.body.options) {
        Object.assign(this.generator.options, req.body.options);
      }

      res.json({
        success: true,
        message: "Options updated successfully",
      });
    });

    // API pour sauvegarder l'état actuel
    this.app.post("/api/save", async (req, res) => {
      try {
        const savePath = path.join(this.options.playlistsDir, "playlists.json");
        await this.generator.savePlaylistsToJson(savePath);

        res.json({
          success: true,
          message: "Playlists saved successfully",
          path: savePath,
        });
      } catch (error) {
        console.error("Error saving playlists:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // API pour charger un état sauvegardé
    this.app.post("/api/load", async (req, res) => {
      try {
        const loadPath = path.join(this.options.playlistsDir, "playlists.json");
        await this.generator.loadPlaylistsFromJson(loadPath);

        res.json({
          success: true,
          message: "Playlists loaded successfully",
          playlistCount: this.generator.playlists.length,
        });
      } catch (error) {
        console.error("Error loading playlists:", error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  }

  // Méthode pour démarrer le serveur
  start() {
    this.server = this.app.listen(this.options.port, () => {
      console.log(
        `Playlist Editor UI running at http://localhost:${this.options.port}`
      );
    });
    return this;
  }

  // Méthode pour arrêter le serveur
  stop() {
    if (this.server) {
      this.server.close();
      console.log("Playlist Editor UI server stopped");
    }
    return this;
  }
}

// Fonction principale
async function main() {
  const port = process.env.PORT || 3000;
  const musicDir = process.argv[2] || "./music";
  const playlistsDir = process.argv[3] || "./playlists";

  const editorUI = new PlaylistEditorUI({
    port,
    musicDir,
    playlistsDir,
    generatorOptions: {
      minTracksPerPlaylist: 20,
      maxTracksPerPlaylist: 50,
      maxTracksPerArtistInPlaylist: 4,
      numberOfPlaylists: 10,
      includeYearBasedPlaylists: true,
      includeRecentlyAdded: true,
    },
  });

  editorUI.start();

  console.log(`
==============================================
Smart Playlist Generator UI
==============================================
Music directory: ${musicDir}
Playlists directory: ${playlistsDir}
Server running at: http://localhost:${port}
==============================================
Press Ctrl+C to stop the server
==============================================
  `);
}

// Exécuter le programme si appelé directement
if (require.main === module) {
  main();
}

module.exports = PlaylistEditorUI;
