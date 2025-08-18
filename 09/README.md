# MCP x 2

- Add a second MCP
- Establish interaction between them in your application (one does something, the second does it based on it)

Format: Video + Code

### What's Been Added:

1. **New endpoint in telegram-mcp**: `/mcp/telegram/send-github-report`
   - Receives GitHub reports and sends them to Telegram
   - Automatically splits long messages into parts
   - Adds header "🐙 GITHUB ANALYSIS REPORT"

2. **Automatic report delivery**:
   - When GitHub data is automatically updated (on schedule)
   - When manually retrieving data via "🔍 Get GitHub Data" button
   - Reports are sent immediately after successful data retrieval

3. **Workflow**:
   ```
   1. Scheduled retrieval of data from GitHub MCP
   2. Report generation with repository and issue analysis
   3. Report automatically sent to Telegram via telegram-mcp
   4. Sending confirmation displayed in interface
   ```

### Technical Changes:

**In `app.js`:**
- Added `sendGitHubReportToTelegram()` function
- Exported function to global scope

**In `github-analysis.js`:**
- Modified `performAutoGitHubUpdate()` function for automatic delivery
- Modified Agent3 button handler for automatic delivery
- Added Telegram delivery status messages

**In `telegram-mcp/mcp-http-server.js`:**
- Added new endpoint `/mcp/telegram/send-github-report`
- Long message handling with splitting
- Report formatting with header

### Usage:

1. **Automatic updates**: Reports are sent automatically on schedule
2. **Manual updates**: Click "🔍 Get GitHub Data" button on second tab
3. **Status viewing**: Interface displays "📱 Report sent to Telegram" message

### Configuration:

Ensure `config.json` is configured with:
- Telegram bot token and chat ID
- GitHub token
- Automatic update settings

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
- **🆕 Automatically sends reports to Telegram**

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