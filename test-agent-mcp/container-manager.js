const Docker = require('dockerode');
const fs = require('fs-extra');

class ContainerManager {
    constructor(config) {
        this.config = config;
        this.docker = new Docker({
            socketPath: config.docker?.socketPath || '/var/run/docker.sock'
        });
        this.runningContainers = new Map();
    }

    async createContainer(containerName, testDir) {
        const buildStream = await this.docker.buildImage({
            context: testDir,
            src: ['.']
        }, {
            t: containerName
        });

        await new Promise((resolve, reject) => {
            this.docker.modem.followProgress(buildStream, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });

        const container = await this.docker.createContainer({
            Image: containerName,
            name: containerName,
            WorkingDir: '/app',
            Cmd: ['npm', 'test'],
            HostConfig: {
                Memory: 512 * 1024 * 1024,
                CpuShares: 512,
                NetworkMode: 'bridge'
            }
        });

        return container;
    }

    async executeTests(container, testId) {
        const startTime = Date.now();
        
        try {
            await container.start();

            const timeout = this.config.testSettings?.timeout || 300;
            const result = await Promise.race([
                container.wait(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Test timeout')), timeout * 1000)
                )
            ]);

            const logs = await container.logs({
                stdout: true,
                stderr: true,
                timestamps: true
            });

            const resultFiles = await this.extractResultFiles(container);

            const endTime = Date.now();
            const duration = endTime - startTime;

            return {
                success: result.StatusCode === 0,
                statusCode: result.StatusCode,
                duration: duration,
                logs: logs.toString(),
                resultFiles: resultFiles,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;

            return {
                success: false,
                error: error.message,
                duration: duration,
                timestamp: new Date().toISOString()
            };
        }
    }

    async extractResultFiles(container) {
        const files = {};
        const resultFileNames = [
            'test-results.json',
            'test-report.html',
            'coverage/lcov-report/index.html'
        ];

        for (const fileName of resultFileNames) {
            try {
                const stream = await container.getArchive({ path: `/app/${fileName}` });
                const chunks = [];
                
                stream.on('data', chunk => chunks.push(chunk));
                await new Promise((resolve, reject) => {
                    stream.on('end', resolve);
                    stream.on('error', reject);
                });

                files[fileName] = Buffer.concat(chunks);
            } catch (error) {
                console.log(`File ${fileName} not found in container`);
            }
        }

        return files;
    }

    async cleanupContainer(container, testDir) {
        try {
            if (container) {
                await container.remove({ force: true });
            }
            
            if (testDir && await fs.pathExists(testDir)) {
                await fs.remove(testDir);
            }
        } catch (error) {
            console.error('Container cleanup error:', error);
        }
    }
}

module.exports = ContainerManager;
