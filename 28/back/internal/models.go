package internal

import "net/http"

type HealthResponse struct {
	Status  string `json:"status" example:"ok"`
	Service string `json:"service" example:"chat-web-service-backend"`
	Version string `json:"version" example:"1.0.0"`
}

type LLMRequest struct {
	Model       string  `json:"model"`
	System      string  `json:"system,omitempty"`
	Prompt      string  `json:"prompt"`
	Temperature float64 `json:"temperature"`
	MaxTokens   int     `json:"max_tokens"`
	Stream      bool    `json:"stream"`
}

type LLMResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
	Error    string `json:"error,omitempty"`
}

type UserRequest struct {
	Message string `json:"message"`
	System  string `json:"system,omitempty"`
}

type LLMClient struct {
	BaseURL string
	Model   string
	Client  *http.Client
}

// Requirements represents the gathered requirements for website creation
type Requirements struct {
	SiteType       string `json:"site_type"`
	TargetAudience string `json:"target_audience"`
	Note           string `json:"note"`
}

// DialogSession represents a user's dialog session
type DialogSession struct {
	UserID          string       `json:"user_id"`
	History         []Message    `json:"history"`
	Requirements    Requirements `json:"requirements"`
	IsComplete      bool         `json:"is_complete"`
	CurrentQuestion string       `json:"current_question"` // Текущий вопрос, на который отвечает пользователь
}

// Message represents a single message in the dialog
type Message struct {
	Role    string `json:"role"` // "user" or "assistant"
	Content string `json:"content"`
}

// WebsiteBuilderClient represents a client for website generation
type WebsiteBuilderClient struct {
	BaseURL string
	Model   string
	Client  *http.Client
}

type WebsiteBuilderClient2 struct {
	BaseURL string
	Model   string
	Client  *http.Client
}

// WebsiteRequest represents a request for website generation
type WebsiteRequest struct {
	Message      string       `json:"message"`
	System       string       `json:"system,omitempty"`
	Requirements Requirements `json:"requirements"`
}

// PublishRequest represents a request for publishing a file to Yandex Cloud
type PublishRequest struct {
	Filename string `json:"filename"`
	UserID   string `json:"user_id"`
}

// HuggingFaceRequest represents a request to Hugging Face Inference API
type HuggingFaceRequest struct {
	Inputs     string                 `json:"inputs"`
	Parameters HuggingFaceParameters  `json:"parameters,omitempty"`
	Options    HuggingFaceOptions     `json:"options,omitempty"`
}

// HuggingFaceParameters represents parameters for HF API
type HuggingFaceParameters struct {
	Temperature       float64 `json:"temperature,omitempty"`
	MaxNewTokens      int     `json:"max_new_tokens,omitempty"`
	DoSample          bool    `json:"do_sample,omitempty"`
	TopP              float64 `json:"top_p,omitempty"`
	RepetitionPenalty float64 `json:"repetition_penalty,omitempty"`
}

// HuggingFaceOptions represents options for HF API
type HuggingFaceOptions struct {
	UseCache     bool `json:"use_cache,omitempty"`
	WaitForModel bool `json:"wait_for_model,omitempty"`
}

// HuggingFaceResponse represents response from HF API
type HuggingFaceResponse []struct {
	GeneratedText string `json:"generated_text"`
}

// HuggingFaceChatRequest represents a request to Hugging Face Chat Completions API
type HuggingFaceChatRequest struct {
	Model    string                    `json:"model"`
	Messages []HuggingFaceChatMessage  `json:"messages"`
	Stream   bool                      `json:"stream"`
}

// HuggingFaceChatMessage represents a message in the chat format
type HuggingFaceChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// HuggingFaceChatResponse represents response from HF Chat Completions API
type HuggingFaceChatResponse struct {
	Object            string                  `json:"object"`
	ID                string                  `json:"id"`
	Created           int64                   `json:"created"`
	Model             string                  `json:"model"`
	SystemFingerprint string                  `json:"system_fingerprint"`
	Choices           []HuggingFaceChatChoice `json:"choices"`
	Usage             HuggingFaceChatUsage    `json:"usage"`
}

// HuggingFaceChatChoice represents a choice in the chat response
type HuggingFaceChatChoice struct {
	Index        int                    `json:"index"`
	Message      HuggingFaceChatMessage `json:"message"`
	LogProbs     interface{}            `json:"logprobs"`
	FinishReason string                 `json:"finish_reason"`
}

// HuggingFaceChatUsage represents token usage information
type HuggingFaceChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// AnalyzeProjectResponse represents response from analyze-project endpoint
type AnalyzeProjectResponse struct {
	Success bool   `json:"success"`
	Output  string `json:"output,omitempty"`
	Error   string `json:"error,omitempty"`
}
