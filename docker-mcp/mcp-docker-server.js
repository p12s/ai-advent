const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Docker = require('dockerode');

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

let config = {};
try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
} catch (error) {
    console.error('Error loading config:', error);
}

const dockerConfig = {
    socketPath: config.docker?.socketPath || '/var/run/docker.sock',
    host: config.docker?.host || 'localhost',
    port: config.docker?.port || 2375
};

let docker;

function initDocker() {
    try {
        if (dockerConfig.socketPath && fs.existsSync(dockerConfig.socketPath)) {
            docker = new Docker({ socketPath: dockerConfig.socketPath });
        } else {
            docker = new Docker({
                host: dockerConfig.host,
                port: dockerConfig.port
            });
        }
        console.log('Docker connection initialized');
        return true;
    } catch (error) {
        console.error('Error initializing Docker:', error);
        return false;
    }
}

async function getContainers() {
    try {
        const containers = await docker.listContainers({ all: true });
        return containers.map(container => ({
            id: container.Id,
            names: container.Names,
            image: container.Image,
            status: container.Status,
            state: container.State,
            ports: container.Ports,
            created: container.Created,
            sizeRw: container.SizeRw,
            sizeRootFs: container.SizeRootFs
        }));
    } catch (error) {
        console.error('Error getting containers:', error);
        throw error;
    }
}

async function getImages() {
    try {
        const images = await docker.listImages();
        return images.map(image => ({
            id: image.Id,
            tags: image.RepoTags,
            size: image.Size,
            created: image.Created,
            labels: image.Labels
        }));
    } catch (error) {
        console.error('Error getting images:', error);
        throw error;
    }
}

async function createContainer(imageName, containerName, options = {}) {
    try {
        const container = await docker.createContainer({
            Image: imageName,
            name: containerName,
            ...options
        });
        
        const containerInfo = await container.inspect();
        return {
            id: containerInfo.Id,
            name: containerInfo.Name,
            state: containerInfo.State.Status,
            created: containerInfo.Created,
            image: containerInfo.Image
        };
    } catch (error) {
        console.error('Error creating container:', error);
        throw error;
    }
}

async function startContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        
        const containerInfo = await container.inspect();
        
        if (containerInfo.State.Status === 'running') {
            console.log(`Container ${containerId} is already running`);
            return {
                id: containerInfo.Id,
                name: containerInfo.Name,
                state: containerInfo.State.Status
            };
        }
        
        await container.start();
        const updatedContainerInfo = await container.inspect();
        return {
            id: updatedContainerInfo.Id,
            name: updatedContainerInfo.Name,
            state: updatedContainerInfo.State.Status
        };
    } catch (error) {
        console.error('Error starting container:', error);
        throw error;
    }
}

async function stopContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        await container.stop();
        const containerInfo = await container.inspect();
        return {
            id: containerInfo.Id,
            name: containerInfo.Name,
            state: containerInfo.State.Status
        };
    } catch (error) {
        console.error('Error stopping container:', error);
        throw error;
    }
}

async function removeContainer(containerId, force = false) {
    try {
        const container = docker.getContainer(containerId);
        await container.remove({ force });
        return { success: true, message: 'Container removed successfully' };
    } catch (error) {
        console.error('Error removing container:', error);
        throw error;
    }
}

async function getContainerLogs(containerId, tail = 100) {
    try {
        const container = docker.getContainer(containerId);
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            tail: tail
        });
        return logs.toString('utf8');
    } catch (error) {
        console.error('Error getting container logs:', error);
        throw error;
    }
}

async function pullImage(imageName, tag = 'latest') {
    try {
        const fullImageName = tag === 'latest' ? imageName : `${imageName}:${tag}`;
        await docker.pull(fullImageName);
        return { success: true, message: `Image ${fullImageName} pulled successfully` };
    } catch (error) {
        console.error('Error pulling image:', error);
        throw error;
    }
}

async function getSystemInfo() {
    try {
        const info = await docker.info();
        return {
            containers: info.Containers,
            images: info.Images,
            driver: info.Driver,
            kernelVersion: info.KernelVersion,
            operatingSystem: info.OperatingSystem,
            architecture: info.Architecture,
            dockerRootDir: info.DockerRootDir,
            serverVersion: info.ServerVersion
        };
    } catch (error) {
        console.error('Error getting system info:', error);
        throw error;
    }
}

async function execCommand(containerId, command) {
    try {
        const container = docker.getContainer(containerId);
        const exec = await container.exec({
            Cmd: command,
            AttachStdout: true,
            AttachStderr: true
        });
        
        const stream = await exec.start();
        
        return new Promise((resolve, reject) => {
            let output = '';
            let error = '';
            
            stream.on('data', (chunk) => {
                output += chunk.toString();
            });
            
            stream.on('error', (err) => {
                error += err.toString();
            });
            
            stream.on('end', () => {
                if (error) {
                    reject(new Error(error));
                } else {
                    resolve(output);
                }
            });
        });
    } catch (error) {
        console.error('Error executing command:', error);
        throw error;
    }
}

app.post('/mcp/docker/init', async (req, res) => {
    try {
        const { socketPath, host, port } = req.body;
        
        if (socketPath) dockerConfig.socketPath = socketPath;
        if (host) dockerConfig.host = host;
        if (port) dockerConfig.port = port;
        
        const success = initDocker();
        
        if (success) {
            res.json({ success: true, message: 'Docker MCP initialized successfully' });
        } else {
            res.json({ success: false, error: 'Failed to initialize Docker connection' });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/docker/containers', async (req, res) => {
    try {
        const containers = await getContainers();
        res.json({ success: true, containers });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/docker/images', async (req, res) => {
    try {
        const images = await getImages();
        res.json({ success: true, images });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/docker/container/create', async (req, res) => {
    try {
        const { imageName, containerName, options } = req.body;
        
        if (!imageName || !containerName) {
            return res.json({ success: false, error: 'Image name and container name are required' });
        }
        
        const container = await createContainer(imageName, containerName, options);
        res.json({ success: true, container });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/docker/container/start', async (req, res) => {
    try {
        const { containerId } = req.body;
        
        if (!containerId) {
            return res.json({ success: false, error: 'Container ID is required' });
        }
        
        const container = await startContainer(containerId);
        res.json({ success: true, container });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/docker/container/stop', async (req, res) => {
    try {
        const { containerId } = req.body;
        
        if (!containerId) {
            return res.json({ success: false, error: 'Container ID is required' });
        }
        
        const container = await stopContainer(containerId);
        res.json({ success: true, container });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.delete('/mcp/docker/container/remove', async (req, res) => {
    try {
        const { containerId, force } = req.body;
        
        if (!containerId) {
            return res.json({ success: false, error: 'Container ID is required' });
        }
        
        const result = await removeContainer(containerId, force);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/docker/container/logs/:containerId', async (req, res) => {
    try {
        const { containerId } = req.params;
        const { tail } = req.query;
        
        const logs = await getContainerLogs(containerId, parseInt(tail) || 100);
        res.json({ success: true, logs });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/docker/container/inspect/:containerId', async (req, res) => {
    try {
        const { containerId } = req.params;
        
        if (!containerId) {
            return res.json({ success: false, error: 'Container ID is required' });
        }
        
        const container = docker.getContainer(containerId);
        const containerInfo = await container.inspect();
        
        res.json({ 
            success: true, 
            container: {
                id: containerInfo.Id,
                name: containerInfo.Name,
                state: containerInfo.State.Status,
                created: containerInfo.Created,
                image: containerInfo.Image,
                ports: containerInfo.NetworkSettings.Ports
            }
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/docker/image/pull', async (req, res) => {
    try {
        const { imageName, tag } = req.body;
        
        if (!imageName) {
            return res.json({ success: false, error: 'Image name is required' });
        }
        
        const result = await pullImage(imageName, tag);
        res.json({ success: true, result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/docker/system/info', async (req, res) => {
    try {
        const info = await getSystemInfo();
        res.json({ success: true, info });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/mcp/docker/container/exec', async (req, res) => {
    try {
        const { containerId, command } = req.body;
        
        if (!containerId || !command) {
            return res.json({ success: false, error: 'Container ID and command are required' });
        }
        
        const output = await execCommand(containerId, command);
        res.json({ success: true, output });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/docker/health', async (req, res) => {
    try {
        if (!docker) {
            return res.json({ success: false, error: 'Docker not initialized' });
        }
        
        await docker.ping();
        res.json({ success: true, message: 'Docker is running' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

if (!initDocker()) {
    console.log('Warning: Docker connection not available. Please initialize with /mcp/docker/init');
}

app.listen(PORT, () => {
    console.log(`Docker MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/mcp/docker/health`);
});
