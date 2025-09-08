package main

import (
	"fmt"
	"os"
	"strings"

	"code-analyzer/internal/config"
	"code-analyzer/internal/scanner"
)

func testMain() {
	// Create a test file with many lines (use .js extension so it's recognized as code)
	testFile := "large_test_file.js"
	
	// Create a file with 10,000 lines to test streaming
	file, err := os.Create(testFile)
	if err != nil {
		fmt.Printf("Error creating test file: %v\n", err)
		return
	}
	
	fmt.Println("Creating test file with 10,000 lines...")
	for i := 1; i <= 10000; i++ {
		fmt.Fprintf(file, "// This is line number %d with some content to make it realistic\n", i)
	}
	file.Close()
	
	// Test the scanner with the large file
	cfg := config.DefaultConfig()
	cfg.TargetPath = "."
	cfg.Verbose = true
	cfg.ChunkSize = 50  // Small chunks for testing
	cfg.MaxChunksPerFile = 100  // Limit chunks for testing
	
	s := scanner.New(cfg)
	
	fmt.Println("Scanning files...")
	files, err := s.ScanDirectory()
	if err != nil {
		fmt.Printf("Error scanning: %v\n", err)
		return
	}
	
	// Find our test file in the results
	for _, fileInfo := range files {
		if strings.Contains(fileInfo.Path, testFile) {
			fmt.Printf("File: %s\n", fileInfo.Path)
			fmt.Printf("Lines: %d\n", fileInfo.Lines)
			fmt.Printf("Chunks: %d\n", len(fileInfo.Chunks))
			fmt.Printf("Language: %s\n", fileInfo.Language)
			
			// Show first and last chunk info
			if len(fileInfo.Chunks) > 0 {
				first := fileInfo.Chunks[0]
				last := fileInfo.Chunks[len(fileInfo.Chunks)-1]
				fmt.Printf("First chunk: lines %d-%d\n", first.StartLine, first.EndLine)
				fmt.Printf("Last chunk: lines %d-%d\n", last.StartLine, last.EndLine)
			}
			break
		}
	}
	
	// Clean up
	os.Remove(testFile)
	fmt.Println("Test completed successfully!")
}

func main() {
	testMain()
}
