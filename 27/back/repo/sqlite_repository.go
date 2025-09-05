package repo

import (
	"context"
	"database/sql"
	"time"

	_ "modernc.org/sqlite"
)

// SQLiteRepository implements Repository interface using SQLite
type SQLiteRepository struct {
	db *sql.DB
}

// NewSQLiteRepository creates a new SQLite repository with persistent database
func NewSQLiteRepository() (*SQLiteRepository, error) {
	// Use persistent SQLite database file
	db, err := sql.Open("sqlite", "chat_service.db")
	if err != nil {
		return nil, err
	}

	repo := &SQLiteRepository{db: db}
	
	// Run migrations
	if err := repo.Migrate(); err != nil {
		db.Close()
		return nil, err
	}

	return repo, nil
}

// Migrate creates all necessary tables
func (r *SQLiteRepository) Migrate() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS chats (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id INTEGER NOT NULL,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			file_path TEXT,
			status TEXT DEFAULT 'building',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS images (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id INTEGER NOT NULL,
			prompt TEXT NOT NULL,
			file_path TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS user_requests (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			request_date TEXT NOT NULL,
			request_count INTEGER DEFAULT 1,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, request_date)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`,
		`CREATE INDEX IF NOT EXISTS idx_projects_chat_id ON projects(chat_id)`,
		`CREATE INDEX IF NOT EXISTS idx_images_chat_id ON images(chat_id)`,
		`CREATE INDEX IF NOT EXISTS idx_user_requests_user_date ON user_requests(user_id, request_date)`,
	}

	for _, query := range queries {
		if _, err := r.db.Exec(query); err != nil {
			return err
		}
	}

	return nil
}

// Close closes the database connection
func (r *SQLiteRepository) Close() error {
	return r.db.Close()
}

// Chat operations
func (r *SQLiteRepository) CreateChat(ctx context.Context, title string) (*Chat, error) {
	now := time.Now()
	result, err := r.db.ExecContext(ctx, 
		"INSERT INTO chats (title, created_at, updated_at) VALUES (?, ?, ?)",
		title, now, now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &Chat{
		ID:        id,
		Title:     title,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

func (r *SQLiteRepository) GetChat(ctx context.Context, id int64) (*Chat, error) {
	chat := &Chat{}
	err := r.db.QueryRowContext(ctx,
		"SELECT id, title, created_at, updated_at FROM chats WHERE id = ?", id).
		Scan(&chat.ID, &chat.Title, &chat.CreatedAt, &chat.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return chat, nil
}

func (r *SQLiteRepository) GetChats(ctx context.Context, limit, offset int) ([]*Chat, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, title, created_at, updated_at FROM chats ORDER BY updated_at DESC LIMIT ? OFFSET ?",
		limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chats []*Chat
	for rows.Next() {
		chat := &Chat{}
		if err := rows.Scan(&chat.ID, &chat.Title, &chat.CreatedAt, &chat.UpdatedAt); err != nil {
			return nil, err
		}
		chats = append(chats, chat)
	}

	return chats, rows.Err()
}

func (r *SQLiteRepository) UpdateChat(ctx context.Context, id int64, title string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE chats SET title = ?, updated_at = ? WHERE id = ?",
		title, time.Now(), id)
	return err
}

func (r *SQLiteRepository) DeleteChat(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM chats WHERE id = ?", id)
	return err
}

// Message operations
func (r *SQLiteRepository) CreateMessage(ctx context.Context, chatID int64, role, content string) (*Message, error) {
	now := time.Now()
	result, err := r.db.ExecContext(ctx,
		"INSERT INTO messages (chat_id, role, content, sent_at) VALUES (?, ?, ?, ?)",
		chatID, role, content, now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &Message{
		ID:      id,
		ChatID:  chatID,
		Role:    role,
		Content: content,
		SentAt:  now,
	}, nil
}

func (r *SQLiteRepository) GetMessages(ctx context.Context, chatID int64, limit, offset int) ([]*Message, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, chat_id, role, content, sent_at FROM messages WHERE chat_id = ? ORDER BY sent_at ASC LIMIT ? OFFSET ?",
		chatID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*Message
	for rows.Next() {
		msg := &Message{}
		if err := rows.Scan(&msg.ID, &msg.ChatID, &msg.Role, &msg.Content, &msg.SentAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	return messages, rows.Err()
}

func (r *SQLiteRepository) GetMessage(ctx context.Context, id int64) (*Message, error) {
	msg := &Message{}
	err := r.db.QueryRowContext(ctx,
		"SELECT id, chat_id, role, content, sent_at FROM messages WHERE id = ?", id).
		Scan(&msg.ID, &msg.ChatID, &msg.Role, &msg.Content, &msg.SentAt)
	if err != nil {
		return nil, err
	}
	return msg, nil
}

func (r *SQLiteRepository) DeleteMessage(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM messages WHERE id = ?", id)
	return err
}

// Project operations
func (r *SQLiteRepository) CreateProject(ctx context.Context, chatID int64, name, description, filePath string) (*Project, error) {
	now := time.Now()
	result, err := r.db.ExecContext(ctx,
		"INSERT INTO projects (chat_id, name, description, file_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		chatID, name, description, filePath, now, now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &Project{
		ID:          id,
		ChatID:      chatID,
		Name:        name,
		Description: description,
		FilePath:    filePath,
		Status:      "building",
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func (r *SQLiteRepository) GetProject(ctx context.Context, id int64) (*Project, error) {
	project := &Project{}
	err := r.db.QueryRowContext(ctx,
		"SELECT id, chat_id, name, description, file_path, status, created_at, updated_at FROM projects WHERE id = ?", id).
		Scan(&project.ID, &project.ChatID, &project.Name, &project.Description, &project.FilePath, &project.Status, &project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return project, nil
}

func (r *SQLiteRepository) GetProjectsByChat(ctx context.Context, chatID int64) ([]*Project, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, chat_id, name, description, file_path, status, created_at, updated_at FROM projects WHERE chat_id = ? ORDER BY created_at DESC",
		chatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*Project
	for rows.Next() {
		project := &Project{}
		if err := rows.Scan(&project.ID, &project.ChatID, &project.Name, &project.Description, &project.FilePath, &project.Status, &project.CreatedAt, &project.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}

	return projects, rows.Err()
}

func (r *SQLiteRepository) UpdateProjectStatus(ctx context.Context, id int64, status string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
		status, time.Now(), id)
	return err
}

func (r *SQLiteRepository) DeleteProject(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM projects WHERE id = ?", id)
	return err
}

// Image operations
func (r *SQLiteRepository) CreateImage(ctx context.Context, chatID int64, prompt, filePath string) (*Image, error) {
	now := time.Now()
	result, err := r.db.ExecContext(ctx,
		"INSERT INTO images (chat_id, prompt, file_path, created_at) VALUES (?, ?, ?, ?)",
		chatID, prompt, filePath, now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &Image{
		ID:        id,
		ChatID:    chatID,
		Prompt:    prompt,
		FilePath:  filePath,
		CreatedAt: now,
	}, nil
}

func (r *SQLiteRepository) GetImage(ctx context.Context, id int64) (*Image, error) {
	image := &Image{}
	err := r.db.QueryRowContext(ctx,
		"SELECT id, chat_id, prompt, file_path, created_at FROM images WHERE id = ?", id).
		Scan(&image.ID, &image.ChatID, &image.Prompt, &image.FilePath, &image.CreatedAt)
	if err != nil {
		return nil, err
	}
	return image, nil
}

func (r *SQLiteRepository) GetImagesByChat(ctx context.Context, chatID int64) ([]*Image, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, chat_id, prompt, file_path, created_at FROM images WHERE chat_id = ? ORDER BY created_at DESC",
		chatID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []*Image
	for rows.Next() {
		image := &Image{}
		if err := rows.Scan(&image.ID, &image.ChatID, &image.Prompt, &image.FilePath, &image.CreatedAt); err != nil {
			return nil, err
		}
		images = append(images, image)
	}

	return images, rows.Err()
}

func (r *SQLiteRepository) DeleteImage(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM images WHERE id = ?", id)
	return err
}

// UserRequest operations for rate limiting
func (r *SQLiteRepository) GetUserRequestCount(ctx context.Context, userID, requestDate string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		"SELECT request_count FROM user_requests WHERE user_id = ? AND request_date = ?",
		userID, requestDate).Scan(&count)
	if err == sql.ErrNoRows {
		return 0, nil // No requests found for this user/date
	}
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *SQLiteRepository) IncrementUserRequestCount(ctx context.Context, userID, requestDate string) error {
	now := time.Now()
	
	// Try to increment existing record
	result, err := r.db.ExecContext(ctx,
		"UPDATE user_requests SET request_count = request_count + 1, updated_at = ? WHERE user_id = ? AND request_date = ?",
		now, userID, requestDate)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	// If no rows were updated, create a new record
	if rowsAffected == 0 {
		_, err = r.db.ExecContext(ctx,
			"INSERT INTO user_requests (user_id, request_date, request_count, created_at, updated_at) VALUES (?, ?, 1, ?, ?)",
			userID, requestDate, now, now)
		return err
	}
	
	return nil
}
