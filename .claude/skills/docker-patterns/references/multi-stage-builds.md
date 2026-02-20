# Multi-Stage Build Patterns

Detailed examples of multi-stage Docker builds for optimal image size and security.

---

## Basic Multi-Stage Pattern

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runner (minimal production image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy only necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Layer Optimization

### Bad: Cache invalidated on any file change
```dockerfile
COPY . .
RUN npm install
```

### Good: Dependencies cached unless package.json changes
```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

---

## Build Cache with BuildKit

```dockerfile
# Use BuildKit cache mounts for npm
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

# Use BuildKit cache mounts for pip
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
```

---

## Image Size Comparison

| Base Image | Size |
|------------|------|
| node:20 | ~1GB |
| node:20-slim | ~250MB |
| node:20-alpine | ~180MB |
| distroless/nodejs20 | ~130MB |

---

## Size Reduction Techniques

```dockerfile
# Use specific slim/alpine versions
FROM node:20-alpine  # ~180MB vs ~1GB for full
FROM python:3.11-slim  # ~150MB vs ~1GB for full

# Remove unnecessary files after installation
RUN apt-get update && apt-get install -y \
    package1 \
    package2 \
    && rm -rf /var/lib/apt/lists/*

# Clean npm cache
RUN npm ci --only=production && npm cache clean --force

# Use multi-stage builds to exclude build tools
```

---

## Development vs Production Targets

```dockerfile
FROM node:20-alpine AS base

# Development stage
FROM base AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=development /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
```

Build specific stage:
```bash
# Development
docker build --target development -t myapp:dev .

# Production
docker build --target production -t myapp:prod .
```
