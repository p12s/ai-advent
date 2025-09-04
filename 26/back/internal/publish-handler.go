package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
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

	var req PublishRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON payload"})
		return
	}

	if req.Filename == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "filename is required"})
		return
	}

	if req.UserID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "user_id is required"})
		return
	}

	// Read file from result directory
	filePath := filepath.Join("result", req.Filename)
	
	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("File %s not found in result directory", req.Filename)})
		return
	}

	// Read file content
	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to read file: %v", err)})
		return
	}

	// Prepare request for ycloud-mcp
	ycloudReq := YCloudDeployRequest{
		HTMLContent: string(fileContent),
		Filename:    req.Filename,
	}

	reqBody, err := json.Marshal(ycloudReq)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to marshal request: %v", err)})
		return
	}

	// Send request to ycloud-mcp server
	ycloudURL := "http://localhost:3004/api/deploy/html"
	resp, err := http.Post(ycloudURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to connect to ycloud-mcp service: %v", err)})
		return
	}
	defer resp.Body.Close()

	// Read response from ycloud-mcp
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to read ycloud response: %v", err)})
		return
	}

	var ycloudResp YCloudDeployResponse
	if err := json.Unmarshal(respBody, &ycloudResp); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Failed to parse ycloud response: %v", err)})
		return
	}

	// Check if deployment was successful
	if !ycloudResp.Success {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Ycloud deployment failed: %s", ycloudResp.Error)})
		return
	}

	// Return success response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":     true,
		"message":     fmt.Sprintf("File %s successfully deployed to Yandex Cloud", req.Filename),
		"filename":    req.Filename,
		"user_id":     req.UserID,
		"remote_path": ycloudResp.Data.RemotePath,
	})
}
