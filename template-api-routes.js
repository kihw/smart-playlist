/**
 * Routes API pour la gestion des modèles de playlists
 * Ce fichier ajoute les routes nécessaires au serveur Express
 */

const express = require("express");
const router = express.Router();
const templateApi = require("./template-api");

/**
 * GET /api/templates
 * Récupère tous les modèles de playlists prédéfinis
 */
router.get("/templates", (req, res) => {
  try {
    const templates = templateApi.getAllTemplates();

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/templates/genre/:genre
 * Récupère les modèles de playlists pour un genre spécifique
 */
router.get("/templates/genre/:genre", (req, res) => {
  try {
    const genre = req.params.genre;
    const templates = templateApi.findTemplatesByGenre(genre);

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Error fetching templates by genre:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/templates/period/:start/:end
 * Récupère les modèles de playlists pour une période spécifique
 */
router.get("/templates/period/:start/:end", (req, res) => {
  try {
    const startYear = parseInt(req.params.start);
    const endYear = parseInt(req.params.end);

    if (isNaN(startYear) || isNaN(endYear)) {
      return res.status(400).json({
        success: false,
        error: "Years must be valid numbers",
      });
    }

    const templates = templateApi.findTemplatesByPeriod(startYear, endYear);

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Error fetching templates by period:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/templates
 * Crée un nouveau modèle de playlist personnalisé
 */
router.post("/templates", (req, res) => {
  try {
    const { name, description, rules, advanced } = req.body;

    if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Name and at least one rule are required",
      });
    }

    const template = templateApi.createCustomTemplate(
      name,
      description,
      rules,
      advanced
    );

    // Valider le modèle
    if (!templateApi.validateTemplate(template)) {
      return res.status(400).json({
        success: false,
        error: "Invalid template structure",
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Intégrer les routes au serveur Express
 * @param {Object} app - Instance d'Express
 */
function registerTemplateRoutes(app) {
  app.use("/api", router);

  console.log("Template API routes registered");
}

module.exports = registerTemplateRoutes;
