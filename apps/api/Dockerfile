# Multi-stage Dockerfile for @footprint/api monorepo service
FROM node:20-slim AS builder
WORKDIR /app

# Copy configuration and workspaces metadata
COPY package.json package-lock.json tsconfig.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/carbon-math ./packages/carbon-math
COPY apps/api ./apps/api

# Install all workspace dependencies
RUN npm install --legacy-peer-deps

# Build the workspaces sequentially
RUN npm run build -w @footprint/shared-types
RUN npm run build -w @footprint/carbon-math
RUN npm run build -w @footprint/api

# Production Runner stage
FROM node:20-slim
WORKDIR /app

# Copy build artifacts and workspace directories
COPY --from=builder /app /app

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

# Run API workspace directly
CMD ["npm", "start", "-w", "@footprint/api"]
