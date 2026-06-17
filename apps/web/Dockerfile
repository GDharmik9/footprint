# Multi-stage Dockerfile for @footprint/web SPA
FROM node:20-slim AS builder
WORKDIR /app

# Copy monorepo resources
COPY package.json package-lock.json tsconfig.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/carbon-math ./packages/carbon-math
COPY apps/web ./apps/web

# Install and compile the frontend client
RUN npm install --legacy-peer-deps
RUN npm run build -w @footprint/shared-types
RUN npm run build -w @footprint/carbon-math
RUN npm run build -w @footprint/web

# Serve static assets using Nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Replace default Nginx port 80 to 8080 for GCP compatibility (Cloud Run)
RUN sed -i 's/listen\(  *\)80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
