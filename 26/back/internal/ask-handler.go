package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

type AskRequest struct {
	Message string `json:"message"`
	UserID  string `json:"user_id,omitempty"`
}

type AskResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

type RequirementsResponse struct {
	Status       string       `json:"status"`
	Requirements Requirements `json:"requirements"`
	IsComplete   bool         `json:"is_complete"`
	History      []Message    `json:"history"`
}

func AskHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Parse JSON request
	var askReq AskRequest
	if err := json.Unmarshal(body, &askReq); err != nil {
		log.Printf("Error parsing JSON: %v", err)
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// Log the incoming request to console
	log.Printf("=== Incoming /ask request ===")
	log.Printf("Message: %s", askReq.Message)
	log.Printf("User ID: %s", askReq.UserID)
	log.Printf("Raw body: %s", string(body))
	log.Printf("=============================")

	// Get or create session for the user
	session := GetOrCreateSession(askReq.UserID)

	// Add user message to session history
	AddMessageToSession(session, "user", askReq.Message)

	// Get dialog history as string
	history := GetHistoryAsString(session)

	// Create LLM client and get response using requirements gathering prompt
	llmClient := NewLLMClient()
	systemPrompt := GetRequirementsGatheringPrompt(history, session.Requirements)
	llmResponse, err := llmClient.GetLLMResponse(askReq.Message, systemPrompt)

	var response AskResponse
	if err != nil {
		log.Printf("Error getting LLM response: %v", err)
		response = AskResponse{
			Status:  "error",
			Message: fmt.Sprintf("Ошибка обработки запроса: %v", err),
		}
	} else {
		log.Printf("=== LLM Response ===")
		log.Printf("Response: %s", llmResponse)
		log.Printf("===================")

		// Add assistant response to session history
		AddMessageToSession(session, "assistant", llmResponse)

		// Update requirements based on the conversation
		UpdateRequirementsFromResponse(session, askReq.Message, llmResponse)

		// Log current requirements state
		log.Printf("=== Current Requirements ===")
		log.Printf("Site Type: %s", session.Requirements.SiteType)
		log.Printf("Target Audience: %s", session.Requirements.TargetAudience)
		log.Printf("Note: %s", session.Requirements.Note)
		log.Printf("Current Question: %s", session.CurrentQuestion)
		log.Printf("Is Complete: %t", session.IsComplete)
		log.Printf("============================")

		response = AskResponse{
			Status:  "success",
			Message: llmResponse,
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func RequirementsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		userID = "default"
	}

	session := GetOrCreateSession(userID)

	response := RequirementsResponse{
		Status:       "success",
		Requirements: session.Requirements,
		IsComplete:   session.IsComplete,
		History:      session.History,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
