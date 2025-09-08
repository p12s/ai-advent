package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	rootCmd = &cobra.Command{
		Use:   "code-analyzer",
		Short: "A code analysis tool for finding duplicates, improving readability, and detecting obsolete dependencies",
		Long: `Code Analyzer is a comprehensive tool that analyzes your codebase to:
- Find duplicate code blocks and suggest consolidation
- Analyze code readability and complexity metrics
- Detect obsolete or unused dependencies
- Generate actionable improvement suggestions`,
	}
)

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.code-analyzer.yaml)")
	rootCmd.PersistentFlags().StringP("output", "o", "console", "output format (console, json, html)")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "verbose output")
	
	viper.BindPFlag("output", rootCmd.PersistentFlags().Lookup("output"))
	viper.BindPFlag("verbose", rootCmd.PersistentFlags().Lookup("verbose"))
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		cobra.CheckErr(err)

		viper.AddConfigPath(home)
		viper.SetConfigType("yaml")
		viper.SetConfigName(".code-analyzer")
	}

	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err == nil {
		fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	}
}
