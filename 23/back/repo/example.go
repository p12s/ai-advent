package repo

import (
	"context"
	"fmt"
	"log"
)

// ExampleUsage demonstrates how to use the repository
func ExampleUsage() {
	// Create repository instance
	repo, err := NewRepository()
	if err != nil {
		log.Fatalf("Failed to create repository: %v", err)
	}
	defer repo.Close()

	ctx := context.Background()

	// Create a chat
	chat, err := repo.CreateChat(ctx, "My First Chat")
	if err != nil {
		log.Fatalf("Failed to create chat: %v", err)
	}
	fmt.Printf("Created chat: %+v\n", chat)

	// Add messages to the chat
	userMsg, err := repo.CreateMessage(ctx, chat.ID, "user", "Hello, how can you help me build a web app?")
	if err != nil {
		log.Fatalf("Failed to create user message: %v", err)
	}
	fmt.Printf("Created user message: %+v\n", userMsg)

	assistantMsg, err := repo.CreateMessage(ctx, chat.ID, "assistant", "I can help you build a web application! What kind of app would you like to create?")
	if err != nil {
		log.Fatalf("Failed to create assistant message: %v", err)
	}
	fmt.Printf("Created assistant message: %+v\n", assistantMsg)

	// Get all messages for the chat
	messages, err := repo.GetMessages(ctx, chat.ID, 10, 0)
	if err != nil {
		log.Fatalf("Failed to get messages: %v", err)
	}
	fmt.Printf("Retrieved %d messages\n", len(messages))

	// Create a project
	project, err := repo.CreateProject(ctx, chat.ID, "My Web App", "A simple web application", "/path/to/project")
	if err != nil {
		log.Fatalf("Failed to create project: %v", err)
	}
	fmt.Printf("Created project: %+v\n", project)

	// Update project status
	err = repo.UpdateProjectStatus(ctx, project.ID, "completed")
	if err != nil {
		log.Fatalf("Failed to update project status: %v", err)
	}
	fmt.Printf("Updated project status to completed\n")

	// Create an image
	image, err := repo.CreateImage(ctx, chat.ID, "A beautiful sunset over mountains", "/path/to/image.jpg")
	if err != nil {
		log.Fatalf("Failed to create image: %v", err)
	}
	fmt.Printf("Created image: %+v\n", image)
}
