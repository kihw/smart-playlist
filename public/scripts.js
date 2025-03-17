/**
 * Script principal pour l'interface de génération de playlists
 * Gère les interactions utilisateur et les appels API
 */

document.addEventListener("DOMContentLoaded", function () {
  // Éléments du DOM
  const loadingIndicator = document.getElementById("loadingIndicator");
  const statsText = document.getElementById("statsText");
  const playlistsList = document.getElementById("playlistsList");
  const welcomeMessage = document.getElementById("welcomeMessage");
  const playlistContent = document.getElementById("playlistContent");
  const playlistTitle = document.getElementById("playlistTitle");
  const playlistDescription = document.getElementById("playlistDescription");
  const tracksList = document.getElementById("tracksList");
  const trackCount = document.getElementById("trackCount");
  const scanLibraryBtn = document.getElementById("scanLibrary");
  const generatePlaylistsBtn = document.getElementById("generatePlaylists");
  const savePlaylistsBtn = document.getElementById("savePlaylists");
  const loadPlaylistsBtn = document.getElementById("loadPlaylists");
  const saveOptionsBtn = document.getElementById("saveOptions");
  const optionsForm = document.getElementById("optionsForm");
  const templateForm = document.getElementById("templateForm");
  const addRuleBtn = document.getElementById("addRuleBtn");
  const rulesList = document.getElementById("rulesList");
  const saveTemplateBtn = document.getElementById("saveTemplate");
  const editPlaylistBtn = document.getElementById("editPlaylistBtn");
  const removePlaylistBtn = document.getElementById("removePlaylistBtn");
  const editPlaylistForm = document.getElementById("editPlaylistForm");
  const editPlaylistName = document.getElementById("editPlaylistName");
  const editPlaylistDescription = document.getElementById(
    "editPlaylistDescription"
  );
  const savePlaylistEditBtn = document.getElementById("savePlaylistEdit");
  const trackSearch = document.getElementById("trackSearch");
  const refreshTemplatesBtn = document.getElementById("refreshTemplates");
  const predefinedTemplatesContainer = document.getElementById(
    "predefinedTemplates"
  );

  // Toasts pour les notifications
  const toastContainer = document.getElementById("toast-container");

  // État de l'application
  let currentState = {
    library: {
      scanned: false,
      tracks: 0,
      artists: 0,
      genres: 0,
    },
    playlists: [],
    currentPlaylistIndex: -1,
    genres: [],
    artists: [],
    predefinedTemplates: [],
  };

  /**
   * Affiche une notification toast
   * @param {string} message - Message à afficher
   * @param {string} type - Type de notification (success, error, warning, info)
   */
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast show toast-${type} fade-in`;
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    const iconClass =
      type === "success"
        ? "bi-check-circle-fill"
        : type === "error"
        ? "bi-x-circle-fill"
        : type === "warning"
        ? "bi-exclamation-triangle-fill"
        : "bi-info-circle-fill";

    toast.innerHTML = `
        <div class="toast-header">
          <i class="bi ${iconClass} me-2"></i>
          <strong class="me-auto">${
            type.charAt(0).toUpperCase() + type.slice(1)
          }</strong>
          <small>à l'instant</small>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      `;

    toastContainer.appendChild(toast);

    // Supprimer le toast après 5 secondes
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    }, 5000);

    // Configurer le bouton de fermeture
    const closeBtn = toast.querySelector(".btn-close");
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    });
  }

  // Afficher/masquer l'indicateur de chargement
  function toggleLoading(show) {
    loadingIndicator.style.display = show ? "flex" : "none";
  }

  // Mettre à jour les statistiques
  function updateStats() {
    if (currentState.library.scanned) {
      statsText.innerHTML = `
          <i class="bi bi-music-note"></i> ${currentState.library.tracks} morceaux 
          <i class="bi bi-person"></i> ${currentState.library.artists} artistes 
          <i class="bi bi-tag"></i> ${currentState.library.genres} genres
        `;
    } else {
      statsText.textContent = "Bibliothèque non scannée";
    }
  }

  // Mettre à jour la liste des playlists
  function updatePlaylistsList() {
    if (currentState.playlists.length === 0) {
      playlistsList.innerHTML = `
          <div class="text-center text-muted p-4 fade-in">
            <i class="bi bi-music-note-list" style="font-size: 3rem;"></i>
            <p class="mt-3">Aucune playlist disponible</p>
            <p class="small">Générez des playlists à partir de votre bibliothèque</p>
          </div>
        `;
      return;
    }

    playlistsList.innerHTML = "";
    currentState.playlists.forEach((playlist, index) => {
      const item = document.createElement("a");
      item.href = "#";
      item.className =
        "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
      if (index === currentState.currentPlaylistIndex) {
        item.classList.add("active");
      }

      // Déterminer l'icône en fonction du type de générateur
      const iconClass = getGeneratorIcon(playlist.generatedBy || "custom");

      item.innerHTML = `
          <div>
            <div class="fw-bold">
              <i class="bi ${iconClass} me-2 small"></i>
              ${escapeHtml(playlist.name)}
            </div>
            <small class="text-muted">${
              playlist.generatedBy || "custom"
            }</small>
          </div>
          <span class="badge bg-primary rounded-pill">${
            playlist.trackCount
          }</span>
        `;

      item.addEventListener("click", (e) => {
        e.preventDefault();
        loadPlaylist(index);
      });

      playlistsList.appendChild(item);
    });
  }

  // Obtenir l'icône pour un type de générateur
  function getGeneratorIcon(generator) {
    switch (generator) {
      case "genres":
        return "bi-tags";
      case "folders":
        return "bi-folder";
      case "recentlyAdded":
        return "bi-clock-history";
      case "decades":
        return "bi-calendar-event";
      case "smartMix":
        return "bi-shuffle";
      case "coverage":
        return "bi-collection";
      case "template":
        return "bi-bookmark";
      default:
        return "bi-music-note-list";
    }
  }

  // Échapper les caractères HTML pour éviter les injections XSS
  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // Charger les détails d'une playlist
  async function loadPlaylist(index) {
    if (index < 0 || index >= currentState.playlists.length) return;

    currentState.currentPlaylistIndex = index;
    updatePlaylistsList();

    try {
      toggleLoading(true);

      const response = await fetch(`/api/playlists/${index}`);
      const data = await response.json();

      if (data.success) {
        const playlist = data.playlist;

        // Masquer le message de bienvenue et afficher le contenu de la playlist
        welcomeMessage.style.display = "none";
        playlistContent.style.display = "block";

        // Mettre à jour les informations de la playlist
        playlistTitle.textContent = playlist.name;
        playlistDescription.textContent = playlist.description || "";
        trackCount.textContent = playlist.tracks.length;

        // Afficher la liste des pistes
        displayTracks(playlist.tracks);

        // Rendre le bouton d'édition actif
        editPlaylistBtn.classList.remove("disabled");
        removePlaylistBtn.classList.remove("disabled");
      } else {
        showToast(
          `Erreur lors du chargement de la playlist: ${data.error}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Error loading playlist:", error);
      showToast("Erreur lors du chargement de la playlist", "error");
    } finally {
      toggleLoading(false);
    }
  }

  // Afficher la liste des pistes
  function displayTracks(tracks) {
    tracksList.innerHTML = "";

    if (tracks.length === 0) {
      tracksList.innerHTML =
        '<tr><td colspan="5" class="text-center py-4">Aucune piste dans cette playlist</td></tr>';
      return;
    }

    tracks.forEach((track, index) => {
      const row = document.createElement("tr");
      row.className = "track-item";

      row.innerHTML = `
          <td>${index + 1}</td>
          <td>${escapeHtml(track.title)}</td>
          <td>${escapeHtml(track.artist)}</td>
          <td>${escapeHtml(track.album || "")}</td>
          <td>${
            Array.isArray(track.genres)
              ? track.genres.map(escapeHtml).join(", ")
              : ""
          }</td>
        `;

      tracksList.appendChild(row);
    });
  }

  // Filtrer les pistes
  function filterTracks() {
    const query = trackSearch.value.toLowerCase();
    const rows = tracksList.querySelectorAll("tr");

    let visibleCount = 0;

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const isVisible = text.includes(query);
      row.style.display = isVisible ? "" : "none";
      if (isVisible) visibleCount++;
    });

    // Afficher un message si aucun résultat
    if (visibleCount === 0 && rows.length > 0) {
      const noResultRow = document.createElement("tr");
      noResultRow.className = "no-results";
      noResultRow.innerHTML = `
          <td colspan="5" class="text-center py-4">
            Aucun résultat pour "<strong>${escapeHtml(query)}</strong>"
          </td>
        `;
      tracksList.appendChild(noResultRow);
    } else {
      // Supprimer le message s'il existe
      const noResultRow = tracksList.querySelector(".no-results");
      if (noResultRow) noResultRow.remove();
    }
  }

  // Scanner la bibliothèque
  async function scanLibrary() {
    try {
      toggleLoading(true);

      const response = await fetch("/api/scan", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        currentState.library = {
          scanned: true,
          ...data.stats,
        };

        // Récupérer les genres et artistes pour les templates
        await fetchGenresAndArtists();

        updateStats();

        // Permettre la génération de playlists
        generatePlaylistsBtn.classList.remove("disabled");

        showToast("Bibliothèque scannée avec succès !", "success");
      } else {
        showToast(`Erreur lors du scan: ${data.error}`, "error");
      }
    } catch (error) {
      console.error("Error scanning library:", error);
      showToast("Erreur lors du scan de la bibliothèque", "error");
    } finally {
      toggleLoading(false);
    }
  }

  // Récupérer les genres et artistes
  async function fetchGenresAndArtists() {
    try {
      const [genresResponse, artistsResponse] = await Promise.all([
        fetch("/api/genres"),
        fetch("/api/artists"),
      ]);

      const genresData = await genresResponse.json();
      const artistsData = await artistsResponse.json();

      currentState.genres = genresData.genres;
      currentState.artists = artistsData.artists;

      // Charger également les modèles prédéfinis
      await fetchPredefinedTemplates();
    } catch (error) {
      console.error("Error fetching genres and artists:", error);
      showToast("Erreur lors de la récupération des métadonnées", "warning");
    }
  }

  // Récupérer les modèles prédéfinis
  async function fetchPredefinedTemplates() {
    try {
      const response = await fetch("/api/templates");
      const data = await response.json();

      if (data.success) {
        currentState.predefinedTemplates = data.templates;
        displayPredefinedTemplates();
      }
    } catch (error) {
      console.error("Error fetching predefined templates:", error);
    }
  }

  // Afficher les modèles prédéfinis
  function displayPredefinedTemplates() {
    if (!predefinedTemplatesContainer) return;

    predefinedTemplatesContainer.innerHTML = "";

    currentState.predefinedTemplates.forEach((template) => {
      const card = document.createElement("div");
      card.className = "col-md-4 mb-3";

      card.innerHTML = `
          <div class="card h-100 template-card">
            <div class="card-body">
              <h5 class="card-title">${escapeHtml(template.name)}</h5>
              <p class="card-text small text-muted">${escapeHtml(
                template.description || ""
              )}</p>
              <div class="d-grid">
                <button class="btn btn-sm btn-outline-primary apply-template" data-template='${JSON.stringify(
                  template
                )}'>
                  <i class="bi bi-plus-circle"></i> Appliquer
                </button>
              </div>
            </div>
          </div>
        `;

      predefinedTemplatesContainer.appendChild(card);
    });

    // Ajouter les écouteurs d'événements pour les boutons
    document.querySelectorAll(".apply-template").forEach((button) => {
      button.addEventListener("click", (e) => {
        const template = JSON.parse(e.target.dataset.template);
        applyPredefinedTemplate(template);
      });
    });
  }

  // Appliquer un modèle prédéfini
  function applyPredefinedTemplate(template) {
    try {
      // Réinitialiser le formulaire
      templateForm.reset();
      rulesList.innerHTML = "";

      // Remplir les champs du formulaire
      templateForm.querySelector('[name="name"]').value = template.name;
      templateForm.querySelector('[name="description"]').value =
        template.description || "";

      // Ajouter les règles
      if (template.rules && Array.isArray(template.rules)) {
        template.rules.forEach((rule) => {
          const ruleId = addRuleField();
          const ruleElement = document.querySelector(
            `.template-item[data-rule-id="${ruleId}"]`
          );

          // Sélectionner le type de règle
          const typeSelect = ruleElement.querySelector(".rule-type");
          typeSelect.value = rule.type;

          // Mettre à jour les champs en fonction du type
          updateRuleFields(ruleId, rule.type);

          // Remplir les valeurs
          if (rule.type === "year") {
            const operatorContainer =
              ruleElement.querySelector(`.operator-container`);
            const operatorSelect =
              operatorContainer.querySelector(".rule-operator");
            operatorSelect.value = rule.operator;

            // Simuler le changement d'opérateur
            const event = new Event("change");
            operatorSelect.dispatchEvent(event);

            // Remplir les valeurs
            if (rule.operator === "between") {
              ruleElement.querySelector(".rule-value-min").value =
                rule.value[0];
              ruleElement.querySelector(".rule-value-max").value =
                rule.value[1];
            } else {
              ruleElement.querySelector(".rule-value").value = rule.value;
            }
          } else {
            ruleElement.querySelector(".rule-value").value = rule.value;
          }
        });
      }

      // Afficher le modal
      const modal = bootstrap.Modal.getOrCreateInstance(
        document.getElementById("templateModal")
      );
      modal.show();
    } catch (error) {
      console.error("Error applying template:", error);
      showToast("Erreur lors de l'application du modèle", "error");
    }
  }

  // Générer les playlists
  async function generatePlaylists() {
    if (!currentState.library.scanned) {
      showToast("Veuillez d'abord scanner votre bibliothèque", "warning");
      return;
    }

    try {
      toggleLoading(true);

      // Récupérer les options
      const formData = new FormData(optionsForm);
      const options = {};
      const generators = {};

      for (const [key, value] of formData.entries()) {
        if (key.startsWith("generators.")) {
          const generatorName = key.split(".")[1];
          generators[generatorName] = true;
        } else if (key.startsWith("similarityFactors.")) {
          const factorName = key.split(".")[1];
          if (!options.similarityFactors) {
            options.similarityFactors = {};
          }
          options.similarityFactors[factorName] = parseFloat(value);
        } else {
          if (!isNaN(value) && value !== "") {
            options[key] = parseInt(value);
          } else {
            options[key] = value;
          }
        }
      }

      // Désactiver les générateurs non cochés
      for (const generatorName of Object.keys(generators)) {
        if (!formData.has(`generators.${generatorName}`)) {
          generators[generatorName] = false;
        }
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          options,
          generators,
        }),
      });

      const data = await response.json();

      if (data.success) {
        currentState.playlists = data.playlists;
        updatePlaylistsList();

        // Activer les boutons de sauvegarde
        savePlaylistsBtn.classList.remove("disabled");

        // Afficher la première playlist
        if (currentState.playlists.length > 0) {
          loadPlaylist(0);
        }

        showToast(
          `${data.playlists.length} playlists générées avec succès !`,
          "success"
        );
      } else {
        showToast(`Erreur lors de la génération: ${data.error}`, "error");
      }
    } catch (error) {
      console.error("Error generating playlists:", error);
      showToast("Erreur lors de la génération des playlists", "error");
    } finally {
      toggleLoading(false);
    }
  }

  // Sauvegarder les playlists
  async function savePlaylists() {
    if (currentState.playlists.length === 0) {
      showToast("Aucune playlist à sauvegarder", "warning");
      return;
    }

    try {
      toggleLoading(true);

      const response = await fetch("/api/save", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        showToast(
          `Playlists sauvegardées avec succès dans ${data.path}`,
          "success"
        );
      } else {
        showToast(`Erreur lors de la sauvegarde: ${data.error}`, "error");
      }
    } catch (error) {
      console.error("Error saving playlists:", error);
      showToast("Erreur lors de la sauvegarde des playlists", "error");
    } finally {
      toggleLoading(false);
    }
  }

  // Charger les playlists
  async function loadPlaylists() {
    try {
      toggleLoading(true);

      const response = await fetch("/api/load", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        // Récupérer la liste des playlists
        const playlistsResponse = await fetch("/api/playlists");
        const playlistsData = await playlistsResponse.json();

        currentState.playlists = playlistsData.playlists;
        updatePlaylistsList();

        // Activer les boutons de sauvegarde
        savePlaylistsBtn.classList.remove("disabled");

        // Afficher la première playlist
        if (currentState.playlists.length > 0) {
          loadPlaylist(0);
        }

        showToast(
          `${data.playlistCount} playlists chargées avec succès !`,
          "success"
        );
      } else {
        showToast(`Erreur lors du chargement: ${data.error}`, "error");
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
      showToast("Erreur lors du chargement des playlists", "error");
    } finally {
      toggleLoading(false);
    }
  }

  // Charger les options
  async function loadOptions() {
    try {
      const response = await fetch("/api/options");
      const data = await response.json();

      if (data.success) {
        // Mettre à jour les champs du formulaire avec les options
        const options = data.options;
        const generators = data.generators;

        // Mettre à jour les champs numériques
        for (const key of [
          "minTracksPerPlaylist",
          "maxTracksPerPlaylist",
          "maxTracksPerArtistInPlaylist",
          "numberOfPlaylists",
        ]) {
          if (options[key] !== undefined) {
            optionsForm.querySelector(`[name="${key}"]`).value = options[key];
          }
        }

        // Mettre à jour les facteurs de similarité
        if (options.similarityFactors) {
          for (const [key, value] of Object.entries(
            options.similarityFactors
          )) {
            const input = optionsForm.querySelector(
              `[name="similarityFactors.${key}"]`
            );
            if (input) {
              input.value = value;
            }
          }
        }

        // Mettre à jour les générateurs
        for (const [name, enabled] of Object.entries(generators)) {
          const checkbox = optionsForm.querySelector(
            `[name="generators.${name}"]`
          );
          if (checkbox) {
            checkbox.checked = enabled;
          }
        }
      }
    } catch (error) {
      console.error("Error loading options:", error);
    }
  }

  // Ajouter un champ de règle
  function addRuleField() {
    const ruleId = Date.now(); // Identifiant unique pour la règle
    const ruleElement = document.createElement("div");
    ruleElement.className = "template-item";
    ruleElement.dataset.ruleId = ruleId;

    ruleElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <strong>Règle</strong>
          <button type="button" class="btn btn-sm btn-outline-danger" data-rule-id="${ruleId}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
        <div class="row mb-2">
          <div class="col-md-4">
            <select class="form-select rule-type" data-rule-id="${ruleId}">
              <option value="genre">Genre</option>
              <option value="artist">Artiste</option>
              <option value="year">Année</option>
              <option value="folder">Dossier</option>
            </select>
          </div>
          <div class="col-md-3 operator-container" data-rule-id="${ruleId}" style="display: none;">
            <select class="form-select rule-operator">
              <option value="=">=</option>
              <option value="<">&lt;</option>
              <option value=">">&gt;</option>
              <option value="between">Entre</option>
            </select>
          </div>
          <div class="col-md-5 value-container" data-rule-id="${ruleId}">
            <select class="form-select rule-value">
              <option value="">Sélectionnez un genre</option>
              ${currentState.genres
                .map(
                  (genre) =>
                    `<option value="${escapeHtml(genre)}">${escapeHtml(
                      genre
                    )}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
      `;

    rulesList.appendChild(ruleElement);

    // Gérer le changement de type de règle
    const typeSelect = ruleElement.querySelector(".rule-type");
    typeSelect.addEventListener("change", () => {
      updateRuleFields(ruleId, typeSelect.value);
    });

    // Gérer la suppression de la règle
    const deleteButton = ruleElement.querySelector("button[data-rule-id]");
    deleteButton.addEventListener("click", () => {
      ruleElement.remove();
    });

    return ruleId;
  }

  // Mettre à jour les champs de règle en fonction du type
  function updateRuleFields(ruleId, type) {
    const operatorContainer = document.querySelector(
      `.operator-container[data-rule-id="${ruleId}"]`
    );
    const valueContainer = document.querySelector(
      `.value-container[data-rule-id="${ruleId}"]`
    );

    // Réinitialiser les conteneurs
    operatorContainer.style.display = "none";
    valueContainer.innerHTML = "";

    switch (type) {
      case "genre":
        valueContainer.innerHTML = `
            <select class="form-select rule-value">
              <option value="">Sélectionnez un genre</option>
              ${currentState.genres
                .map(
                  (genre) =>
                    `<option value="${escapeHtml(genre)}">${escapeHtml(
                      genre
                    )}</option>`
                )
                .join("")}
            </select>
          `;
        break;
      case "artist":
        valueContainer.innerHTML = `
            <select class="form-select rule-value">
              <option value="">Sélectionnez un artiste</option>
              ${currentState.artists
                .map(
                  (artist) =>
                    `<option value="${escapeHtml(artist)}">${escapeHtml(
                      artist
                    )}</option>`
                )
                .join("")}
            </select>
          `;
        break;
      case "year":
        operatorContainer.style.display = "block";
        valueContainer.innerHTML = `<input type="number" class="form-control rule-value" min="1900" max="2100">`;

        // Gérer le changement d'opérateur
        const operatorSelect =
          operatorContainer.querySelector(".rule-operator");
        operatorSelect.addEventListener("change", () => {
          if (operatorSelect.value === "between") {
            valueContainer.innerHTML = `
                <div class="input-group">
                  <input type="number" class="form-control rule-value-min" min="1900" max="2100" placeholder="Min">
                  <span class="input-group-text">-</span>
                  <input type="number" class="form-control rule-value-max" min="1900" max="2100" placeholder="Max">
                </div>
              `;
          } else {
            valueContainer.innerHTML = `<input type="number" class="form-control rule-value" min="1900" max="2100">`;
          }
        });
        break;
      case "folder":
        valueContainer.innerHTML = `<input type="text" class="form-control rule-value" placeholder="Nom du dossier">`;
        break;
    }
  }

  // Collecter les règles du formulaire
  function collectRules() {
    const rules = [];
    const ruleElements = rulesList.querySelectorAll(".template-item");

    for (const element of ruleElements) {
      const ruleId = element.dataset.ruleId;
      const type = element.querySelector(".rule-type").value;
      let rule = { type };

      switch (type) {
        case "genre":
        case "artist":
        case "folder":
          rule.value = element.querySelector(".rule-value").value;
          break;
        case "year":
          const operator = element.querySelector(".rule-operator").value;
          rule.operator = operator;

          if (operator === "between") {
            const min = parseInt(
              element.querySelector(".rule-value-min").value
            );
            const max = parseInt(
              element.querySelector(".rule-value-max").value
            );
            rule.value = [min, max];
          } else {
            rule.value = parseInt(element.querySelector(".rule-value").value);
          }
          break;
      }

      if (
        rule.value !== undefined &&
        rule.value !== "" &&
        (typeof rule.value !== "number" || !isNaN(rule.value))
      ) {
        rules.push(rule);
      }
    }

    return rules;
  }

  // Sauvegarder un modèle de playlist
  async function saveTemplate() {
    const name = templateForm.querySelector('[name="name"]').value;
    const description = templateForm.querySelector(
      '[name="description"]'
    ).value;

    if (!name) {
      showToast("Le nom de la playlist est obligatoire", "warning");
      return;
    }

    const rules = collectRules();

    if (rules.length === 0) {
      showToast("Vous devez ajouter au moins une règle", "warning");
      return;
    }

    try {
      toggleLoading(true);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templates: [
            {
              name,
              description,
              rules,
            },
          ],
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Fermer le modal
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("templateModal")
        );
        modal.hide();

        // Mettre à jour la liste des playlists
        currentState.playlists = data.playlists;
        updatePlaylistsList();

        // Réinitialiser le formulaire
        templateForm.reset();
        rulesList.innerHTML = "";

        showToast("Playlist personnalisée créée avec succès !", "success");
      } else {
        showToast(`Erreur lors de la création: ${data.error}`, "error");
      }
    } catch (error) {
      console.error("Error creating template:", error);
      showToast("Erreur lors de la création du modèle", "error");
    } finally {
      toggleLoading(false);
    }
  }

  // Modifier une playlist
  async function modifyPlaylist() {
    if (currentState.currentPlaylistIndex < 0) return;

    const name = editPlaylistName.value;
    const description = editPlaylistDescription.value;

    if (!name) {
      showToast("Le nom de la playlist est obligatoire", "warning");
      return;
    }

    try {
      toggleLoading(true);

      const response = await fetch(
        `/api/playlists/${currentState.currentPlaylistIndex}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Fermer le modal
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("editPlaylistModal")
        );
        modal.hide();

        // Mettre à jour la playlist actuelle
        currentState.playlists[currentState.currentPlaylistIndex].name = name;
        if (description) {
          currentState.playlists[
            currentState.currentPlaylistIndex
          ].description = description;
        }

        updatePlaylistsList();

        // Mettre à jour l'affichage
        playlistTitle.textContent = name;
        playlistDescription.textContent = description || "";

        showToast("Playlist mise à jour avec succès !", "success");
      } else {
        showToast(`Erreur lors de la mise à jour: ${data.error}`, "error");
      }
    } catch (error) {
      console.error("Error updating playlist:", error);
      showToast("Erreur lors de la mise à jour de la playlist", "error");
    } finally {
      toggleLoading(false);
    }
  }

  // Supprimer une playlist
  function removePlaylist() {
    if (currentState.currentPlaylistIndex < 0) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette playlist ?")) {
      return;
    }

    // Supprimer la playlist de la liste
    currentState.playlists.splice(currentState.currentPlaylistIndex, 1);

    // Mettre à jour l'interface
    updatePlaylistsList();

    if (currentState.playlists.length > 0) {
      // Sélectionner la première playlist
      loadPlaylist(0);
    } else {
      // Aucune playlist, afficher le message de bienvenue
      welcomeMessage.style.display = "block";
      playlistContent.style.display = "none";
      currentState.currentPlaylistIndex = -1;
    }

    showToast("Playlist supprimée avec succès", "success");
  }

  // Initialisation
  function init() {
    // Charger les options
    loadOptions();

    // Événements des boutons
    scanLibraryBtn.addEventListener("click", scanLibrary);
    generatePlaylistsBtn.addEventListener("click", generatePlaylists);
    savePlaylistsBtn.addEventListener("click", savePlaylists);
    loadPlaylistsBtn.addEventListener("click", loadPlaylists);
    saveOptionsBtn.addEventListener("click", () => {
      // Fermer le modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("optionsModal")
      );
      modal.hide();

      showToast(
        "Options mises à jour, elles seront appliquées à la prochaine génération",
        "success"
      );
    });

    // Événements pour les modèles
    addRuleBtn.addEventListener("click", addRuleField);
    saveTemplateBtn.addEventListener("click", saveTemplate);

    // Événements pour l'édition de playlist
    editPlaylistBtn.addEventListener("click", () => {
      if (currentState.currentPlaylistIndex < 0) return;

      const playlist =
        currentState.playlists[currentState.currentPlaylistIndex];
      editPlaylistName.value = playlist.name;
      editPlaylistDescription.value = playlist.description || "";

      const modal = new bootstrap.Modal(
        document.getElementById("editPlaylistModal")
      );
      modal.show();
    });

    savePlaylistEditBtn.addEventListener("click", modifyPlaylist);
    removePlaylistBtn.addEventListener("click", removePlaylist);

    // Recherche de pistes
    trackSearch.addEventListener("input", filterTracks);

    // Actualiser les modèles prédéfinis
    if (refreshTemplatesBtn) {
      refreshTemplatesBtn.addEventListener("click", fetchPredefinedTemplates);
    }

    // Désactiver les boutons tant que la bibliothèque n'est pas scannée
    generatePlaylistsBtn.classList.add("disabled");
    savePlaylistsBtn.classList.add("disabled");
    editPlaylistBtn.classList.add("disabled");
    removePlaylistBtn.classList.add("disabled");

    // Afficher le message de bienvenue au démarrage
    welcomeMessage.style.display = "block";
    playlistContent.style.display = "none";

    updateStats();
  }

  // Initialiser l'application
  init();
});
