package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
)

// extractHTMLFromResponse извлекает HTML код из тегов ```html
func extractHTMLFromResponse(response string) string {
	// Регулярное выражение для поиска содержимого между ```html и ```
	re := regexp.MustCompile(`(?s)` + "`" + `{3}html\s*\n?(.*?)\n?` + "`" + `{3}`)
	matches := re.FindStringSubmatch(response)

	if len(matches) > 1 {
		// Возвращаем содержимое без обрамляющих тегов
		return strings.TrimSpace(matches[1])
	}

	// Если тегов ```html нет, возвращаем как есть
	return response
}

func (c *WebsiteBuilderClient) ProcessWebsiteRequestHF(userInput string, requirements Requirements) (*WebsiteRequest, error) {
	if userInput == "" {
		return nil, fmt.Errorf("user input cannot be empty")
	}

	systemPrompt := `ты - web-разработчик. выдели из запроса пользователя требования к веб-сайту, остальное игнорируй.
нужно сделать красивый сайт-одностраничник.
в ответе верни только html+css все в 1 файле.
в верстке не используй картинки, обозначай блоки цветами.
ВАЖНО: возвращай валидный html готовый к запуску в браузере. никаких твоих лишних пояснений и прочего быть не должно, обрамляющие теги html с косой чертой тоже не используй`

	request := &WebsiteRequest{
		Message:      userInput,
		System:       systemPrompt,
		Requirements: requirements,
	}

	return request, nil
}

func (c *WebsiteBuilderClient2) SendToLLM(websiteReq *WebsiteRequest) (*LLMResponse, error) {
	temperatureStr := os.Getenv("BUILDER_LLM_TEMPERATURE")
	if temperatureStr == "" {
		panic("BUILDER_LLM_TEMPERATURE is not set")
	}
	temperature, err := strconv.ParseFloat(temperatureStr, 64)
	if err != nil {
		panic("BUILDER_LLM_TEMPERATURE is not a valid float")
	}

	maxTokensStr := os.Getenv("BUILDER_LLM_MAX_TOKENS")
	if maxTokensStr == "" {
		panic("BUILDER_LLM_MAX_TOKENS is not set")
	}
	maxTokens, err := strconv.Atoi(maxTokensStr)
	if err != nil {
		panic("BUILDER_LLM_MAX_TOKENS is not a valid integer")
	}

	streamStr := os.Getenv("BUILDER_LLM_STREAM")
	if streamStr == "" {
		panic("BUILDER_LLM_STREAM is not set")
	}
	stream, err := strconv.ParseBool(streamStr)
	if err != nil {
		panic("BUILDER_LLM_STREAM is not a valid boolean")
	}

	llmReq := LLMRequest{
		Model:       c.Model,
		System:      websiteReq.System,
		Prompt:      websiteReq.Message,
		Temperature: temperature,
		MaxTokens:   maxTokens,
		Stream:      stream,
	}

	jsonData, err := json.Marshal(llmReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/api/generate", c.BaseURL)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to LLM: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LLM API returned status %d: %s", resp.StatusCode, string(body))
	}

	var llmResp LLMResponse
	if err := json.Unmarshal(body, &llmResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if llmResp.Error != "" {
		return nil, fmt.Errorf("LLM API error: %s", llmResp.Error)
	}

	return &llmResp, nil
}

func (c *WebsiteBuilderClient) GenerateWebsiteV2(userInput string, requirements Requirements) (string, error) {
	websiteReq, err := c.ProcessWebsiteRequestHF(userInput, requirements)
	if err != nil {
		return "", fmt.Errorf("failed to process website request: %w", err)
	}

	llmResp, err := c.SendToLLM(websiteReq)
	if err != nil {
		return "", fmt.Errorf("failed to get LLM response: %w", err)
	}

	if llmResp.Response == "" {
		return "", fmt.Errorf("received empty response from LLM")
	}

	// Извлекаем HTML из ответа перед отправкой на frontend
	processedResponse := extractHTMLFromResponse(llmResp.Response)
	return processedResponse, nil
}

// SendToHuggingFace отправляет запрос к Hugging Face Chat Completions API
func (c *WebsiteBuilderClient) SendToHuggingFace(websiteReq *WebsiteRequest) (*LLMResponse, error) {
	// Hugging Face API токен, получить на https://huggingface.co/settings/tokens
	// Пример: "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
	apiKey := os.Getenv("HUGGINGFACE_API_KEY")
	if apiKey == "" {
		panic("HUGGINGFACE_API_KEY is not set")
	}

	// Получаем URL из конфига или используем дефолтный
	hfURL := os.Getenv("HUGGINGFACE_CHAT_URL")
	if hfURL == "" {
		panic("HUGGINGFACE_CHAT_URL is not set")
	}

	// Combine system prompt and user message for the chat format
	userContent := websiteReq.System + "\n\nЗапрос пользователя: " + websiteReq.Message

	hfReq := HuggingFaceChatRequest{
		Model: "ibm-granite/granite-3.3-8b-instruct",
		Messages: []HuggingFaceChatMessage{
			{
				Role:    "user",
				Content: userContent,
			},
		},
		Stream: false,
	}

	jsonData, err := json.Marshal(hfReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	fmt.Printf("Making request to URL: %s\n", hfURL)

	req, err := http.NewRequest("POST", hfURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to HuggingFace: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	fmt.Printf("HuggingFace API response status: %d\n", resp.StatusCode)
	fmt.Printf("HuggingFace API response body: %s\n", string(body))

	if resp.StatusCode != http.StatusOK {
		// Добавляем более детальную информацию об ошибке
		if resp.StatusCode == 404 {
			return nil, fmt.Errorf("endpoint not found. Check the URL")
		}
		if resp.StatusCode == 401 {
			return nil, fmt.Errorf("неверный API ключ HuggingFace. Проверьте HUGGINGFACE_API_KEY")
		}
		if resp.StatusCode == 503 {
			return nil, fmt.Errorf("service unavailable. Try again later")
		}
		return nil, fmt.Errorf("HuggingFace API returned status %d: %s", resp.StatusCode, string(body))
	}

	var hfResp HuggingFaceChatResponse
	if err := json.Unmarshal(body, &hfResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(hfResp.Choices) == 0 {
		return nil, fmt.Errorf("received empty choices from HuggingFace")
	}

	// Extract the content from the assistant's message
	generatedText := hfResp.Choices[0].Message.Content

	llmResp := &LLMResponse{
		Response: generatedText,
		Done:     true,
		Error:    "",
	}

	return llmResp, nil
}

// GenerateWebsiteHF генерирует веб-сайт используя Hugging Face API
func (c *WebsiteBuilderClient) GenerateWebsiteHF(userInput string, requirements Requirements) (string, error) {
	websiteReq, err := c.ProcessWebsiteRequestHF(userInput, requirements)
	if err != nil {
		return "", fmt.Errorf("failed to process website request: %w", err)
	}

	llmResp, err := c.SendToHuggingFace(websiteReq)
	if err != nil {
		return "", fmt.Errorf("failed to get HuggingFace response: %w", err)
	}

	if llmResp.Response == "" {
		return "", fmt.Errorf("received empty response from HuggingFace")
	}

	// Извлекаем HTML из ответа перед отправкой на frontend
	processedResponse := extractHTMLFromResponse(llmResp.Response)
	return processedResponse, nil
}
