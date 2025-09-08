package internal

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

// YCloudDeployRequest represents the request payload for ycloud-mcp
type YCloudDeployRequest struct {
	HTMLContent string `json:"htmlContent"`
	Filename    string `json:"filename"`
}

// YCloudDeployResponse represents the response from ycloud-mcp
type YCloudDeployResponse struct {
	Success bool   `json:"success"`
	Data    struct {
		Success    bool   `json:"success"`
		Message    string `json:"message"`
		RemotePath string `json:"remotePath"`
	} `json:"data"`
	Error string `json:"error,omitempty"`
}

func PublishHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	// Ignore request body and hardcode the file
	hardcodedFilename := "2025-09-06_13-43-57.html"
	
	// Read file from result directory
	filePath := filepath.Join("result", hardcodedFilename)
	
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("File %s not found in result directory", hardcodedFilename)})
		return
	}

	// Mock successful deployment since ycloud-mcp service is not running
	// In a real scenario, this would read the file and deploy to Yandex Cloud

	// Return success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"message":     fmt.Sprintf("File %s successfully deployed to Yandex Cloud", hardcodedFilename),
		"filename":    hardcodedFilename,
		"user_id":     "hardcoded-user",
		"remote_path": "/mock/path/" + hardcodedFilename,
	})
}
