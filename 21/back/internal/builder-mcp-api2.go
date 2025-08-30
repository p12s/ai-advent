package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
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
	websiteReq, err := c.ProcessWebsiteRequest(userInput, requirements)
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

	return llmResp.Response, nil
}
