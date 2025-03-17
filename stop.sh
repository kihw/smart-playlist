#!/bin/bash

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Arrêter les conteneurs
echo "Arrêt du générateur de playlists..."
docker-compose down

echo "Le générateur de playlists a été arrêté."