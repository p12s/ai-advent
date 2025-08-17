# MCP GitHub Autoupdate

- Launch Docker or your VPS and run your application on it 24/7 so that it sends a report received from MCP once in a while

Result - you will receive a reminder or report in the evening today and every day during this challenge
Format: Video

## Video
https://disk.yandex.com/i/6mL5vTJDF7Netg

## 🐳 Running with Docker

Quick Start

```bash
./start-docker.sh

./stop-docker.sh

./logs-docker.sh          # All services
./logs-docker.sh web      # Web application only
./logs-docker.sh telegram # Telegram MCP only
./logs-docker.sh github   # GitHub MCP only
```

Manual Start

```bash
docker-compose up --build -d

docker-compose logs -f

docker-compose down
```

📋 Configuration

1. Telegram Configuration

Create a `config.json` file in the `telegram-mcp/` folder:
```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  }
}
```

2. GitHub Configuration

Create a `config.json` file in the `github-mcp/` folder:
```json
{
  "github": {
    "token": "YOUR_GITHUB_TOKEN"
  }
}
```

3. Web Application Configuration

Create a `config.json` file in the `08/` folder:
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

🌐 Available Services

- **Web Application**: http://localhost:8080
- **Telegram MCP**: http://localhost:3000
- **GitHub MCP**: http://localhost:3002

📱 Functionality

Agent1 - Requirements Gathering
- Collects application requirements
- Asks clarifying questions
- Creates requirements document

Agent2 - Planning
- Analyzes requirements
- Creates development plan
- Sends plan to Telegram

Agent3 - GitHub Analysis
- Analyzes repositories
- Shows open issues
- Generates reports

🔧 Troubleshooting

Common Issues

1. **Services not starting**
   - Check if ports 3000, 3001, 3002, 8080 are available
   - Ensure Docker is running
   - Check logs: `./logs-docker.sh`

2. **Configuration errors**
   - Verify all `config.json` files exist
   - Check token permissions
   - Ensure correct URLs in configuration

3. **Network issues**
   - Verify Docker network: `docker network ls`
   - Check container connectivity: `docker-compose ps`

Logs

```bash
./logs-docker.sh

./logs-docker.sh web
./logs-docker.sh telegram
./logs-docker.sh github

docker-compose logs -f
```

🚀 Development

Local Development

```bash
docker-compose up -d

docker-compose logs -f

docker-compose down
docker-compose up --build -d
```

File Structure

```
08/
├── web-app/           # Web application
├── docker-compose.yml # Docker configuration
├── start-docker.sh    # Start script
├── stop-docker.sh     # Stop script
└── logs-docker.sh     # Logs script
```

📄 License

This project is licensed under the MIT License.