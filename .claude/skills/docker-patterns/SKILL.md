---
name: docker-patterns
description: Provides best practices for containerization, multi-stage builds, container orchestration, and Docker security hardening.
---

# Docker Patterns

Best practices for containerization, multi-stage builds, and container orchestration.

---

## Core Principles

### 1. Minimize Image Size
- Use Alpine or slim base images (`node:20-alpine` vs `node:20`)
- Leverage multi-stage builds to exclude build dependencies
- Remove package manager caches after installation
- Use `.dockerignore` to exclude unnecessary files

**Impact**: Reduces image size from ~1GB to ~180MB for Node.js apps.

### 2. Optimize Layer Caching
- Order Dockerfile instructions from least to most frequently changed
- Copy dependency files (`package.json`) before source code
- Combine related `RUN` commands to reduce layers

**Pattern**: Copy `package.json` → Install deps → Copy source → Build

### 3. Security First
- Never run containers as root (`USER` directive)
- Use minimal base images (alpine, slim, distroless)
- Scan images for vulnerabilities (Docker Scout, Trivy)
- Never hardcode secrets in Dockerfiles
- Drop unnecessary Linux capabilities
- Enable read-only filesystems where possible

### 4. Production Readiness
- Implement health checks (`HEALTHCHECK` directive)
- Handle signals properly (use `dumb-init`)
- Set resource limits (CPU, memory)
- Use structured logging to stdout/stderr
- Pin base image versions (avoid `latest`)

---

## When to Use Multi-Stage Builds

### Use Cases
1. **Compiled languages** (Go, Rust): Build in one stage, run in minimal runtime
2. **Frontend apps**: Build with dev dependencies, serve with minimal runtime
3. **Python/Node**: Install all deps for build, copy only production deps to final image
4. **Separating build tools from runtime**: Exclude compilers, dev tools from production

### Benefits
- Smaller final images (only runtime dependencies)
- Faster deployments (less data to transfer)
- Reduced attack surface (fewer packages/tools)
- Cleaner separation of build and runtime concerns

### Basic Pattern
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime (minimal)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

**See**: `references/multi-stage-builds.md` for complete examples

---

## Security Best Practices

### Non-Root User
Always create and switch to a non-root user:
```dockerfile
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser
USER appuser
```

### Signal Handling
Use `dumb-init` for proper signal forwarding:
```dockerfile
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
```

### Read-Only Filesystem
```yaml
# docker-compose.yml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
```

### Vulnerability Scanning
```bash
# Scan before deployment
docker scout cves myapp:latest
trivy image --severity HIGH,CRITICAL myapp:latest
```

**See**: `references/security.md` for complete hardening guide

---

## Docker Compose Patterns

### Development vs Production
- **Development**: Use bind mounts for hot reload, expose all ports
- **Production**: Use built images, health checks, resource limits, logging

### Key Configurations
- `depends_on` with `condition: service_healthy` for startup ordering
- Named volumes for data persistence
- Health checks for all services
- Network isolation with custom networks
- Override files (`docker-compose.override.yml`) for local development

**See**: `references/docker-compose.md` for complete configurations

---

## Quick Reference

### Layer Optimization
```dockerfile
# ❌ Bad: Invalidates cache on any file change
COPY . .
RUN npm install

# ✅ Good: Cache deps unless package.json changes
COPY package*.json ./
RUN npm ci
COPY . .
```

### Size Reduction
| Base Image | Size |
|------------|------|
| `node:20` | ~1GB |
| `node:20-slim` | ~250MB |
| `node:20-alpine` | ~180MB |
| `distroless/nodejs20` | ~130MB |

### Common Commands
```bash
# Build with cache
docker build -t myapp:latest .

# Build without cache
docker build --no-cache -t myapp:latest .

# Build specific stage
docker build --target builder -t myapp:builder .

# Run with docker compose
docker compose up -d

# View logs
docker compose logs -f app

# Clean up
docker system prune -a
```

---

## Health Checks

### Dockerfile Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

### Compose Health Check
```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Health Endpoint Pattern
Expose `/health` endpoint that checks:
- Application is running
- Database connection is alive
- Required services are reachable
- Return 200 if healthy, 503 if unhealthy

**See**: `references/dockerfile-examples.md` for implementation

---

## .dockerignore Template

Essential files to exclude:
```
# Dependencies
node_modules

# Build outputs
dist
build
.next

# Development files
.git
*.md
Dockerfile*

# Secrets
.env*
!.env.example

# Tests
tests
coverage
```

---

## Debugging

### Quick Diagnostics
```bash
# Shell into running container
docker exec -it container_name sh

# View logs
docker logs -f container_name

# Inspect container
docker inspect container_name

# Check resource usage
docker stats container_name

# Run health check manually
docker exec container_name wget -O- http://localhost:3000/health
```

**See**: `references/debugging.md` for complete troubleshooting guide

---

## Common Pitfalls

### 1. Using `latest` Tag
❌ **Bad**: Unpredictable builds, hard to rollback
```dockerfile
FROM node:latest
```

✅ **Good**: Pin specific versions
```dockerfile
FROM node:20.11.0-alpine3.19
```

### 2. Running as Root
❌ **Bad**: Security risk
```dockerfile
FROM node:20-alpine
CMD ["node", "index.js"]
```

✅ **Good**: Create non-root user
```dockerfile
FROM node:20-alpine
RUN adduser -D appuser
USER appuser
CMD ["node", "index.js"]
```

### 3. Hardcoded Secrets
❌ **Bad**: Secrets in image layers
```dockerfile
ENV API_KEY=sk-abc123
```

✅ **Good**: Use environment variables or Docker secrets
```yaml
services:
  app:
    env_file: .env
```

### 4. Missing Health Checks
❌ **Bad**: No health monitoring
```dockerfile
CMD ["node", "index.js"]
```

✅ **Good**: Add health check
```dockerfile
HEALTHCHECK CMD wget --spider http://localhost:3000/health || exit 1
CMD ["node", "index.js"]
```

---

## CI/CD Integration

### GitHub Actions Build
```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ghcr.io/OWNER/REPO:COMMIT_SHA  # Use GitHub Actions syntax: ghcr.io/${{github.repository}}:${{github.sha}}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### BuildKit Cache Mounts
```dockerfile
# Cache npm packages across builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production
```

---

## Reference Documentation

- **Dockerfile Examples**: `references/dockerfile-examples.md` - Complete examples for Node.js, Python, Go
- **Multi-Stage Builds**: `references/multi-stage-builds.md` - Detailed multi-stage patterns and optimization
- **Docker Compose**: `references/docker-compose.md` - Development and production configurations
- **Security**: `references/security.md` - Complete security hardening guide
- **Debugging**: `references/debugging.md` - Troubleshooting commands and techniques

### External Resources
- Docker Best Practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- Dockerfile Reference: https://docs.docker.com/engine/reference/builder/
- Docker Compose: https://docs.docker.com/compose/
- Distroless Images: https://github.com/GoogleContainerTools/distroless
