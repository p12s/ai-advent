#!/bin/bash

# Test Agent - Start Both MCP and HTTP Servers
# This script starts both the MCP server and HTTP server

set -e

echo "🧪 Starting Test Agent - Both MCP and HTTP Servers"
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

# Start MCP server first
print_info "Starting MCP server on port 3005..."
node mcp-test-server.js > logs/mcp-server.log 2>&1 &
MCP_PID=$!

# Wait a moment for MCP server to start
sleep 3

# Check if MCP server is running
if ! kill -0 $MCP_PID 2>/dev/null; then
    print_error "MCP server failed to start"
    cat logs/mcp-server.log
    exit 1
fi

print_status "MCP server started successfully"

# Start HTTP server
print_info "Starting HTTP server on port 3006..."
node mcp-http-server.js > logs/http-server.log 2>&1 &
HTTP_PID=$!

# Wait a moment for HTTP server to start
sleep 3

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
echo "  • MCP Server: http://localhost:3005"
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
echo "  • MCP Server: logs/mcp-server.log"
echo "  • HTTP Server: logs/http-server.log"
echo ""
echo "🛑 To stop the service, press Ctrl+C"
echo ""

# Keep the script running and monitor the services
while true; do
    # Check if MCP server is still running
    if ! kill -0 $MCP_PID 2>/dev/null; then
        print_error "MCP server stopped unexpectedly"
        cat logs/mcp-server.log
        exit 1
    fi
    
    # Check if HTTP server is still running
    if ! kill -0 $HTTP_PID 2>/dev/null; then
        print_error "HTTP server stopped unexpectedly"
        cat logs/http-server.log
        exit 1
    fi
    
    sleep 5
done
