FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npx", "nodemon", "src/server.js"]

FROM base AS production
RUN npm ci --omit=dev
COPY . .
EXPOSE 3001
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node src/server.js"]
