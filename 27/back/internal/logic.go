package internal

import (
	"fmt"
	"strings"
	"sync"
)

// In-memory storage for dialog sessions
var (
	sessions      = make(map[string]*DialogSession)
	sessionsMutex = &sync.RWMutex{}
)

// GetOrCreateSession retrieves or creates a dialog session for a user
func GetOrCreateSession(userID string) *DialogSession {
	sessionsMutex.Lock()
	defer sessionsMutex.Unlock()

	if userID == "" {
		userID = "default"
	}

	session, exists := sessions[userID]
	if !exists {
		session = &DialogSession{
			UserID:       userID,
			History:      []Message{},
			Requirements: Requirements{},
			IsComplete:   false,
		}
		sessions[userID] = session
	}

	return session
}

// AddMessageToSession adds a message to the session history
func AddMessageToSession(session *DialogSession, role, content string) {
	sessionsMutex.Lock()
	defer sessionsMutex.Unlock()

	message := Message{
		Role:    role,
		Content: content,
	}
	session.History = append(session.History, message)
}

// GetHistoryAsString converts session history to a formatted string
func GetHistoryAsString(session *DialogSession) string {
	var history strings.Builder

	for _, msg := range session.History {
		if msg.Role == "user" {
			history.WriteString(fmt.Sprintf("Пользователь: %s\n", msg.Content))
		} else {
			history.WriteString(fmt.Sprintf("Ассистент: %s\n", msg.Content))
		}
	}

	return history.String()
}

// UpdateRequirementsFromResponse analyzes the LLM response and user message to extract requirements
func UpdateRequirementsFromResponse(session *DialogSession, userMessage, llmResponse string) {
	sessionsMutex.Lock()
	defer sessionsMutex.Unlock()

	// Если это первый ответ пользователя, определяем что это ответ на вопрос о типе сайта
	if session.Requirements.SiteType == "" && session.CurrentQuestion == "" {
		session.Requirements.SiteType = userMessage
		session.CurrentQuestion = "target_audience"
		return
	}

	// Если это ответ на вопрос о целевой аудитории
	if session.Requirements.TargetAudience == "" && session.CurrentQuestion == "target_audience" {
		session.Requirements.TargetAudience = userMessage
		session.CurrentQuestion = "complete"
		session.IsComplete = true
		return
	}

	// Если все вопросы заданы, но пользователь продолжает отвечать - добавляем как дополнительную информацию
	if session.IsComplete {
		if session.Requirements.Note == "" {
			session.Requirements.Note = userMessage
		} else {
			session.Requirements.Note += "; " + userMessage
		}
	}
}

// This file contains business logic functions
// Currently empty - will be populated as needed
