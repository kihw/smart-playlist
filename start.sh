#!/bin/bash

# Créer les dossiers nécessaires s'ils n'existent pas
mkdir -p ./music
mkdir -p ./playlists

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Construire et démarrer les conteneurs
echo "Démarrage du générateur de playlists..."
docker-compose up -d --build

echo "Le générateur de playlists est accessible à l'adresse: http://localhost:3000"
echo "Placez vos fichiers musicaux dans le dossier './music'"
echo "Les playlists générées seront disponibles dans le dossier './playlists'"