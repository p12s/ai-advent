/**
 * Test utilities for loading docker-report.js module
 */

const fs = require('fs');
const path = require('path');

/**
 * Loads docker-report.js module into global scope for testing
 */
function loadDockerReportModule() {
    try {
        const modulePath = path.join(__dirname, 'docker-report.js');
        const moduleContent = fs.readFileSync(modulePath, 'utf8');
        
        eval(moduleContent);
        
        global.parseGitHubDataFromReport = window.parseGitHubDataFromReport;
        global.createHtmlReport = window.createHtmlReport;
        global.DockerReportManager = window.dockerReportManager.constructor;
        
        return true;
    } catch (error) {
        console.error('Failed to load docker-report.js module:', error);
        return false;
    }
}

function mockFetch() {
    global.fetch = jest.fn();
}

function clearMocks() {
    jest.clearAllMocks();
    if (global.fetch) {
        global.fetch.mockClear();
    }
}

module.exports = {
    loadDockerReportModule,
    mockFetch,
    clearMocks
};
