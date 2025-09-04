package internal

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
)

type GenerateImageRequest struct {
	Prompt string `json:"prompt"`
}

type GenerateImageResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

type ExternalGenerateRequest struct {
	Prompt      string `json:"prompt"`
	WidthRatio  int    `json:"width_ratio"`
	HeightRatio int    `json:"height_ratio"`
	Seed        int    `json:"seed"`
}

type ExternalGenerateResponse struct {
	Image      string `json:"image"`
	Parameters struct {
		HeightRatio int `json:"height_ratio"`
		Seed        int `json:"seed"`
		WidthRatio  int `json:"width_ratio"`
	} `json:"parameters"`
	Prompt string `json:"prompt"`
}

func GenerateImageHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var genImageReq GenerateImageRequest
	if err := json.Unmarshal(body, &genImageReq); err != nil {
		log.Printf("Error parsing JSON: %v", err)
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	log.Printf("=== Incoming /generate-image request ===")
	log.Printf("Prompt: %s", genImageReq.Prompt)
	log.Printf("Raw body: %s", string(body))
	log.Printf("=======================================")

	externalReq := ExternalGenerateRequest{
		Prompt:      genImageReq.Prompt,
		WidthRatio:  1,
		HeightRatio: 2,
		Seed:        50,
	}

	externalReqJSON, err := json.Marshal(externalReq)
	if err != nil {
		log.Printf("Error marshaling external request: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	externalURL := "https://fb9dd1a4-530d-48d5-b50a-e2150fa1d1fc-00-w02de76grpam.kirk.replit.dev/generate"
	resp, err := http.Post(externalURL, "application/json", bytes.NewBuffer(externalReqJSON))
	if err != nil {
		log.Printf("Error making external request: %v", err)
		http.Error(w, "Failed to generate image", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading external response: %v", err)
		http.Error(w, "Failed to read external response", http.StatusInternalServerError)
		return
	}

	var externalResp ExternalGenerateResponse
	if err := json.Unmarshal(respBody, &externalResp); err != nil {
		log.Printf("Error parsing external response: %v", err)
		http.Error(w, "Invalid external response format", http.StatusInternalServerError)
		return
	}

	log.Printf("=== External API Response ===")
	log.Printf("Image length: %d", len(externalResp.Image))
	log.Printf("Parameters: %+v", externalResp.Parameters)
	log.Printf("Prompt: %s", externalResp.Prompt)
	log.Printf("=============================")

	w.WriteHeader(http.StatusOK)
	w.Write(respBody)
}
