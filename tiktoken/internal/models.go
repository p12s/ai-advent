package internal

type TokenRequest struct {
	Text  string `json:"text" example:"Hello, world! This is a test message."`
	Model string `json:"model" example:"gpt-4"`
}

type TokenResponse struct {
	Success bool      `json:"success" example:"true"`
	Data    TokenData `json:"data"`
}

type TokenData struct {
	TokenCount int    `json:"token_count" example:"7"`
	Model      string `json:"model" example:"gpt-4"`
	TextLength int    `json:"text_length" example:"28"`
	FileName   string `json:"file_name,omitempty" example:"document.txt"`
}

type HealthResponse struct {
	Status  string `json:"status" example:"ok"`
	Service string `json:"service" example:"tiktoken-server"`
	Version string `json:"version" example:"1.0.0"`
}
