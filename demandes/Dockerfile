# ============================================================
# api-demandes - Dockerfile multi-stage (Node 20 Alpine)
# Microservice ecoute sur le port 4007
# ============================================================

# --- Etape 1 : build TypeScript ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Etape 2 : dependances de production uniquement ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- Etape 3 : image finale ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4007

RUN addgroup -S apinode && adduser -S apinode -G apinode

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

USER apinode

EXPOSE 4007

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4007/sante', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
