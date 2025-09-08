package readability

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"regexp"
	"strings"
	"unicode"

	"code-analyzer/internal/config"
	"code-analyzer/internal/models"
)

// Analyzer analyzes code readability and complexity
type Analyzer struct {
	config config.Config
}

// New creates a new readability analyzer
func New(cfg config.Config) *Analyzer {
	return &Analyzer{config: cfg}
}

// Analyze performs readability analysis on files
func (a *Analyzer) Analyze(files []models.FileInfo) ([]models.ReadabilityIssue, error) {
	var issues []models.ReadabilityIssue
	
	for _, file := range files {
		fileIssues := a.analyzeFile(file)
		issues = append(issues, fileIssues...)
	}
	
	return issues, nil
}

// analyzeFile analyzes a single file for readability issues
func (a *Analyzer) analyzeFile(file models.FileInfo) []models.ReadabilityIssue {
	var issues []models.ReadabilityIssue
	
	for _, chunk := range file.Chunks {
		chunkIssues := a.analyzeChunk(file, chunk)
		issues = append(issues, chunkIssues...)
	}
	
	return issues
}

// analyzeChunk analyzes a code chunk for readability issues
func (a *Analyzer) analyzeChunk(file models.FileInfo, chunk models.Chunk) []models.ReadabilityIssue {
	var issues []models.ReadabilityIssue
	
	lines := strings.Split(chunk.Content, "\n")
	
	// Analyze each line
	for i, line := range lines {
		lineNumber := chunk.StartLine + i
		lineIssues := a.analyzeLine(file, line, lineNumber)
		issues = append(issues, lineIssues...)
	}
	
	// Analyze function complexity for Go files
	if file.Language == "Go" {
		complexityIssues := a.analyzeGoComplexity(file, chunk)
		issues = append(issues, complexityIssues...)
	}
	
	// Analyze JavaScript/TypeScript complexity
	if file.Language == "JavaScript" || file.Language == "TypeScript" {
		jsIssues := a.analyzeJSComplexity(file, chunk)
		issues = append(issues, jsIssues...)
	}
	
	return issues
}

// analyzeLine analyzes a single line for readability issues
func (a *Analyzer) analyzeLine(file models.FileInfo, line string, lineNumber int) []models.ReadabilityIssue {
	var issues []models.ReadabilityIssue
	
	// Check line length
	if len(line) > 120 {
		issues = append(issues, models.ReadabilityIssue{
			Issue: models.Issue{
				Type:       "long_line",
				Severity:   models.SeverityLow,
				Message:    fmt.Sprintf("Line too long (%d characters)", len(line)),
				File:       file.Path,
				Line:       lineNumber,
				Suggestion: "Consider breaking this line into multiple lines",
			},
			Metric:    "line_length",
			Value:     float64(len(line)),
			Threshold: 120,
		})
	}
	
	// Check for poor variable naming
	if a.hasPoorNaming(line) {
		issues = append(issues, models.ReadabilityIssue{
			Issue: models.Issue{
				Type:       "poor_naming",
				Severity:   models.SeverityMedium,
				Message:    "Poor variable naming detected",
				File:       file.Path,
				Line:       lineNumber,
				Suggestion: "Use descriptive variable names instead of single letters or abbreviations",
			},
			Metric:      "naming_quality",
			Value:       0.0,
			Threshold:   1.0,
			CodeSnippet: strings.TrimSpace(line),
		})
	}
	
	// Check for excessive nesting (indentation)
	indentLevel := a.getIndentationLevel(line)
	if indentLevel > 4 {
		issues = append(issues, models.ReadabilityIssue{
			Issue: models.Issue{
				Type:       "deep_nesting",
				Severity:   models.SeverityMedium,
				Message:    fmt.Sprintf("Deep nesting detected (level %d)", indentLevel),
				File:       file.Path,
				Line:       lineNumber,
				Suggestion: "Consider extracting nested logic into separate functions",
			},
			Metric:    "nesting_level",
			Value:     float64(indentLevel),
			Threshold: 4,
		})
	}
	
	return issues
}

// analyzeGoComplexity analyzes Go code complexity using AST
func (a *Analyzer) analyzeGoComplexity(file models.FileInfo, chunk models.Chunk) []models.ReadabilityIssue {
	var issues []models.ReadabilityIssue
	
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, file.Path, chunk.Content, parser.ParseComments)
	if err != nil {
		return issues // Return empty if parsing fails
	}
	
	// Analyze functions
	ast.Inspect(node, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.FuncDecl:
			if x.Body != nil {
				complexity := a.calculateCyclomaticComplexity(x.Body)
				pos := fset.Position(x.Pos())
				
				if complexity > 10 {
					severity := models.SeverityMedium
					if complexity > 20 {
						severity = models.SeverityHigh
					}
					
					issues = append(issues, models.ReadabilityIssue{
						Issue: models.Issue{
							Type:       "high_complexity",
							Severity:   severity,
							Message:    fmt.Sprintf("Function '%s' has high cyclomatic complexity (%d)", x.Name.Name, complexity),
							File:       file.Path,
							Line:       pos.Line,
							Suggestion: "Consider breaking this function into smaller, simpler functions",
						},
						Metric:    "cyclomatic_complexity",
						Value:     float64(complexity),
						Threshold: 10,
					})
				}
				
				// Check function length
				end := fset.Position(x.End())
				length := end.Line - pos.Line
				if length > 50 {
					issues = append(issues, models.ReadabilityIssue{
						Issue: models.Issue{
							Type:       "long_function",
							Severity:   models.SeverityMedium,
							Message:    fmt.Sprintf("Function '%s' is too long (%d lines)", x.Name.Name, length),
							File:       file.Path,
							Line:       pos.Line,
							Suggestion: "Consider breaking this function into smaller functions",
						},
						Metric:    "function_length",
						Value:     float64(length),
						Threshold: 50,
					})
				}
			}
		}
		return true
	})
	
	return issues
}

// analyzeJSComplexity analyzes JavaScript/TypeScript complexity
func (a *Analyzer) analyzeJSComplexity(file models.FileInfo, chunk models.Chunk) []models.ReadabilityIssue {
	var issues []models.ReadabilityIssue
	
	lines := strings.Split(chunk.Content, "\n")
	
	// Simple heuristic-based analysis for JS/TS
	functionPattern := regexp.MustCompile(`function\s+(\w+)|(\w+)\s*[:=]\s*function|(\w+)\s*=>\s*{`)
	
	inFunction := false
	functionStart := 0
	functionName := ""
	braceCount := 0
	complexity := 1
	
	for i, line := range lines {
		lineNumber := chunk.StartLine + i
		trimmed := strings.TrimSpace(line)
		
		// Detect function start
		if matches := functionPattern.FindStringSubmatch(line); matches != nil {
			inFunction = true
			functionStart = lineNumber
			functionName = a.extractFunctionName(matches)
			braceCount = 0
			complexity = 1
		}
		
		if inFunction {
			// Count braces to detect function end
			braceCount += strings.Count(line, "{") - strings.Count(line, "}")
			
			// Count complexity indicators
			if strings.Contains(trimmed, "if") || strings.Contains(trimmed, "else if") {
				complexity++
			}
			if strings.Contains(trimmed, "for") || strings.Contains(trimmed, "while") {
				complexity++
			}
			if strings.Contains(trimmed, "switch") {
				complexity++
			}
			if strings.Contains(trimmed, "case") {
				complexity++
			}
			
			// Function ended
			if braceCount <= 0 && i > 0 {
				functionLength := lineNumber - functionStart
				
				if complexity > 10 {
					severity := models.SeverityMedium
					if complexity > 20 {
						severity = models.SeverityHigh
					}
					
					issues = append(issues, models.ReadabilityIssue{
						Issue: models.Issue{
							Type:       "high_complexity",
							Severity:   severity,
							Message:    fmt.Sprintf("Function '%s' has high complexity (%d)", functionName, complexity),
							File:       file.Path,
							Line:       functionStart,
							Suggestion: "Consider breaking this function into smaller functions",
						},
						Metric:    "cyclomatic_complexity",
						Value:     float64(complexity),
						Threshold: 10,
					})
				}
				
				if functionLength > 50 {
					issues = append(issues, models.ReadabilityIssue{
						Issue: models.Issue{
							Type:       "long_function",
							Severity:   models.SeverityMedium,
							Message:    fmt.Sprintf("Function '%s' is too long (%d lines)", functionName, functionLength),
							File:       file.Path,
							Line:       functionStart,
							Suggestion: "Consider breaking this function into smaller functions",
						},
						Metric:    "function_length",
						Value:     float64(functionLength),
						Threshold: 50,
					})
				}
				
				inFunction = false
			}
		}
	}
	
	return issues
}

// calculateCyclomaticComplexity calculates the cyclomatic complexity of a Go function
func (a *Analyzer) calculateCyclomaticComplexity(body *ast.BlockStmt) int {
	complexity := 1 // Base complexity
	
	ast.Inspect(body, func(n ast.Node) bool {
		switch n.(type) {
		case *ast.IfStmt:
			complexity++
		case *ast.ForStmt, *ast.RangeStmt:
			complexity++
		case *ast.SwitchStmt, *ast.TypeSwitchStmt:
			complexity++
		case *ast.CaseClause:
			complexity++
		}
		return true
	})
	
	return complexity
}

// hasPoorNaming checks if a line contains poor variable naming
func (a *Analyzer) hasPoorNaming(line string) bool {
	// Simple heuristics for poor naming
	poorPatterns := []string{
		`\b[a-z]\b`,           // Single letter variables
		`\btemp\b`,            // Generic temp variables
		`\bdata\b`,            // Generic data variables
		`\binfo\b`,            // Generic info variables
		`\bobj\b`,             // Generic object variables
		`\bvar\d+\b`,          // Numbered variables
	}
	
	for _, pattern := range poorPatterns {
		matched, _ := regexp.MatchString(pattern, line)
		if matched {
			return true
		}
	}
	
	return false
}

// getIndentationLevel calculates the indentation level of a line
func (a *Analyzer) getIndentationLevel(line string) int {
	level := 0
	for _, char := range line {
		if char == ' ' {
			level++
		} else if char == '\t' {
			level += 4 // Assume tab = 4 spaces
		} else {
			break
		}
	}
	return level / 4 // Assume 4 spaces per level
}

// extractFunctionName extracts function name from regex matches
func (a *Analyzer) extractFunctionName(matches []string) string {
	for _, match := range matches {
		if match != "" && unicode.IsLetter(rune(match[0])) {
			return match
		}
	}
	return "anonymous"
}
