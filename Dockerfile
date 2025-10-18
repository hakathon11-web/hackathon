# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Leverage layer caching: install deps first
COPY package.json package-lock.json* bun.lockb* ./
RUN npm ci --no-audit --no-fund

# Copy source
COPY . .

# Build for production - environment variables will be injected at runtime
# This ensures the same build works across all environments
RUN npm run build:prod

# ---- Runtime stage ----
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime tools needed by healthcheck
RUN apk add --no-cache wget ca-certificates

# Copy only what's needed to run the server
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copy built assets and server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/nginx.conf ./nginx.conf

# Env and runtime settings
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]


