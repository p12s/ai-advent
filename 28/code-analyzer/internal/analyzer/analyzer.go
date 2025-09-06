package analyzer

import (
	"fmt"
	"time"

	"code-analyzer/internal/config"
	"code-analyzer/internal/models"
	"code-analyzer/internal/scanner"
	"code-analyzer/internal/analyzers/duplicates"
	"code-analyzer/internal/analyzers/readability"
	"code-analyzer/internal/analyzers/dependencies"
)

// Analyzer orchestrates the analysis process
type Analyzer struct {
	config   config.Config
	scanner  *scanner.Scanner
}

// New creates a new analyzer instance
func New(cfg config.Config) *Analyzer {
	return &Analyzer{
		config:  cfg,
		scanner: scanner.New(cfg),
	}
}

// Analyze performs the complete analysis of the codebase
func (a *Analyzer) Analyze() (*models.AnalysisResult, error) {
	startTime := time.Now()

	if a.config.Verbose {
		fmt.Println("Starting codebase analysis...")
	}

	// Step 1: Scan and discover files
	if a.config.Verbose {
		fmt.Println("Scanning files...")
	}
	
	files, err := a.scanner.ScanDirectory()
	if err != nil {
		return nil, fmt.Errorf("failed to scan directory: %w", err)
	}

	if len(files) == 0 {
		return nil, fmt.Errorf("no code files found in %s", a.config.TargetPath)
	}

	if a.config.Verbose {
		fmt.Printf("Found %d files to analyze\n", len(files))
	}

	// Initialize result
	result := &models.AnalysisResult{
		Timestamp: startTime,
		Summary: models.Summary{
			FilesScanned: len(files),
		},
	}

	// Calculate total lines
	for _, file := range files {
		result.Summary.LinesAnalyzed += file.Lines
	}

	// Step 2: Run duplicate analysis
	if a.config.AnalyzeDuplicates {
		if a.config.Verbose {
			fmt.Println("Analyzing duplicates...")
		}
		
		duplicateAnalyzer := duplicates.New(a.config)
		duplicateIssues, err := duplicateAnalyzer.Analyze(files)
		if err != nil {
			return nil, fmt.Errorf("duplicate analysis failed: %w", err)
		}
		
		result.Duplicates = duplicateIssues
		result.Summary.DuplicatesFound = len(duplicateIssues)
	}

	// Step 3: Run readability analysis
	if a.config.AnalyzeReadability {
		if a.config.Verbose {
			fmt.Println("Analyzing readability...")
		}
		
		readabilityAnalyzer := readability.New(a.config)
		readabilityIssues, err := readabilityAnalyzer.Analyze(files)
		if err != nil {
			return nil, fmt.Errorf("readability analysis failed: %w", err)
		}
		
		result.Readability = readabilityIssues
		result.Summary.ReadabilityIssues = len(readabilityIssues)
	}

	// Step 4: Run dependency analysis
	if a.config.AnalyzeDependencies {
		if a.config.Verbose {
			fmt.Println("Analyzing dependencies...")
		}
		
		dependencyAnalyzer := dependencies.New(a.config)
		dependencyIssues, err := dependencyAnalyzer.Analyze(a.config.TargetPath)
		if err != nil {
			return nil, fmt.Errorf("dependency analysis failed: %w", err)
		}
		
		result.Dependencies = dependencyIssues
		result.Summary.DependencyIssues = len(dependencyIssues)
	}

	// Calculate totals
	result.Summary.TotalIssues = result.Summary.DuplicatesFound + 
		result.Summary.ReadabilityIssues + 
		result.Summary.DependencyIssues

	result.Duration = time.Since(startTime)

	if a.config.Verbose {
		fmt.Printf("Analysis completed in %v\n", result.Duration)
		fmt.Printf("Total issues found: %d\n", result.Summary.TotalIssues)
	}

	return result, nil
}
