package reporter

import (
	"encoding/json"
	"fmt"
	"html/template"
	"os"
	"strings"

	"code-analyzer/internal/models"
	"github.com/fatih/color"
)

// Reporter generates analysis reports in different formats
type Reporter struct {
	format string
}

// New creates a new reporter instance
func New(format string) *Reporter {
	return &Reporter{format: format}
}

// Generate creates a report from analysis results
func (r *Reporter) Generate(results *models.AnalysisResult) error {
	switch r.format {
	case "json":
		return r.generateJSON(results)
	case "html":
		return r.generateHTML(results)
	case "console":
		return r.generateConsole(results)
	default:
		return fmt.Errorf("unsupported output format: %s", r.format)
	}
}

// generateJSON outputs results as JSON
func (r *Reporter) generateJSON(results *models.AnalysisResult) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(results)
}

// generateConsole outputs results to console with colors
func (r *Reporter) generateConsole(results *models.AnalysisResult) error {
	// Header
	fmt.Println(color.New(color.FgCyan, color.Bold).Sprint("🔍 Code Analysis Report"))
	fmt.Println(strings.Repeat("=", 50))
	
	// Summary
	fmt.Println(color.New(color.FgYellow, color.Bold).Sprint("\n📊 Summary"))
	fmt.Printf("Files scanned: %d\n", results.Summary.FilesScanned)
	fmt.Printf("Lines analyzed: %d\n", results.Summary.LinesAnalyzed)
	fmt.Printf("Analysis duration: %v\n", results.Duration)
	fmt.Printf("Total issues found: %d\n", results.Summary.TotalIssues)
	
	if results.Summary.TotalIssues == 0 {
		fmt.Println(color.New(color.FgGreen, color.Bold).Sprint("\n✅ No issues found! Your code looks great!"))
		return nil
	}
	
	// Issue breakdown
	fmt.Printf("  - Duplicates: %d\n", results.Summary.DuplicatesFound)
	fmt.Printf("  - Readability issues: %d\n", results.Summary.ReadabilityIssues)
	fmt.Printf("  - Dependency issues: %d\n", results.Summary.DependencyIssues)
	
	// Duplicate issues
	if len(results.Duplicates) > 0 {
		fmt.Println(color.New(color.FgMagenta, color.Bold).Sprint("\n🔄 Duplicate Code Issues"))
		fmt.Println(strings.Repeat("-", 30))
		
		for i, issue := range results.Duplicates {
			if i >= 10 { // Limit output
				fmt.Printf("... and %d more duplicate issues\n", len(results.Duplicates)-10)
				break
			}
			
			r.printIssue(issue.Issue, fmt.Sprintf("Found in %d locations (%d lines)", len(issue.Locations), issue.LinesCount))
			
			// Show locations
			for j, loc := range issue.Locations {
				if j >= 3 { // Limit locations shown
					fmt.Printf("    ... and %d more locations\n", len(issue.Locations)-3)
					break
				}
				fmt.Printf("    📍 %s:%d-%d\n", loc.File, loc.StartLine, loc.EndLine)
			}
			fmt.Println()
		}
	}
	
	// Readability issues
	if len(results.Readability) > 0 {
		fmt.Println(color.New(color.FgBlue, color.Bold).Sprint("\n📖 Readability Issues"))
		fmt.Println(strings.Repeat("-", 30))
		
		for i, issue := range results.Readability {
			if i >= 15 { // Limit output
				fmt.Printf("... and %d more readability issues\n", len(results.Readability)-15)
				break
			}
			
			detail := fmt.Sprintf("Metric: %s (%.1f/%.1f)", issue.Metric, issue.Value, issue.Threshold)
			r.printIssue(issue.Issue, detail)
			
			if issue.CodeSnippet != "" {
				fmt.Printf("    Code: %s\n", strings.TrimSpace(issue.CodeSnippet))
			}
			fmt.Println()
		}
	}
	
	// Dependency issues
	if len(results.Dependencies) > 0 {
		fmt.Println(color.New(color.FgRed, color.Bold).Sprint("\n📦 Dependency Issues"))
		fmt.Println(strings.Repeat("-", 30))
		
		for i, issue := range results.Dependencies {
			if i >= 10 { // Limit output
				fmt.Printf("... and %d more dependency issues\n", len(results.Dependencies)-10)
				break
			}
			
			detail := fmt.Sprintf("Package: %s", issue.Package)
			if issue.CurrentVersion != "" {
				detail += fmt.Sprintf(" (v%s)", issue.CurrentVersion)
			}
			if issue.HasVulnerability {
				detail += " ⚠️ SECURITY RISK"
			}
			
			r.printIssue(issue.Issue, detail)
			fmt.Println()
		}
	}
	
	// Footer with recommendations
	fmt.Println(color.New(color.FgGreen, color.Bold).Sprint("\n💡 Recommendations"))
	fmt.Println("1. Address critical and high severity issues first")
	fmt.Println("2. Focus on security vulnerabilities in dependencies")
	fmt.Println("3. Refactor duplicate code into reusable functions")
	fmt.Println("4. Break down complex functions into smaller ones")
	fmt.Println("5. Update outdated dependencies to latest stable versions")
	
	return nil
}

// printIssue prints a single issue with appropriate colors
func (r *Reporter) printIssue(issue models.Issue, detail string) {
	var severityColor *color.Color
	var severityIcon string
	
	switch issue.Severity {
	case models.SeverityCritical:
		severityColor = color.New(color.FgRed, color.Bold)
		severityIcon = "🚨"
	case models.SeverityHigh:
		severityColor = color.New(color.FgRed)
		severityIcon = "❗"
	case models.SeverityMedium:
		severityColor = color.New(color.FgYellow)
		severityIcon = "⚠️"
	case models.SeverityLow:
		severityColor = color.New(color.FgBlue)
		severityIcon = "ℹ️"
	default:
		severityColor = color.New(color.FgWhite)
		severityIcon = "📝"
	}
	
	fmt.Printf("%s %s %s\n", 
		severityIcon,
		severityColor.Sprint(strings.ToUpper(string(issue.Severity))),
		issue.Message)
	
	if issue.File != "" {
		location := issue.File
		if issue.Line > 0 {
			location += fmt.Sprintf(":%d", issue.Line)
		}
		fmt.Printf("    📁 %s\n", location)
	}
	
	if detail != "" {
		fmt.Printf("    %s\n", detail)
	}
	
	if issue.Suggestion != "" {
		fmt.Printf("    💡 %s\n", color.New(color.FgGreen).Sprint(issue.Suggestion))
	}
}

// generateHTML outputs results as HTML report
func (r *Reporter) generateHTML(results *models.AnalysisResult) error {
	htmlTemplate := `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .summary { padding: 30px; border-bottom: 1px solid #eee; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
        .summary-card .number { font-size: 2em; font-weight: bold; color: #007bff; }
        .section { padding: 30px; border-bottom: 1px solid #eee; }
        .section h2 { margin: 0 0 20px 0; color: #495057; }
        .issue { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #dee2e6; }
        .issue.critical { border-left-color: #dc3545; }
        .issue.high { border-left-color: #fd7e14; }
        .issue.medium { border-left-color: #ffc107; }
        .issue.low { border-left-color: #17a2b8; }
        .issue-header { font-weight: 600; color: #495057; }
        .issue-file { color: #6c757d; font-size: 0.9em; margin: 5px 0; }
        .issue-suggestion { color: #28a745; margin: 10px 0; font-style: italic; }
        .severity { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 600; text-transform: uppercase; }
        .severity.critical { background: #dc3545; color: white; }
        .severity.high { background: #fd7e14; color: white; }
        .severity.medium { background: #ffc107; color: #212529; }
        .severity.low { background: #17a2b8; color: white; }
        .no-issues { text-align: center; padding: 60px; color: #28a745; }
        .no-issues h3 { font-size: 1.5em; margin: 0 0 10px 0; }
        .footer { padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
        .recommendations { list-style: none; padding: 0; }
        .recommendations li { padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .recommendations li:last-child { border-bottom: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Code Analysis Report</h1>
            <p>Generated on {{.Timestamp.Format "January 2, 2006 at 3:04 PM"}} • Duration: {{.Duration}}</p>
        </div>
        
        <div class="summary">
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Files Scanned</h3>
                    <div class="number">{{.Summary.FilesScanned}}</div>
                </div>
                <div class="summary-card">
                    <h3>Lines Analyzed</h3>
                    <div class="number">{{.Summary.LinesAnalyzed}}</div>
                </div>
                <div class="summary-card">
                    <h3>Total Issues</h3>
                    <div class="number">{{.Summary.TotalIssues}}</div>
                </div>
                <div class="summary-card">
                    <h3>Duplicates</h3>
                    <div class="number">{{.Summary.DuplicatesFound}}</div>
                </div>
            </div>
        </div>
        
        {{if eq .Summary.TotalIssues 0}}
        <div class="no-issues">
            <h3>✅ No Issues Found!</h3>
            <p>Your code looks great! Keep up the good work.</p>
        </div>
        {{else}}
        
        {{if .Duplicates}}
        <div class="section">
            <h2>🔄 Duplicate Code Issues ({{len .Duplicates}})</h2>
            {{range .Duplicates}}
            <div class="issue {{.Issue.Severity}}">
                <div class="issue-header">
                    <span class="severity {{.Issue.Severity}}">{{.Issue.Severity}}</span>
                    {{.Issue.Message}}
                </div>
                <div class="issue-file">{{.Issue.File}}:{{.Issue.Line}} • {{.LinesCount}} lines • {{len .Locations}} locations</div>
                {{if .Issue.Suggestion}}<div class="issue-suggestion">💡 {{.Issue.Suggestion}}</div>{{end}}
            </div>
            {{end}}
        </div>
        {{end}}
        
        {{if .Readability}}
        <div class="section">
            <h2>📖 Readability Issues ({{len .Readability}})</h2>
            {{range .Readability}}
            <div class="issue {{.Issue.Severity}}">
                <div class="issue-header">
                    <span class="severity {{.Issue.Severity}}">{{.Issue.Severity}}</span>
                    {{.Issue.Message}}
                </div>
                <div class="issue-file">{{.Issue.File}}:{{.Issue.Line}} • {{.Metric}}: {{printf "%.1f" .Value}}/{{printf "%.1f" .Threshold}}</div>
                {{if .Issue.Suggestion}}<div class="issue-suggestion">💡 {{.Issue.Suggestion}}</div>{{end}}
            </div>
            {{end}}
        </div>
        {{end}}
        
        {{if .Dependencies}}
        <div class="section">
            <h2>📦 Dependency Issues ({{len .Dependencies}})</h2>
            {{range .Dependencies}}
            <div class="issue {{.Issue.Severity}}">
                <div class="issue-header">
                    <span class="severity {{.Issue.Severity}}">{{.Issue.Severity}}</span>
                    {{.Issue.Message}}
                </div>
                <div class="issue-file">{{.Issue.File}}:{{.Issue.Line}} • Package: {{.Package}} {{if .CurrentVersion}}(v{{.CurrentVersion}}){{end}}</div>
                {{if .Issue.Suggestion}}<div class="issue-suggestion">💡 {{.Issue.Suggestion}}</div>{{end}}
            </div>
            {{end}}
        </div>
        {{end}}
        
        {{end}}
        
        <div class="footer">
            <h3>💡 Recommendations</h3>
            <ul class="recommendations">
                <li>🚨 Address critical and high severity issues first</li>
                <li>🔒 Focus on security vulnerabilities in dependencies</li>
                <li>🔄 Refactor duplicate code into reusable functions</li>
                <li>📏 Break down complex functions into smaller ones</li>
                <li>📦 Update outdated dependencies to latest stable versions</li>
            </ul>
        </div>
    </div>
</body>
</html>`

	tmpl, err := template.New("report").Parse(htmlTemplate)
	if err != nil {
		return err
	}

	return tmpl.Execute(os.Stdout, results)
}
