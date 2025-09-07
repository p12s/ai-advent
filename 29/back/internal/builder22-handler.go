package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

func Builder22Handler(w http.ResponseWriter, r *http.Request) {
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

	// Parse JSON request - use the same format as other endpoints
	var req struct {
		Message string `json:"message"`
		UserID  string `json:"user_id,omitempty"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		log.Printf("Error parsing JSON: %v", err)
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// Log the incoming request
	log.Printf("=== Incoming /builder22 request ===")
	log.Printf("Message: %s", req.Message)
	log.Printf("User ID: %s", req.UserID)
	log.Printf("===================================")

	// Create system prompt for HTML generation
	systemPrompt := `Ты - профессиональный веб-разработчик и верстальщик. Твоя задача - создать полноценную HTML-страницу на основе детального технического задания.

ВАЖНЫЕ ТРЕБОВАНИЯ:
1. Возвращай ТОЛЬКО чистый HTML код без комментариев, объяснений или дополнительного текста
2. HTML должен быть полным - с DOCTYPE, head, body и всеми необходимыми тегами
3. Включай встроенные CSS стили в <style> теге внутри <head>
4. Используй современные CSS практики (flexbox, grid, responsive design)
5. Добавляй реалистичный контент вместо placeholder'ов
6. Код должен быть валидным и семантичным
7. Включай мета-теги для SEO и viewport
8. Используй красивые цвета, шрифты и современный дизайн

НЕ ДОБАВЛЯЙ:
- Комментарии в коде
- Объяснения до или после HTML
- Markdown разметку
- Текст типа "Вот HTML код:" или подобное

НАЧИНАЙ ОТВЕТ СРАЗУ С <!DOCTYPE html> И ЗАКАНЧИВАЙ </html>`

	// Create LLM client and get response
	llmClient := NewLLMClient()
	llmResponse, err := llmClient.GetLLMResponse(req.Message, systemPrompt)

	var response Builder22Response
	if err != nil {
		log.Printf("Error getting LLM response: %v", err)
		response = Builder22Response{
			Status: "error",
			Error:  fmt.Sprintf("Ошибка генерации HTML: %v", err),
		}
	} else {
		// Clean the response to ensure it's pure HTML
		cleanHTML := cleanHTMLResponse(llmResponse)
		
		log.Printf("=== LLM Response ===")
		log.Printf("HTML length: %d characters", len(cleanHTML))
		log.Printf("===================")

		response = Builder22Response{
			Status: "success",
			HTML:   cleanHTML,
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// cleanHTMLResponse removes any non-HTML content from the response
func cleanHTMLResponse(response string) string {
	// Trim whitespace
	response = strings.TrimSpace(response)
	
	// Find the start of HTML (DOCTYPE or <html>)
	doctypeIndex := strings.Index(strings.ToLower(response), "<!doctype")
	htmlIndex := strings.Index(strings.ToLower(response), "<html")
	
	startIndex := -1
	if doctypeIndex != -1 {
		startIndex = doctypeIndex
	} else if htmlIndex != -1 {
		startIndex = htmlIndex
	}
	
	// Find the end of HTML
	endIndex := strings.LastIndex(strings.ToLower(response), "</html>")
	
	// Extract clean HTML
	if startIndex != -1 && endIndex != -1 {
		return response[startIndex:endIndex+7] // +7 for "</html>"
	}
	
	// If no proper HTML structure found, return as is
	return response
}
