# Docker Setup for Job Tracker Testing

## Option 1: Docker Desktop (Recommended for Development)

1. **Install Docker Desktop for macOS:**
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop
   - Verify installation: `docker --version`

2. **Test Docker is working:**
   ```bash
   docker run hello-world
   ```

## Option 2: Docker via Homebrew (Alternative)

```bash
# Install Docker via Homebrew
brew install --cask docker

# Or install colima (lightweight alternative)
brew install colima docker
colima start
```

## Option 3: Podman (Docker Alternative)

```bash
# Install podman (Docker-compatible)
brew install podman
podman machine init
podman machine start

# Configure Testcontainers to use podman
export TESTCONTAINERS_RYUK_DISABLED=true
export DOCKER_HOST="unix://${HOME}/.local/share/containers/podman/machine/podman-machine-default/podman.sock"
```

## Verification

After installing any option, verify with:

```bash
docker --version
docker ps
```

## Testcontainers Configuration

The project includes Testcontainers configuration that will work once Docker is running.
