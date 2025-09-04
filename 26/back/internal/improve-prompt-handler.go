package internal

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
)

type ImprovePromptRequest struct {
	Prompt string `json:"prompt"`
}

type ImprovePromptResponse struct {
	Prompt string `json:"prompt"`
}

type OllamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	System string `json:"system"`
	Stream bool   `json:"stream"`
}

type OllamaResponse struct {
	Model     string `json:"model"`
	CreatedAt string `json:"created_at"`
	Response  string `json:"response"`
	Done      bool   `json:"done"`
}

func ImprovePromptHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var improvePromptReq ImprovePromptRequest
	if err := json.Unmarshal(body, &improvePromptReq); err != nil {
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	ollamaReq := OllamaRequest{
		Model:  "gemma3:12b",
		Prompt: improvePromptReq.Prompt,
		System: "You are a prompt improvement assistant. Take the user's image generation prompt and improve it for better image generation results. Return ONLY the improved prompt in English, without any explanations, thinking, quotes, or additional text. Do not use <think> tags or any other formatting.",
		Stream: false,
	}

	ollamaReqJSON, err := json.Marshal(ollamaReq)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	ollamaURL := "http://localhost:11434/api/generate"
	resp, err := http.Post(ollamaURL, "application/json", bytes.NewBuffer(ollamaReqJSON))
	if err != nil {
		http.Error(w, "Failed to improve prompt", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read Ollama response", http.StatusInternalServerError)
		return
	}

	var ollamaResp OllamaResponse
	if err := json.Unmarshal(respBody, &ollamaResp); err != nil {
		log.Printf("Error parsing Ollama response: %v, body: %s", err, string(respBody))
		http.Error(w, "Invalid Ollama response format", http.StatusInternalServerError)
		return
	}

	log.Printf("Ollama response: %+v", ollamaResp)

	response := ImprovePromptResponse{
		Prompt: ollamaResp.Response,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
