# Frontend Multi-Stage Dockerfile for NeuroDetect React Vite App
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source files and build production distribution
COPY . .
RUN npm run build

# Stage 2: Nginx Production Server
FROM nginx:alpine

# Copy built dist files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
