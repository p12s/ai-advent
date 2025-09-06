package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"chat-web-service-backend/repo"
)

type LatestResponse struct {
	Status   string `json:"status"`
	Message  string `json:"message"`
	File     string `json:"file,omitempty"`
	FilePath string `json:"file_path,omitempty"`
}

// LatestHandler returns the latest generated file from the repository
func LatestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Initialize repository
	repository, err := repo.NewRepository()
	if err != nil {
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}
	defer repository.Close()

	ctx := context.Background()

	// Get all chats to find the latest project
	chats, err := repository.GetChats(ctx, 100, 0) // Get up to 100 recent chats
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get chats: %v", err), http.StatusInternalServerError)
		return
	}

	var latestProject *repo.Project
	var latestChat *repo.Chat

	// Find the latest project across all chats
	for _, chat := range chats {
		projects, err := repository.GetProjectsByChat(ctx, chat.ID)
		if err != nil {
			continue // Skip this chat if error
		}

		for _, project := range projects {
			if latestProject == nil || project.CreatedAt.After(latestProject.CreatedAt) {
				latestProject = project
				latestChat = chat
			}
		}
	}

	var response LatestResponse

	if latestProject == nil {
		// No projects found - return empty string
		response = LatestResponse{
			Status:  "success",
			Message: "No generated files found",
			File:    "",
		}
	} else {
		// Return the latest project info
		response = LatestResponse{
			Status:   "success",
			Message:  fmt.Sprintf("Latest generated file from chat: %s", latestChat.Title),
			File:     latestProject.Name,
			FilePath: latestProject.FilePath,
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}