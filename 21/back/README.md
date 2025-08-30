# Chat Web Service Backend

Golang backend service for the chat web application.

## Setup

1. Install dependencies:
```bash
go mod tidy
```

2. Run the service:
```bash
go run main.go
```

The server will start on port 8080.

## Endpoints

- `GET /health` - Health check endpoint

## Development

The service includes CORS configuration to allow requests from the frontend running on localhost:3000.
