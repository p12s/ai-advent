#!/bin/bash

# Test Agent - Continuous Running Service Startup Script
# This script sets up and starts the test agent as a continuously running service

set -e

echo "🧪 Starting Test Agent - Continuous Running Service"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ to continue."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js $(node -v) detected"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker to continue."
    exit 1
fi

print_status "Docker is running"

# Check if config.json exists
if [ ! -f "config.json" ]; then
    print_warning "config.json not found, copying from config.example.json"
    cp config.example.json config.json
    print_info "Please edit config.json with your settings before running again"
fi

# Install dependencies
print_info "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Dependencies installed successfully"

# Create necessary directories
mkdir -p uploads
mkdir -p test-runs
mkdir -p web-results
mkdir -p logs

print_status "Created necessary directories"

# Check if Ollama is accessible (optional)
OLLAMA_URL=$(grep -o '"url": "[^"]*"' config.json | head -1 | cut -d'"' -f4)
if [ ! -z "$OLLAMA_URL" ]; then
    if curl -s "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
        print_status "Ollama is accessible at $OLLAMA_URL"
    else
        print_warning "Ollama is not accessible at $OLLAMA_URL"
        print_info "The service will still work but AI test generation may fail"
    fi
fi

# Function to cleanup on exit
cleanup() {
    print_info "Shutting down services..."
    if [ ! -z "$HTTP_PID" ]; then
        kill $HTTP_PID 2>/dev/null || true
    fi
    if [ ! -z "$MCP_PID" ]; then
        kill $MCP_PID 2>/dev/null || true
    fi
    print_status "Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start the services
print_info "Starting Test Agent services..."

# Start HTTP server
print_info "Starting HTTP server on port 3006..."
node mcp-http-server.js > logs/http-server.log 2>&1 &
HTTP_PID=$!

# Wait a moment for server to start
sleep 2

# Check if HTTP server is running
if ! curl -s http://localhost:3006/health >/dev/null 2>&1; then
    print_error "HTTP server failed to start"
    cat logs/http-server.log
    exit 1
fi

print_status "HTTP server started successfully"

# Display service information
echo ""
echo "🚀 Test Agent is now running!"
echo "================================"
echo ""
echo "📊 Service Status:"
echo "  • HTTP Server: http://localhost:3006"
echo "  • Web Interface: http://localhost:3006"
echo "  • Health Check: http://localhost:3006/health"
echo ""
echo "🔧 API Endpoints:"
echo "  • Test Code: POST /api/test-code"
echo "  • Test File: POST /api/test-file"
echo "  • Languages: GET /api/languages"
echo ""
echo "📁 Logs:"
echo "  • HTTP Server: logs/http-server.log"
echo ""
echo "🛑 To stop the service, press Ctrl+C"
echo ""

# Open browser (optional)
if command -v open &> /dev/null; then
    print_info "Opening web interface in browser..."
    open http://localhost:3006
elif command -v xdg-open &> /dev/null; then
    print_info "Opening web interface in browser..."
    xdg-open http://localhost:3006
fi

# Keep the script running and monitor the services
while true; do
    # Check if HTTP server is still running
    if ! kill -0 $HTTP_PID 2>/dev/null; then
        print_error "HTTP server stopped unexpectedly"
        cat logs/http-server.log
        exit 1
    fi
    
    sleep 5
done
