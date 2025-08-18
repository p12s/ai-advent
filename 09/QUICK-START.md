🚀 Quick Start MCP Realtime

1. Configuration Setup

Create configuration files:

`../telegram-mcp/config.json`
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }
}
```

`../github-mcp/config.json`
```json
{
  "github": {
    "token": "YOUR_GITHUB_TOKEN"
  }
}
```

`config.json` (in 08/ folder)
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  },
  "github": {
    "url": "http://github-mcp:3002",
    "token": "YOUR_GITHUB_TOKEN"
  }
}
```

2. Launch

```bash
./start-docker.sh

open http://localhost:8080
```

3. Management

```bash
./stop-docker.sh

./logs-docker.sh

docker-compose ps
```

4. Verification

- 🌐 Web Application: http://localhost:8080
- 📱 Telegram MCP: http://localhost:3000/health
- 🐙 GitHub MCP: http://localhost:3002/health

🆘 If Something's Not Working

```bash
docker-compose down
docker-compose up --build -d

docker-compose logs -f
```
