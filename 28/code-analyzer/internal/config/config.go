package config

// Config holds all configuration options for the analyzer
type Config struct {
	TargetPath          string
	AnalyzeDuplicates   bool
	AnalyzeReadability  bool
	AnalyzeDependencies bool
	ExcludePatterns     []string
	MinLines            int
	SimilarityThreshold float64
	OutputFormat        string
	Verbose             bool
	MaxFileSize         int64 // Maximum file size to process (bytes) - 0 means no limit
	ChunkSize           int   // Lines per chunk for large files
	MaxChunksPerFile    int   // Maximum number of chunks per file to prevent memory issues
}

// DefaultConfig returns a configuration with sensible defaults
func DefaultConfig() Config {
	return Config{
		TargetPath:          ".",
		AnalyzeDuplicates:   true,
		AnalyzeReadability:  true,
		AnalyzeDependencies: true,
		ExcludePatterns: []string{
			"node_modules/**",
			"vendor/**",
			"*.min.js",
			"*.min.css",
			".git/**",
			"build/**",
			"dist/**",
		},
		MinLines:            5,
		SimilarityThreshold: 0.8,
		OutputFormat:        "console",
		Verbose:             false,
		MaxFileSize:         0,    // 0 means no file size limit
		ChunkSize:           100,  // 100 lines per chunk
		MaxChunksPerFile:    1000, // Maximum 1000 chunks per file (100k lines max)
	}
}
