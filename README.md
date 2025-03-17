# Guide d'Installation et d'Utilisation du Générateur de Playlists Intelligent

Ce générateur avancé de playlists crée automatiquement des playlists "mix" inspirées de Spotify en regroupant les artistes ayant une logique ou un lien commun. La version améliorée propose une interface graphique et des options de personnalisation avancées.

## Prérequis

- [Node.js](https://nodejs.org/) (version 14 ou supérieure)
- Une bibliothèque musicale organisée dans des dossiers

## Installation

1. Créez un nouveau dossier pour le projet :

   ```bash
   mkdir smart-playlist-generator
   cd smart-playlist-generator
   ```

2. Initialisez un nouveau projet Node.js :

   ```bash
   npm init -y
   ```

3. Installez les dépendances nécessaires :

   ```bash
   npm install music-metadata express body-parser ejs
   ```

4. Créez les dossiers requis :

   ```bash
   mkdir views
   mkdir public
   ```

5. Copiez les fichiers du générateur dans votre projet :
   - `index.js` (générateur principal)
   - `playlist-editor-ui.js` (interface graphique)
   - `views/index.ejs` (vue principale)
   - `template-api.js` (API de modèles)

## Structure du Projet

```
smart-playlist-generator/
├── index.js               # Générateur de playlists principal
├── playlist-editor-ui.js  # Interface graphique d'édition
├── template-api.js        # API pour les modèles de playlists
├── public/                # Fichiers statiques
└── views/
    └── index.ejs          # Template de la page web
```

## Utilisation en Ligne de Commande

```bash
node index.js [chemin-vers-dossier-musique] [chemin-vers-dossier-sortie]
```

Exemples :

- Utilisation avec les chemins par défaut :

  ```bash
  node index.js
  ```

  Cette commande va scanner le dossier `./music` et générer les playlists dans `./playlists`.

- Utilisation avec des chemins personnalisés :
  ```bash
  node index.js /chemin/vers/ma/musique /chemin/vers/mes/playlists
  ```

## Utilisation avec l'Interface Graphique

```bash
node playlist-editor-ui.js [chemin-vers-dossier-musique] [chemin-vers-dossier-sortie]
```

Puis ouvrez votre navigateur à l'adresse `http://localhost:3000` pour accéder à l'interface.

## Configuration Avancée

### Options principales

Vous pouvez personnaliser le comportement du générateur en modifiant les options suivantes :

- `minTracksPerPlaylist` : Nombre minimum de pistes par playlist (défaut : 20)
- `maxTracksPerPlaylist` : Nombre maximum de pistes par playlist (défaut : 50)
- `maxTracksPerArtistInPlaylist` : Nombre maximum de pistes par artiste dans une playlist (défaut : 4)
- `numberOfPlaylists` : Nombre maximum de playlists à générer (défaut : 10)
- `smartMixRatio` : Ratio de contrôle de la similarité (défaut : 0.7)
- `includeYearBasedPlaylists` : Activer les playlists par décennie (défaut : true)
- `includeRecentlyAdded` : Activer les playlists des ajouts récents (défaut : true)

### Facteurs de similarité

Les facteurs de similarité pour les mix intelligents peuvent être ajustés :

- `genre` : Importance du genre musical (défaut : 0.5)
- `folder` : Importance de l'emplacement dans les dossiers (défaut : 0.3)
- `artistName` : Importance de la similarité des noms d'artistes (défaut : 0.2)

### Modèles de playlists personnalisés

Vous pouvez créer des modèles de playlists personnalisés basés sur différentes règles :

```javascript
const template = {
  name: "80s Rock Classics",
  description: "Classic rock tracks from the 1980s",
  rules: [
    { type: "genre", value: "rock" },
    { type: "year", operator: "between", value: [1980, 1989] },
  ],
};

generator.addPlaylistTemplate(template);
```

Types de règles disponibles :

- `genre` : Filtre par genre musical
- `artist` : Filtre par artiste
- `year` : Filtre par année avec opérateurs (`<`, `>`, `=`, `between`)
- `folder` : Filtre par nom de dossier

## Intégration dans votre propre code

Vous pouvez importer et utiliser la classe `SmartPlaylistGenerator` dans votre propre code :

```javascript
const SmartPlaylistGenerator = require("./index.js");

async function generatePlaylists() {
  const options = {
    minTracksPerPlaylist: 20,
    maxTracksPerPlaylist: 50,
    maxTracksPerArtistInPlaylist: 3,
    numberOfPlaylists: 8,
    smartMixRatio: 0.7,
    similarityFactors: {
      genre: 0.6,
      folder: 0.2,
      artistName: 0.2,
    },
  };

  const generator = new SmartPlaylistGenerator(
    "./ma-musique",
    "./mes-playlists",
    options
  );

  // Désactiver certains générateurs si besoin
  generator.disableGenerator("decades");

  // Ajouter un template personnalisé
  generator.addPlaylistTemplate({
    name: "Musique française",
    description: "Artistes français",
    rules: [{ type: "folder", value: "france" }],
  });

  await generator.scanLibrary();
  generator.generatePlaylists();
  await generator.exportPlaylists();
  generator.printSummary();
}

generatePlaylists();
```

## API Avancée

### Registre des générateurs de playlists

Le système utilise différents générateurs pour créer des playlists variées :

- `genres` : Playlists basées sur les genres musicaux
- `folders` : Playlists basées sur l'organisation des dossiers
- `recentlyAdded` : Playlist des morceaux récemment ajoutés
- `decades` : Playlists par décennie
- `smartMix` : Mix intelligents basés sur les similarités
- `coverage` : Playlists pour assurer que tous les artistes sont inclus

Vous pouvez activer/désactiver ces générateurs :

```javascript
// Désactiver les playlists par décennie
generator.disableGenerator("decades");

// Réactiver les playlists par décennie
generator.enableGenerator("decades");
```

### Sauvegarde et chargement des playlists

Vous pouvez sauvegarder l'état des playlists générées dans un fichier JSON et les recharger ultérieurement :

```javascript
// Sauvegarder les playlists
await generator.savePlaylistsToJson("./mes-playlists/playlists.json");

// Charger les playlists
await generator.loadPlaylistsFromJson("./mes-playlists/playlists.json");
```

Cette fonctionnalité est particulièrement utile pour :

- Reprendre la modification des playlists à un moment ultérieur
- Transférer les playlists entre différentes machines
- Créer des sauvegardes de vos configurations préférées

## Interface Graphique Avancée

L'interface graphique vous permet de :

1. **Scanner votre bibliothèque musicale**

   - Analyse tous les fichiers audio et leurs métadonnées
   - Affiche des statistiques sur votre collection

2. **Configurer les options de génération**

   - Ajuster tous les paramètres (nombre de pistes, ratio de similarité, etc.)
   - Activer/désactiver les différents types de générateurs

3. **Créer des modèles personnalisés**

   - Définir des règles de filtrage complexes
   - Combiner plusieurs critères (genre, année, artiste, dossier)

4. **Gérer vos playlists**

   - Consulter les détails de chaque playlist
   - Modifier les noms et descriptions
   - Supprimer les playlists indésirables

5. **Sauvegarder/charger les configurations**
   - Enregistrer votre travail pour y revenir plus tard
   - Expérimenter avec différentes configurations

## Conseils d'Utilisation

### Pour de meilleures playlists

1. **Organisation des métadonnées** :

   - Assurez-vous que vos fichiers audio ont des métadonnées correctes (artiste, album, genre)
   - Une bonne organisation des tags améliore considérablement la qualité des playlists générées

2. **Structure des dossiers** :

   - Organisez votre musique de manière logique (par genre, par décennie, etc.)
   - Le générateur utilise la structure des dossiers comme indice de similarité

3. **Équilibre des paramètres** :

   - Ajustez le `smartMixRatio` entre 0.5 et 0.8 pour un bon équilibre
   - Limitez `maxTracksPerArtistInPlaylist` à 3-5 morceaux pour plus de variété

4. **Modèles personnalisés** :
   - Créez des modèles pour vos styles musicaux favoris
   - Combinez plusieurs règles pour des playlists plus précises

### Performances

- Pour les grandes bibliothèques (>10 000 morceaux), augmentez la mémoire Node.js :

  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" node playlist-editor-ui.js
  ```

- Le scan initial peut prendre du temps selon la taille de votre bibliothèque
- Les opérations suivantes (génération, modification) sont beaucoup plus rapides

## Résolution des Problèmes

| Problème                       | Solution                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Erreur "Out of memory"         | Augmentez la mémoire disponible avec `NODE_OPTIONS="--max-old-space-size=4096"` |
| Certains fichiers sont ignorés | Vérifiez que le format est supporté (.mp3, .flac, .m4a, .wav, .ogg, .aac)       |
| Métadonnées manquantes         | Utilisez un éditeur de tags comme Mp3tag pour compléter vos métadonnées         |
| Interface web inaccessible     | Vérifiez que le port 3000 n'est pas déjà utilisé                                |
| Playlists trop courtes         | Réduisez la valeur de `minTracksPerPlaylist` dans les options                   |

## Améliorations Futures

Ce générateur peut être étendu avec les fonctionnalités suivantes :

- Analyse audio (BPM, tonalité) pour des playlists encore plus intelligentes
- Intégration avec des APIs de recommandation musicale externes
- Support pour les fichiers de playlists d'autres formats (PLS, XSPF, WPL)
- Gestion des listes de lecture par glisser-déposer dans l'interface
- Visualisation graphique des relations entre artistes
- Synchronisation avec des services de streaming

## Exemple Complet

Voici un exemple complet qui utilise les fonctionnalités avancées :

```javascript
const SmartPlaylistGenerator = require("./index.js");

(async () => {
  const generator = new SmartPlaylistGenerator(
    "./ma-musique",
    "./mes-playlists",
    {
      minTracksPerPlaylist: 15,
      maxTracksPerPlaylist: 40,
      maxTracksPerArtistInPlaylist: 3,
      numberOfPlaylists: 12,
      smartMixRatio: 0.75,
      similarityFactors: {
        genre: 0.6,
        folder: 0.25,
        artistName: 0.15,
      },
    }
  );

  // Désactiver certains générateurs
  generator.disableGenerator("decades");

  // Ajouter des modèles personnalisés
  generator.addPlaylistTemplate({
    name: "Rock des années 90",
    description: "Le meilleur du rock des années 90",
    rules: [
      { type: "genre", value: "rock" },
      { type: "year", operator: "between", value: [1990, 1999] },
    ],
  });

  generator.addPlaylistTemplate({
    name: "Découvertes électro",
    description: "Électro récente à découvrir",
    rules: [
      { type: "genre", value: "electronic" },
      { type: "year", operator: ">", value: 2020 },
    ],
  });

  // Scanner la bibliothèque
  await generator.scanLibrary();

  // Générer les playlists
  generator.generatePlaylists();

  // Exporter les playlists au format M3U
  await generator.exportPlaylists();

  // Sauvegarder l'état pour modification ultérieure
  await generator.savePlaylistsToJson("./mes-playlists/etat.json");

  // Afficher le résumé
  generator.printSummary();
})();
```

N'hésitez pas à explorer et expérimenter avec les différentes options pour créer des playlists parfaitement adaptées à votre collection musicale et à vos goûts!
#   s m a r t - p l a y l i s t  
 