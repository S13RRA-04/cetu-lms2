# Stage 1: build the LMS frontend
FROM node:22-alpine AS lms-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: build the PACT app
FROM node:22-alpine AS pact-builder
WORKDIR /pact
COPY pact-app/package*.json ./
RUN npm ci
COPY pact-app/ ./
RUN npm run build

# Stage 3: build the LAIR app
FROM node:22-alpine AS lair-builder
WORKDIR /lair
COPY lair-app/package*.json ./
RUN npm ci
COPY lair-app/ ./
RUN npm run build

# Stage 4: production backend (serves API + all frontends)
FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=lms-builder  /frontend/dist ./public
COPY --from=pact-builder /pact/dist     ./public-pact
COPY --from=lair-builder /lair/dist     ./public-lair
EXPOSE 3001
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node src/server.js"]
