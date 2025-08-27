package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type BuildRequest struct {
	Message      string       `json:"message"`
	UserID       string       `json:"user_id,omitempty"`
	Requirements Requirements `json:"requirements,omitempty"`
}

type BuildResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	File    string `json:"file,omitempty"`
}

func BuildHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var buildReq BuildRequest
	if err := json.Unmarshal(body, &buildReq); err != nil {
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	builderClient := NewWebsiteBuilderClient()
	websiteHTML, err := builderClient.GenerateWebsite(buildReq.Message, buildReq.Requirements)

	var response BuildResponse
	if err != nil {
		response = BuildResponse{
			Status:  "error",
			Message: fmt.Sprintf("Ошибка генерации сайта: %v", err),
		}
	} else {
		resultDir := "result"
		if err := os.MkdirAll(resultDir, 0755); err != nil {
			response = BuildResponse{
				Status:  "error",
				Message: fmt.Sprintf("Ошибка создания папки result: %v", err),
			}
		} else {
			now := time.Now()
			filename := now.Format("2006-01-02_15-04-05") + ".html"
			filepath := filepath.Join(resultDir, filename)

			if err := os.WriteFile(filepath, []byte(websiteHTML), 0644); err != nil {
				response = BuildResponse{
					Status:  "error",
					Message: fmt.Sprintf("Ошибка сохранения файла: %v", err),
				}
			} else {
				response = BuildResponse{
					Status:  "success",
					Message: "Сайт успешно сгенерирован и сохранен",
					File:    filename,
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
