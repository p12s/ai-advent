# GitHub MCP Server

A powerful GitHub MCP (Model Context Protocol) server for analyzing repositories, issues, and providing comprehensive GitHub account insights.

## Features

- 🔍 **Repository Analysis** - Get detailed information about user repositories
- 📋 **Issue Tracking** - Retrieve open issues and pull requests for each repository
- 📊 **Account Statistics** - Comprehensive analytics and metrics for GitHub accounts
- 🔗 **RESTful API** - Clean HTTP endpoints for easy integration
- 🛡️ **Secure Authentication** - GitHub Personal Access Token support
- 🚀 **Dual Server Architecture** - MCP server + HTTP proxy for maximum flexibility

## Quick Start

### Prerequisites

- Node.js 18+ (with built-in fetch support)
- npm or yarn
- GitHub Personal Access Token

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd github-mcp
   npm install
   ```

2. **Configure GitHub token:**
   ```bash
   cp config.example.json config.json
   ```

3. **Edit `config.json` with your GitHub token:**
   ```json
   {
     "github": {
       "url": "https://api.github.com",
       "token": "your_github_personal_access_token"
     }
   }
   ```

### Running the Services

#### Option 1: Quick Start (Recommended)
```bash
./start.sh
```

This script automatically:
- Verifies Node.js and npm installation
- Installs dependencies
- Checks port availability
- Starts GitHub MCP server (port 3001)
- Starts HTTP proxy server (port 3002)

#### Option 2: Manual Start

**Start GitHub MCP Server:**
```bash
npm start
# or
node mcp-github-server.js
```

**Start HTTP Proxy (optional):**
```bash
npm run http-server
# or
node mcp-http-server.js
```

**Run tests:**
```bash
npm test
# or
node test-github-api.js
```

## API Reference

### Authentication

**POST** `/mcp/github/init`

Initialize the GitHub MCP with your token.

```json
{
  "token": "your_github_token",
  "url": "https://api.github.com"
}
```

### User Information

**GET** `/mcp/github/user`

Returns comprehensive user profile information.

**Response:**
```json
{
  "success": true,
  "data": {
    "login": "username",
    "id": 123456,
    "name": "Full Name",
    "email": "user@example.com",
    "public_repos": 25,
    "followers": 100,
    "following": 50
  }
}
```

### Repository Management

**GET** `/mcp/github/repos?per_page=10&sort=updated`

Retrieves user repositories with pagination and sorting.

**Parameters:**
- `per_page` - Number of repositories (default: 10, max: 100)
- `sort` - Sort order: `created`, `updated`, `pushed`, `full_name` (default: `updated`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "name": "repo-name",
      "full_name": "username/repo-name",
      "description": "Repository description",
      "private": false,
      "fork": false,
      "language": "JavaScript",
      "stargazers_count": 42,
      "open_issues_count": 5
    }
  ]
}
```

### Issue Tracking

**GET** `/mcp/github/repos/:owner/:repo/issues?state=open&per_page=100`

Fetches issues for a specific repository.

**Parameters:**
- `state` - Issue state: `open`, `closed`, `all` (default: `open`)
- `per_page` - Number of issues (default: 100)

### Comprehensive Analysis

**GET** `/mcp/github/analysis?per_page=10`

Provides a complete GitHub account analysis including:
- User profile summary
- Repository overview with issue counts
- Total statistics and metrics
- Generation timestamp

**Response:**
```json
{
  "success": true,
  "data": {
    "user": "username",
    "totalRepositories": 15,
    "totalIssues": 23,
    "repositories": [
      {
        "name": "repo-name",
        "issues": 5,
        "description": "Repository description",
        "owner": "username"
      }
    ],
    "generatedAt": "2025-08-16T09:00:00.000Z"
  }
}
```

### Health Check

**GET** `/health`

Returns server status and configuration information.

## Usage Examples

### Command Line Integration

```bash
# Initialize with token
curl -X POST http://localhost:3001/mcp/github/init \
  -H "Content-Type: application/json" \
  -d '{"token": "your_token"}'

# Get user information
curl http://localhost:3001/mcp/github/user

# Get repository analysis
curl "http://localhost:3001/mcp/github/analysis?per_page=5"

# Get issues for specific repo
curl "http://localhost:3001/mcp/github/repos/username/repo-name/issues"
```

### JavaScript Integration

```javascript
// Initialize the service
const initResponse = await fetch('http://localhost:3001/mcp/github/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'your_github_token' })
});

// Get comprehensive analysis
const analysisResponse = await fetch('http://localhost:3001/mcp/github/analysis');
const analysis = await analysisResponse.json();

console.log(`User: ${analysis.data.user}`);
console.log(`Total repositories: ${analysis.data.totalRepositories}`);
console.log(`Open issues: ${analysis.data.totalIssues}`);
```

### Using the HTTP Proxy

The HTTP proxy (port 3002) provides the same API endpoints with additional routing:

```bash
# All endpoints work through the proxy
curl http://localhost:3002/mcp/github/user
curl http://localhost:3002/mcp/github/analysis
```

## Project Structure

```
github-mcp/
├── mcp-github-server.js    # Main MCP server implementation
├── mcp-http-server.js      # HTTP proxy server
├── package.json            # Dependencies and scripts
├── config.json             # Configuration (gitignored)
├── config.example.json     # Configuration template
├── test-github-api.js      # API testing suite
├── start.sh               # Service launcher script
└── README.md              # This documentation
```

## Troubleshooting

### Common Issues

**"GitHub MCP not initialized"**
- Ensure `config.json` exists with valid token
- Verify token has required permissions (`repo`, `read:user`)
- Check server is running and accessible

**"GitHub API error: 403"**
- Validate token is correct and not expired
- Confirm token has sufficient permissions
- Check rate limiting status

**"Port already in use"**
```bash
# Kill processes on required ports
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

**"fetch is not a function"**
- Ensure Node.js version 18+ is installed
- The server uses built-in fetch, no external dependencies needed

### Debug Mode

Enable verbose logging by running servers directly:
```bash
node mcp-github-server.js
node mcp-http-server.js
```

## Development

### Adding New Endpoints

1. Add route handler in `mcp-github-server.js`
2. Update error handling and response format
3. Test with `test-github-api.js`
4. Update documentation

### Testing

```bash
# Run API tests
node test-github-api.js

# Test specific endpoints
curl http://localhost:3001/health
curl http://localhost:3001/mcp/github/user
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review GitHub API documentation
- Open an issue in the repository
