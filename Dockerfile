# Stage 1: build the React frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: production backend (serves API + built frontend)
FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
# Copy built frontend into a known path the backend can serve
COPY --from=frontend-builder /frontend/dist ./public
EXPOSE 3001
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node src/server.js"]
