# Code Analyzer

A comprehensive Go-based code analysis tool that helps improve code quality by detecting duplicates, analyzing readability, and identifying dependency issues.

## Features

### 🔍 **Duplicate Code Detection**
- **AST-based Analysis**: Uses Abstract Syntax Trees for semantic code comparison
- **Hash-based Matching**: Generates fingerprints for functions/classes to find exact duplicates
- **Cross-file Analysis**: Detects duplicates across different files and directories
- **Configurable Thresholds**: Set minimum line counts and similarity thresholds

### 📖 **Readability Analysis**
- **Complexity Metrics**: Calculates cyclomatic complexity and nesting depth
- **Function Length**: Identifies overly long functions that should be broken down
- **Naming Conventions**: Detects poor variable and function naming patterns
- **Code Structure**: Analyzes indentation, line length, and organization

### 📦 **Dependency Analysis**
- **Multi-language Support**: Analyzes `package.json`, `go.mod`, `requirements.txt`
- **Version Checking**: Identifies outdated and pre-v1.0 unstable packages
- **Security Scanning**: Flags packages with known vulnerabilities
- **Unused Dependencies**: Detects imported but unused packages

### 🚀 **Large Codebase Support**
- **Chunked Processing**: Handles large files by processing them in manageable chunks
- **Memory Efficient**: Streams files instead of loading everything into memory
- **Configurable Limits**: Set file size limits and chunk sizes
- **Progress Tracking**: Verbose mode shows analysis progress

## Installation

### Prerequisites
- Go 1.21 or higher

### Build from Source
```bash
git clone <repository>
cd code-analyzer
go mod tidy
go build -o code-analyzer
```

## Usage

### Basic Analysis
```bash
# Analyze current directory
./code-analyzer analyze

# Analyze specific path
./code-analyzer analyze /path/to/project

# Verbose output
./code-analyzer analyze --verbose
```

### Output Formats
```bash
# Console output (default)
./code-analyzer analyze --output console

# JSON output
./code-analyzer analyze --output json

# HTML report
./code-analyzer analyze --output html > report.html
```

### Analysis Options
```bash
# Analyze only duplicates
./code-analyzer analyze --readability=false --dependencies=false

# Custom duplicate detection settings
./code-analyzer analyze --min-lines 10 --similarity 0.9

# Exclude patterns
./code-analyzer analyze --exclude "node_modules/**" --exclude "*.min.js"
```

### Configuration File
Create `~/.code-analyzer.yaml`:
```yaml
exclude:
  - "node_modules/**"
  - "vendor/**"
  - "*.min.js"
  - "*.min.css"
  - ".git/**"
  - "build/**"
  - "dist/**"
min_lines: 5
similarity: 0.8
max_file_size: 1048576  # 1MB
chunk_size: 100
```

## Command Reference

### Global Flags
- `--config string`: Config file path (default: `$HOME/.code-analyzer.yaml`)
- `--output, -o string`: Output format (`console`, `json`, `html`)
- `--verbose, -v`: Enable verbose output

### Analyze Command Flags
- `--duplicates, -d`: Analyze duplicate code (default: `true`)
- `--readability, -r`: Analyze code readability (default: `true`)
- `--dependencies, -p`: Analyze dependencies (default: `true`)
- `--exclude, -e strings`: Exclude patterns (glob format)
- `--min-lines, -m int`: Minimum lines for duplicate detection (default: `5`)
- `--similarity, -s float`: Similarity threshold for duplicates (default: `0.8`)

## Supported Languages

### Code Analysis
- **Go**: Full AST analysis with complexity metrics
- **JavaScript/TypeScript**: Heuristic-based complexity analysis
- **Python**: Basic structure analysis
- **Java, C/C++, C#**: File-level analysis
- **HTML, CSS**: Structure and formatting analysis

### Dependency Analysis
- **Node.js**: `package.json` analysis
- **Go**: `go.mod` analysis
- **Python**: `requirements.txt` analysis

## Example Output

### Console Output
```
🔍 Code Analysis Report
==================================================

📊 Summary
Files scanned: 46
Lines analyzed: 1,234
Analysis duration: 2.3ms
Total issues found: 8
  - Duplicates: 2
  - Readability issues: 3
  - Dependency issues: 3

🔄 Duplicate Code Issues
------------------------------
🚨 CRITICAL Found duplicate code block (25 lines)
    📁 src/utils.js:45
    Found in 3 locations (25 lines)
    📍 src/utils.js:45-70
    📍 src/helpers.js:12-37
    📍 lib/common.js:89-114
    💡 Consider extracting this code into a shared function

📖 Readability Issues
------------------------------
⚠️ MEDIUM Function 'processData' has high complexity (15)
    📁 src/processor.js:23
    Metric: cyclomatic_complexity (15.0/10.0)
    💡 Consider breaking this function into smaller functions

📦 Dependency Issues
------------------------------
🚨 CRITICAL Dependency 'lodash' has known security vulnerabilities
    📁 package.json:12
    Package: lodash (v4.17.15) ⚠️ SECURITY RISK
    💡 Update to a secure version or find an alternative package
```

### JSON Output
```json
{
  "summary": {
    "files_scanned": 46,
    "lines_analyzed": 1234,
    "duplicates_found": 2,
    "readability_issues": 3,
    "dependency_issues": 3,
    "total_issues": 8
  },
  "duplicates": [
    {
      "type": "duplicate_code",
      "severity": "critical",
      "message": "Duplicate code block found (25 lines)",
      "file": "src/utils.js",
      "line": 45,
      "locations": [
        {"file": "src/utils.js", "start_line": 45, "end_line": 70},
        {"file": "src/helpers.js", "start_line": 12, "end_line": 37}
      ],
      "similarity_score": 1.0,
      "lines_count": 25
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": "2.3ms"
}
```

## Architecture

### Core Components
- **Scanner**: File discovery and chunking for large codebases
- **Analyzers**: Modular analysis engines (duplicates, readability, dependencies)
- **Reporter**: Multi-format output generation (console, JSON, HTML)
- **CLI**: Command-line interface with Cobra framework

### Analysis Flow
1. **File Discovery**: Recursively scan target directory
2. **Filtering**: Apply exclude patterns and file type filters
3. **Chunking**: Split large files into manageable chunks
4. **Analysis**: Run enabled analyzers in parallel
5. **Reporting**: Generate formatted output

## Performance

### Optimizations
- **Streaming Processing**: Files are processed as streams to minimize memory usage
- **Chunked Analysis**: Large files are split into chunks to avoid context limits
- **Parallel Processing**: Independent analysis modules run concurrently
- **Smart Filtering**: Early exclusion of non-code files and patterns

### Benchmarks
- **Small Projects** (< 100 files): < 1 second
- **Medium Projects** (100-1000 files): 1-10 seconds  
- **Large Projects** (1000+ files): 10-60 seconds

## Contributing

### Development Setup
```bash
# Clone repository
git clone <repository>
cd code-analyzer

# Install dependencies
go mod tidy

# Run tests
go test ./...

# Build
go build -o code-analyzer
```

### Adding New Analyzers
1. Create analyzer in `internal/analyzers/<name>/`
2. Implement the `Analyzer` interface
3. Register in `internal/analyzer/analyzer.go`
4. Add CLI flags in `internal/cli/analyze.go`

### Adding Language Support
1. Update `isCodeFile()` in `internal/scanner/scanner.go`
2. Add language detection in `detectLanguage()`
3. Implement language-specific analysis logic

## License

MIT License - see LICENSE file for details

## Roadmap

- [ ] **Web Dashboard**: Interactive web interface for results
- [ ] **Git Integration**: Analyze only changed files in commits
- [ ] **CI/CD Integration**: GitHub Actions and other CI systems
- [ ] **Plugin System**: Custom analyzer plugins
- [ ] **Database Storage**: Store and track analysis history
- [ ] **Team Collaboration**: Share and discuss analysis results
- [ ] **IDE Extensions**: VS Code and other editor integrations
