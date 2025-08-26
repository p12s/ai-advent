package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

type MCPServer struct {
	tools map[string]Tool
}

type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

type ToolCall struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

type ToolResult struct {
	Content []map[string]interface{} `json:"content"`
}

type TokenRequest struct {
	Text  string `json:"text"`
	Model string `json:"model"`
}

type TokenResponse struct {
	Success bool `json:"success"`
	Data    struct {
		TokenCount int    `json:"token_count"`
		Model      string `json:"model"`
		TextLength int    `json:"text_length"`
		FileName   string `json:"file_name"`
	} `json:"data"`
}

type HealthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}

func main() {
	server := &MCPServer{
		tools: map[string]Tool{
			"count_tokens": {
				Name:        "count_tokens",
				Description: "Count tokens in text for specified OpenAI model",
				InputSchema: map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"text": map[string]interface{}{
							"type":        "string",
							"description": "Text to count tokens in",
						},
						"model": map[string]interface{}{
							"type":        "string",
							"description": "OpenAI model name",
							"default":     "gpt-4",
						},
					},
					"required": []string{"text"},
				},
			},
			"get_health": {
				Name:        "get_health",
				Description: "Get service health status",
				InputSchema: map[string]interface{}{
					"type":       "object",
					"properties": map[string]interface{}{},
				},
			},
		},
	}

	server.run()
}

func (s *MCPServer) run() {
	log.Printf("DEBUG: Starting MCP server...")

	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	port := getPort()
	log.Printf("DEBUG: Using port: %d", port)

	r := mux.NewRouter()
	r.HandleFunc("/mcp/tiktoken/count-tokens", s.countTokensHandler).Methods("POST")
	r.HandleFunc("/mcp/tiktoken/health", s.healthHandler).Methods("GET")
	r.HandleFunc("/health", s.healthHandler).Methods("GET")

	log.Printf("DEBUG: Router configured with handlers")
	log.Printf("Tiktoken MCP server running on port %d", port)

	log.Printf("DEBUG: Starting HTTP server...")
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), r))
}

func (s *MCPServer) countTokensHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("DEBUG: countTokensHandler called with method: %s", r.Method)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		log.Printf("DEBUG: Handling OPTIONS request")
		w.WriteHeader(http.StatusOK)
		return
	}

	var text string
	var model string
	var fileName string

	contentType := r.Header.Get("Content-Type")
	log.Printf("DEBUG: Content-Type: %s", contentType)

	if contentType == "application/json" {
		log.Printf("DEBUG: Processing JSON request")
		var req TokenRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("DEBUG: JSON decode error: %v", err)
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		text = req.Text
		model = req.Model
		log.Printf("DEBUG: JSON request - text length: %d, model: %s", len(text), model)
	} else {
		log.Printf("DEBUG: Processing multipart form request")
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			log.Printf("DEBUG: ParseMultipartForm error: %v", err)
			http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			log.Printf("DEBUG: FormFile error: %v", err)
			http.Error(w, "File upload required", http.StatusBadRequest)
			return
		}
		defer file.Close()

		content, err := io.ReadAll(file)
		if err != nil {
			log.Printf("DEBUG: ReadAll error: %v", err)
			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}

		text = string(content)
		fileName = header.Filename
		model = r.FormValue("model")
		log.Printf("DEBUG: Multipart request - text length: %d, model: %s, filename: %s", len(text), model, fileName)
	}

	if text == "" {
		log.Printf("DEBUG: Empty text content")
		http.Error(w, "Text content is required", http.StatusBadRequest)
		return
	}

	if model == "" {
		model = "gpt-4"
		log.Printf("DEBUG: Using default model: %s", model)
	}

	tiktokenURL := os.Getenv("TIKTOKEN_URL")
	if tiktokenURL == "" {
		panic("TIKTOKEN_URL is not set")
	}
	log.Printf("DEBUG: Using TIKTOKEN_URL from env: %s", tiktokenURL)

	var resp *http.Response
	var err error

	if fileName != "" {
		log.Printf("DEBUG: Sending multipart form request to tiktoken service")
		resp, err = s.sendMultipartRequest(tiktokenURL, text, model, fileName)
	} else {
		log.Printf("DEBUG: Sending JSON request to tiktoken service")
		resp, err = s.sendJSONRequest(tiktokenURL, text, model)
	}

	if err != nil {
		log.Printf("DEBUG: Request to tiktoken service failed: %v", err)
		http.Error(w, "Failed to call tiktoken service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	log.Printf("DEBUG: HTTP response status: %d", resp.StatusCode)

	log.Printf("DEBUG: Reading response body")
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("DEBUG: Read response body error: %v", err)
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}
	log.Printf("DEBUG: Response body size: %d bytes", len(body))
	log.Printf("DEBUG: Response body: %s", string(body))

	if resp.StatusCode != http.StatusOK {
		log.Printf("DEBUG: Non-OK status code: %d, body: %s", resp.StatusCode, string(body))
		http.Error(w, string(body), resp.StatusCode)
		return
	}

	log.Printf("DEBUG: Unmarshaling response")
	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		log.Printf("DEBUG: JSON unmarshal error: %v", err)
		log.Printf("DEBUG: Response body that failed to parse: %s", string(body))
		http.Error(w, "Failed to parse response", http.StatusInternalServerError)
		return
	}
	log.Printf("DEBUG: Response unmarshaled successfully: %+v", tokenResp)

	response := map[string]interface{}{
		"success":     true,
		"token_count": tokenResp.Data.TokenCount,
		"model":       tokenResp.Data.Model,
		"text_length": tokenResp.Data.TextLength,
		"message":     fmt.Sprintf("Text contains %d tokens for model %s", tokenResp.Data.TokenCount, tokenResp.Data.Model),
	}

	if fileName != "" {
		response["file_name"] = fileName
	}

	log.Printf("DEBUG: Sending final response: %+v", response)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("DEBUG: JSON encode error: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	log.Printf("DEBUG: Response sent successfully")
}

func (s *MCPServer) sendJSONRequest(tiktokenURL, text, model string) (*http.Response, error) {
	tiktokenReq := TokenRequest{
		Text:  text,
		Model: model,
	}

	log.Printf("DEBUG: Marshaling request to JSON")
	jsonData, err := json.Marshal(tiktokenReq)
	if err != nil {
		log.Printf("DEBUG: JSON marshal error: %v", err)
		return nil, err
	}
	log.Printf("DEBUG: Request marshaled, size: %d bytes", len(jsonData))

	fullURL := tiktokenURL + "/count-tokens"
	log.Printf("DEBUG: Making HTTP POST request to: %s", fullURL)

	return http.Post(fullURL, "application/json", bytes.NewBuffer(jsonData))
}

func (s *MCPServer) sendMultipartRequest(tiktokenURL, text, model, fileName string) (*http.Response, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	fileWriter, err := writer.CreateFormFile("file", fileName)
	if err != nil {
		log.Printf("DEBUG: CreateFormFile error: %v", err)
		return nil, err
	}

	if _, err := fileWriter.Write([]byte(text)); err != nil {
		log.Printf("DEBUG: Write file content error: %v", err)
		return nil, err
	}

	if model != "" {
		if err := writer.WriteField("model", model); err != nil {
			log.Printf("DEBUG: WriteField model error: %v", err)
			return nil, err
		}
	}

	writer.Close()

	fullURL := tiktokenURL + "/count-tokens"
	log.Printf("DEBUG: Making multipart HTTP POST request to: %s", fullURL)

	req, err := http.NewRequest("POST", fullURL, &buf)
	if err != nil {
		log.Printf("DEBUG: NewRequest error: %v", err)
		return nil, err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	return client.Do(req)
}

func (s *MCPServer) healthHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("DEBUG: healthHandler called")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	response := HealthResponse{
		Status:  "ok",
		Service: "tiktoken-mcp-server",
		Version: "1.0.0",
	}

	log.Printf("DEBUG: Sending health response: %+v", response)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("DEBUG: JSON encode error in health handler: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	log.Printf("DEBUG: Health response sent successfully")
}

func getPort() int {
	log.Printf("DEBUG: getPort called")

	if portStr := os.Getenv("PORT"); portStr != "" {
		log.Printf("DEBUG: Found PORT environment variable: %s", portStr)
		if port, err := strconv.Atoi(portStr); err == nil && port > 0 {
			log.Printf("DEBUG: Using port: %d", port)
			return port
		} else {
			log.Printf("DEBUG: Failed to parse PORT: %s, error: %v", portStr, err)
		}
	} else {
		log.Printf("DEBUG: PORT environment variable not found")
	}

	log.Printf("DEBUG: Using default port: 3007")
	return 3007
}
