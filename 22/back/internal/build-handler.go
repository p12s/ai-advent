package internal

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type BuildRequest struct {
	Message      string       `json:"message"`
	UserID       string       `json:"user_id,omitempty"`
	Requirements Requirements `json:"requirements,omitempty"`
}

type BuildResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	File      string `json:"file,omitempty"`
	GitHubURL string `json:"github_url,omitempty"`
}

type MCPRequest struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Method  string `json:"method"`
	Params  struct {
		Name      string `json:"name"`
		Arguments struct {
			FilePath      string `json:"filePath"`
			TargetPath    string `json:"targetPath,omitempty"`
			CommitMessage string `json:"commitMessage,omitempty"`
		} `json:"arguments"`
	} `json:"params"`
}

type MCPResponse struct {
	Result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
		IsError bool `json:"isError,omitempty"`
	} `json:"result"`
}

// pushToGitHubViaMCP отправляет файл в GitHub через MCP сервер
func pushToGitHubViaMCP(filePath, targetPath, commitMessage string) (string, error) {
	// Создаем MCP запрос
	mcpReq := MCPRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  "tools/call",
	}
	mcpReq.Params.Name = "push_file_to_github"
	mcpReq.Params.Arguments.FilePath = filePath
	mcpReq.Params.Arguments.TargetPath = targetPath
	mcpReq.Params.Arguments.CommitMessage = commitMessage

	// Сериализуем запрос в JSON
	requestJSON, err := json.Marshal(mcpReq)
	if err != nil {
		return "", fmt.Errorf("failed to marshal MCP request: %v", err)
	}

	// Запускаем MCP сервер
	cmd := exec.Command("node", "index.js")
	cmd.Dir = "../../github-mcp2" // Путь к MCP серверу относительно back директории
	cmd.Stdin = bytes.NewReader(append(requestJSON, '\n'))
	
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("MCP server error: %v, stderr: %s", err, stderr.String())
	}

	// Получаем вывод и ищем JSON ответ
	output := stdout.String()
	lines := bytes.Split([]byte(output), []byte("\n"))
	
	var jsonResponse []byte
	for _, line := range lines {
		line = bytes.TrimSpace(line)
		if len(line) > 0 && line[0] == '{' {
			jsonResponse = line
			break
		}
	}

	if len(jsonResponse) == 0 {
		return "", fmt.Errorf("no JSON response found in MCP output: %s", output)
	}

	// Парсим ответ
	var mcpResp MCPResponse
	if err := json.Unmarshal(jsonResponse, &mcpResp); err != nil {
		return "", fmt.Errorf("failed to parse MCP response: %v, raw output: %s", err, string(jsonResponse))
	}

	// Проверяем на ошибки
	if mcpResp.Result.IsError || len(mcpResp.Result.Content) == 0 {
		if len(mcpResp.Result.Content) > 0 {
			return "", fmt.Errorf("MCP error: %s", mcpResp.Result.Content[0].Text)
		}
		return "", fmt.Errorf("unknown MCP error")
	}

	// Извлекаем URL коммита из ответа
	responseText := mcpResp.Result.Content[0].Text
	// Простой парсинг URL из текста ответа
	if bytes.Contains([]byte(responseText), []byte("Commit URL: ")) {
		lines := bytes.Split([]byte(responseText), []byte("\n"))
		for _, line := range lines {
			if bytes.Contains(line, []byte("Commit URL: ")) {
				url := string(bytes.TrimPrefix(line, []byte("- Commit URL: ")))
				return url, nil
			}
		}
	}

	return "https://github.com/p12s/ai-advent-package", nil
}

func BuildHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var buildReq BuildRequest
	if err := json.Unmarshal(body, &buildReq); err != nil {
		http.Error(w, "Invalid JSON format", http.StatusBadRequest)
		return
	}

	builderClient := NewWebsiteBuilderClient()
	websiteHTML, err := builderClient.GenerateWebsite(buildReq.Message, buildReq.Requirements)
	//websiteHTML, err := builderClient.GenerateWebsiteHF(buildReq.Message, buildReq.Requirements)

	var response BuildResponse
	if err != nil {
		response = BuildResponse{
			Status:  "error",
			Message: fmt.Sprintf("Ошибка генерации сайта: %v", err),
		}
	} else {
		resultDir := "result"
		if err := os.MkdirAll(resultDir, 0755); err != nil {
			response = BuildResponse{
				Status:  "error",
				Message: fmt.Sprintf("Ошибка создания папки result: %v", err),
			}
		} else {
			now := time.Now()
			filename := now.Format("2006-01-02_15-04-05") + ".html"
			filePath := filepath.Join(resultDir, filename)

			if err := os.WriteFile(filePath, []byte(websiteHTML), 0644); err != nil {
				response = BuildResponse{
					Status:  "error",
					Message: fmt.Sprintf("Ошибка сохранения файла: %v", err),
				}
			} else {
				// Файл успешно сохранен, теперь отправляем в GitHub через MCP
				absFilePath, _ := filepath.Abs(filePath)
				commitMessage := fmt.Sprintf("Add generated website %s", filename)
				
				githubURL, githubErr := pushToGitHubViaMCP(absFilePath, filename, commitMessage)
				
				if githubErr != nil {
					// GitHub push failed, but file was saved locally
					response = BuildResponse{
						Status:  "partial_success",
						Message: fmt.Sprintf("Сайт сгенерирован и сохранен локально, но не удалось отправить в GitHub: %v", githubErr),
						File:    filename,
					}
				} else {
					// Full success - file saved and pushed to GitHub
					response = BuildResponse{
						Status:    "success",
						Message:   "Сайт успешно сгенерирован, сохранен и отправлен в GitHub",
						File:      filename,
						GitHubURL: githubURL,
					}
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
