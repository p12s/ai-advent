const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

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

const githubConfig = {
    url: config.github?.url || "https://api.github.com",
    token: config.github?.token || ""
};

async function getUserData() {
    try {
        const response = await fetch(githubConfig.url + '/user', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
}

async function getRepositories(perPage = 10, sort = 'updated') {
    try {
        const response = await fetch(githubConfig.url + `/user/repos?per_page=${perPage}&sort=${sort}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting repositories:', error);
        throw error;
    }
}

async function getRepositoryIssues(owner, repo, state = 'open', perPage = 100) {
    try {
        const response = await fetch(githubConfig.url + `/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error getting issues for ${owner}/${repo}:`, error);
        throw error;
    }
}

app.post('/mcp/github/init', async (req, res) => {
    try {
        const { token, url } = req.body;
        
        if (!token) {
            return res.json({ success: false, error: 'GitHub token is required' });
        }
        
        githubConfig.token = token;
        if (url) {
            githubConfig.url = url;
        }
        
        const userData = await getUserData();
        
        res.json({ 
            success: true, 
            message: 'GitHub MCP initialized successfully',
            user: userData.login
        });
    } catch (error) {
        console.error('Error initializing GitHub MCP:', error);
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/github/user', async (req, res) => {
    try {
        if (!githubConfig.token) {
            return res.json({ success: false, error: 'GitHub MCP not initialized' });
        }
        
        const userData = await getUserData();
        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('Error getting user data:', error);
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/github/repos', async (req, res) => {
    try {
        if (!githubConfig.token) {
            return res.json({ success: false, error: 'GitHub MCP not initialized' });
        }
        
        const { per_page = 10, sort = 'updated' } = req.query;
        const repos = await getRepositories(parseInt(per_page), sort);
        res.json({ success: true, data: repos });
    } catch (error) {
        console.error('Error getting repositories:', error);
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/github/repos/:owner/:repo/issues', async (req, res) => {
    try {
        if (!githubConfig.token) {
            return res.json({ success: false, error: 'GitHub MCP not initialized' });
        }
        
        const { owner, repo } = req.params;
        const { state = 'open', per_page = 100 } = req.query;
        
        const issues = await getRepositoryIssues(owner, repo, state, parseInt(per_page));
        res.json({ success: true, data: issues });
    } catch (error) {
        console.error('Error getting repository issues:', error);
        res.json({ success: false, error: error.message });
    }
});

app.get('/mcp/github/analysis', async (req, res) => {
    try {
        if (!githubConfig.token) {
            return res.json({ success: false, error: 'GitHub MCP not initialized' });
        }
        
        const { per_page = 10 } = req.query;
        
        const userData = await getUserData();
        
        const repos = await getRepositories(parseInt(per_page), 'updated');
        
        let totalIssues = 0;
        const repoDetails = [];
        
        for (const repo of repos.slice(0, 5)) {
            try {
                const issues = await getRepositoryIssues(repo.owner.login, repo.name, 'open', 100);
                const unresolvedIssues = issues.length;
                totalIssues += unresolvedIssues;
                
                repoDetails.push({
                    name: repo.name,
                    issues: unresolvedIssues,
                    description: repo.description || 'Без описания',
                    owner: repo.owner.login
                });
            } catch (repoError) {
                console.error(`Error processing repo ${repo.name}:`, repoError);
                repoDetails.push({
                    name: repo.name,
                    issues: 0,
                    description: repo.description || 'Без описания',
                    owner: repo.owner.login,
                    error: repoError.message
                });
            }
        }
        
        const analysis = {
            user: userData.login,
            totalRepositories: repos.length,
            totalIssues: totalIssues,
            repositories: repoDetails,
            generatedAt: new Date().toISOString()
        };
        
        res.json({ success: true, data: analysis });
    } catch (error) {
        console.error('Error in GitHub analysis:', error);
        res.json({ success: false, error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'github-mcp',
        github_initialized: !!githubConfig.token,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`GitHub MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`GitHub token configured: ${githubConfig.token ? 'Yes' : 'No'}`);
});

module.exports = app;
