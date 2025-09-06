package internal

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// AnalyzeProjectHandler handles GET /analyze-project requests
func AnalyzeProjectHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get the current working directory to determine project root
	currentDir, err := os.Getwd()
	if err != nil {
		log.Printf("Error getting current directory: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(AnalyzeProjectResponse{
			Success: false,
			Error:   "Failed to get current directory",
		})
		return
	}

	// Navigate to project root (assuming we're in back/ directory)
	projectRoot := filepath.Dir(currentDir)

	// Prepare the command - the executable is in code-analyzer directory
	analyzerPath := filepath.Join(projectRoot, "code-analyzer", "code-analyzer")
	cmd := exec.Command(analyzerPath, "analyze", "../28/back", "--verbose", "--exclude", "*.mod", "--exclude", "*.sum", "--exclude", "*.html")
	cmd.Dir = projectRoot

	// Execute the command and capture output
	output, err := cmd.CombinedOutput()

	// Filter out warning lines about file truncation
	filteredOutput := filterWarningLines(string(output))

	if err != nil {
		log.Printf("Error executing analyze command: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(AnalyzeProjectResponse{
			Success: false,
			Error:   "Failed to execute analyze command: " + err.Error(),
			Output:  filteredOutput,
		})
		return
	}

	// Return successful response
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(AnalyzeProjectResponse{
		Success: true,
		Output:  filteredOutput,
	})
}

// filterWarningLines removes warning lines about file truncation from the output
func filterWarningLines(output string) string {
	lines := strings.Split(output, "\n")
	var filteredLines []string

	for _, line := range lines {
		// Skip lines that contain the truncation warning
		if !strings.Contains(line, "Warning: File has too many lines, truncating") {
			filteredLines = append(filteredLines, line)
		}
	}

	return strings.Join(filteredLines, "\n")
}
