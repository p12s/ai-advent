# Docker MCP Server

A powerful MCP (Model Context Protocol) server for managing Docker containers, deploying applications, and monitoring container health.

## Features

- 🐳 **Container Management** - Create, start, stop, and remove containers
- 📦 **Image Management** - Pull and manage Docker images
- 📊 **System Monitoring** - Docker system information and resource monitoring
- 📋 **Container Logs** - Real-time container log retrieval
- 🔗 **RESTful API** - Clean HTTP endpoints for easy integration
- 🚀 **Dual Architecture** - MCP server + HTTP proxy for maximum flexibility
- 🛡️ **Security** - Support for Docker socket and TCP connections

## Quick Start

### Requirements

- Node.js 18+ (with built-in fetch support)
- npm or yarn
- Docker (installed and running)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd docker-mcp
   npm install
   ```

2. **Configure settings:**
   ```bash
   cp config.example.json config.json
   ```

3. **Edit `config.json` if needed:**
   ```json
   {
     "docker": {
       "socketPath": "/var/run/docker.sock",
       "host": "localhost",
       "port": 2375
     }
   }
   ```

### Starting Services

#### Option 1: Quick Start (Recommended)
```bash
./start.sh
```

This script automatically:
- Checks Node.js and npm installation
- Installs dependencies
- Verifies port availability
- Starts Docker MCP server (port 3003)
- Starts HTTP proxy server (port 3004)

#### Option 2: Manual Start

**Start Docker MCP server:**
```bash
npm start
# or
node mcp-docker-server.js
```

**Start HTTP proxy (optional):**
```bash
npm run http-server
# or
node mcp-http-server.js
```

**Run tests:**
```bash
npm test
# or
node test-docker-api.js
```

## API Reference

### Initialization

**POST** `/mcp/docker/init`

Initialize Docker MCP with connection settings.

```json
{
  "socketPath": "/var/run/docker.sock",
  "host": "localhost",
  "port": 2375
}
```

### System Information

**GET** `/mcp/docker/system/info`

Get Docker system information.

**GET** `/mcp/docker/health`

Check Docker connection status.

### Container Management

**GET** `/mcp/docker/containers`

Get list of all containers.

**POST** `/mcp/docker/container/create`

Create a new container.

```json
{
  "imageName": "nginx:alpine",
  "containerName": "my-nginx",
  "options": {
    "HostConfig": {
      "PortBindings": {
        "80/tcp": [{ "HostPort": "8080" }]
      }
    }
  }
}
```

**POST** `/mcp/docker/container/start`

Start a container.

```json
{
  "containerId": "container_id_here"
}
```

**POST** `/mcp/docker/container/stop`

Stop a container.

```json
{
  "containerId": "container_id_here"
}
```

**DELETE** `/mcp/docker/container/remove`

Remove a container.

```json
{
  "containerId": "container_id_here",
  "force": false
}
```

**GET** `/mcp/docker/container/logs/:containerId`

Get container logs.

```
GET /mcp/docker/container/logs/container_id?tail=100
```

### Image Management

**GET** `/mcp/docker/images`

Get list of all images.

**POST** `/mcp/docker/image/pull`

Pull an image from registry.

```json
{
  "imageName": "nginx",
  "tag": "alpine"
}
```

## Usage Examples

### Deploying a Web Application

```bash
# Create nginx container
curl -X POST http://localhost:3003/mcp/docker/container/create \
  -H "Content-Type: application/json" \
  -d '{
    "imageName": "nginx:alpine",
    "containerName": "my-website",
    "options": {
      "HostConfig": {
        "PortBindings": {
          "80/tcp": [{ "HostPort": "8080" }]
        }
      }
    }
  }'
```

### Container Monitoring

```bash
# Get container list
curl http://localhost:3003/mcp/docker/containers

# Get container logs
curl http://localhost:3003/mcp/docker/container/logs/container_id?tail=50
```

### Lifecycle Management

```bash
# Stop container
curl -X POST http://localhost:3003/mcp/docker/container/stop \
  -H "Content-Type: application/json" \
  -d '{"containerId": "container_id"}'

# Remove container
curl -X DELETE http://localhost:3003/mcp/docker/container/remove \
  -H "Content-Type: application/json" \
  -d '{"containerId": "container_id", "force": true}'
```

## HTTP Proxy

The server also provides an HTTP proxy on port 3004 for easier integration:

```bash
# Through proxy
curl http://localhost:3004/api/mcp/docker/containers
curl http://localhost:3004/api/mcp/docker/system/info
```

## Testing

Run tests to verify functionality:

```bash
npm test
```

To clean up test containers:

```bash
node test-docker-api.js --cleanup
```

## Configuration

### Docker Socket (Linux/macOS)

By default, Unix socket is used:

```json
{
  "docker": {
    "socketPath": "/var/run/docker.sock"
  }
}
```

### Docker TCP (Windows/Remote)

For TCP connection:

```json
{
  "docker": {
    "host": "localhost",
    "port": 2375
  }
}
```

## Security

- Ensure Docker daemon is properly configured
- Use Docker socket only in trusted environments
- For production, configure TLS connection with Docker daemon

## Troubleshooting

### Docker Not Available

```bash
# Check Docker daemon
docker info

# Check socket permissions
ls -la /var/run/docker.sock
```

### Port in Use

Change ports in files:
- `mcp-docker-server.js` (port 3003)
- `mcp-http-server.js` (port 3004)

### Connection Errors

Check configuration in `config.json` and ensure Docker daemon is running.

## License

MIT License
