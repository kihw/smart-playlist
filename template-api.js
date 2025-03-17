/**
 * API pour la gestion des modèles de playlists
 * Ce fichier contient des exemples de modèles prédéfinis et des fonctions pour les manipuler
 */

// Collection de modèles prédéfinis
const predefinedTemplates = [
  {
    name: "Hits des années 80",
    description: "Les tubes des années 80",
    rules: [{ type: "year", operator: "between", value: [1980, 1989] }],
  },
  {
    name: "Musique Électronique",
    description: "Mix électronique (Techno, House, EDM...)",
    rules: [{ type: "genre", value: "Electronic" }],
  },
  {
    name: "Rock & Metal",
    description: "Les meilleurs morceaux de Rock et Metal",
    rules: [{ type: "genre", value: "Rock" }],
  },
  {
    name: "Hip-Hop Classics",
    description: "Les classiques du Hip-Hop et Rap",
    rules: [{ type: "genre", value: "Hip-Hop" }],
  },
  {
    name: "Mix Acoustique",
    description: "Morceaux acoustiques et chillout",
    rules: [{ type: "genre", value: "Acoustic" }],
  },
  {
    name: "Workout Mix",
    description: "Morceaux énergiques pour l'entraînement",
    rules: [
      { type: "genre", value: "Electronic" },
      { type: "genre", value: "Rock" },
    ],
  },
  {
    name: "Oldies but Goldies",
    description: "Classiques des années 60-70",
    rules: [{ type: "year", operator: "between", value: [1960, 1979] }],
  },
  {
    name: "Découvertes Récentes",
    description: "Morceaux récents pour découvrir de nouvelles musiques",
    rules: [{ type: "year", operator: ">", value: 2020 }],
  },
];

// Modèles plus avancés avec des règles complexes
const advancedTemplates = [
  {
    name: "Roadtrip Mix",
    description: "Parfait pour les longs trajets en voiture",
    rules: [
      { type: "genre", value: "Rock" },
      { type: "genre", value: "Pop" },
    ],
    advanced: {
      tempo: "medium", // Rythme modéré
      energy: "high", // Énergie élevée
      mood: "positive", // Ambiance positive
    },
  },
  {
    name: "Focus & Concentration",
    description: "Musique parfaite pour le travail ou l'étude",
    rules: [
      { type: "genre", value: "Ambient" },
      { type: "genre", value: "Classical" },
      { type: "genre", value: "Electronic" },
    ],
    advanced: {
      tempo: "slow", // Rythme lent
      energy: "low", // Énergie faible
      mood: "neutral", // Ambiance neutre
      instrumental: true, // Préférence pour l'instrumental
    },
  },
  {
    name: "Party Mix",
    description: "Les tubes qui font danser",
    rules: [
      { type: "genre", value: "Pop" },
      { type: "genre", value: "Dance" },
      { type: "genre", value: "Electronic" },
    ],
    advanced: {
      tempo: "high", // Rythme rapide
      energy: "high", // Énergie élevée
      mood: "positive", // Ambiance positive
      popularity: "high", // Morceaux populaires
    },
  },
  {
    name: "Chill & Relax",
    description: "Musique douce pour se détendre",
    rules: [
      { type: "genre", value: "Ambient" },
      { type: "genre", value: "Chill" },
    ],
    advanced: {
      tempo: "slow", // Rythme lent
      energy: "low", // Énergie faible
      mood: "relaxed", // Ambiance relaxante
      instrumental: true, // Préférence pour l'instrumental
    },
  },
  {
    name: "Hits Français",
    description: "Le meilleur de la musique francophone",
    rules: [{ type: "folder", value: "French" }],
    advanced: {
      language: "french", // Langue française
    },
  },
];

/**
 * Obtient tous les modèles disponibles
 * @returns {Array} Liste des modèles de playlists
 */
function getAllTemplates() {
  return [...predefinedTemplates, ...advancedTemplates];
}

/**
 * Recherche des modèles par genre
 * @param {string} genre - Genre musical à rechercher
 * @returns {Array} Liste des modèles correspondants
 */
function findTemplatesByGenre(genre) {
  return getAllTemplates().filter((template) =>
    template.rules.some(
      (rule) =>
        rule.type === "genre" &&
        rule.value.toLowerCase() === genre.toLowerCase()
    )
  );
}

/**
 * Recherche des modèles par période
 * @param {number} startYear - Année de début
 * @param {number} endYear - Année de fin
 * @returns {Array} Liste des modèles correspondants
 */
function findTemplatesByPeriod(startYear, endYear) {
  return getAllTemplates().filter((template) =>
    template.rules.some((rule) => {
      if (rule.type === "year") {
        if (rule.operator === "between") {
          return rule.value[0] >= startYear && rule.value[1] <= endYear;
        } else if (rule.operator === ">") {
          return rule.value >= startYear;
        } else if (rule.operator === "<") {
          return rule.value <= endYear;
        } else if (rule.operator === "=") {
          return rule.value >= startYear && rule.value <= endYear;
        }
      }
      return false;
    })
  );
}

/**
 * Crée un nouveau modèle de playlist personnalisé
 * @param {string} name - Nom du modèle
 * @param {string} description - Description du modèle
 * @param {Array} rules - Règles du modèle
 * @param {Object} advanced - Paramètres avancés (optionnel)
 * @returns {Object} Nouveau modèle créé
 */
function createCustomTemplate(name, description, rules, advanced = null) {
  const template = {
    name,
    description,
    rules: rules
      .map((rule) => validateRule(rule))
      .filter((rule) => rule !== null),
  };

  if (advanced) {
    template.advanced = advanced;
  }

  return template;
}

/**
 * Valide et normalise une règle
 * @param {Object} rule - Règle à valider
 * @returns {Object|null} Règle validée ou null si invalide
 */
function validateRule(rule) {
  if (!rule || !rule.type) {
    return null;
  }

  const validatedRule = { ...rule };

  switch (rule.type) {
    case "genre":
    case "artist":
    case "folder":
      if (!rule.value || typeof rule.value !== "string") {
        return null;
      }
      break;

    case "year":
      if (!rule.operator) {
        validatedRule.operator = "=";
      }

      if (rule.operator === "between") {
        if (
          !Array.isArray(rule.value) ||
          rule.value.length !== 2 ||
          isNaN(rule.value[0]) ||
          isNaN(rule.value[1])
        ) {
          return null;
        }

        // Normaliser les valeurs
        validatedRule.value = [
          parseInt(rule.value[0]),
          parseInt(rule.value[1]),
        ];
      } else {
        if (isNaN(rule.value)) {
          return null;
        }

        // Normaliser la valeur
        validatedRule.value = parseInt(rule.value);
      }
      break;

    default:
      return null;
  }

  return validatedRule;
}

/**
 * Vérifie si un modèle est valide
 * @param {Object} template - Modèle à vérifier
 * @returns {boolean} True si le modèle est valide, false sinon
 */
function validateTemplate(template) {
  // Vérifier les champs obligatoires
  if (
    !template.name ||
    !template.rules ||
    !Array.isArray(template.rules) ||
    template.rules.length === 0
  ) {
    return false;
  }

  // Vérifier chaque règle
  for (const rule of template.rules) {
    if (!rule.type) {
      return false;
    }

    switch (rule.type) {
      case "genre":
      case "artist":
      case "folder":
        if (!rule.value) {
          return false;
        }
        break;
      case "year":
        if (!rule.operator) {
          return false;
        }
        if (rule.operator === "between") {
          if (!Array.isArray(rule.value) || rule.value.length !== 2) {
            return false;
          }
        } else if (rule.value === undefined || rule.value === null) {
          return false;
        }
        break;
      default:
        return false;
    }
  }

  return true;
}

/**
 * Combine des modèles pour créer un modèle hybride
 * @param {Array} templates - Liste des modèles à combiner
 * @param {string} name - Nom du modèle hybride (optionnel)
 * @returns {Object} Modèle hybride
 */
function combineTemplates(templates, name = null) {
  if (!templates || !Array.isArray(templates) || templates.length === 0) {
    throw new Error("Templates array is required");
  }

  const combinedRules = [];
  let combinedAdvanced = {};

  // Collecter toutes les règles et paramètres avancés
  for (const template of templates) {
    if (template.rules && Array.isArray(template.rules)) {
      for (const rule of template.rules) {
        // Éviter les doublons
        if (
          !combinedRules.some(
            (r) =>
              r.type === rule.type &&
              r.value === rule.value &&
              r.operator === rule.operator
          )
        ) {
          combinedRules.push(rule);
        }
      }
    }

    if (template.advanced) {
      combinedAdvanced = { ...combinedAdvanced, ...template.advanced };
    }
  }

  // Créer le modèle hybride
  const hybridTemplate = {
    name: name || `Hybrid Mix (${templates.length} templates)`,
    description: `Combined from ${templates.length} templates`,
    rules: combinedRules,
  };

  if (Object.keys(combinedAdvanced).length > 0) {
    hybridTemplate.advanced = combinedAdvanced;
  }

  return hybridTemplate;
}

/**
 * Génère une description automatique pour un modèle basé sur ses règles
 * @param {Object} template - Modèle à décrire
 * @returns {string} Description générée
 */
function generateTemplateDescription(template) {
  if (!template || !template.rules || !Array.isArray(template.rules)) {
    return "";
  }

  const descriptions = [];

  // Collecter les descriptions pour chaque type de règle
  const genres = template.rules
    .filter((rule) => rule.type === "genre")
    .map((rule) => rule.value);

  const artists = template.rules
    .filter((rule) => rule.type === "artist")
    .map((rule) => rule.value);

  const years = template.rules.filter((rule) => rule.type === "year");

  const folders = template.rules
    .filter((rule) => rule.type === "folder")
    .map((rule) => rule.value);

  // Générer des descriptions pour chaque catégorie
  if (genres.length > 0) {
    descriptions.push(`Genres: ${genres.join(", ")}`);
  }

  if (artists.length > 0) {
    descriptions.push(`Artistes: ${artists.join(", ")}`);
  }

  if (years.length > 0) {
    const yearDescriptions = years.map((year) => {
      if (year.operator === "between") {
        return `entre ${year.value[0]} et ${year.value[1]}`;
      } else if (year.operator === ">") {
        return `après ${year.value}`;
      } else if (year.operator === "<") {
        return `avant ${year.value}`;
      } else {
        return `${year.value}`;
      }
    });

    descriptions.push(`Années: ${yearDescriptions.join(", ")}`);
  }

  if (folders.length > 0) {
    descriptions.push(`Dossiers: ${folders.join(", ")}`);
  }

  // Ajouter des informations sur les paramètres avancés
  if (template.advanced) {
    const advancedDescriptions = [];

    if (template.advanced.tempo) {
      const tempoMap = {
        slow: "lent",
        medium: "modéré",
        high: "rapide",
      };
      advancedDescriptions.push(
        `rythme ${tempoMap[template.advanced.tempo] || template.advanced.tempo}`
      );
    }

    if (template.advanced.energy) {
      const energyMap = {
        low: "faible",
        medium: "moyenne",
        high: "élevée",
      };
      advancedDescriptions.push(
        `énergie ${
          energyMap[template.advanced.energy] || template.advanced.energy
        }`
      );
    }

    if (template.advanced.mood) {
      const moodMap = {
        positive: "positive",
        neutral: "neutre",
        relaxed: "relaxante",
        negative: "mélancolique",
      };
      advancedDescriptions.push(
        `ambiance ${moodMap[template.advanced.mood] || template.advanced.mood}`
      );
    }

    if (template.advanced.instrumental) {
      advancedDescriptions.push("préférence pour les morceaux instrumentaux");
    }

    if (advancedDescriptions.length > 0) {
      descriptions.push(`Paramètres: ${advancedDescriptions.join(", ")}`);
    }
  }

  return descriptions.join(". ");
}

// Exporter les fonctions et données
module.exports = {
  getAllTemplates,
  findTemplatesByGenre,
  findTemplatesByPeriod,
  createCustomTemplate,
  validateTemplate,
  validateRule,
  combineTemplates,
  generateTemplateDescription,
  predefinedTemplates,
  advancedTemplates,
};
