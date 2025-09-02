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

func NewLLMClient() *LLMClient {
	baseURL := os.Getenv("GATHERING_REQUIREMENTS_LLM_URL")
	if baseURL == "" {
		panic("GATHERING_REQUIREMENTS_LLM_URL is not set")
	}

	model := os.Getenv("GATHERING_REQUIREMENTS_LLM_MODEL")
	if model == "" {
		panic("GATHERING_REQUIREMENTS_LLM_MODEL is not set")
	}

	timeoutStr := os.Getenv("GATHERING_REQUIREMENTS_LLM_TIMEOUT")
	if timeoutStr == "" {
		panic("GATHERING_REQUIREMENTS_LLM_TIMEOUT is not set")
	}
	var timeout int
	if timeoutStr != "" {
		if t, err := strconv.Atoi(timeoutStr); err == nil && t > 0 {
			timeout = t
		}
	}

	return &LLMClient{
		BaseURL: baseURL,
		Model:   model,
		Client: &http.Client{
			Timeout: time.Duration(timeout) * time.Second,
		},
	}
}

func (c *LLMClient) ProcessUserInput(userInput string, systemPrompt string) (*UserRequest, error) {
	if userInput == "" {
		return nil, fmt.Errorf("user input cannot be empty")
	}

	request := &UserRequest{
		Message: userInput,
		System:  systemPrompt,
	}

	return request, nil
}

func (c *LLMClient) SendToLLM(userReq *UserRequest) (*LLMResponse, error) {
	temperatureStr := os.Getenv("GATHERING_REQUIREMENTS_LLM_TEMPERATURE")
	if temperatureStr == "" {
		panic("GATHERING_REQUIREMENTS_LLM_TEMPERATURE is not set")
	}
	temperature, err := strconv.ParseFloat(temperatureStr, 64)
	if err != nil {
		panic("GATHERING_REQUIREMENTS_LLM_TEMPERATURE is not a valid float")
	}

	maxTokensStr := os.Getenv("GATHERING_REQUIREMENTS_LLM_MAX_TOKENS")
	if maxTokensStr == "" {
		panic("GATHERING_REQUIREMENTS_LLM_MAX_TOKENS is not set")
	}
	maxTokens, err := strconv.Atoi(maxTokensStr)
	if err != nil {
		panic("GATHERING_REQUIREMENTS_LLM_MAX_TOKENS is not a valid integer")
	}

	streamStr := os.Getenv("GATHERING_REQUIREMENTS_LLM_STREAM")
	if streamStr == "" {
		panic("GATHERING_REQUIREMENTS_LLM_STREAM is not set")
	}
	stream, err := strconv.ParseBool(streamStr)
	if err != nil {
		panic("GATHERING_REQUIREMENTS_LLM_STREAM is not a valid boolean")
	}

	llmReq := LLMRequest{
		Model:       c.Model,
		System:      userReq.System,
		Prompt:      userReq.Message,
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

func (c *LLMClient) GetLLMResponse(userInput string, systemPrompt string) (string, error) {
	userReq, err := c.ProcessUserInput(userInput, systemPrompt)
	if err != nil {
		return "", fmt.Errorf("failed to process user input: %w", err)
	}

	llmResp, err := c.SendToLLM(userReq)
	if err != nil {
		return "", fmt.Errorf("failed to get LLM response: %w", err)
	}

	if llmResp.Response == "" {
		return "", fmt.Errorf("received empty response from LLM")
	}

	return llmResp.Response, nil
}
