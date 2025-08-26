package internal

type TokenRequest struct {
	Text  string `json:"text"`
	Model string `json:"model"`
}

type TokenResponse struct {
	Success bool `json:"success"`
	Data    struct {
		TokenCount int    `json:"token_count"`
		Model      string `json:"model"`
		TextLength int    `json:"text_length"`
		FileName   string `json:"file_name"`
	} `json:"data"`
}

type HealthResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}
