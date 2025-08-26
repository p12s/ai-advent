/**
 * Tests for github-analysis.js
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { loadGitHubAnalysisModule, mockFetch, clearMocks } = require('./test-utils');

mockFetch();

global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock window object for browser environment
global.window = {
    githubConfig: {
        url: '',
        token: 'test-token'
    },
    autoUpdateConfig: {
        enabled: true,
        intervalMinutes: 60,
        startMinute: 15
    },
    addMessage: jest.fn(),
    parseGitHubDataFromReport: jest.fn(),
    createHtmlReport: jest.fn(),
    dockerReportManager: {
        checkHealth: jest.fn(),
        deployHtmlReport: jest.fn()
    },
    sendGitHubReportToTelegram: jest.fn(),
    showFullPlanModal: jest.fn(),
    open: jest.fn()
};

// Mock DOM elements
global.document = {
    createElement: jest.fn(() => ({
        textContent: '',
        className: '',
        style: {},
        onclick: null,
        appendChild: jest.fn(),
        remove: jest.fn()
    })),
    querySelector: jest.fn(),
    getElementById: jest.fn(() => ({
        appendChild: jest.fn(),
        scrollTop: 0,
        scrollHeight: 100
    })),
    addEventListener: jest.fn()
};

global.navigator = {
    clipboard: {
        writeText: jest.fn(() => Promise.resolve())
    }
};

beforeAll(() => {
    loadGitHubAnalysisModule();
});

beforeEach(() => {
    clearMocks();
    jest.clearAllMocks();
});

describe('GitHubAgent', () => {
    let githubAgent;

    beforeEach(() => {
        githubAgent = new GitHubAgent();
    });

    test('должен создавать экземпляр с правильными свойствами', () => {
        expect(githubAgent).toBeDefined();
        expect(githubAgent.isActive).toBe(false);
    });

    describe('getGitHubData', () => {
        test('должен возвращать ошибку когда MCP GitHub не подключен', async () => {
            // Устанавливаем mcpGithubEnabled в false
            global.mcpGithubEnabled = false;

            const result = await githubAgent.getGitHubData();

            expect(result).toEqual({
                type: 'error',
                content: '❌ GitHub MCP не подключен. Проверьте конфигурацию.',
                message: 'GitHub MCP недоступен'
            });
        });

        test('должен успешно получать данные от GitHub MCP сервера', async () => {
            global.mcpGithubEnabled = true;
            
            const mockAnalysisData = {
                user: 'testuser',
                totalRepositories: 3,
                totalIssues: 5,
                repositories: [
                    {
                        owner: 'testuser',
                        name: 'repo1',
                        description: 'Test repository 1',
                        issues: 3
                    }
                ],
                generatedAt: new Date().toISOString()
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: mockAnalysisData
                })
            });

            const result = await githubAgent.getGitHubData();

            expect(fetch).toHaveBeenCalledWith('http://localhost:3002/mcp/github/analysis', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            expect(result.type).toBe('success');
            expect(result.content).toContain('testuser');
            expect(result.content).toContain('3');
            expect(result.content).toContain('5');
            expect(result.message).toBe('✅ GitHub анализ завершен!');
        });

        test('должен обрабатывать HTTP ошибки', async () => {
            global.mcpGithubEnabled = true;

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const result = await githubAgent.getGitHubData();

            expect(result).toEqual({
                type: 'error',
                content: '❌ Не удалось получить данные от GitHub MCP сервера',
                message: 'Ошибка получения данных'
            });
        });

        test('должен обрабатывать ошибки сервера', async () => {
            global.mcpGithubEnabled = true;

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: false,
                    error: 'Server error'
                })
            });

            const result = await githubAgent.getGitHubData();

            expect(result).toEqual({
                type: 'error',
                content: '❌ Ошибка GitHub MCP сервера: Server error',
                message: 'Ошибка сервера'
            });
        });

        test('должен обрабатывать сетевые ошибки', async () => {
            global.mcpGithubEnabled = true;

            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await githubAgent.getGitHubData();

            expect(result.type).toBe('error');
            expect(result.content).toContain('Network error');
            expect(result.message).toBe('Ошибка анализа');
            expect(console.error).toHaveBeenCalledWith('Error in GitHub analysis:', expect.any(Error));
        });
    });
});

describe('getGithubData', () => {
    test('должен возвращать null когда MCP GitHub не подключен', async () => {
        global.mcpGithubEnabled = false;

        const result = await getGithubData();

        expect(result).toBeNull();
    });

    test('должен успешно получать данные репозиториев и задач', async () => {
        global.mcpGithubEnabled = true;

        const mockRepos = [
            {
                name: 'repo1',
                owner: { login: 'testuser' },
                description: 'Test repository'
            }
        ];

        const mockIssues = [
            {
                title: 'Test issue',
                state: 'open',
                created_at: '2024-01-01T00:00:00Z'
            }
        ];

        fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    result: {
                        content: [{ text: JSON.stringify(mockRepos) }]
                    }
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    result: {
                        content: [{ text: JSON.stringify(mockIssues) }]
                    }
                })
            });

        const result = await getGithubData();

        expect(result).toEqual({
            repositories: mockRepos,
            issues: mockIssues
        });

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenNthCalledWith(1, 'http://localhost:3002/tools/call', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                name: "list_repositories",
                arguments: {}
            })
        });
    });

    test('должен обрабатывать ошибки получения данных', async () => {
        global.mcpGithubEnabled = true;

        fetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await getGithubData();

        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalledWith('Error getting GitHub data:', expect.any(Error));
    });

    test('должен обрабатывать отсутствие данных в ответе', async () => {
        global.mcpGithubEnabled = true;

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                result: null
            })
        });

        const result = await getGithubData();

        expect(result).toBeNull();
    });
});

describe('createGithubReport', () => {
    test('должен создавать отчет для валидных данных GitHub', async () => {
        const githubData = {
            repositories: [
                {
                    name: 'repo1',
                    description: 'Test repository 1'
                },
                {
                    name: 'repo2',
                    description: null
                }
            ],
            issues: [
                {
                    title: 'Issue 1',
                    state: 'open',
                    created_at: '2024-01-01T00:00:00Z'
                },
                {
                    title: 'Issue 2',
                    state: 'open',
                    created_at: '2024-01-02T00:00:00Z'
                }
            ]
        };

        const result = await createGithubReport(githubData);

        expect(result).toBeTruthy();
        expect(result).toContain('# GitHub Отчет');
        expect(result).toContain('## Репозитории');
        expect(result).toContain('- **repo1**: Test repository 1');
        expect(result).toContain('- **repo2**: Без описания');
        expect(result).toContain('## Открытые задачи');
        expect(result).toContain('- **Issue 1**: open');
        expect(result).toContain('- **Issue 2**: open');
        expect(result).toContain('## Статистика');
        expect(result).toContain('- Всего репозиториев: 2');
        expect(result).toContain('- Открытых задач: 2');
        expect(result).toContain('- Последнее обновление:');
    });

    test('должен возвращать null для пустых данных', async () => {
        const result = await createGithubReport(null);

        expect(result).toBeNull();
    });

    test('должен обрабатывать пустые массивы', async () => {
        const githubData = {
            repositories: [],
            issues: []
        };

        const result = await createGithubReport(githubData);

        expect(result).toBeTruthy();
        expect(result).toContain('- Всего репозиториев: 0');
        expect(result).toContain('- Открытых задач: 0');
    });
});

describe('createAndDeployHtmlReport', () => {
    beforeEach(() => {
        window.createHtmlReport.mockReset();
        window.dockerReportManager.checkHealth.mockReset();
        window.dockerReportManager.deployHtmlReport.mockReset();
    });

    test('должен успешно создавать и развертывать HTML отчет', async () => {
        const githubData = {
            user: 'testuser',
            totalRepositories: 2,
            totalIssues: 3
        };

        const htmlContent = '<html><body>Test report</body></html>';
        const deploymentResult = {
            success: true,
            containerId: 'test-container',
            containerName: 'github-report-test',
            url: 'http://localhost:8080',
            port: 8080
        };

        window.createHtmlReport.mockResolvedValue(htmlContent);
        window.dockerReportManager.checkHealth.mockResolvedValue(true);
        window.dockerReportManager.deployHtmlReport.mockResolvedValue(deploymentResult);

        const result = await createAndDeployHtmlReport(githubData);

        expect(window.createHtmlReport).toHaveBeenCalledWith(githubData);
        expect(window.dockerReportManager.checkHealth).toHaveBeenCalled();
        expect(window.dockerReportManager.deployHtmlReport).toHaveBeenCalledWith(htmlContent);
        expect(result).toEqual(deploymentResult);
    });

    test('должен возвращать ошибку когда не удается создать HTML контент', async () => {
        const githubData = { user: 'testuser' };

        window.createHtmlReport.mockResolvedValue(null);

        const result = await createAndDeployHtmlReport(githubData);

        expect(result).toEqual({
            success: false,
            error: 'Failed to create HTML report'
        });
    });

    test('должен возвращать ошибку когда Docker Report Manager не инициализирован', async () => {
        const githubData = { user: 'testuser' };
        const htmlContent = '<html><body>Test</body></html>';

        window.createHtmlReport.mockResolvedValue(htmlContent);
        window.dockerReportManager = null;

        const result = await createAndDeployHtmlReport(githubData);

        expect(result).toEqual({
            success: false,
            error: 'Docker Report Manager not initialized'
        });
    });

    test('должен возвращать ошибку когда Docker MCP сервис недоступен', async () => {
        const githubData = { user: 'testuser' };
        const htmlContent = '<html><body>Test</body></html>';

        window.createHtmlReport.mockResolvedValue(htmlContent);
        window.dockerReportManager = {
            checkHealth: jest.fn().mockResolvedValue(false),
            deployHtmlReport: jest.fn()
        };

        const result = await createAndDeployHtmlReport(githubData);

        expect(result).toEqual({
            success: false,
            error: 'Docker MCP service unavailable'
        });
    });

    test('должен возвращать ошибку при неудачном развертывании', async () => {
        const githubData = { user: 'testuser' };
        const htmlContent = '<html><body>Test</body></html>';

        window.createHtmlReport.mockResolvedValue(htmlContent);
        window.dockerReportManager.checkHealth.mockResolvedValue(true);
        window.dockerReportManager.deployHtmlReport.mockResolvedValue({
            success: false,
            error: 'Deployment failed'
        });

        const result = await createAndDeployHtmlReport(githubData);

        expect(result).toEqual({
            success: false,
            error: 'Deployment error: Deployment failed'
        });
    });
});

describe('initMCPGithub', () => {
    test('должен успешно инициализировать GitHub MCP', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                github_initialized: true
            })
        });

        await initMCPGithub();

        expect(fetch).toHaveBeenCalledWith('http://localhost:3001/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        expect(global.mcpGithubEnabled).toBe(true);
    });

    test('должен обрабатывать случай когда сервер запущен но не инициализирован', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                github_initialized: false
            })
        });

        await initMCPGithub();

        expect(console.error).toHaveBeenCalledWith('GitHub MCP server is running but not initialized');
        expect(global.mcpGithubEnabled).toBeFalsy();
    });

    test('должен обрабатывать HTTP ошибки', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        await initMCPGithub();

        expect(console.error).toHaveBeenCalledWith('Failed to connect to GitHub MCP server:', 500);
        expect(global.mcpGithubEnabled).toBeFalsy();
    });

    test('должен обрабатывать сетевые ошибки', async () => {
        fetch.mockRejectedValueOnce(new Error('Network error'));

        await initMCPGithub();

        expect(console.error).toHaveBeenCalledWith('Error initializing GitHub MCP:', expect.any(Error));
        expect(global.mcpGithubEnabled).toBeFalsy();
    });
});

describe('performAutoGitHubUpdate', () => {
    beforeEach(() => {
        window.addMessage.mockReset();
        window.parseGitHubDataFromReport.mockReset();
        window.sendGitHubReportToTelegram.mockReset();
        document.createElement.mockReset();
        document.querySelector.mockReset();
        document.getElementById.mockReset();
    });

    test('должен завершиться рано если MCP GitHub не подключен', async () => {
        global.mcpGithubEnabled = false;

        await performAutoGitHubUpdate();

        expect(window.addMessage).not.toHaveBeenCalled();
    });

    test('должен успешно выполнять автоматическое обновление', async () => {
        global.mcpGithubEnabled = true;
        
        const mockResult = {
            type: 'success',
            content: 'Test GitHub report content',
            message: 'Success'
        };

        const mockGithubData = {
            user: 'testuser',
            totalRepositories: 2,
            totalIssues: 1
        };

        const mockHtmlResult = {
            success: true,
            url: 'http://localhost:8080'
        };

        // Mock GitHubAgent
        global.GitHubAgent = jest.fn().mockImplementation(() => ({
            getGitHubData: jest.fn().mockResolvedValue(mockResult)
        }));

        const mockLoadingMessage = { remove: jest.fn() };
        window.addMessage.mockReturnValue(mockLoadingMessage);
        window.parseGitHubDataFromReport.mockReturnValue(mockGithubData);
        window.sendGitHubReportToTelegram.mockResolvedValue();
        
        global.createAndDeployHtmlReport = jest.fn().mockResolvedValue(mockHtmlResult);

        await performAutoGitHubUpdate();

        expect(window.addMessage).toHaveBeenCalledWith('🕐 Автоматическое обновление GitHub данных...', false, false, 'System', 'github');
        expect(window.addMessage).toHaveBeenCalledWith('...', false, true, 'Agent3', 'github');
        expect(mockLoadingMessage.remove).toHaveBeenCalled();
        expect(window.addMessage).toHaveBeenCalledWith(mockResult.content, false, false, 'Agent3', 'github');
        expect(window.addMessage).toHaveBeenCalledWith('✅ Автоматическое обновление завершено!', false, false, 'System', 'github');
    });

    test('должен обрабатывать ошибки при автоматическом обновлении', async () => {
        global.mcpGithubEnabled = true;

        global.GitHubAgent = jest.fn().mockImplementation(() => ({
            getGitHubData: jest.fn().mockRejectedValue(new Error('Test error'))
        }));

        const mockLoadingMessage = { remove: jest.fn() };
        window.addMessage.mockReturnValue(mockLoadingMessage);

        await performAutoGitHubUpdate();

        expect(mockLoadingMessage.remove).toHaveBeenCalled();
        expect(window.addMessage).toHaveBeenCalledWith('❌ Ошибка при автоматическом обновлении: Test error', false, false, 'Agent3', 'github');
    });
});

describe('Интеграционные тесты', () => {
    test('должен корректно обрабатывать полный цикл GitHub анализа', async () => {
        global.mcpGithubEnabled = true;

        const mockAnalysisData = {
            user: 'testuser',
            totalRepositories: 2,
            totalIssues: 3,
            repositories: [
                {
                    owner: 'testuser',
                    name: 'repo1',
                    description: 'Test repository',
                    issues: 3
                }
            ],
            generatedAt: new Date().toISOString()
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                data: mockAnalysisData
            })
        });

        const githubAgent = new GitHubAgent();
        const result = await githubAgent.getGitHubData();

        expect(result.type).toBe('success');
        expect(result.content).toContain('testuser');
        expect(result.content).toContain('2');
        expect(result.content).toContain('3');
        expect(result.message).toBe('✅ GitHub анализ завершен!');
    });

    test('должен корректно создавать отчет из данных GitHub API', async () => {
        const githubData = {
            repositories: [
                { name: 'repo1', description: 'Test repo 1' },
                { name: 'repo2', description: 'Test repo 2' }
            ],
            issues: [
                { title: 'Issue 1', state: 'open', created_at: '2024-01-01' }
            ]
        };

        const report = await createGithubReport(githubData);

        expect(report).toContain('# GitHub Отчет');
        expect(report).toContain('repo1');
        expect(report).toContain('repo2');
        expect(report).toContain('Issue 1');
        expect(report).toContain('Всего репозиториев: 2');
        expect(report).toContain('Открытых задач: 1');
    });
});
