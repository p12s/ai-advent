package duplicates

import (
	"crypto/md5"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"strings"

	"code-analyzer/internal/config"
	"code-analyzer/internal/models"
)

// Analyzer detects duplicate code blocks
type Analyzer struct {
	config config.Config
}

// New creates a new duplicate analyzer
func New(cfg config.Config) *Analyzer {
	return &Analyzer{config: cfg}
}

// Analyze finds duplicate code blocks across files
func (a *Analyzer) Analyze(files []models.FileInfo) ([]models.DuplicateIssue, error) {
	var issues []models.DuplicateIssue
	
	// Create a map of code hashes to locations
	hashMap := make(map[string][]models.Location)
	
	// Process each file
	for _, file := range files {
		if len(file.Chunks) == 0 {
			continue
		}
		
		// Analyze each chunk
		for _, chunk := range file.Chunks {
			duplicates := a.findDuplicatesInChunk(file, chunk, hashMap)
			issues = append(issues, duplicates...)
		}
	}
	
	return issues, nil
}

// findDuplicatesInChunk analyzes a single chunk for duplicates
func (a *Analyzer) findDuplicatesInChunk(file models.FileInfo, chunk models.Chunk, hashMap map[string][]models.Location) []models.DuplicateIssue {
	var issues []models.DuplicateIssue
	
	lines := strings.Split(chunk.Content, "\n")
	
	// Look for duplicate blocks of minimum size
	for i := 0; i < len(lines)-a.config.MinLines+1; i++ {
		for j := i + a.config.MinLines; j <= len(lines); j++ {
			block := strings.Join(lines[i:j], "\n")
			normalizedBlock := a.normalizeCode(block)
			
			// Skip empty or whitespace-only blocks
			if strings.TrimSpace(normalizedBlock) == "" {
				continue
			}
			
			hash := fmt.Sprintf("%x", md5.Sum([]byte(normalizedBlock)))
			
			location := models.Location{
				File:      file.Path,
				StartLine: chunk.StartLine + i,
				EndLine:   chunk.StartLine + j - 1,
			}
			
			// Check if we've seen this hash before
			if locations, exists := hashMap[hash]; exists {
				// Found a duplicate
				issue := models.DuplicateIssue{
					Issue: models.Issue{
						Type:       "duplicate_code",
						Severity:   a.calculateSeverity(j - i),
						Message:    fmt.Sprintf("Duplicate code block found (%d lines)", j-i),
						File:       file.Path,
						Line:       chunk.StartLine + i,
						Suggestion: "Consider extracting this code into a shared function or method",
					},
					Locations:       append(locations, location),
					SimilarityScore: 1.0, // Exact match
					LinesCount:      j - i,
					CodeSnippet:     block,
				}
				
				issues = append(issues, issue)
				
				// Update the hash map with the new location
				hashMap[hash] = append(locations, location)
			} else {
				// First occurrence of this block
				hashMap[hash] = []models.Location{location}
			}
		}
	}
	
	return issues
}

// normalizeCode removes whitespace and comments for better duplicate detection
func (a *Analyzer) normalizeCode(code string) string {
	lines := strings.Split(code, "\n")
	var normalized []string
	
	for _, line := range lines {
		// Remove leading/trailing whitespace
		trimmed := strings.TrimSpace(line)
		
		// Skip empty lines
		if trimmed == "" {
			continue
		}
		
		// Remove single-line comments (basic implementation)
		if strings.HasPrefix(trimmed, "//") || 
		   strings.HasPrefix(trimmed, "#") ||
		   strings.HasPrefix(trimmed, "/*") {
			continue
		}
		
		// Normalize whitespace within the line
		normalized = append(normalized, strings.Join(strings.Fields(trimmed), " "))
	}
	
	return strings.Join(normalized, "\n")
}

// calculateSeverity determines the severity based on duplicate size
func (a *Analyzer) calculateSeverity(lines int) models.Severity {
	if lines >= 50 {
		return models.SeverityCritical
	} else if lines >= 20 {
		return models.SeverityHigh
	} else if lines >= 10 {
		return models.SeverityMedium
	} else {
		return models.SeverityLow
	}
}

// analyzeGoFile performs Go-specific AST analysis for more accurate duplicate detection
func (a *Analyzer) analyzeGoFile(filePath string, content string) ([]models.DuplicateIssue, error) {
	var issues []models.DuplicateIssue
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, filePath, content, parser.ParseComments)
	if err != nil {
		return issues, err // Return empty issues if parsing fails
	}
	
	// Extract functions for comparison
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			if x.Body != nil {
				// Analyze function body for duplicates
				// This is a simplified implementation
				pos := fset.Position(x.Pos())
				end := fset.Position(x.End())
				
				// Create a basic duplicate issue for demonstration
				// In a real implementation, you would compare function bodies
				if end.Line-pos.Line > a.config.MinLines {
					issue := models.DuplicateIssue{
						Issue: models.Issue{
							Type:     "potential_duplicate_function",
							Severity: models.SeverityInfo,
							Message:  fmt.Sprintf("Large function '%s' may contain duplicatable logic", x.Name.Name),
							File:     filePath,
							Line:     pos.Line,
							Suggestion: "Consider breaking this function into smaller, reusable functions",
						},
						Locations: []models.Location{
							{
								File:      filePath,
								StartLine: pos.Line,
								EndLine:   end.Line,
							},
						},
						SimilarityScore: 0.0,
						LinesCount:      end.Line - pos.Line,
					}
					issues = append(issues, issue)
				}
			}
		}
		return true
	})
	
	return issues, nil
}
