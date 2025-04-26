#!/usr/bin/env node

/**
 * Custom script to deploy the docs to GitHub Pages.
 * This script works from the root of the repository and handles
 * the deployment of the Docusaurus build files to the gh-pages branch
 * without deleting existing files.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const buildDir = path.join(__dirname, '..', 'doc', 'build');
const ghPagesBranch = 'gh-pages';
const tempDeployDir = path.join(__dirname, '..', '.deploy_docs_temp');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

/**
 * Executes a shell command and returns the output
 * @param {string} command - The command to execute
 * @param {boolean} [silent=false] - Whether to suppress console output
 * @returns {string} - The command output
 */
function exec(command, silent = false) {
  try {
    if (!silent) console.log(`${colors.yellow}$ ${command}${colors.reset}`);
    return execSync(command, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
  } catch (error) {
    console.error(`${colors.red}Error executing command: ${command}${colors.reset}`);
    throw error;
  }
}

/**
 * Recursively copy directory contents
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  // Check if we have a git repository
  try {
    exec('git rev-parse --is-inside-work-tree', true);
  } catch (error) {
    console.error(`${colors.red}Error: Not a git repository. Initialize one first with 'git init'.${colors.reset}`);
    process.exit(1);
  }

  // Check if build directory exists
  if (!fs.existsSync(buildDir)) {
    console.error(`${colors.red}Error: Build directory ${buildDir} does not exist.${colors.reset}`);
    console.log(`Run ${colors.bright}npm run build-docs${colors.reset} first.`);
    process.exit(1);
  }

  try {
    // Get current branch to return to it later
    const currentBranch = exec('git rev-parse --abbrev-ref HEAD', true).trim();
    console.log(`${colors.green}Current branch: ${currentBranch}${colors.reset}`);

    // Store current git hash for commit message
    const currentHash = exec('git rev-parse HEAD', true).trim();
    
    // Create temporary deploy directory if it doesn't exist
    console.log(`${colors.blue}Creating temporary deploy directory...${colors.reset}`);
    if (fs.existsSync(tempDeployDir)) {
      fs.rmSync(tempDeployDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDeployDir, { recursive: true });

    // Create or checkout gh-pages branch
    try {
      exec(`git show-ref --verify --quiet refs/heads/${ghPagesBranch}`, true);
      console.log(`${colors.green}Branch ${ghPagesBranch} exists, checking it out to temp directory...${colors.reset}`);
      
      // Clone the gh-pages branch to temp directory
      exec(`git worktree add ${tempDeployDir} ${ghPagesBranch}`);
    } catch (error) {
      // Branch doesn't exist yet
      console.log(`${colors.yellow}Creating ${ghPagesBranch} branch...${colors.reset}`);
      exec(`git checkout --orphan ${ghPagesBranch}`);
      exec('git reset --hard');
      exec('git commit --allow-empty -m "Initial empty commit for gh-pages branch"');
      exec(`git checkout ${currentBranch}`);
      exec(`git worktree add ${tempDeployDir} ${ghPagesBranch}`);
    }

    // Copy built files to the temp directory (preserving existing files)
    console.log(`${colors.blue}Copying build files to the deployment directory...${colors.reset}`);
    copyDir(buildDir, tempDeployDir);

    // Commit and push changes
    console.log(`${colors.blue}Committing and pushing changes...${colors.reset}`);
    exec(`cd ${tempDeployDir} && git add .`);
    exec(`cd ${tempDeployDir} && git commit -m "Deploy documentation - based on ${currentHash.substring(0, 8)}"`);
    exec(`cd ${tempDeployDir} && git push origin ${ghPagesBranch}`);

    // Clean up
    console.log(`${colors.blue}Cleaning up...${colors.reset}`);
    exec(`git worktree remove ${tempDeployDir}`);

    console.log(`${colors.green}${colors.bright}✅ Successfully deployed to ${ghPagesBranch}!${colors.reset}`);
    console.log(`${colors.green}View your site at https://[username].github.io/vss-ol-cli/${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Deployment failed:${colors.reset}`, error);
    
    // Attempt cleanup
    try {
      if (fs.existsSync(tempDeployDir)) {
        exec(`git worktree remove ${tempDeployDir} --force`);
      }
    } catch (cleanupError) {
      console.error(`${colors.red}Cleanup failed:${colors.reset}`, cleanupError);
    }
    
    process.exit(1);
  }
}

// Execute the deployment
deploy();