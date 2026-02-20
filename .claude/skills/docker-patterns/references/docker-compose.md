# Docker Compose Configurations

Complete docker-compose.yml examples for development and production environments.

---

## Development Setup

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules  # Preserve node_modules from container
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=myapp
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Production Setup

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  app:
    image: myapp:latest  # Set via VERSION env var or defaults to latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Override Files

```yaml
# docker-compose.override.yml (for local development)
version: "3.9"

services:
  app:
    build:
      context: .
      target: development
    volumes:
      - .:/app:delegated
    command: npm run dev
```

---

## Networking

### Bridge Network (Default)
```yaml
services:
  app:
    networks:
      - app-network

  db:
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### External Network
```yaml
networks:
  shared-network:
    external: true

services:
  app:
    networks:
      - shared-network
```

### Network Aliases
```yaml
services:
  primary-db:
    image: postgres:15
    networks:
      app-network:
        aliases:
          - database
          - postgres
```

---

## Volume Management

### Named Volumes
```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Bind Mounts (Development)
```yaml
services:
  app:
    volumes:
      # Source code (for hot reload)
      - ./src:/app/src:delegated
      # Exclude node_modules
      - /app/node_modules
```

### tmpfs (In-Memory)
```yaml
services:
  app:
    tmpfs:
      - /tmp
      - /app/cache
```

---

## Multi-File Compose

Run multiple compose files:
```bash
# Development (uses docker-compose.yml + docker-compose.override.yml automatically)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up

# Testing
docker compose -f docker-compose.yml -f docker-compose.test.yml up
```
