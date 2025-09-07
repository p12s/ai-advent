package internal

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
)

func ClearHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Parse JSON request
	var clearReq ClearRequest
	if err := json.NewDecoder(r.Body).Decode(&clearReq); err != nil {
		log.Printf("Error parsing JSON: %v", err)
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// Log the incoming request
	log.Printf("=== Incoming /clear request ===")
	log.Printf("Raw HTML length: %d characters", len(clearReq.RawHTML))
	log.Printf("User ID: %s", clearReq.UserID)
	log.Printf("===============================")

	// Clean the HTML from markdown artifacts
	cleanHTML := cleanMarkdownArtifacts(clearReq.RawHTML)

	log.Printf("=== Cleaning Result ===")
	log.Printf("Original length: %d", len(clearReq.RawHTML))
	log.Printf("Cleaned length: %d", len(cleanHTML))
	log.Printf("======================")

	response := ClearResponse{
		Status:    "success",
		CleanHTML: cleanHTML,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// cleanMarkdownArtifacts removes markdown code block markers and leading/trailing artifacts from HTML
func cleanMarkdownArtifacts(rawHTML string) string {
	cleaned := strings.TrimSpace(rawHTML)

	// Удаляем любые открывающие маркеры блока ```
	openingCodeBlock := regexp.MustCompile("^```[a-zA-Z]*\\s*\n?")
	cleaned = openingCodeBlock.ReplaceAllString(cleaned, "")

	// Удаляем любые закрывающие маркеры блока ```
	closingCodeBlock := regexp.MustCompile("(?m)\\n?\\s*```\\s*$")
	cleaned = closingCodeBlock.ReplaceAllString(cleaned, "")

	// Если есть DOCTYPE или <html -- удаляем всё до них
	lower := strings.ToLower(cleaned)
	doctype := strings.Index(lower, "<!doctype")
	htmltag := strings.Index(lower, "<html")
	startIndex := -1
	if doctype != -1 {
		startIndex = doctype
	} else if htmltag != -1 {
		startIndex = htmltag
	}
	if startIndex > 0 {
		cleaned = cleaned[startIndex:]
	}

	// Обрезаем всё после закрывающего </html>
	endIndex := strings.LastIndex(strings.ToLower(cleaned), "</html>")
	if endIndex != -1 {
		cleaned = cleaned[:endIndex+7]
	}

	// Финальная очистка
	return strings.TrimSpace(cleaned)
}
