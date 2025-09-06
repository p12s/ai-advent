package dependencies

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"code-analyzer/internal/config"
	"code-analyzer/internal/models"
)

// Analyzer analyzes project dependencies
type Analyzer struct {
	config config.Config
}

// PackageJSON represents a Node.js package.json file
type PackageJSON struct {
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
}

// GoMod represents basic go.mod information
type GoMod struct {
	Module  string
	Require []Requirement
}

type Requirement struct {
	Path    string
	Version string
}

// New creates a new dependency analyzer
func New(cfg config.Config) *Analyzer {
	return &Analyzer{config: cfg}
}

// Analyze performs dependency analysis on the project
func (a *Analyzer) Analyze(projectPath string) ([]models.DependencyIssue, error) {
	var issues []models.DependencyIssue
	
	// Analyze package.json files
	packageIssues, err := a.analyzePackageJSON(projectPath)
	if err != nil && a.config.Verbose {
		fmt.Printf("Warning: package.json analysis failed: %v\n", err)
	}
	issues = append(issues, packageIssues...)
	
	// Analyze go.mod files
	goIssues, err := a.analyzeGoMod(projectPath)
	if err != nil && a.config.Verbose {
		fmt.Printf("Warning: go.mod analysis failed: %v\n", err)
	}
	issues = append(issues, goIssues...)
	
	// Analyze requirements.txt files
	pythonIssues, err := a.analyzeRequirementsTxt(projectPath)
	if err != nil && a.config.Verbose {
		fmt.Printf("Warning: requirements.txt analysis failed: %v\n", err)
	}
	issues = append(issues, pythonIssues...)
	
	return issues, nil
}

// analyzePackageJSON analyzes Node.js dependencies
func (a *Analyzer) analyzePackageJSON(projectPath string) ([]models.DependencyIssue, error) {
	var issues []models.DependencyIssue
	
	err := filepath.Walk(projectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if info.Name() == "package.json" {
			fileIssues, err := a.analyzePackageJSONFile(path)
			if err != nil {
				return err
			}
			issues = append(issues, fileIssues...)
		}
		
		return nil
	})
	
	return issues, err
}

// analyzePackageJSONFile analyzes a single package.json file
func (a *Analyzer) analyzePackageJSONFile(filePath string) ([]models.DependencyIssue, error) {
	var issues []models.DependencyIssue
	
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return issues, err
	}
	
	var pkg PackageJSON
	if err := json.Unmarshal(content, &pkg); err != nil {
		return issues, err
	}
	
	// Check dependencies
	for name, version := range pkg.Dependencies {
		depIssues := a.analyzeDependency(filePath, name, version, false)
		issues = append(issues, depIssues...)
	}
	
	// Check dev dependencies
	for name, version := range pkg.DevDependencies {
		depIssues := a.analyzeDependency(filePath, name, version, true)
		issues = append(issues, depIssues...)
	}
	
	return issues, nil
}

// analyzeGoMod analyzes Go module dependencies
func (a *Analyzer) analyzeGoMod(projectPath string) ([]models.DependencyIssue, error) {
	var issues []models.DependencyIssue
	
	err := filepath.Walk(projectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if info.Name() == "go.mod" {
			fileIssues, err := a.analyzeGoModFile(path)
			if err != nil {
				return err
			}
			issues = append(issues, fileIssues...)
		}
		
		return nil
	})
	
	return issues, err
}

// analyzeGoModFile analyzes a single go.mod file
func (a *Analyzer) analyzeGoModFile(filePath string) ([]models.DependencyIssue, error) {
	var issues []models.DependencyIssue
	
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return issues, err
	}
	
	lines := strings.Split(string(content), "\n")
	inRequireBlock := false
	
	for i, line := range lines {
		line = strings.TrimSpace(line)
		
		if strings.HasPrefix(line, "require (") {
			inRequireBlock = true
			continue
		}
		
		if inRequireBlock && line == ")" {
			inRequireBlock = false
			continue
		}
		
		if inRequireBlock || strings.HasPrefix(line, "require ") {
			// Parse requirement line
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				module := parts[0]
				version := parts[1]
				
				// Skip "require" keyword if present
				if module == "require" && len(parts) >= 3 {
					module = parts[1]
					version = parts[2]
				}
				
				depIssues := a.analyzeGoModule(filePath, module, version, i+1)
				issues = append(issues, depIssues...)
			}
		}
	}
	
	return issues, nil
}

// analyzeRequirementsTxt analyzes Python requirements.txt files
func (a *Analyzer) analyzeRequirementsTxt(projectPath string) ([]models.DependencyIssue, error) {
	var issues []models.DependencyIssue
	
	err := filepath.Walk(projectPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		
		if info.Name() == "requirements.txt" {
			fileIssues, err := a.analyzeRequirementsTxtFile(path)
			if err != nil {
				return err
			}
			issues = append(issues, fileIssues...)
		}
		
		return nil
	})
	
	return issues, err
}

// analyzeRequirementsTxtFile analyzes a single requirements.txt file
func (a *Analyzer) analyzeRequirementsTxtFile(filePath string) ([]models.DependencyIssue, error) {
	var issues []models.DependencyIssue
	
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return issues, err
	}
	
	lines := strings.Split(string(content), "\n")
	
	for i, line := range lines {
		line = strings.TrimSpace(line)
		
		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		
		// Parse requirement line (package==version or package>=version, etc.)
		var packageName, version string
		
		if strings.Contains(line, "==") {
			parts := strings.Split(line, "==")
			packageName = strings.TrimSpace(parts[0])
			if len(parts) > 1 {
				version = strings.TrimSpace(parts[1])
			}
		} else if strings.Contains(line, ">=") {
			parts := strings.Split(line, ">=")
			packageName = strings.TrimSpace(parts[0])
			if len(parts) > 1 {
				version = strings.TrimSpace(parts[1])
			}
		} else {
			packageName = line
			version = "unknown"
		}
		
		depIssues := a.analyzePythonPackage(filePath, packageName, version, i+1)
		issues = append(issues, depIssues...)
	}
	
	return issues, nil
}

// analyzeDependency analyzes a Node.js dependency
func (a *Analyzer) analyzeDependency(filePath, name, version string, isDev bool) []models.DependencyIssue {
	var issues []models.DependencyIssue
	
	// Check for outdated version patterns
	if a.isOutdatedVersion(version) {
		severity := models.SeverityMedium
		if !isDev {
			severity = models.SeverityHigh
		}
		
		issues = append(issues, models.DependencyIssue{
			Issue: models.Issue{
				Type:       "outdated_dependency",
				Severity:   severity,
				Message:    fmt.Sprintf("Dependency '%s' may be outdated (version: %s)", name, version),
				File:       filePath,
				Suggestion: "Consider updating to the latest stable version",
			},
			Package:        name,
			CurrentVersion: version,
		})
	}
	
	// Check for known vulnerable packages (simplified list)
	if a.isVulnerablePackage(name) {
		issues = append(issues, models.DependencyIssue{
			Issue: models.Issue{
				Type:       "vulnerable_dependency",
				Severity:   models.SeverityCritical,
				Message:    fmt.Sprintf("Dependency '%s' has known security vulnerabilities", name),
				File:       filePath,
				Suggestion: "Update to a secure version or find an alternative package",
			},
			Package:            name,
			CurrentVersion:     version,
			HasVulnerability:   true,
			VulnerabilityDetails: "This package has been flagged for security issues",
		})
	}
	
	return issues
}

// analyzeGoModule analyzes a Go module dependency
func (a *Analyzer) analyzeGoModule(filePath, module, version string, line int) []models.DependencyIssue {
	var issues []models.DependencyIssue
	
	// Check for pre-v1.0 versions that might be unstable
	if strings.HasPrefix(version, "v0.") {
		issues = append(issues, models.DependencyIssue{
			Issue: models.Issue{
				Type:       "unstable_dependency",
				Severity:   models.SeverityMedium,
				Message:    fmt.Sprintf("Module '%s' is pre-v1.0 (%s) and may be unstable", module, version),
				File:       filePath,
				Line:       line,
				Suggestion: "Consider using a stable v1.0+ version if available",
			},
			Package:        module,
			CurrentVersion: version,
		})
	}
	
	// Check for very old versions (simplified heuristic)
	if strings.Contains(version, "+incompatible") {
		issues = append(issues, models.DependencyIssue{
			Issue: models.Issue{
				Type:       "incompatible_dependency",
				Severity:   models.SeverityHigh,
				Message:    fmt.Sprintf("Module '%s' is marked as incompatible", module),
				File:       filePath,
				Line:       line,
				Suggestion: "Update to a compatible version that follows semantic versioning",
			},
			Package:        module,
			CurrentVersion: version,
		})
	}
	
	return issues
}

// analyzePythonPackage analyzes a Python package dependency
func (a *Analyzer) analyzePythonPackage(filePath, packageName, version string, line int) []models.DependencyIssue {
	var issues []models.DependencyIssue
	
	// Check for packages with known security issues (simplified)
	vulnerablePackages := map[string]bool{
		"requests": false, // Example: older versions had issues
		"django":   false, // Example: check for very old versions
		"flask":    false, // Example: check for very old versions
	}
	
	if _, exists := vulnerablePackages[strings.ToLower(packageName)]; exists {
		issues = append(issues, models.DependencyIssue{
			Issue: models.Issue{
				Type:       "potentially_vulnerable",
				Severity:   models.SeverityMedium,
				Message:    fmt.Sprintf("Package '%s' should be checked for security updates", packageName),
				File:       filePath,
				Line:       line,
				Suggestion: "Verify you're using the latest secure version",
			},
			Package:        packageName,
			CurrentVersion: version,
		})
	}
	
	return issues
}

// isOutdatedVersion checks if a version string indicates an outdated package
func (a *Analyzer) isOutdatedVersion(version string) bool {
	// Simple heuristics for outdated versions
	outdatedPatterns := []string{
		"^0.",     // Very early versions
		"^1.0.",   // Very old 1.x versions
		"^1.1.",   // Old 1.x versions
	}
	
	for _, pattern := range outdatedPatterns {
		if strings.HasPrefix(version, strings.TrimPrefix(pattern, "^")) {
			return true
		}
	}
	
	return false
}

// isVulnerablePackage checks if a package is known to have vulnerabilities
func (a *Analyzer) isVulnerablePackage(name string) bool {
	// Simplified list of packages that have had security issues
	// In a real implementation, this would query a vulnerability database
	vulnerablePackages := map[string]bool{
		"lodash":     false, // Had prototype pollution issues in older versions
		"handlebars": false, // Had template injection issues
		"jquery":     false, // Older versions had XSS vulnerabilities
		"moment":     false, // Deprecated, should use alternatives
	}
	
	return vulnerablePackages[strings.ToLower(name)]
}
