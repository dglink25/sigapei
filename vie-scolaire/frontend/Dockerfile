FROM node:22-alpine

WORKDIR /app

# Installer les dependances d'abord (cache Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Puis copier le code
COPY . .

EXPOSE 5173

# Serveur de developpement Vite, accessible hors du conteneur
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
