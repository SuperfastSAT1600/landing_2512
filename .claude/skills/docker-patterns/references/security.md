# Docker Security Hardening

Security best practices and hardening techniques for Docker containers.

---

## Run as Non-Root User

```dockerfile
FROM node:20-alpine

# Create user during build
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup appuser

# Set proper permissions
WORKDIR /app
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

CMD ["node", "index.js"]
```

---

## Signal Handling with dumb-init

```dockerfile
FROM node:20-alpine

# Don't run as root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Remove unnecessary packages and install dumb-init
RUN apk --no-cache add dumb-init && \
    rm -rf /var/cache/apk/*

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Set proper permissions
WORKDIR /app
COPY --chown=appuser:appgroup . .

USER appuser
CMD ["node", "index.js"]
```

---

## Read-Only Filesystem

```yaml
# docker-compose.yml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
```

---

## Drop Capabilities

```yaml
# docker-compose.yml
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if needed for binding to ports < 1024
```

---

## Security Scanning

### Docker Scout
```bash
# Scan image for vulnerabilities
docker scout cves myapp:latest

# View recommendations
docker scout recommendations myapp:latest
```

### Trivy
```bash
# Scan with Trivy
trivy image myapp:latest

# Scan and fail on HIGH/CRITICAL
trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:latest
```

### Build with Secrets
```bash
# Scan during build (don't expose secrets in layers)
docker build --secret id=npm,src=$HOME/.npmrc .
```

```dockerfile
# In Dockerfile
RUN --mount=type=secret,id=npm,target=/root/.npmrc \
    npm ci --only=production
```

---

## Distroless Images

Use Google's distroless images for minimal attack surface:

```dockerfile
# Go application with distroless
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o server

FROM gcr.io/distroless/static-debian11
COPY --from=builder /app/server /
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

---

## Security Checklist

- [ ] Run as non-root user (`USER` directive)
- [ ] Use minimal base images (alpine, slim, distroless)
- [ ] No hardcoded secrets in Dockerfile or image
- [ ] Scan images for vulnerabilities regularly
- [ ] Use multi-stage builds to exclude build tools
- [ ] Drop unnecessary Linux capabilities
- [ ] Enable read-only filesystem where possible
- [ ] Use `.dockerignore` to exclude sensitive files
- [ ] Pin base image versions (avoid `latest`)
- [ ] Implement proper signal handling (dumb-init)
- [ ] Health checks configured
- [ ] Resource limits set (CPU, memory)
- [ ] Logs to stdout/stderr (not files)

---

## Production Hardening

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Security: Install only runtime dependencies
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Security: Switch to non-root
USER appuser

# Security: Use dumb-init for signal handling
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node healthcheck.js || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.prod.yml
services:
  app:
    image: myapp:latest
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
```

---

## Common Vulnerabilities

### Exposed Secrets
```dockerfile
# ❌ BAD: Secret in environment variable
ENV API_KEY=sk-abc123

# ✅ GOOD: Use Docker secrets or env file
CMD ["sh", "-c", "node index.js"]
```

### Running as Root
```dockerfile
# ❌ BAD: Default root user
FROM node:20-alpine
COPY . .
CMD ["node", "index.js"]

# ✅ GOOD: Non-root user
FROM node:20-alpine
RUN adduser -D appuser
USER appuser
COPY --chown=appuser:appuser . .
CMD ["node", "index.js"]
```

### Using `latest` Tag
```dockerfile
# ❌ BAD: Unpredictable versions
FROM node:latest

# ✅ GOOD: Pinned version
FROM node:20.11.0-alpine3.19
```
