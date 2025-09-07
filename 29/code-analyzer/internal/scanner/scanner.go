package scanner

import (
	"bufio"
	"crypto/md5"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"code-analyzer/internal/config"
	"code-analyzer/internal/models"
)

// Scanner handles file discovery and chunking for large codebases
type Scanner struct {
	config config.Config
}

// New creates a new scanner instance
func New(cfg config.Config) *Scanner {
	return &Scanner{config: cfg}
}

// ScanDirectory recursively scans a directory and returns file information
func (s *Scanner) ScanDirectory() ([]models.FileInfo, error) {
	var files []models.FileInfo

	err := filepath.Walk(s.config.TargetPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if info.IsDir() {
			return nil
		}

		// Check if file should be excluded
		if s.shouldExclude(path) {
			return nil
		}

		// Check if file is a supported code file
		if !s.isCodeFile(path) {
			return nil
		}

		fileInfo, err := s.processFile(path, info)
		if err != nil {
			if s.config.Verbose {
				fmt.Printf("Warning: Failed to process file %s: %v\n", path, err)
			}
			return nil // Continue processing other files
		}

		files = append(files, fileInfo)
		return nil
	})

	return files, err
}

// processFile processes a single file and creates chunks if necessary
func (s *Scanner) processFile(path string, info os.FileInfo) (models.FileInfo, error) {
	fileInfo := models.FileInfo{
		Path:         path,
		Language:     s.detectLanguage(path),
		Size:         info.Size(),
		LastModified: info.ModTime(),
	}

	file, err := os.Open(path)
	if err != nil {
		return fileInfo, err
	}
	defer file.Close()

	// Process file content using streaming approach for memory efficiency
	lines, chunks, err := s.processFileContentStreaming(file)
	if err != nil {
		return fileInfo, err
	}

	fileInfo.Lines = lines
	fileInfo.Chunks = chunks

	return fileInfo, nil
}

// processFileContentStreaming reads file content and creates chunks using streaming approach
// This method processes files of any size without loading everything into memory
func (s *Scanner) processFileContentStreaming(file *os.File) (int, []models.Chunk, error) {
	scanner := bufio.NewScanner(file)
	var chunks []models.Chunk
	var currentChunk strings.Builder
	lineCount := 0
	chunkStartLine := 1
	linesInCurrentChunk := 0
	chunkCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		lineCount++
		linesInCurrentChunk++

		// Add line to current chunk
		if currentChunk.Len() > 0 {
			currentChunk.WriteString("\n")
		}
		currentChunk.WriteString(line)

		// Check if we should finalize the current chunk
		if linesInCurrentChunk >= s.config.ChunkSize {
			content := currentChunk.String()
			hash := fmt.Sprintf("%x", md5.Sum([]byte(content)))
			
			chunk := models.Chunk{
				StartLine: chunkStartLine,
				EndLine:   lineCount,
				Content:   content,
				Hash:      hash,
			}
			chunks = append(chunks, chunk)
			chunkCount++

			// Check if we've reached the maximum number of chunks per file
			if chunkCount >= s.config.MaxChunksPerFile {
				if s.config.Verbose {
					fmt.Printf("Warning: File has too many lines, truncating at %d chunks (%d lines)\n", 
						s.config.MaxChunksPerFile, lineCount)
				}
				// Continue counting lines but stop creating chunks
				for scanner.Scan() {
					lineCount++
				}
				break
			}

			// Reset for next chunk
			currentChunk.Reset()
			chunkStartLine = lineCount + 1
			linesInCurrentChunk = 0
		}
	}

	if err := scanner.Err(); err != nil {
		return 0, nil, err
	}

	// Handle remaining lines in the last chunk (if we haven't hit the limit)
	if linesInCurrentChunk > 0 && chunkCount < s.config.MaxChunksPerFile {
		content := currentChunk.String()
		hash := fmt.Sprintf("%x", md5.Sum([]byte(content)))
		
		chunk := models.Chunk{
			StartLine: chunkStartLine,
			EndLine:   lineCount,
			Content:   content,
			Hash:      hash,
		}
		chunks = append(chunks, chunk)
	}

	// If no chunks were created (empty file), create an empty chunk
	if len(chunks) == 0 {
		chunks = []models.Chunk{
			{
				StartLine: 1,
				EndLine:   0,
				Content:   "",
				Hash:      fmt.Sprintf("%x", md5.Sum([]byte(""))),
			},
		}
	}

	return lineCount, chunks, nil
}


// shouldExclude checks if a file should be excluded based on patterns
func (s *Scanner) shouldExclude(path string) bool {
	for _, pattern := range s.config.ExcludePatterns {
		matched, err := filepath.Match(pattern, path)
		if err == nil && matched {
			return true
		}

		// Check if any parent directory matches the pattern
		dir := filepath.Dir(path)
		for dir != "." && dir != "/" {
			matched, err := filepath.Match(pattern, filepath.Base(dir))
			if err == nil && matched {
				return true
			}
			dir = filepath.Dir(dir)
		}
	}
	return false
}

// isCodeFile determines if a file is a supported code file
func (s *Scanner) isCodeFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))

	codeExtensions := map[string]bool{
		".go":    true,
		".js":    true,
		".ts":    true,
		".jsx":   true,
		".tsx":   true,
		".py":    true,
		".java":  true,
		".c":     true,
		".cpp":   true,
		".cc":    true,
		".cxx":   true,
		".h":     true,
		".hpp":   true,
		".cs":    true,
		".php":   true,
		".rb":    true,
		".swift": true,
		".kt":    true,
		".scala": true,
		".rs":    true,
		".dart":  true,
		".lua":   true,
		".sh":    true,
		".bash":  true,
		".zsh":   true,
		".fish":  true,
		".ps1":   true,
		".bat":   true,
		".cmd":   true,
		".html":  true,
		".htm":   true,
		".css":   true,
		".scss":  true,
		".sass":  true,
		".less":  true,
		".xml":   true,
		".json":  true,
		".yaml":  true,
		".yml":   true,
		".toml":  true,
		".ini":   true,
		".cfg":   true,
		".conf":  true,
		".sql":   true,
		".r":     true,
		".m":     true,
		".mm":    true,
		".pl":    true,
		".pm":    true,
		".tcl":   true,
		".vb":    true,
		".vbs":   true,
		".asm":   true,
		".s":     true,
		".f":     true,
		".f90":   true,
		".f95":   true,
		".pas":   true,
		".pp":    true,
		".inc":   true,
	}

	return codeExtensions[ext]
}

// detectLanguage attempts to detect the programming language of a file
func (s *Scanner) detectLanguage(path string) string {
	ext := strings.ToLower(filepath.Ext(path))

	languageMap := map[string]string{
		".go":    "Go",
		".js":    "JavaScript",
		".ts":    "TypeScript",
		".jsx":   "JavaScript",
		".tsx":   "TypeScript",
		".py":    "Python",
		".java":  "Java",
		".c":     "C",
		".cpp":   "C++",
		".cc":    "C++",
		".cxx":   "C++",
		".h":     "C/C++",
		".hpp":   "C++",
		".cs":    "C#",
		".php":   "PHP",
		".rb":    "Ruby",
		".swift": "Swift",
		".kt":    "Kotlin",
		".scala": "Scala",
		".rs":    "Rust",
		".dart":  "Dart",
		".lua":   "Lua",
		".sh":    "Shell",
		".bash":  "Bash",
		".zsh":   "Zsh",
		".fish":  "Fish",
		".ps1":   "PowerShell",
		".bat":   "Batch",
		".cmd":   "Batch",
		".html":  "HTML",
		".htm":   "HTML",
		".css":   "CSS",
		".scss":  "SCSS",
		".sass":  "Sass",
		".less":  "Less",
		".xml":   "XML",
		".json":  "JSON",
		".yaml":  "YAML",
		".yml":   "YAML",
		".toml":  "TOML",
		".ini":   "INI",
		".cfg":   "Config",
		".conf":  "Config",
		".sql":   "SQL",
		".r":     "R",
		".m":     "Objective-C",
		".mm":    "Objective-C++",
		".pl":    "Perl",
		".pm":    "Perl",
		".tcl":   "Tcl",
		".vb":    "Visual Basic",
		".vbs":   "VBScript",
		".asm":   "Assembly",
		".s":     "Assembly",
		".f":     "Fortran",
		".f90":   "Fortran",
		".f95":   "Fortran",
		".pas":   "Pascal",
		".pp":    "Pascal",
		".inc":   "Include",
	}

	if lang, exists := languageMap[ext]; exists {
		return lang
	}

	return "Unknown"
}
