package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

func IdeaHandler(w http.ResponseWriter, r *http.Request) {
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
	log.Printf("=== Incoming /idea request ===")
	log.Printf("Message: %s", req.Message)
	log.Printf("User ID: %s", req.UserID)
	log.Printf("==============================")

	// Create system prompt for idea expansion
	systemPrompt := `Ты - эксперт по веб-разработке и UX/UI дизайну. Твоя задача - взять базовую идею типа сайта и расширить её до детального технического задания.

Когда пользователь говорит тип сайта (например "лендинг", "интернет-магазин", "блог"), ты должен:

1. Определить целевую аудиторию
2. Предложить ключевые функции и разделы
3. Описать структуру страниц
4. Предложить цветовую схему и стиль
5. Указать технические особенности
6. Добавить конкретные элементы контента

Отвечай на русском языке. Создай подробное техническое задание, которое можно будет использовать для создания сайта.

Формат ответа:
ТЕХНИЧЕСКОЕ ЗАДАНИЕ: [Тип сайта]

ЦЕЛЕВАЯ АУДИТОРИЯ: [описание]

СТРУКТУРА САЙТА:
- [список разделов и страниц]

КЛЮЧЕВЫЕ ФУНКЦИИ:
- [список функций]

ДИЗАЙН И СТИЛЬ:
- Цветовая схема: [цвета]
- Стиль: [описание стиля]
- Типографика: [шрифты и размеры]

КОНТЕНТ:
- [конкретные примеры текстов и изображений]

ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
- [особенности реализации]`

	// Create LLM client and get response
	llmClient := NewLLMClient()
	llmResponse, err := llmClient.GetLLMResponse(req.Message, systemPrompt)

	var response IdeaResponse
	if err != nil {
		log.Printf("Error getting LLM response: %v", err)
		response = IdeaResponse{
			Status: "error",
			Error:  fmt.Sprintf("Ошибка обработки запроса: %v", err),
		}
	} else {
		log.Printf("=== LLM Response ===")
		log.Printf("Response: %s", llmResponse)
		log.Printf("===================")

		response = IdeaResponse{
			Status:         "success",
			ExpandedPrompt: llmResponse,
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
