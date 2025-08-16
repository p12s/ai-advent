const githubConfig = {
    url: "https://api.github.com",
    token: "YOUR_GITHUB_TOKEN_HERE"
};

async function testGitHubAPI() {
    console.log('🔍 Testing GitHub API...');
    console.log('URL:', githubConfig.url);
    console.log('Token:', githubConfig.token.substring(0, 20) + '...');
    console.log('');

    try {
        console.log('1️⃣ Getting user information...');
        const userResponse = await fetch(githubConfig.url + '/user', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        console.log('Status:', userResponse.status);
        
        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.log('Error response:', errorText);
            return;
        }

        const userData = await userResponse.json();
        console.log('✅ User:', userData.login);
        console.log('✅ Name:', userData.name);
        console.log('✅ Email:', userData.email);
        console.log('');

        console.log('2️⃣ Getting repository list...');
        const reposResponse = await fetch(githubConfig.url + '/user/repos?per_page=5&sort=updated', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${githubConfig.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        console.log('Status:', reposResponse.status);
        
        if (!reposResponse.ok) {
            const errorText = await reposResponse.text();
            console.log('Error response:', errorText);
            return;
        }

        const repos = await reposResponse.json();
        console.log('✅ Found repositories:', repos.length);
        
        for (const repo of repos) {
            console.log(`   - ${repo.owner.login}/${repo.name}: ${repo.description || 'No description'}`);
        }
        console.log('');

        if (repos.length > 0) {
            const firstRepo = repos[0];
            console.log(`3️⃣ Getting issues for ${firstRepo.owner.login}/${firstRepo.name}...`);
            
            const issuesResponse = await fetch(githubConfig.url + `/repos/${firstRepo.owner.login}/${firstRepo.name}/issues?state=open&per_page=10`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${githubConfig.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            console.log('Status:', issuesResponse.status);
            
            if (issuesResponse.ok) {
                const issues = await issuesResponse.json();
                console.log('✅ Open issues:', issues.length);
                
                for (const issue of issues.slice(0, 3)) {
                    console.log(`   - #${issue.number}: ${issue.title}`);
                }
            } else {
                const errorText = await issuesResponse.text();
                console.log('Error response:', errorText);
            }
            console.log('');


        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testGitHubAPI();
