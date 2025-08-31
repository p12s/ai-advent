#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Octokit } from '@octokit/rest';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GitHubPushMCP {
  constructor() {
    this.server = new Server(
      {
        name: 'github-push-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'push_file_to_github',
            description: 'Push a file to the GitHub repository https://github.com/p12s/ai-advent-package.git',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the file to push to GitHub',
                },
                targetPath: {
                  type: 'string',
                  description: 'Target path in the repository (optional, defaults to filename)',
                },
                commitMessage: {
                  type: 'string',
                  description: 'Custom commit message (optional, auto-generated if not provided)',
                },
              },
              required: ['filePath'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'push_file_to_github') {
        return await this.pushFileToGitHub(args);
      }

      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
    });
  }

  async pushFileToGitHub(args) {
    try {
      const { filePath, targetPath, commitMessage } = args;

      // Validate file exists
      if (!await fs.pathExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read file content
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const repoTargetPath = targetPath || fileName;

      // Repository details
      const owner = 'p12s';
      const repo = 'ai-advent-package';
      const branch = 'main';

      // Generate commit message if not provided
      const finalCommitMessage = commitMessage || `Add ${fileName} - automated commit via MCP`;

      // Get current commit SHA for the branch
      let currentCommitSha;
      try {
        const { data: refData } = await this.octokit.rest.git.getRef({
          owner,
          repo,
          ref: `heads/${branch}`,
        });
        currentCommitSha = refData.object.sha;
      } catch (error) {
        if (error.status === 404) {
          // Branch doesn't exist, we'll create it
          const { data: masterRef } = await this.octokit.rest.git.getRef({
            owner,
            repo,
            ref: 'heads/main',
          });
          currentCommitSha = masterRef.object.sha;
        } else {
          throw error;
        }
      }

      // Check if file already exists to get its SHA
      let existingFileSha = null;
      try {
        const { data: existingFile } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: repoTargetPath,
          ref: branch,
        });
        existingFileSha = existingFile.sha;
      } catch (error) {
        // File doesn't exist, which is fine
      }

      // Create or update the file
      const createOrUpdateParams = {
        owner,
        repo,
        path: repoTargetPath,
        message: finalCommitMessage,
        content: fileContent.toString('base64'),
        branch,
      };

      if (existingFileSha) {
        createOrUpdateParams.sha = existingFileSha;
      }

      const { data: result } = await this.octokit.rest.repos.createOrUpdateFileContents(createOrUpdateParams);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully pushed file to GitHub!\n\nDetails:\n- File: ${fileName}\n- Target path: ${repoTargetPath}\n- Repository: ${owner}/${repo}\n- Branch: ${branch}\n- Commit message: ${finalCommitMessage}\n- Commit SHA: ${result.commit.sha}\n- Commit URL: ${result.commit.html_url}`,
          },
        ],
      };
    } catch (error) {
      console.error('Error pushing file to GitHub:', error);
      
      let errorMessage = 'Failed to push file to GitHub';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error.status) {
        errorMessage += ` (HTTP ${error.status})`;
      }

      return {
        content: [
          {
            type: 'text',
            text: errorMessage,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub Push MCP server running on stdio');
  }
}

const server = new GitHubPushMCP();
server.run().catch(console.error);
