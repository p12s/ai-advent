# AI Test Agent - Automated Code Testing with AI

🧪 **AI Test Agent** - an intelligent system for automated generation and execution of code tests using artificial intelligence.

## 🚀 Features

- **🤖 AI Test Generation** - automatic creation of unit tests using Ollama
- **🐳 Docker Isolation** - test execution in isolated containers
- **📊 Detailed Reporting** - beautiful HTML reports with test results
- **🔗 MCP Integration** - full integration with existing MCP services
- **🌐 Web Interface** - convenient interface for uploading and testing code

## 📋 Supported Languages

- **JavaScript/TypeScript** - Jest
- **Python** - pytest
- **Java** - JUnit
- **Go** - testing
- **Ruby** - RSpec
- **PHP** - PHPUnit
- **C#** - NUnit
- **Rust** - cargo test

## 🏗️ Architecture

```
12/
├── web-app/                    # Web application
│   ├── app.js                 # Main application file
│   ├── test-agent.js          # Module for working with test-agent-mcp
│   ├── test-agent-module.js   # UI module for testing
│   ├── example-test.js        # Example file for testing
│   └── index.html             # Main page
├── test-agent-mcp/            # MCP server for testing
│   ├── mcp-test-server.js     # Main MCP server
│   ├── mcp-http-server.js     # HTTP API server
│   └── config.json           # Configuration
└── README.md                 # Documentation
```

## 🚀 Quick Start

### 1. Start test-agent-mcp server

```bash
# Navigate to test-agent-mcp directory
cd test-agent-mcp

# Install dependencies
npm install

# Configure settings
cp config.example.json config.json

# Start server
./start.sh
```

### 2. Start web application

```bash
# Return to root directory
cd ..

# Start HTTP server
npx http-server -p 8080 --cors
```

### 3. Open application

Navigate to: `http://localhost:8080`

## 🧪 Usage

### Automated Testing

1. **Open the application** in your browser
2. **Click the "🧪 Test Code" button** in the control panel
3. **Choose testing method:**

#### 📁 File Upload
- Click "📁 Select file for testing"
- Choose a code file (supports .js, .ts, .py, .java, .go, .rb, .php, .cs, .rs)
- System will automatically detect the programming language

#### 📝 Manual Code Input
- Select programming language
- Enter file name
- Paste code in the text field

4. **Click "🚀 Run Tests"**

### Testing Process

1. **📄 Code Analysis** - programming language detection
2. **🤖 Test Generation** - test creation using AI (Ollama)
3. **🐳 Container Creation** - test environment preparation
4. **🚀 Test Execution** - test execution in isolated environment
5. **📊 Result Analysis** - parsing and analyzing results
6. **📄 Report Generation** - HTML report creation
7. **🌐 Deployment** - report publication in Docker container

### Test Results

After testing completion, you will receive:

- **📊 Test Statistics** - total count, passed, failed
- **📈 Success Rate** - ratio of passed to total tests
- **📄 HTML Report** - detailed report with source code, generated tests and results
- **🔗 Report Link** - automatically opens in new tab

## ⚙️ Configuration

### config.json (test-agent-mcp)

```json
{
  "ollama": {
    "url": "http://localhost:11434",
    "model": "phi4:14b"
  },
  "docker": {
    "url": "http://docker-mcp:3004",
    "socketPath": "/var/run/docker.sock"
  },
  "testSettings": {
    "timeout": 300,
    "memoryLimit": "512m",
    "supportedLanguages": ["javascript", "python", "java", "go"],
    "testImages": {
      "javascript": "node:18-alpine",
      "python": "python:3.11-alpine",
      "java": "openjdk:17-alpine",
      "go": "golang:1.21-alpine"
    }
  },
  "server": {
    "port": 3005,
    "httpPort": 3006
  }
}
```

## 📊 Usage Examples

### Testing JavaScript Code

```javascript
function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}
```

**Result:** System will automatically create tests using Jest and verify functionality.

### Testing Python Code

```python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

**Result:** System will create tests using pytest and verify algorithm correctness.

## 🔧 Requirements

### System Requirements
- **Docker** - for test isolation
- **Node.js** - for server execution
- **Ollama** - for AI-powered test generation

### Dependencies
- **test-agent-mcp** - MCP server for testing
- **docker-mcp** - for HTML report deployment
- **http-server** - for web application execution

## 🚨 Troubleshooting

### Docker Not Available
```bash
# Check Docker status
sudo systemctl status docker

# Ensure Docker socket is accessible
ls -la /var/run/docker.sock
```

### Ollama Not Responding
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

### Test Agent MCP Not Initialized
```bash
# Check server status
curl http://localhost:3005/health

# Restart server
cd test-agent-mcp
./start.sh
```

## 📈 Monitoring

### Server Logs
```bash
# View MCP server logs
tail -f test-agent-mcp/logs/mcp-server.log

# View HTTP server logs
tail -f test-agent-mcp/logs/http-server.log
```

### Metrics
- Number of executed tests
- Test execution time
- Test success rate
- Resource usage

## 🎯 Result

The system provides:

✅ **Automated test generation** using AI  
✅ **Isolated execution** in Docker containers  
✅ **Detailed reporting** with HTML reports  
✅ **Simple web interface** for code upload and testing  
✅ **Support for multiple programming languages**  
✅ **Integration with MCP ecosystem**  

---

**🧪 AI Test Agent** - automate code testing with artificial intelligence!
