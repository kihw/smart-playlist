# Smart Playlist Generator

Générateur de playlists intelligent avec interface web, inspiré de la logique des "Mix" de Spotify. Ce projet analyse votre bibliothèque musicale et génère automatiquement des playlists thématiques basées sur les genres, artistes, années et autres métadonnées.

## Fonctionnalités

- **Scan automatique** de votre bibliothèque musicale
- **Algorithmes intelligents** pour regrouper les artistes similaires
- **Interface web** pour gérer et personnaliser vos playlists
- **Modèles prédéfinis** pour générer rapidement des playlists thématiques
- **Export au format M3U** compatible avec la plupart des lecteurs (VLC, foobar2000, etc.)

## Installation avec Docker

### Prérequis

- Docker
- Docker Compose

### Installation rapide

1. Clonez ce dépôt :

   ```bash
   git clone https://github.com/votre-username/smart-playlist-generator.git
   cd smart-playlist-generator
   ```

2. Rendez les scripts exécutables :

   ```bash
   chmod +x start.sh stop.sh
   ```

3. Démarrez l'application :

   ```bash
   ./start.sh
   ```

4. Accédez à l'application via votre navigateur :
   ```
   http://localhost:3000
   ```

### Configuration

Par défaut, l'application utilise les dossiers suivants :

- `./music` : Placez vos fichiers musicaux dans ce dossier
- `./playlists` : Les playlists générées seront stockées ici

Vous pouvez modifier ces chemins dans le fichier `docker-compose.yml`.

## Utilisation

1. **Scanner votre bibliothèque** : Cliquez sur "Scanner la bibliothèque" pour analyser vos fichiers musicaux
2. **Générer des playlists** : Cliquez sur "Générer les playlists" pour créer automatiquement des playlists basées sur votre collection
3. **Explorer et modifier** : Parcourez les playlists générées, modifiez-les selon vos préférences
4. **Utiliser des modèles** : Explorez les modèles prédéfinis pour créer rapidement des playlists thématiques

## Types de playlists générées

- **Mix par genre** : Regroupe les artistes d'un même genre musical
- **Mix par dossier** : Basées sur la structure de vos dossiers
- **Mix par décennie** : Regroupe la musique par décennies (80s, 90s, 2000s, etc.)
- **Mix intelligents** : Basées sur la similarité entre artistes
- **Ajouts récents** : Contient vos fichiers musicaux récemment ajoutés
- **Mix découverte** : Assure que chaque artiste apparaît dans au moins une playlist

## Formats supportés

L'application supporte les formats audio suivants :

- MP3 (.mp3)
- FLAC (.flac)
- AAC (.m4a)
- WAV (.wav)
- Ogg Vorbis (.ogg)
- AAC (.aac)

## Options avancées

Vous pouvez personnaliser le comportement du générateur en ajustant les options suivantes :

- Nombre minimum/maximum de pistes par playlist
- Maximum de pistes par artiste dans une playlist
- Facteurs de similarité pour les mix intelligents
- Activation/désactivation des différents types de générateurs

## Crédits

- Interface basée sur Bootstrap et Bootstrap Icons
- Analyse des métadonnées avec music-metadata
- Serveur web avec Express.js

## Licence

MIT
