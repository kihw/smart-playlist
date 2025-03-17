FROM node:18-alpine

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source de l'application
COPY . .

# Créer les dossiers de musique et de playlists
RUN mkdir -p /music
RUN mkdir -p /playlists

# Exposer le port
EXPOSE 3000

# Volume pour les dossiers de musique et playlists
VOLUME ["/music", "/playlists"]

# Commande de démarrage
CMD ["node", "main-app.js", "/music", "/playlists"]