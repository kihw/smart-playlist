/**
 * Application principale pour le générateur de playlists
 * Ce fichier intègre tous les composants et lance l'application
 */

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const mkdirAsync = promisify(fs.mkdir);

// Importer les composants
const SmartPlaylistGenerator = require("./index.js");
const PlaylistEditorUI = require("./playlist-editor-ui.js");
const registerTemplateRoutes = require("./template-api-routes");

// Configuration
const DEFAULT_CONFIG = {
  musicDir: "./music",
  playlistsDir: "./playlists",
  port: 3000,
  generatorOptions: {
    minTracksPerPlaylist: 20,
    maxTracksPerPlaylist: 50,
    maxTracksPerArtistInPlaylist: 4,
    numberOfPlaylists: 10,
    includeYearBasedPlaylists: true,
    includeRecentlyAdded: true,
    smartMixRatio: 0.7,
    similarityFactors: {
      genre: 0.5,
      folder: 0.3,
      artistName: 0.2,
    },
  },
};

/**
 * Charge la configuration depuis le fichier config.json
 * @returns {Object} - Configuration chargée ou configuration par défaut
 */
function loadConfig() {
  try {
    const configPath = path.join(__dirname, "config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      console.log("Configuration loaded from config.json");
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.warn("Error loading config:", error.message);
  }

  console.log("Using default configuration");
  return DEFAULT_CONFIG;
}

/**
 * Sauvegarde la configuration dans le fichier config.json
 * @param {Object} config - Configuration à sauvegarder
 */
async function saveConfig(config) {
  try {
    const configPath = path.join(__dirname, "config.json");
    await fs.promises.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      "utf8"
    );
    console.log("Configuration saved to config.json");
  } catch (error) {
    console.error("Error saving config:", error.message);
  }
}

/**
 * Initialise les dossiers nécessaires
 * @param {Object} config - Configuration contenant les chemins des dossiers
 */
async function initFolders(config) {
  try {
    // Créer le dossier de musique s'il n'existe pas
    if (!fs.existsSync(config.musicDir)) {
      await mkdirAsync(config.musicDir, { recursive: true });
      console.log(`Created music directory: ${config.musicDir}`);
    }

    // Créer le dossier de playlists s'il n'existe pas
    if (!fs.existsSync(config.playlistsDir)) {
      await mkdirAsync(config.playlistsDir, { recursive: true });
      console.log(`Created playlists directory: ${config.playlistsDir}`);
    }
  } catch (error) {
    console.error("Error initializing folders:", error.message);
  }
}

/**
 * Fonction principale pour lancer l'application
 */
async function main() {
  // Charger la configuration
  const config = loadConfig();

  // Initialiser les dossiers
  await initFolders(config);

  // Extraire les options de ligne de commande
  const args = process.argv.slice(2);
  const musicDirArg = args[0] || config.musicDir;
  const playlistsDirArg = args[1] || config.playlistsDir;
  const portArg = parseInt(args[2] || config.port.toString());

  // Mettre à jour la configuration
  config.musicDir = musicDirArg;
  config.playlistsDir = playlistsDirArg;
  config.port = portArg;

  // Sauvegarder la configuration mise à jour
  await saveConfig(config);

  // Créer l'interface utilisateur
  const editorUI = new PlaylistEditorUI({
    port: config.port,
    musicDir: config.musicDir,
    playlistsDir: config.playlistsDir,
    generatorOptions: config.generatorOptions,
  });

  // Ajouter les routes pour les templates
  registerTemplateRoutes(editorUI.app);

  // Démarrer le serveur
  editorUI.start();

  console.log(`
==============================================
Smart Playlist Generator
==============================================
Music directory: ${config.musicDir}
Playlists directory: ${config.playlistsDir}
Server running at: http://localhost:${config.port}
==============================================
Press Ctrl+C to stop the server
==============================================
  `);
}

// Exécuter l'application
if (require.main === module) {
  main().catch((error) => {
    console.error("Error starting application:", error);
    process.exit(1);
  });
}

module.exports = { main };
