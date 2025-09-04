package repo

import (
	"context"
)

// Repository defines the interface for data operations
type Repository interface {
	// Chat operations
	CreateChat(ctx context.Context, title string) (*Chat, error)
	GetChat(ctx context.Context, id int64) (*Chat, error)
	GetChats(ctx context.Context, limit, offset int) ([]*Chat, error)
	UpdateChat(ctx context.Context, id int64, title string) error
	DeleteChat(ctx context.Context, id int64) error

	// Message operations
	CreateMessage(ctx context.Context, chatID int64, role, content string) (*Message, error)
	GetMessages(ctx context.Context, chatID int64, limit, offset int) ([]*Message, error)
	GetMessage(ctx context.Context, id int64) (*Message, error)
	DeleteMessage(ctx context.Context, id int64) error

	// Project operations
	CreateProject(ctx context.Context, chatID int64, name, description, filePath string) (*Project, error)
	GetProject(ctx context.Context, id int64) (*Project, error)
	GetProjectsByChat(ctx context.Context, chatID int64) ([]*Project, error)
	UpdateProjectStatus(ctx context.Context, id int64, status string) error
	DeleteProject(ctx context.Context, id int64) error

	// Image operations
	CreateImage(ctx context.Context, chatID int64, prompt, filePath string) (*Image, error)
	GetImage(ctx context.Context, id int64) (*Image, error)
	GetImagesByChat(ctx context.Context, chatID int64) ([]*Image, error)
	DeleteImage(ctx context.Context, id int64) error

	// Rate limiting operations
	GetUserRequestCount(ctx context.Context, userID, requestDate string) (int, error)
	IncrementUserRequestCount(ctx context.Context, userID, requestDate string) error

	// Database operations
	Close() error
	Migrate() error
}
