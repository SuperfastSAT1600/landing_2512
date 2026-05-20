# Docker Debugging & Troubleshooting

Common debugging commands and techniques for Docker containers.

---

## Interactive Shell

### Running Container
```bash
# Run shell in running container (Alpine uses 'sh', Ubuntu uses 'bash')
docker exec -it container_name sh
docker exec -it container_name bash

# Run as root (if container runs as non-root)
docker exec -it -u root container_name sh
```

### New Container
```bash
# Run shell in new container
docker run -it --rm myimage sh

# Override entrypoint to debug startup issues
docker run -it --rm --entrypoint sh myimage
```

---

## Viewing Logs

```bash
# Follow logs (like tail -f)
docker logs -f container_name

# Last 100 lines
docker logs --tail 100 container_name

# With timestamps
docker logs -t container_name

# Since specific time
docker logs --since 2024-01-01T00:00:00 container_name

# Between timestamps
docker logs --since 2024-01-01 --until 2024-01-02 container_name
```

---

## Inspecting Containers

### Container Details
```bash
# Full container config
docker inspect container_name

# Specific value (using Go template)
docker inspect -f '{{.State.Status}}' container_name
docker inspect -f '{{.NetworkSettings.IPAddress}}' container_name

# All environment variables
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' container_name
```

### Image Details
```bash
# Image layers and history
docker history myimage

# Show layer commands
docker history --no-trunc myimage

# Image details
docker inspect myimage
```

### Network
```bash
# Network details
docker network inspect bridge

# Container's network settings
docker inspect -f '{{json .NetworkSettings.Networks}}' container_name | jq
```

---

## Resource Usage

```bash
# Real-time container stats
docker stats

# Specific container
docker stats container_name

# Without streaming (single output)
docker stats --no-stream
```

---

## Process Inspection

```bash
# List processes in container
docker top container_name

# With custom ps options
docker top container_name aux
```

---

## File System Inspection

```bash
# Copy files from container
docker cp container_name:/app/logs/error.log ./error.log

# Copy files to container
docker cp ./config.json container_name:/app/config.json

# View filesystem changes
docker diff container_name
```

---

## Port Mapping

```bash
# Show port mappings
docker port container_name

# Specific port
docker port container_name 3000
```

---

## Build Debugging

### Build with Progress
```bash
# Plain progress (better for CI)
docker build --progress=plain -t myapp .

# No cache (force rebuild)
docker build --no-cache -t myapp .

# Build specific stage
docker build --target builder -t myapp:builder .
```

### Inspect Build Cache
```bash
# Show build cache
docker buildx du

# Clear build cache
docker buildx prune

# Clear all build cache
docker buildx prune -a
```

---

## Common Issues

### Container Exits Immediately
```bash
# Check exit code and error
docker logs container_name
docker inspect -f '{{.State.ExitCode}}' container_name

# Run with shell to investigate
docker run -it --rm --entrypoint sh myimage
```

### Permission Denied
```bash
# Check if running as correct user
docker exec container_name whoami
docker exec container_name id

# Check file permissions
docker exec container_name ls -la /app
```

### Cannot Connect to Container
```bash
# Check if container is running
docker ps -a

# Check port mappings
docker port container_name

# Check network
docker inspect -f '{{.NetworkSettings.IPAddress}}' container_name

# Test from inside container
docker exec container_name wget -O- http://localhost:3000/health
```

### Out of Disk Space
```bash
# Check Docker disk usage
docker system df

# Detailed view
docker system df -v

# Remove unused resources
docker system prune

# Remove everything (caution!)
docker system prune -a --volumes
```

---

## Compose Debugging

```bash
# View logs for all services
docker compose logs

# Follow logs for specific service
docker compose logs -f app

# Check service status
docker compose ps

# View config (merged from all files)
docker compose config

# Validate config
docker compose config --quiet
```

---

## Health Check Debugging

```bash
# View health status
docker inspect -f '{{.State.Health.Status}}' container_name

# View health check logs
docker inspect -f '{{range .State.Health.Log}}{{.Output}}{{end}}' container_name

# Run health check manually
docker exec container_name wget -O- http://localhost:3000/health
```

---

## Network Debugging

```bash
# Create network
docker network create my-network

# Connect running container to network
docker network connect my-network container_name

# Disconnect from network
docker network disconnect my-network container_name

# Test connectivity between containers
docker exec container1 ping container2
docker exec container1 wget -O- http://container2:3000
```

---

## Quick Diagnostic Commands

```bash
# One-liner system check
docker ps -a && docker images && docker volume ls && docker network ls

# Check if Docker daemon is running
docker info

# Clean up stopped containers
docker container prune

# Clean up unused images
docker image prune

# Clean up unused volumes
docker volume prune

# Clean up everything unused
docker system prune -a --volumes
```
