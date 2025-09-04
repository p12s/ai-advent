package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

func NewWebsiteBuilderClient() *WebsiteBuilderClient {
	baseURL := os.Getenv("BUILDER_LLM_URL")
	if baseURL == "" {
		panic("BUILDER_LLM_URL is not set")
	}

	model := os.Getenv("BUILDER_LLM_MODEL")
	if model == "" {
		panic("BUILDER_LLM_MODEL is not set")
	}

	timeoutStr := os.Getenv("BUILDER_LLM_TIMEOUT")
	if timeoutStr == "" {
		panic("BUILDER_LLM_TIMEOUT is not set")
	}
	var timeout int
	if timeoutStr != "" {
		if t, err := strconv.Atoi(timeoutStr); err == nil && t > 0 {
			timeout = t
		}
	}

	return &WebsiteBuilderClient{
		BaseURL: baseURL,
		Model:   model,
		Client: &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		},
	}
}

func (c *WebsiteBuilderClient) ProcessWebsiteRequest(userInput string, requirements Requirements) (*WebsiteRequest, error) {
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

func (c *WebsiteBuilderClient) SendToLLM(websiteReq *WebsiteRequest) (*LLMResponse, error) {
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

func (c *WebsiteBuilderClient) GenerateWebsite(userInput string, requirements Requirements) (string, error) {
	// Step 1: Thought - Analyze the user request and plan the approach
	thoughtReq := &WebsiteRequest{
		Message: userInput,
		System: "Ты — аналитик веб-разработки. Твоя задача — проанализировать запрос пользователя и создать план разработки сайта.\n\n" +
			"Проанализируй запрос и опиши:\n" +
			"1. Какой тип сайта нужен (лендинг, портфолио, блог и т.д.)\n" +
			"2. Ключевые элементы и разделы\n" +
			"3. Цветовую схему и стиль\n" +
			"4. Структуру страницы\n" +
			"5. Особые требования\n\n" +
			"Ответь в формате плана разработки, но НЕ создавай HTML код.",
		Requirements: requirements,
	}

	thoughtResp, err := c.SendToLLM(thoughtReq)
	if err != nil {
		return "", fmt.Errorf("failed to analyze request: %w", err)
	}

	if thoughtResp.Response == "" {
		return "", fmt.Errorf("received empty analysis response")
	}

	// Step 2: Generate website based on the analysis
	websiteReq := &WebsiteRequest{
		Message: fmt.Sprintf("Исходный запрос пользователя: %s\n\nАнализ и план разработки:\n%s\n\nТеперь создай HTML-код сайта согласно этому плану.", userInput, thoughtResp.Response),
		System: "Ты — web-разработчик. На основе анализа и плана создай красивый сайт-одностраничник.\n\n" +
			"Требования:\n" +
			"- Возвращай только валидный HTML+CSS в одном файле\n" +
			"- Не используй картинки, обозначай блоки цветами\n" +
			"- Создай современный, адаптивный дизайн\n" +
			"- Следуй плану разработки\n" +
			"- Никаких пояснений, только готовый к запуску HTML",
		Requirements: requirements,
	}

	llmResp, err := c.SendToLLM(websiteReq)
	if err != nil {
		return "", fmt.Errorf("failed to generate website: %w", err)
	}

	if llmResp.Response == "" {
		return "", fmt.Errorf("received empty website response")
	}

	// Step 3: Verification - Check and improve the generated HTML
	verificationReq := &WebsiteRequest{
		Message: fmt.Sprintf("Исходный план:\n%s\n\nСгенерированный HTML:\n%s\n\nПроверь соответствие плану и улучши код.", thoughtResp.Response, llmResp.Response),
		System: "Ты — контролёр качества HTML-кода. Проверь соответствие кода плану и улучши его.\n\n" +
			"Проверь:\n" +
			"1. Соответствие исходному плану\n" +
			"2. Валидность HTML\n" +
			"3. Качество CSS стилей\n" +
			"4. Адаптивность дизайна\n" +
			"5. Семантическую корректность\n\n" +
			"Правила ответа:\n" +
			"- Возвращай только исправленный валидный HTML-код\n" +
			"- Никаких markdown-блоков, пояснений или комментариев\n" +
			"- Ответ начинается с <!DOCTYPE html> и заканчивается </html>\n" +
			"- Один HTML-документ готовый к запуску",
		Requirements: requirements,
	}

	finalResp, err := c.SendToLLM(verificationReq)
	if err != nil {
		return "", fmt.Errorf("failed to verify HTML: %w", err)
	}

	if finalResp.Response == "" {
		return "", fmt.Errorf("received empty verification response")
	}

	// Clean up markdown code blocks from the response
	cleanedHTML := strings.TrimSpace(finalResp.Response)
	cleanedHTML = strings.TrimPrefix(cleanedHTML, "```html")
	cleanedHTML = strings.TrimPrefix(cleanedHTML, "```")
	cleanedHTML = strings.TrimSuffix(cleanedHTML, "```")
	cleanedHTML = strings.TrimSpace(cleanedHTML)

	return cleanedHTML, nil
}
