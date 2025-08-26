package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"

	_ "tiktoken-server/docs"
	"tiktoken-server/internal"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/pkoukk/tiktoken-go"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

// @Summary Count tokens in text
// @Description Counts the number of tokens in text for the specified OpenAI model
// @Tags tokens
// @Accept json,multipart/form-data
// @Produce json
// @Param request body internal.TokenRequest true "Token counting request (for JSON)"
// @Param file formData file false "File with text for analysis"
// @Param model formData string false "OpenAI model (default: gpt-4)"
// @Success 200 {object} internal.TokenResponse
// @Failure 400 {string} string "Bad Request"
// @Failure 500 {string} string "Internal Server Error"
// @Router /count-tokens [post]
func countTokensHandler(w http.ResponseWriter, r *http.Request) {
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

	if r.Method != "POST" {
		log.Printf("DEBUG: Invalid method: %s, expected POST", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var text string
	var model string
	var fileName string

	contentType := r.Header.Get("Content-Type")
	log.Printf("DEBUG: Content-Type: %s", contentType)

	if contentType == "application/json" {
		log.Printf("DEBUG: Processing JSON request")
		var req internal.TokenRequest
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

	log.Printf("DEBUG: Calling countTokens with model: %s", model)
	tokenCount, err := countTokens(text, model)
	if err != nil {
		log.Printf("DEBUG: countTokens error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("DEBUG: Token count successful: %d", tokenCount)

	response := internal.TokenResponse{
		Success: true,
	}
	response.Data.TokenCount = tokenCount
	response.Data.Model = model
	response.Data.TextLength = len(text)
	if fileName != "" {
		response.Data.FileName = fileName
	}

	log.Printf("DEBUG: Sending response: %+v", response)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("DEBUG: JSON encode error: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	log.Printf("DEBUG: Response sent successfully")
}

// @Summary Service health check
// @Description Returns service status information
// @Tags health
// @Produce json
// @Success 200 {object} internal.HealthResponse
// @Router /health [get]
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

// @Summary Swagger UI
// @Description API documentation in Swagger UI format
// @Tags docs
// @Router /swagger/* [get]
func swaggerHandler(w http.ResponseWriter, r *http.Request) {
	httpSwagger.Handler(httpSwagger.URL("/swagger/doc.json")).ServeHTTP(w, r)
}

// @Summary OpenAPI specification
// @Description OpenAPI specification in JSON format
// @Tags docs
// @Produce json
// @Success 200 {object} object
// @Router /swagger/doc.json [get]
func swaggerJSONHandler(w http.ResponseWriter, r *http.Request) {
	httpSwagger.Handler(httpSwagger.URL("/swagger/doc.json")).ServeHTTP(w, r)
}

func loadEnv() error {
	log.Printf("DEBUG: loadEnv called")

	if err := godotenv.Load(); err != nil {
		log.Printf("DEBUG: godotenv.Load error: %v", err)
		return err
	}

	log.Printf("DEBUG: Environment loaded successfully")
	return nil
}

func getModelEncoding(model string) (string, error) {
	log.Printf("DEBUG: getModelEncoding called with model: %s", model)

	modelEncodings := map[string]string{
		"gpt-4":             "cl100k_base",
		"gpt-3.5-turbo":     "cl100k_base",
		"gpt-4o":            "cl100k_base",
		"gpt-4o-mini":       "cl100k_base",
		"gpt-3.5-turbo-16k": "cl100k_base",
	}

	if encoding, exists := modelEncodings[model]; exists {
		log.Printf("DEBUG: Found encoding for model %s: %s", model, encoding)
		return encoding, nil
	}

	log.Printf("DEBUG: Model %s not found in mapping, using default cl100k_base", model)
	return "cl100k_base", nil
}

func setupHTTPClient() {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	http.DefaultClient = &http.Client{Transport: tr}
}

func countTokens(text, model string) (int, error) {
	log.Printf("DEBUG: countTokens called with text length: %d, model: %s", len(text), model)

	encoding, err := getModelEncoding(model)
	if err != nil {
		log.Printf("DEBUG: getModelEncoding error: %v", err)
		return 0, err
	}

	log.Printf("DEBUG: Got encoding: %s", encoding)

	enc, err := tiktoken.GetEncoding(encoding)
	if err != nil {
		log.Printf("DEBUG: tiktoken.GetEncoding error: %v", err)
		return 0, fmt.Errorf("failed to get encoding: %v", err)
	}

	log.Printf("DEBUG: Got tiktoken encoding successfully")

	tokens := enc.Encode(text, nil, nil)
	tokenCount := len(tokens)
	log.Printf("DEBUG: Encoded text into %d tokens", tokenCount)

	return tokenCount, nil
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

	log.Printf("DEBUG: Fatal error - PORT environment variable not set or invalid")
	log.Fatal("PORT environment variable not set or invalid")
	return 0
}

func main() {
	log.Printf("DEBUG: Starting tiktoken server...")

	if err := loadEnv(); err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	setupHTTPClient()
	log.Printf("DEBUG: HTTP client configured")

	port := getPort()
	log.Printf("DEBUG: Using port: %d", port)

	r := mux.NewRouter()
	r.HandleFunc("/count-tokens", countTokensHandler).Methods("POST", "OPTIONS")
	r.HandleFunc("/health", healthHandler).Methods("GET")

	r.PathPrefix("/swagger/").Handler(httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
		httpSwagger.DeepLinking(true),
		httpSwagger.DocExpansion("none"),
		httpSwagger.DomID("swagger-ui"),
	))

	log.Printf("DEBUG: Router configured with handlers")
	log.Printf("Tiktoken MCP HTTP server running on port %d", port)
	log.Printf("Swagger UI available at: http://localhost:%d/swagger/", port)

	log.Printf("DEBUG: Starting HTTP server...")
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), r))
}
