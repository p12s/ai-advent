# MCP GitHub Integration

- Use MCP at the last stage, your task is to collect data from any of your systems and make a small report (any, for example, the number of unfinished tasks and analysis of these tasks)

Result: You received a report
Format: Video + Code

## Video
https://disk.yandex.com/i/DxJAA4A-hKyh_w

## Features

- 🤖 **Automatic dialog start notification** sent to Telegram group
- 📋 **Final development plan delivery** after agent completion
- 🔄 **Seamless integration** with existing application without core logic changes
- 📸 **Automatic screenshot preservation** (as before)
- 📝 **Note field support** for additional requirements
- 📊 **GitHub data integration** with automatic report generation
- 🔗 **MCP GitHub server** for repository and issue analysis
- 🔍 **Agent3 GitHub analyzer** for real-time repository monitoring

## Prerequisites

This application requires the **telegram-mcp** server to be running and **GitHub MCP** server configuration. Please refer to the [telegram-mcp directory](../telegram-mcp/README.md) for setup and configuration.

## Installation & Setup

### 1. Install Dependencies

```bash
cd telegram-mcp
npm install
```

### 2. Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) in Telegram
2. Get the bot token
3. Add the bot to your group
4. Get the group chat ID (you can use [@userinfobot](https://t.me/userinfobot))

### 3. GitHub MCP Setup

1. Get your GitHub Personal Access Token with appropriate permissions
2. Configure the GitHub MCP server URL and token in config.json

### 4. Configuration

Copy `config.example.json` to `config.json` and fill in your actual data:

```json
{
  "telegram": {
    "botToken": "YOUR_ACTUAL_BOT_TOKEN",
    "chatId": "YOUR_ACTUAL_CHAT_ID"
  },
  "github": {
    "url": "https://api.githubcopilot.com/mcp/",
    "token": "YOUR_GITHUB_TOKEN"
  }
}
```

Also update the configuration in `telegram-mcp/config.json`:

```json
{
  "telegram": {
    "botToken": "YOUR_ACTUAL_BOT_TOKEN",
    "chatId": "YOUR_ACTUAL_CHAT_ID"
  }
}
```

## Usage

### Quick Start - All Services

```bash
cd telegram-mcp
./start.sh
```

This script automatically launches all necessary services.

### Manual Launch

#### 1. Start MCP HTTP Server

```bash
cd telegram-mcp
npm run http-server
```

Server will start on port 3000.

#### 2. Launch Web Application

```bash
cd 07
npx http-server -p 8080 --cors
```

Application will be available at http://localhost:8080

#### 3. Verify Functionality

Open in browser: http://localhost:3000/health

Should return:
```json
{
  "status": "ok",
  "bot_initialized": false,
  "chat_id_set": false
}
```

## How It Works

### 1. Initialization
Upon page load, the application automatically initializes the MCP Telegram server.

### 2. Dialog Start
When a user sends their first message, a notification about the survey start is automatically sent to Telegram.

### 3. Requirements Collection
Agent1 collects requirements through user dialog (as before).

### 4. Plan Creation
Agent2 creates a final development plan based on collected requirements.

### 5. Plan Delivery
The final plan is automatically sent to the Telegram group with formatting.

### 6. GitHub Report Generation
After plan completion, the system automatically generates a GitHub report with repository and issue information.

### 7. Agent3 GitHub Analysis
Agent3 provides real-time GitHub analysis with a dedicated button to check unresolved issues and security alerts across repositories.

## File Structure

```
07/
├── app.js                    # Main application with MCP integration
├── index.html               # HTML interface
├── style.css                # Styles
├── config.json              # Configuration (not in git)
├── config.example.json      # Configuration example
└── README.md                # Documentation

telegram-mcp/                 # MCP Telegram server (in project root)
├── mcp-telegram-server.js   # MCP server for Telegram
├── mcp-http-server.js       # HTTP server for request handling
├── config.json              # Configuration (not in git)
├── config.example.json      # Configuration example
├── package.json             # Dependencies
├── start.sh                 # All services launcher
└── README.md                # Documentation
```

## API Endpoints

### POST /mcp/telegram/init
Initialize Telegram bot
```json
{
  "token": "YOUR_BOT_TOKEN",
  "chat_id": "YOUR_CHAT_ID"
}
```

### POST /mcp/telegram/send-dialog-start
Send dialog start message
```json
{
  "chat_id": "YOUR_CHAT_ID"
}
```

### POST /mcp/telegram/send-plan
Send final plan
```json
{
  "plan_content": "Plan content...",
  "chat_id": "YOUR_CHAT_ID"
}
```

### GET /health
Server health check

## Features

- ✅ **Automatic long message splitting** into parts
- ✅ **Error handling** with informative messages
- ✅ **CORS support** for web applications
- ✅ **Health check endpoint** for monitoring
- ✅ **Preserved existing functionality** for screenshots
- ✅ **Note field support** for additional requirements
- ✅ **GitHub MCP integration** for repository analysis
- ✅ **Automatic report generation** with repository and issue data
- ✅ **Agent3 real-time analysis** for unresolved issues and security alerts

## Troubleshooting

### "Bot not initialized" Error
Ensure that:
1. MCP HTTP server is running on port 3000
2. Bot token and chat ID are correctly specified
3. Bot is added to the group

### "Failed to send message" Error
Check:
1. Bot permissions in the group (must have message sending rights)
2. Chat ID correctness
3. Bot activity status

### Server Connection Error
Verify that:
1. MCP HTTP server is running
2. Port 3000 is not occupied by another application
3. No firewall blocking
