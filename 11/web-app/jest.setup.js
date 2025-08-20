/**
 * Jest setup file for testing browser-based code
 */

// Мокаем глобальные браузерные объекты
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Мокаем window объект
global.window = {
    dockerReportManager: null,
    deployHtmlReport: null,
    checkDockerHealth: null,
    parseGitHubDataFromReport: null,
    createHtmlReport: null
};

// Мокаем document объект
global.document = {
    createElement: jest.fn(() => ({
        className: '',
        innerHTML: '',
        setAttribute: jest.fn(),
        appendChild: jest.fn()
    })),
    getElementById: jest.fn(),
    body: {
        appendChild: jest.fn()
    }
};

// Мокаем setTimeout
global.setTimeout = jest.fn((callback, delay) => {
    if (typeof callback === 'function') {
        callback();
    }
    return 1;
});

// Мокаем clearTimeout
global.clearTimeout = jest.fn();

// Мокаем Math.random для предсказуемых тестов
const originalMathRandom = Math.random;
beforeEach(() => {
    Math.random = jest.fn(() => 0.5);
});

afterEach(() => {
    Math.random = originalMathRandom;
});

// Мокаем Date для предсказуемых тестов
const originalDate = global.Date;
beforeEach(() => {
    global.Date = class extends originalDate {
        constructor() {
            return new originalDate('2024-01-01T00:00:00.000Z');
        }
        
        static now() {
            return new originalDate('2024-01-01T00:00:00.000Z').getTime();
        }
        
        toISOString() {
            return '2024-01-01T00:00:00.000Z';
        }
        
        toLocaleString() {
            return '01.01.2024, 00:00:00';
        }
    };
});

afterEach(() => {
    global.Date = originalDate;
});
