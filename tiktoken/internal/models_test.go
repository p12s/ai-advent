package internal

import (
	"encoding/json"
	"testing"
)

func TestTokenRequest(t *testing.T) {
	t.Run("marshalJSON", func(t *testing.T) {
		req := &TokenRequest{
			Text:  "Hello, world!",
			Model: "gpt-4",
		}
		data, err := json.Marshal(req)
		if err != nil {
			t.Fatalf("Failed to marshal request: %v", err)
		}
		expected := `{"text":"Hello, world!","model":"gpt-4"}`
		if string(data) != expected {
			t.Errorf("Marshalled output mismatch:\ngot=%s\nwant=%s", string(data), expected)
		}
	})

	t.Run("unmarshalJSON", func(t *testing.T) {
		input := []byte(`{"text":"This is another text","model":"gpt-3.5-turbo"}`)
		var req TokenRequest
		err := json.Unmarshal(input, &req)
		if err != nil {
			t.Fatalf("Failed to unmarshal request: %v", err)
		}
		want := &TokenRequest{
			Text:  "This is another text",
			Model: "gpt-3.5-turbo",
		}
		if !equalRequests(&req, want) {
			t.Errorf("Unmarshalled object mismatch:\ngot=%+v\nwant=%+v", req, want)
		}
	})
}

func equalRequests(a, b *TokenRequest) bool {
	return a.Text == b.Text && a.Model == b.Model
}

func TestTokenResponse(t *testing.T) {
	t.Run("marshalJSON", func(t *testing.T) {
		resp := &TokenResponse{
			Success: true,
			Data: TokenData{
				TokenCount: 10,
				Model:      "gpt-4",
				TextLength: 20,
			},
		}
		data, err := json.Marshal(resp)
		if err != nil {
			t.Fatalf("Failed to marshal response: %v", err)
		}
		expected := `{"success":true,"data":{"token_count":10,"model":"gpt-4","text_length":20}}`
		if string(data) != expected {
			t.Errorf("Marshalled output mismatch:\ngot=%s\nwant=%s", string(data), expected)
		}
	})

	t.Run("unmarshalJSON", func(t *testing.T) {
		input := []byte(`{"success":false,"data":{"token_count":5,"model":"gpt-3.5-turbo","text_length":15}}`)
		var resp TokenResponse
		err := json.Unmarshal(input, &resp)
		if err != nil {
			t.Fatalf("Failed to unmarshal response: %v", err)
		}
		want := &TokenResponse{
			Success: false,
			Data: TokenData{
				TokenCount: 5,
				Model:      "gpt-3.5-turbo",
				TextLength: 15,
			},
		}
		if !equalResponses(&resp, want) {
			t.Errorf("Unmarshalled object mismatch:\ngot=%+v\nwant=%+v", resp, want)
		}
	})
}

func equalResponses(a, b *TokenResponse) bool {
	return a.Success == b.Success &&
		a.Data.TokenCount == b.Data.TokenCount &&
		a.Data.Model == b.Data.Model &&
		a.Data.TextLength == b.Data.TextLength
}

func TestHealthResponse(t *testing.T) {
	t.Run("marshalJSON", func(t *testing.T) {
		resp := &HealthResponse{
			Status:  "ok",
			Service: "tiktoken-server",
			Version: "1.0.0",
		}
		data, err := json.Marshal(resp)
		if err != nil {
			t.Fatalf("Failed to marshal health response: %v", err)
		}
		expected := `{"status":"ok","service":"tiktoken-server","version":"1.0.0"}`
		if string(data) != expected {
			t.Errorf("Marshalled output mismatch:\ngot=%s\nwant=%s", string(data), expected)
		}
	})

	t.Run("unmarshalJSON", func(t *testing.T) {
		input := []byte(`{"status":"maintenance","service":"tiktoken-server","version":"1.0.1"}`)
		var resp HealthResponse
		err := json.Unmarshal(input, &resp)
		if err != nil {
			t.Fatalf("Failed to unmarshal health response: %v", err)
		}
		want := &HealthResponse{
			Status:  "maintenance",
			Service: "tiktoken-server",
			Version: "1.0.1",
		}
		if !equalHealthResponses(&resp, want) {
			t.Errorf("Unmarshalled object mismatch:\ngot=%+v\nwant=%+v", resp, want)
		}
	})
}

func equalHealthResponses(a, b *HealthResponse) bool {
	return a.Status == b.Status &&
		a.Service == b.Service &&
		a.Version == b.Version
}
