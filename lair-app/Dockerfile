FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 5175
CMD ["npx", "vite", "--host", "0.0.0.0"]

FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build
