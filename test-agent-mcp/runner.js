const { v4: uuidv4 } = require('uuid');
const ContainerManager = require('./container-manager');
const EnvBuilder = require('./env-builder');
const Deploy = require('./deploy');

class Runner {
    constructor(config) {
        this.config = config;
        this.containerManager = new ContainerManager(config);
        this.environmentBuilder = new EnvBuilder();
        this.resultsDeployer = new Deploy();
    }

    async runTests(testData) {
        const testId = uuidv4();
        const containerName = `test-runner-${testId}`;
        
        try {
            const testDir = await this.environmentBuilder.createTestEnvironment(testId, testData);
            
            const container = await this.containerManager.createContainer(containerName, testDir);
            this.containerManager.runningContainers.set(testId, container);
            
            const result = await this.containerManager.executeTests(container, testId);
            
            const webUrl = await this.resultsDeployer.deployTestResults(testId, result, testData);
            
            await this.containerManager.cleanupContainer(container, testDir);
            this.containerManager.runningContainers.delete(testId);
            
            return {
                success: true,
                testId,
                result,
                webUrl,
                containerName
            };

        } catch (error) {
            console.error(`Error running tests ${testId}:`, error);
            await this.cleanup(null, null, testId);
            
            return {
                success: false,
                testId,
                error: error.message
            };
        }
    }

    async cleanup(container, testDir, testId = null) {
        await this.containerManager.cleanupContainer(container, testDir);
        if (testId) {
            await this.resultsDeployer.cleanupWebServer(testId);
        }
    }
}

module.exports = Runner;
