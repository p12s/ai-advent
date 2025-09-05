package repo

import (
	"log"
)

// NewRepository creates a new repository instance
// Currently returns SQLite persistent repository, but can be extended
// to support other database types based on configuration
func NewRepository() (Repository, error) {
	repo, err := NewSQLiteRepository()
	if err != nil {
		return nil, err
	}

	log.Printf("SQLite persistent repository initialized successfully")
	return repo, nil
}

// MustNewRepository creates a new repository and panics on error
// Useful for initialization where failure should stop the application
func MustNewRepository() Repository {
	repo, err := NewRepository()
	if err != nil {
		log.Fatalf("Failed to initialize repository: %v", err)
	}
	return repo
}
