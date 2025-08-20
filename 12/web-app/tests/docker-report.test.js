/**
 * Tests for docker-report.js
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

const { loadDockerReportModule, mockFetch, clearMocks } = require('./test-utils');

mockFetch();

global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

beforeAll(() => {
    loadDockerReportModule();
});

beforeEach(() => {
    clearMocks();
});

describe('parseGitHubDataFromReport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('должен корректно парсить валидный markdown отчет', () => {
        const reportContent = `
# GitHub Analysis Report

Пользователь: testuser
Всего репозиториев: 5
Неразрешенных задач: 12

## Repositories

### testuser/repo1
- **Описание**: Test repository 1
- **Открытых задач**: 3

### testuser/repo2
- **Описание**: Test repository 2
- **Открытых задач**: 0

### testuser/repo3
- **Описание**: Test repository 3
- **Открытых задач**: 9
        `;

        const result = parseGitHubDataFromReport(reportContent);

        expect(result).toEqual({
            user: 'testuser',
            totalRepositories: 5,
            totalIssues: 12,
            repositories: [
                {
                    owner: 'testuser',
                    name: 'repo1',
                    description: 'Test repository 1',
                    issues: 3
                },
                {
                    owner: 'testuser',
                    name: 'repo2',
                    description: 'Test repository 2',
                    issues: 0
                },
                {
                    owner: 'testuser',
                    name: 'repo3',
                    description: 'Test repository 3',
                    issues: 9
                }
            ]
        });
    });

    test('должен возвращать дефолтные значения для пустого отчета', () => {
        const result = parseGitHubDataFromReport('');

        expect(result).toEqual({
            user: 'Unknown',
            totalRepositories: 0,
            totalIssues: 0,
            repositories: []
        });
    });

    test('должен обрабатывать отчет без репозиториев', () => {
        const reportContent = `
Пользователь: testuser
Всего репозиториев: 0
Неразрешенных задач: 0
        `;

        const result = parseGitHubDataFromReport(reportContent);

        expect(result).toEqual({
            user: 'testuser',
            totalRepositories: 0,
            totalIssues: 0,
            repositories: []
        });
    });

    test('должен корректно парсить репозитории с разными форматами имен', () => {
        const reportContent = `
### owner/repo-name
- **Описание**: Repository with dash
- **Открытых задач**: 5

### another-owner/repo_name
- **Описание**: Repository with underscore
- **Открытых задач**: 2

### single-repo
- **Описание**: Repository without owner
- **Открытых задач**: 1
        `;

        const result = parseGitHubDataFromReport(reportContent);

        expect(result.repositories).toEqual([
            {
                owner: 'owner',
                name: 'repo-name',
                description: 'Repository with dash',
                issues: 5
            },
            {
                owner: 'another-owner',
                name: 'repo_name',
                description: 'Repository with underscore',
                issues: 2
            },
            {
                owner: 'Unknown',
                name: 'single-repo',
                description: 'Repository without owner',
                issues: 1
            }
        ]);
    });

    test('должен обрабатывать ошибки парсинга', () => {
        const invalidContent = null;
        
        const result = parseGitHubDataFromReport(invalidContent);

        expect(result).toEqual({
            user: 'Unknown',
            totalRepositories: 0,
            totalIssues: 0,
            repositories: []
        });
        expect(console.error).toHaveBeenCalledWith('Error parsing GitHub data from report:', expect.any(Error));
    });
});

describe('createHtmlReport', () => {
    test('должен создавать HTML отчет для валидных данных', () => {
        const githubData = {
            user: 'testuser',
            totalRepositories: 3,
            totalIssues: 5,
            repositories: [
                {
                    owner: 'testuser',
                    name: 'repo1',
                    description: 'Test repo 1',
                    issues: 2
                },
                {
                    owner: 'testuser',
                    name: 'repo2',
                    description: 'Test repo 2',
                    issues: 0
                }
            ]
        };

        const result = createHtmlReport(githubData);

        expect(result).toBeTruthy();
        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toContain('testuser');
        expect(result).toContain('3');
        expect(result).toContain('5');
        expect(result).toContain('testuser/repo1');
        expect(result).toContain('testuser/repo2');
        expect(result).toContain('Test repo 1');
        expect(result).toContain('Test repo 2');
        expect(result).toContain('2 issues');
        expect(result).toContain('0 issues');
    });

    test('должен возвращать null для пустых данных', () => {
        const result = createHtmlReport(null);
        expect(result).toBeNull();
    });

    test('должен показывать предупреждение когда есть неразрешенные задачи', () => {
        const githubData = {
            user: 'testuser',
            totalRepositories: 1,
            totalIssues: 5,
            repositories: []
        };

        const result = createHtmlReport(githubData);

        expect(result).toContain('⚠️ Recommendations');
        expect(result).toContain('🔴 Attention required: 5 unresolved issues');
    });

    test('должен показывать успешный статус когда нет неразрешенных задач', () => {
        const githubData = {
            user: 'testuser',
            totalRepositories: 1,
            totalIssues: 0,
            repositories: []
        };

        const result = createHtmlReport(githubData);

        expect(result).toContain('✅ Status');
        expect(result).toContain('✅ All issues resolved! Great work!');
    });

    test('должен обрабатывать репозитории с ошибками', () => {
        const githubData = {
            user: 'testuser',
            totalRepositories: 1,
            totalIssues: 0,
            repositories: [
                {
                    owner: 'testuser',
                    name: 'repo1',
                    description: 'Test repo',
                    issues: 0,
                    error: 'Access denied'
                }
            ]
        };

        const result = createHtmlReport(githubData);

        expect(result).toContain('⚠️ Error: Access denied');
    });
});

describe('DockerReportManager', () => {
    let dockerManager;

    beforeEach(() => {
        jest.clearAllMocks();
        dockerManager = new DockerReportManager();
    });

    describe('createContainerConfig', () => {
        test('должен создавать корректную конфигурацию контейнера', () => {
            const config = dockerManager.createContainerConfig();

            expect(config).toHaveProperty('containerName');
            expect(config).toHaveProperty('port');
            expect(config).toHaveProperty('imageName');
            expect(config).toHaveProperty('options');

            expect(config.containerName).toContain('github-report');
            expect(config.port).toBeGreaterThanOrEqual(8000);
            expect(config.port).toBeLessThanOrEqual(8999);
            expect(config.imageName).toBe('rancher/mirrored-library-nginx:1.19.9-alpine');
            expect(config.options.ExposedPorts).toEqual({ '80/tcp': {} });
            expect(config.options.HostConfig.PortBindings['80/tcp']).toEqual([{ HostPort: config.port.toString() }]);
        });

        test('должен генерировать уникальные имена контейнеров', () => {
            const config1 = dockerManager.createContainerConfig();
            const config2 = dockerManager.createContainerConfig();

            expect(config1.containerName).not.toBe(config2.containerName);
        });
    });

    describe('getRandomPort', () => {
        test('должен возвращать порт в заданном диапазоне', () => {
            for (let i = 0; i < 100; i++) {
                const port = dockerManager.getRandomPort();
                expect(port).toBeGreaterThanOrEqual(8000);
                expect(port).toBeLessThanOrEqual(8999);
            }
        });
    });

    describe('encodeHtmlContent', () => {
        test('должен корректно кодировать HTML контент в base64', () => {
            const htmlContent = '<html><body>Test content</body></html>';
            const encoded = dockerManager.encodeHtmlContent(htmlContent);

            expect(encoded).toBe('PGh0bWw+PGJvZHk+VGVzdCBjb250ZW50PC9ib2R5PjwvaHRtbD4=');
        });

        test('должен обрабатывать Unicode символы', () => {
            const htmlContent = '<html><body>Тест с русскими символами</body></html>';
            const encoded = dockerManager.encodeHtmlContent(htmlContent);

            expect(encoded).toBeTruthy();
            expect(typeof encoded).toBe('string');
        });
    });

    describe('makeRequest', () => {
        test('должен делать успешный GET запрос', async () => {
            const mockResponse = { success: true, data: 'test' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await dockerManager.makeRequest('/test');

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3004/api/mcp/docker/test',
                expect.objectContaining({
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('должен делать успешный POST запрос с телом', async () => {
            const mockResponse = { success: true };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const body = { test: 'data' };
            const result = await dockerManager.makeRequest('/test', {
                method: 'POST',
                body
            });

            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:3004/api/mcp/docker/test',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(body)
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('должен обрабатывать ошибки HTTP', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: async () => ({ error: 'Not found' })
            });

            await expect(dockerManager.makeRequest('/test')).rejects.toThrow('HTTP 404: Not found');
        });

        test('должен обрабатывать сетевые ошибки', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(dockerManager.makeRequest('/test')).rejects.toThrow('Network error');
        });
    });

    describe('deployHtmlReport', () => {
        beforeEach(() => {
            dockerManager.cleanupOldContainers = jest.fn();
            dockerManager.createContainer = jest.fn();
            dockerManager.startContainer = jest.fn();
            dockerManager.createHtmlFile = jest.fn();
            dockerManager.waitForContainerStartup = jest.fn();
        });

        test('должен успешно развертывать HTML отчет', async () => {
            const htmlContent = '<html><body>Test</body></html>';
            const mockContainer = { id: 'test-container-id' };
            const mockConfig = {
                containerName: 'test-container',
                port: 8080
            };

            dockerManager.createContainerConfig = jest.fn().mockReturnValue(mockConfig);
            dockerManager.createContainer.mockResolvedValue(mockContainer);

            const result = await dockerManager.deployHtmlReport(htmlContent);

            expect(dockerManager.cleanupOldContainers).toHaveBeenCalled();
            expect(dockerManager.createContainer).toHaveBeenCalledWith(mockConfig);
            expect(dockerManager.startContainer).toHaveBeenCalledWith(mockContainer.id);
            expect(dockerManager.createHtmlFile).toHaveBeenCalledWith(mockContainer.id, htmlContent);
            expect(dockerManager.waitForContainerStartup).toHaveBeenCalled();

            expect(result).toEqual({
                success: true,
                containerId: mockContainer.id,
                containerName: mockConfig.containerName,
                url: `http://localhost:${mockConfig.port}`,
                port: mockConfig.port
            });
        });

        test('должен возвращать ошибку для пустого HTML контента', async () => {
            const result = await dockerManager.deployHtmlReport('');

            expect(result).toEqual({
                success: false,
                error: 'HTML content is required'
            });
        });

        test('должен обрабатывать ошибки при создании контейнера', async () => {
            const htmlContent = '<html><body>Test</body></html>';
            dockerManager.createContainer.mockRejectedValue(new Error('Container creation failed'));

            const result = await dockerManager.deployHtmlReport(htmlContent);

            expect(result).toEqual({
                success: false,
                error: 'Container creation failed'
            });
        });
    });

    describe('checkHealth', () => {
        test('должен возвращать true для доступного сервиса', async () => {
            fetch.mockResolvedValueOnce({ ok: true });

            const result = await dockerManager.checkHealth();

            expect(result).toBe(true);
            expect(fetch).toHaveBeenCalledWith('http://localhost:3004/health');
        });

        test('должен возвращать false для недоступного сервиса', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await dockerManager.checkHealth();

            expect(result).toBe(false);
            expect(console.error).toHaveBeenCalledWith('❌ Docker MCP health check failed:', expect.any(Error));
        });
    });
});

describe('Интеграционные тесты', () => {
    test('должен корректно обрабатывать полный цикл создания отчета', () => {
        const reportContent = `
Пользователь: testuser
Всего репозиториев: 2
Неразрешенных задач: 3

### testuser/repo1
- **Описание**: Test repository
- **Открытых задач**: 3
        `;

        const githubData = parseGitHubDataFromReport(reportContent);
        const htmlReport = createHtmlReport(githubData);

        expect(githubData.user).toBe('testuser');
        expect(githubData.totalRepositories).toBe(2);
        expect(githubData.totalIssues).toBe(3);
        expect(githubData.repositories).toHaveLength(1);
        expect(htmlReport).toContain('testuser');
        expect(htmlReport).toContain('3');
    });
});
