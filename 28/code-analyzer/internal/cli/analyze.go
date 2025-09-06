package cli

import (
	"fmt"
	"path/filepath"

	"code-analyzer/internal/analyzer"
	"code-analyzer/internal/config"
	"code-analyzer/internal/reporter"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var analyzeCmd = &cobra.Command{
	Use:   "analyze [path]",
	Short: "Analyze a codebase for duplicates, readability issues, and obsolete dependencies",
	Long: `Analyze performs a comprehensive analysis of the specified codebase:
- Scans for duplicate code blocks
- Evaluates code readability and complexity
- Checks for obsolete or unused dependencies
- Generates improvement suggestions`,
	Args: cobra.MaximumNArgs(1),
	RunE: runAnalyze,
}

func init() {
	rootCmd.AddCommand(analyzeCmd)
	
	analyzeCmd.Flags().BoolP("duplicates", "d", true, "analyze duplicate code")
	analyzeCmd.Flags().BoolP("readability", "r", true, "analyze code readability")
	analyzeCmd.Flags().BoolP("dependencies", "p", true, "analyze dependencies")
	analyzeCmd.Flags().StringSliceP("exclude", "e", []string{}, "exclude patterns (glob)")
	analyzeCmd.Flags().IntP("min-lines", "m", 5, "minimum lines for duplicate detection")
	analyzeCmd.Flags().Float64P("similarity", "s", 0.8, "similarity threshold for duplicates (0.0-1.0)")
	
	viper.BindPFlag("duplicates", analyzeCmd.Flags().Lookup("duplicates"))
	viper.BindPFlag("readability", analyzeCmd.Flags().Lookup("readability"))
	viper.BindPFlag("dependencies", analyzeCmd.Flags().Lookup("dependencies"))
	viper.BindPFlag("exclude", analyzeCmd.Flags().Lookup("exclude"))
	viper.BindPFlag("min-lines", analyzeCmd.Flags().Lookup("min-lines"))
	viper.BindPFlag("similarity", analyzeCmd.Flags().Lookup("similarity"))
}

func runAnalyze(cmd *cobra.Command, args []string) error {
	targetPath := "."
	if len(args) > 0 {
		targetPath = args[0]
	}

	absPath, err := filepath.Abs(targetPath)
	if err != nil {
		return fmt.Errorf("failed to resolve path: %w", err)
	}

	cfg := config.Config{
		TargetPath:         absPath,
		AnalyzeDuplicates:  viper.GetBool("duplicates"),
		AnalyzeReadability: viper.GetBool("readability"),
		AnalyzeDependencies: viper.GetBool("dependencies"),
		ExcludePatterns:    viper.GetStringSlice("exclude"),
		MinLines:          viper.GetInt("min-lines"),
		SimilarityThreshold: viper.GetFloat64("similarity"),
		OutputFormat:      viper.GetString("output"),
		Verbose:           viper.GetBool("verbose"),
	}

	analyzer := analyzer.New(cfg)
	
	fmt.Printf("Analyzing codebase at: %s\n", absPath)
	
	results, err := analyzer.Analyze()
	if err != nil {
		return fmt.Errorf("analysis failed: %w", err)
	}

	reporter := reporter.New(cfg.OutputFormat)
	return reporter.Generate(results)
}
