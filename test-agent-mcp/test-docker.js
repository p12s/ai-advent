const Docker = require('dockerode');

async function testDocker() {
    const docker = new Docker({
        socketPath: '/var/run/docker.sock'
    });
    
    console.log('🧪 Testing Docker connection...');
    
    try {
        await docker.ping();
        console.log('✅ Docker is available');
        
        const containers = await docker.listContainers({ all: true });
        console.log(`📦 Found ${containers.length} containers`);
        
        const images = await docker.listImages();
        console.log(`🖼️ Found ${images.length} images`);
        
        const nodeImage = images.find(img => img.RepoTags && img.RepoTags.some(tag => tag.includes('node:18')));
        if (nodeImage) {
            console.log('✅ Node 18 image found:', nodeImage.RepoTags[0]);
        } else {
            console.log('❌ Node 18 image not found');
        }
        
    } catch (error) {
        console.error('❌ Docker error:', error);
    }
}

testDocker();
