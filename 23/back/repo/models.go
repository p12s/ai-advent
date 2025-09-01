package repo

import (
	"time"
)

// Chat represents a chat session
type Chat struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Message represents a single message in a chat
type Message struct {
	ID       int64     `json:"id"`
	ChatID   int64     `json:"chat_id"`
	Role     string    `json:"role"` // "user" or "assistant"
	Content  string    `json:"content"`
	SentAt   time.Time `json:"sent_at"`
}

// Project represents a generated project
type Project struct {
	ID          int64     `json:"id"`
	ChatID      int64     `json:"chat_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	FilePath    string    `json:"file_path"`
	Status      string    `json:"status"` // "building", "completed", "failed"
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Image represents a generated image
type Image struct {
	ID        int64     `json:"id"`
	ChatID    int64     `json:"chat_id"`
	Prompt    string    `json:"prompt"`
	FilePath  string    `json:"file_path"`
	CreatedAt time.Time `json:"created_at"`
}
