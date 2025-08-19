const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3003';
const PROXY_URL = 'http://localhost:3004';

async function testEndpoint(url, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        console.log(`\n${method} ${url}`);
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
        return data;
    } catch (error) {
        console.error(`Error testing ${method} ${url}:`, error.message);
        return null;
    }
}

async function runTests() {
    console.log('🧪 Testing Docker MCP Server API');
    console.log('================================');
    
    console.log('\n1. Testing health check...');
    await testEndpoint(`${BASE_URL}/mcp/docker/health`);
    
    console.log('\n2. Testing system info...');
    await testEndpoint(`${BASE_URL}/mcp/docker/system/info`);
    
    console.log('\n3. Testing containers list...');
    await testEndpoint(`${BASE_URL}/mcp/docker/containers`);
    
    console.log('\n4. Testing images list...');
    await testEndpoint(`${BASE_URL}/mcp/docker/images`);
    
    console.log('\n5. Testing proxy health check...');
    await testEndpoint(`${PROXY_URL}/health`);
    
    console.log('\n6. Testing proxy API info...');
    await testEndpoint(`${PROXY_URL}/`);
    
    console.log('\n7. Testing proxy containers endpoint...');
    await testEndpoint(`${PROXY_URL}/api/mcp/docker/containers`);
    
    console.log('\n8. Testing container creation (nginx example)...');
    await testEndpoint(`${BASE_URL}/mcp/docker/container/create`, 'POST', {
        imageName: 'nginx:alpine',
        containerName: 'test-nginx',
        options: {
            HostConfig: {
                PortBindings: {
                    '80/tcp': [{ HostPort: '8080' }]
                }
            }
        }
    });
    
    console.log('\n9. Testing image pull...');
    await testEndpoint(`${BASE_URL}/mcp/docker/image/pull`, 'POST', {
        imageName: 'hello-world',
        tag: 'latest'
    });
    
    console.log('\n✅ All tests completed!');
}

async function cleanupTestContainers() {
    console.log('\n🧹 Cleaning up test containers...');
    
    try {
        const containersResponse = await fetch(`${BASE_URL}/mcp/docker/containers`);
        const containersData = await containersResponse.json();
        
        if (containersData.success && containersData.containers) {
            for (const container of containersData.containers) {
                if (container.names && container.names.some(name => name.includes('test-'))) {
                    console.log(`Stopping container: ${container.names.join(', ')}`);
                    await fetch(`${BASE_URL}/mcp/docker/container/stop`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ containerId: container.id })
                    });
                    
                    console.log(`Removing container: ${container.names.join(', ')}`);
                    await fetch(`${BASE_URL}/mcp/docker/container/remove`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ containerId: container.id, force: true })
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error during cleanup:', error.message);
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--cleanup')) {
        cleanupTestContainers().then(() => {
            console.log('Cleanup completed!');
            process.exit(0);
        });
    } else {
        runTests().then(() => {
            console.log('\n💡 To clean up test containers, run: node test-docker-api.js --cleanup');
            process.exit(0);
        });
    }
}

module.exports = { testEndpoint, runTests, cleanupTestContainers };
