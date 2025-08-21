const esprima = require('esprima');
const { parse } = require('@babel/parser');

class CodeParser {
    constructor() {
        this.supportedLanguages = ['javascript', 'python', 'java', 'go', 'ruby', 'php', 'csharp', 'rust'];
    }

    /**
     * Парсит код и разделяет его на функции/методы
     */
    parseCode(code, language) {
        try {
            switch (language.toLowerCase()) {
                case 'javascript':
                case 'typescript':
                    return this.parseJavaScript(code);
                case 'python':
                    return this.parsePython(code);
                case 'java':
                    return this.parseJava(code);
                case 'go':
                    return this.parseGo(code);
                case 'ruby':
                    return this.parseRuby(code);
                case 'php':
                    return this.parsePHP(code);
                case 'csharp':
                    return this.parseCSharp(code);
                case 'rust':
                    return this.parseRust(code);
                default:
                    return this.parseGeneric(code);
            }
        } catch (error) {
            console.error(`Error parsing ${language} code:`, error);
            return this.parseGeneric(code);
        }
    }

    /**
     * Парсинг JavaScript/TypeScript кода
     */
    parseJavaScript(code) {
        const functions = [];
        const classes = [];
        let imports = [];
        let exports = [];

        try {
            const ast = parse(code, {
                sourceType: 'module',
                allowImportExportEverywhere: true,
                allowReturnOutsideFunction: true,
                plugins: ['typescript', 'jsx', 'decorators-legacy']
            });

            this.traverseAST(ast, {
                FunctionDeclaration: (node) => {
                    functions.push({
                        name: node.id?.name || 'anonymous',
                        type: 'function',
                        params: node.params.map(p => p.name || 'param'),
                        code: this.extractCodeFromNode(code, node),
                        line: node.loc?.start?.line || 0
                    });
                },
                ArrowFunctionExpression: (node, parent) => {
                    if (parent.type === 'VariableDeclarator' && parent.id?.name) {
                        functions.push({
                            name: parent.id.name,
                            type: 'arrow_function',
                            params: node.params.map(p => p.name || 'param'),
                            code: this.extractCodeFromNode(code, parent),
                            line: node.loc?.start?.line || 0
                        });
                    }
                },
                ClassDeclaration: (node) => {
                    const methods = [];
                    node.body.body.forEach(method => {
                        if (method.type === 'MethodDefinition') {
                            methods.push({
                                name: method.key.name,
                                type: method.kind,
                                params: method.value.params.map(p => p.name || 'param'),
                                code: this.extractCodeFromNode(code, method),
                                line: method.loc?.start?.line || 0
                            });
                        }
                    });
                    
                    classes.push({
                        name: node.id.name,
                        type: 'class',
                        methods: methods,
                        code: this.extractCodeFromNode(code, node),
                        line: node.loc?.start?.line || 0
                    });
                },
                ImportDeclaration: (node) => {
                    imports.push({
                        source: node.source.value,
                        specifiers: node.specifiers.map(s => s.local?.name || s.imported?.name)
                    });
                },
                ExportNamedDeclaration: (node) => {
                    if (node.declaration) {
                        exports.push({
                            name: node.declaration.id?.name || 'default',
                            type: 'named'
                        });
                    }
                }
            });
        } catch (error) {
            console.error('JavaScript parsing error:', error);
            return this.parseGeneric(code);
        }

        return {
            language: 'javascript',
            functions,
            classes,
            imports,
            exports,
            totalFunctions: functions.length + classes.reduce((sum, cls) => sum + cls.methods.length, 0)
        };
    }

    /**
     * Парсинг Python кода
     */
    parsePython(code) {
        const functions = [];
        const classes = [];
        const imports = [];
        
        const lines = code.split('\n');
        let currentIndent = 0;
        let currentClass = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Импорты
            if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                imports.push(trimmed);
                continue;
            }

            // Функции
            const funcMatch = trimmed.match(/^def\s+(\w+)\s*\(([^)]*)\):/);
            if (funcMatch) {
                const indent = line.length - line.trimStart().length;
                const funcName = funcMatch[1];
                const params = funcMatch[2].split(',').map(p => p.trim().split('=')[0].trim()).filter(p => p);
                
                const funcCode = this.extractPythonBlock(lines, i, indent);
                
                const funcObj = {
                    name: funcName,
                    type: 'function',
                    params: params,
                    code: funcCode,
                    line: i + 1,
                    indent: indent
                };

                if (currentClass && indent > currentClass.indent) {
                    currentClass.methods.push(funcObj);
                } else {
                    functions.push(funcObj);
                }
            }

            // Классы
            const classMatch = trimmed.match(/^class\s+(\w+)(?:\([^)]*\))?:/);
            if (classMatch) {
                const indent = line.length - line.trimStart().length;
                const className = classMatch[1];
                
                currentClass = {
                    name: className,
                    type: 'class',
                    methods: [],
                    code: '',
                    line: i + 1,
                    indent: indent
                };
                
                classes.push(currentClass);
            }
        }

        // Извлекаем код для классов
        classes.forEach(cls => {
            const classLines = lines.slice(cls.line - 1);
            cls.code = this.extractPythonBlock(lines, cls.line - 1, cls.indent);
        });

        return {
            language: 'python',
            functions,
            classes,
            imports,
            totalFunctions: functions.length + classes.reduce((sum, cls) => sum + cls.methods.length, 0)
        };
    }

    /**
     * Парсинг Java кода
     */
    parseJava(code) {
        const functions = [];
        const classes = [];
        const imports = [];
        
        const lines = code.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Импорты
            if (line.startsWith('import ')) {
                imports.push(line);
                continue;
            }

            // Методы
            const methodMatch = line.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+)?\s*\{?/);
            if (methodMatch && !line.includes('class ')) {
                const methodName = methodMatch[1];
                const methodCode = this.extractJavaBlock(lines, i);
                
                functions.push({
                    name: methodName,
                    type: 'method',
                    code: methodCode,
                    line: i + 1
                });
            }

            // Классы
            const classMatch = line.match(/(?:public|private)?\s*class\s+(\w+)/);
            if (classMatch) {
                const className = classMatch[1];
                const classCode = this.extractJavaBlock(lines, i);
                
                classes.push({
                    name: className,
                    type: 'class',
                    code: classCode,
                    line: i + 1
                });
            }
        }

        return {
            language: 'java',
            functions,
            classes,
            imports,
            totalFunctions: functions.length
        };
    }

    /**
     * Парсинг Go кода
     */
    parseGo(code) {
        const functions = [];
        const structs = [];
        const imports = [];
        
        const lines = code.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Импорты
            if (line.startsWith('import ')) {
                imports.push(line);
                continue;
            }

            // Функции
            const funcMatch = line.match(/func\s+(?:\([^)]*\)\s+)?(\w+)\s*\([^)]*\)(?:\s*\([^)]*\))?\s*\{?/);
            if (funcMatch) {
                const funcName = funcMatch[1];
                const funcCode = this.extractGoBlock(lines, i);
                
                functions.push({
                    name: funcName,
                    type: 'function',
                    code: funcCode,
                    line: i + 1
                });
            }

            // Структуры
            const structMatch = line.match(/type\s+(\w+)\s+struct\s*\{/);
            if (structMatch) {
                const structName = structMatch[1];
                const structCode = this.extractGoBlock(lines, i);
                
                structs.push({
                    name: structName,
                    type: 'struct',
                    code: structCode,
                    line: i + 1
                });
            }
        }

        return {
            language: 'go',
            functions,
            structs,
            imports,
            totalFunctions: functions.length
        };
    }

    /**
     * Универсальный парсер для неподдерживаемых языков
     */
    parseGeneric(code) {
        const functions = [];
        const lines = code.split('\n');
        
        // Простые паттерны для поиска функций
        const patterns = [
            /function\s+(\w+)/,  // JavaScript
            /def\s+(\w+)/,       // Python
            /func\s+(\w+)/,      // Go
            /(\w+)\s*\(/,        // Общий паттерн
        ];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    functions.push({
                        name: match[1],
                        type: 'function',
                        code: line,
                        line: i + 1
                    });
                    break;
                }
            }
        }

        return {
            language: 'generic',
            functions,
            totalFunctions: functions.length
        };
    }

    /**
     * Вспомогательные методы для извлечения блоков кода
     */
    extractPythonBlock(lines, startIndex, baseIndent) {
        const block = [lines[startIndex]];
        
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            const indent = line.length - line.trimStart().length;
            
            if (line.trim() === '') {
                block.push(line);
                continue;
            }
            
            if (indent <= baseIndent && line.trim() !== '') {
                break;
            }
            
            block.push(line);
        }
        
        return block.join('\n');
    }

    extractJavaBlock(lines, startIndex) {
        const block = [lines[startIndex]];
        let braceCount = (lines[startIndex].match(/\{/g) || []).length - (lines[startIndex].match(/\}/g) || []).length;
        
        for (let i = startIndex + 1; i < lines.length && braceCount > 0; i++) {
            const line = lines[i];
            block.push(line);
            braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        }
        
        return block.join('\n');
    }

    extractGoBlock(lines, startIndex) {
        return this.extractJavaBlock(lines, startIndex); // Аналогично Java
    }

    extractCodeFromNode(code, node) {
        if (!node.loc) return '';
        
        const lines = code.split('\n');
        const start = node.loc.start.line - 1;
        const end = node.loc.end.line;
        
        return lines.slice(start, end).join('\n');
    }

    traverseAST(node, visitors, parent = null) {
        if (!node || typeof node !== 'object') return;
        
        if (visitors[node.type]) {
            visitors[node.type](node, parent);
        }
        
        for (const key in node) {
            if (key === 'parent' || key === 'loc' || key === 'range') continue;
            
            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(item => this.traverseAST(item, visitors, node));
            } else if (child && typeof child === 'object') {
                this.traverseAST(child, visitors, node);
            }
        }
    }
}

module.exports = CodeParser;
