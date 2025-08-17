🐳 Docker Setup for MCP Realtime

📋 Prerequisites

1. **Docker** and **Docker Compose** installed
2. **Telegram Bot Token** (get from @BotFather)
3. **GitHub Personal Access Token**
4. **Chat ID** of Telegram group

🔧 Configuration Setup

1. Telegram MCP Configuration

Create file `../telegram-mcp/config.json`:
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN_HERE",
    "chatId": "YOUR_CHAT_ID_HERE"
  }
}
```

2. GitHub MCP Configuration

Create file `../github-mcp/config.json`:
```json
{
  "github": {
    "token": "YOUR_GITHUB_TOKEN_HERE"
  }
}
```

3. Web Application Configuration

Create file `config.json` in current folder:
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN_HERE",
    "chatId": "YOUR_CHAT_ID_HERE"
  },
  "github": {
    "url": "http://github-mcp:3002",
    "token": "YOUR_GITHUB_TOKEN_HERE"
  }
}
```

🚀 Service Launch

Quick Start
```bash
./start-docker.sh
```

Manual Start
```bash
docker-compose up --build -d

docker-compose ps

docker-compose logs -f
```

📊 Service Management

View Logs
```bash
./logs-docker.sh

./logs-docker.sh web      # Web application
./logs-docker.sh telegram # Telegram MCP
./logs-docker.sh github   # GitHub MCP
```

Stop Services
```bash
./stop-docker.sh
```

Restart Service
```bash
docker-compose restart web-app
docker-compose restart telegram-mcp
docker-compose restart github-mcp
```

🌐 Available Services

After launch, the following will be available:

- **Web Application**: http://localhost:8080
- **Telegram MCP**: http://localhost:3000
- **GitHub MCP**: http://localhost:3002

🔍 Health Checks

Verify Services
```bash
curl http://localhost:3000/health

curl http://localhost:3002/health

curl http://localhost:8080
```

Expected Responses
```json
// Telegram MCP
{
  "status": "ok",
  "bot_initialized": true,
  "chat_id_set": true
}

// GitHub MCP
{
  "status": "ok",
  "service": "github-mcp-http-proxy",
  "target": "http://localhost:3001"
}
```

🔧 Troubleshooting

Port Conflicts
If you get port binding errors:
```bash
lsof -i :3000
lsof -i :3001
lsof -i :3002
lsof -i :8080

sudo systemctl stop conflicting-service
```

Container Issues
```bash
docker-compose ps

docker-compose logs web-app
docker-compose logs telegram-mcp
docker-compose logs github-mcp

docker-compose up --build -d web-app
```

Network Issues
```bash
docker network ls

docker network inspect 08_mcp-network

docker-compose down
docker network prune
docker-compose up -d
```

📊 Monitoring

Resource Usage
```bash
docker stats

docker system df
```

Log Analysis
```bash
docker-compose logs -f --tail=100

docker-compose logs | grep -i error
```

🔒 Security Considerations

Token Security
- Never commit `config.json` files to version control
- Use environment variables in production
- Rotate tokens regularly
- Use least privilege principle

Network Security
- Services communicate only within Docker network
- No direct external access to MCP services
- Web application accessible only on localhost:8080

Container Security
- Use official base images
- Keep images updated
- Scan for vulnerabilities
- Use non-root users when possible

🚀 Production Deployment

Environment Variables
```bash
export TELEGRAM_BOT_TOKEN="your_token"
export TELEGRAM_CHAT_ID="your_chat_id"
export GITHUB_TOKEN="your_token"

docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

SSL/TLS
```bash
sudo certbot --nginx -d your-domain.com
```

📝 Maintenance

Regular Tasks
- Update base images monthly
- Rotate tokens quarterly
- Monitor resource usage
- Review and rotate logs

Backup Strategy
```bash
tar -czf config-backup-$(date +%Y%m%d).tar.gz */config.json

docker run --rm -v 08_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup-$(date +%Y%m%d).tar.gz /data
```
