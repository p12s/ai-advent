# Environment

- Connect the agent to the real environment, make it run Docker (or emulator) and run something in it

Result: As a result of your work, you can check something on a real device

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

3. **🆕 HTML Report Generation and Deployment**:
   - GitHub reports are automatically converted to beautiful HTML format
   - HTML reports are deployed in Docker containers using nginx
   - Each report gets a unique URL accessible via browser
   - Reports include responsive design and modern UI

4. **🆕 Docker MCP Integration**:
   - Added Docker MCP server for container management
   - HTTP proxy for Docker MCP API
   - Automatic container creation and management for HTML reports

5. **Workflow**:
   ```
   1. Scheduled retrieval of data from GitHub MCP
   2. Report generation with repository and issue analysis
   3. Report automatically sent to Telegram via telegram-mcp
   4. HTML report generated and deployed in Docker container
   5. Report URL provided in interface for easy access
   ```

### Technical Changes:

**In `app.js`:**
- Added `sendGitHubReportToTelegram()` function
- Exported function to global scope

**In `github-analysis.js`:**
- Modified `performAutoGitHubUpdate()` function for automatic delivery
- Modified Agent3 button handler for automatic delivery
- Added Telegram delivery status messages
- **🆕 Refactored to use `docker-report.js` module for HTML generation and deployment**

**🆕 In `docker-report.js`:**
- **🆕 Added `createHtmlReport()` function for HTML generation with modern CSS**
- **🆕 Added `parseGitHubDataFromReport()` function for data parsing**
- **🆕 Added `DockerReportManager` class for container management**
- **🆕 Complete HTML/CSS template with responsive design**

**In `telegram-mcp/mcp-http-server.js`:**
- Added new endpoint `/mcp/telegram/send-github-report`
- Long message handling with splitting
- Report formatting with header

**🆕 In `docker-mcp/mcp-docker-server.js`:**
- Added `execCommand()` function for container command execution
- Added `/mcp/docker/container/exec` endpoint
- Enhanced container management capabilities

**🆕 In `docker-mcp/mcp-http-server.js`:**
- HTTP proxy for Docker MCP API
- Environment variable support for Docker MCP URL

### Usage:

1. **Automatic updates**: Reports are sent automatically on schedule
2. **Manual updates**: Click "🔍 Get GitHub Data" button on second tab
3. **Status viewing**: Interface displays "📱 Report sent to Telegram" message
4. **🆕 HTML reports**: Click "🌐 Открыть HTML-отчет" button to view report in browser

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
./logs-docker.sh docker   # Docker MCP only
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
- **🆕 Docker MCP**: http://localhost:3004

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
- **🆕 Creates and deploys HTML reports in Docker containers**

🔧 Troubleshooting

Common Issues

1. **Services not starting**
   - Check if ports 3000, 3001, 3002, 3003, 3004, 8080 are available
   - Ensure Docker is running
   - Check logs: `./logs-docker.sh`

2. **Configuration errors**
   - Verify all `config.json` files exist
   - Check token permissions
   - Ensure correct URLs in configuration

3. **Network issues**
   - Verify Docker network: `docker network ls`
   - Check container connectivity: `docker-compose ps`

4. **🆕 HTML report deployment issues**
   - Check Docker MCP logs: `./logs-docker.sh docker`
   - Verify nginx image availability
   - Check port availability for report containers

Logs

```bash
./logs-docker.sh

./logs-docker.sh web
./logs-docker.sh telegram
./logs-docker.sh github
./logs-docker.sh docker

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