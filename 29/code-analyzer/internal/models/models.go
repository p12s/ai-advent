package models

import "time"

// AnalysisResult represents the complete analysis results
type AnalysisResult struct {
	Summary      Summary           `json:"summary"`
	Duplicates   []DuplicateIssue  `json:"duplicates,omitempty"`
	Readability  []ReadabilityIssue `json:"readability,omitempty"`
	Dependencies []DependencyIssue `json:"dependencies,omitempty"`
	Timestamp    time.Time         `json:"timestamp"`
	Duration     time.Duration     `json:"duration"`
}

// Summary provides high-level statistics about the analysis
type Summary struct {
	FilesScanned     int `json:"files_scanned"`
	LinesAnalyzed    int `json:"lines_analyzed"`
	DuplicatesFound  int `json:"duplicates_found"`
	ReadabilityIssues int `json:"readability_issues"`
	DependencyIssues int `json:"dependency_issues"`
	TotalIssues      int `json:"total_issues"`
}

// Issue represents a generic code issue
type Issue struct {
	Type        string   `json:"type"`
	Severity    Severity `json:"severity"`
	Message     string   `json:"message"`
	File        string   `json:"file"`
	Line        int      `json:"line,omitempty"`
	Column      int      `json:"column,omitempty"`
	Suggestion  string   `json:"suggestion,omitempty"`
}

// DuplicateIssue represents duplicate code detection results
type DuplicateIssue struct {
	Issue
	Locations     []Location `json:"locations"`
	SimilarityScore float64  `json:"similarity_score"`
	LinesCount    int        `json:"lines_count"`
	CodeSnippet   string     `json:"code_snippet"`
}

// ReadabilityIssue represents code readability problems
type ReadabilityIssue struct {
	Issue
	Metric      string  `json:"metric"`
	Value       float64 `json:"value"`
	Threshold   float64 `json:"threshold"`
	CodeSnippet string  `json:"code_snippet,omitempty"`
}

// DependencyIssue represents dependency-related problems
type DependencyIssue struct {
	Issue
	Package        string `json:"package"`
	CurrentVersion string `json:"current_version,omitempty"`
	LatestVersion  string `json:"latest_version,omitempty"`
	IsUnused       bool   `json:"is_unused"`
	HasVulnerability bool `json:"has_vulnerability"`
	VulnerabilityDetails string `json:"vulnerability_details,omitempty"`
}

// Location represents a code location
type Location struct {
	File      string `json:"file"`
	StartLine int    `json:"start_line"`
	EndLine   int    `json:"end_line"`
	StartCol  int    `json:"start_col,omitempty"`
	EndCol    int    `json:"end_col,omitempty"`
}

// Severity represents issue severity levels
type Severity string

const (
	SeverityCritical Severity = "critical"
	SeverityHigh     Severity = "high"
	SeverityMedium   Severity = "medium"
	SeverityLow      Severity = "low"
	SeverityInfo     Severity = "info"
)

// FileInfo represents information about a scanned file
type FileInfo struct {
	Path         string    `json:"path"`
	Language     string    `json:"language"`
	Size         int64     `json:"size"`
	Lines        int       `json:"lines"`
	LastModified time.Time `json:"last_modified"`
	Chunks       []Chunk   `json:"chunks,omitempty"`
}

// Chunk represents a portion of a large file
type Chunk struct {
	StartLine int    `json:"start_line"`
	EndLine   int    `json:"end_line"`
	Content   string `json:"content"`
	Hash      string `json:"hash"`
}
