package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	"tiktoken-server/internal"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/pkoukk/tiktoken-go"
)

func loadEnv() error {
	if err := godotenv.Load(); err != nil {
		return err
	}
	return nil
}

func getModelEncoding(model string) (string, error) {
	modelEncodings := map[string]string{
		"gpt-4":             "cl100k_base",
		"gpt-3.5-turbo":     "cl100k_base",
		"gpt-4o":            "cl100k_base",
		"gpt-4o-mini":       "cl100k_base",
		"gpt-3.5-turbo-16k": "cl100k_base",
	}

	if encoding, exists := modelEncodings[model]; exists {
		return encoding, nil
	}
	return "cl100k_base", nil
}

func countTokens(text, model string) (int, error) {
	encoding, err := getModelEncoding(model)
	if err != nil {
		return 0, err
	}

	enc, err := tiktoken.GetEncoding(encoding)
	if err != nil {
		return 0, fmt.Errorf("failed to get encoding: %v", err)
	}

	tokens := enc.Encode(text, nil, nil)
	return len(tokens), nil
}

func countTokensHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var text string
	var model string
	var fileName string

	contentType := r.Header.Get("Content-Type")
	if contentType == "application/json" {
		var req internal.TokenRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		text = req.Text
		model = req.Model
	} else {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "File upload required", http.StatusBadRequest)
			return
		}
		defer file.Close()

		content, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "Failed to read file", http.StatusInternalServerError)
			return
		}

		text = string(content)
		fileName = header.Filename
		model = r.FormValue("model")
	}

	if text == "" {
		http.Error(w, "Text content is required", http.StatusBadRequest)
		return
	}

	if model == "" {
		model = "gpt-4"
	}

	tokenCount, err := countTokens(text, model)
	if err != nil {
		log.Printf("Error counting tokens: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := internal.TokenResponse{
		Success: true,
	}
	response.Data.TokenCount = tokenCount
	response.Data.Model = model
	response.Data.TextLength = len(text)
	if fileName != "" {
		response.Data.FileName = fileName
	}

	json.NewEncoder(w).Encode(response)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	response := internal.HealthResponse{
		Status:  "ok",
		Service: "tiktoken-server",
		Version: "1.0.0",
	}

	json.NewEncoder(w).Encode(response)
}

func getPort() int {
	if portStr := os.Getenv("PORT"); portStr != "" {
		if port, err := strconv.Atoi(portStr); err == nil && port > 0 {
			return port
		}
	}

	log.Fatal("PORT environment variable not set or invalid")
	return 0
}

func main() {
	if err := loadEnv(); err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	port := getPort()

	r := mux.NewRouter()
	r.HandleFunc("/count-tokens", countTokensHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/health", healthHandler).Methods("GET")

	log.Printf("Tiktoken MCP HTTP server running on port %d", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), r))
}
