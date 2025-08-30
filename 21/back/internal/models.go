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
