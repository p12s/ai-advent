# Repository Package

This package provides a repository pattern implementation for the chat web service backend using SQLite with an in-memory database.

## Features

- **In-memory SQLite database** - No external dependencies, data stored in RAM
- **Repository pattern** - Clean interface for data operations
- **Full CRUD operations** for:
  - Chats (conversation sessions)
  - Messages (user/assistant messages)
  - Projects (generated projects)
  - Images (generated images)
- **Automatic migrations** - Database schema created on startup
- **Context support** - All operations support Go context

## Usage

### Basic Setup

```go
import "chat-web-service-backend/repo"

// Create repository instance
repository, err := repo.NewRepository()
if err != nil {
    log.Fatal(err)
}
defer repository.Close()

// Or use MustNewRepository for initialization
repository := repo.MustNewRepository()
defer repository.Close()
```

### Working with Chats

```go
ctx := context.Background()

// Create a new chat
chat, err := repository.CreateChat(ctx, "My Chat Title")

// Get chat by ID
chat, err := repository.GetChat(ctx, chatID)

// Get all chats with pagination
chats, err := repository.GetChats(ctx, limit, offset)

// Update chat title
err := repository.UpdateChat(ctx, chatID, "New Title")

// Delete chat (cascades to messages, projects, images)
err := repository.DeleteChat(ctx, chatID)
```

### Working with Messages

```go
// Create user message
userMsg, err := repository.CreateMessage(ctx, chatID, "user", "Hello!")

// Create assistant message
assistantMsg, err := repository.CreateMessage(ctx, chatID, "assistant", "Hi there!")

// Get messages for a chat
messages, err := repository.GetMessages(ctx, chatID, limit, offset)
```

### Working with Projects

```go
// Create project
project, err := repository.CreateProject(ctx, chatID, "My App", "Description", "/path/to/files")

// Update project status
err := repository.UpdateProjectStatus(ctx, projectID, "completed")

// Get projects for a chat
projects, err := repository.GetProjectsByChat(ctx, chatID)
```

### Working with Images

```go
// Create image record
image, err := repository.CreateImage(ctx, chatID, "sunset prompt", "/path/to/image.jpg")

// Get images for a chat
images, err := repository.GetImagesByChat(ctx, chatID)
```

## Models

- **Chat**: Represents a conversation session
- **Message**: Individual messages with role (user/assistant)
- **Project**: Generated projects with status tracking
- **Image**: Generated images with prompts

## Database Schema

The repository automatically creates the following tables:
- `chats` - Chat sessions
- `messages` - Chat messages with foreign key to chats
- `projects` - Generated projects with foreign key to chats
- `images` - Generated images with foreign key to chats

All tables include proper indexes and foreign key constraints with cascade delete.

## Integration with Handlers

To use in your handlers, simply create a repository instance and pass it to your handler functions:

```go
repository := repo.MustNewRepository()
defer repository.Close()

// Pass to handlers that need database access
handler := &MyHandler{repo: repository}
```
