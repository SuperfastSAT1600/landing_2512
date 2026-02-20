/**
 * GitHub setup functions
 * Handles GitHub CLI installation, authentication, and PAT configuration
 */

const { execSync, spawn, spawnSync } = require('child_process');
const https = require('https');
const { log, subheader, color, ICONS } = require('./ui.cjs');
const { ask, askYesNo, askSecret } = require('./input.cjs');

/**
 * Check if GitHub CLI is installed
 */
function checkGitHubCLIInstalled() {
  try {
    const result = execSync('gh --version', { stdio: 'pipe', encoding: 'utf8' });
    const match = result.match(/gh version ([\d.]+)/);
    return { installed: true, version: match ? match[1] : 'unknown' };
  } catch {
    return { installed: false, version: null };
  }
}

/**
 * Check if user is authenticated with GitHub CLI
 */
function checkGitHubAuthenticated() {
  try {
    const result = execSync('gh auth status', { stdio: 'pipe', encoding: 'utf8' });
    const userMatch = result.match(/Logged in to github\.com account (\S+)/i) ||
                      result.match(/Logged in to github\.com as (\S+)/i);
    return { authenticated: true, username: userMatch ? userMatch[1] : 'unknown' };
  } catch {
    return { authenticated: false, username: null };
  }
}

/**
 * Check if git is configured with user name and email
 */
function checkGitConfig() {
  try {
    const name = execSync('git config --global user.name', { stdio: 'pipe', encoding: 'utf8' }).trim();
    const email = execSync('git config --global user.email', { stdio: 'pipe', encoding: 'utf8' }).trim();
    return { configured: !!(name && email), name, email };
  } catch {
    return { configured: false, name: null, email: null };
  }
}

/**
 * Get GitHub CLI installation instructions
 */
function getGitHubCLIInstallInstructions(platformInfo) {
  if (platformInfo.isWindows) {
    return `Install GitHub CLI:
    Option 1: winget install GitHub.cli
    Option 2: Download from https://cli.github.com/`;
  } else if (platformInfo.isMac) {
    return `Install GitHub CLI:
    brew install gh
    Or download from https://cli.github.com/`;
  } else {
    return `Install GitHub CLI:
    ${platformInfo.isDebian ? 'sudo apt install gh' : 'See https://cli.github.com/ for installation instructions'}`;
  }
}

/**
 * Install GitHub CLI
 */
async function installGitHubCLI(platformInfo) {
  const commands = {
    darwin: 'brew install gh',
    linux: platformInfo.isDebian
      ? '(type -p wget >/dev/null || sudo apt install wget -y) && sudo mkdir -p -m 755 /etc/apt/keyrings && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y'
      : null,
    win32: 'winget install GitHub.cli',
  };

  const command = commands[platformInfo.platform];
  if (!command) {
    return { success: false, message: 'Auto-install not available for your platform' };
  }

  log('Installing GitHub CLI...', 'info');
  console.log(color(`  Running: ${command.substring(0, 60)}${command.length > 60 ? '...' : ''}`, 'dim'));

  try {
    execSync(command, { stdio: 'inherit', shell: true });
    if (checkGitHubCLIInstalled().installed) {
      return { success: true };
    }
    return { success: false, message: 'Installation completed but gh not found in PATH' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Authenticate with GitHub CLI
 */
async function authenticateGitHub(rl) {
  log('Starting GitHub authentication...', 'info');
  console.log('');
  console.log(color('This will open a browser to authenticate with GitHub.', 'dim'));
  console.log(color('Follow the prompts to complete authentication.', 'dim'));
  console.log('');

  try {
    return new Promise((resolve) => {
      const child = spawn('gh', ['auth', 'login', '--web'], {
        stdio: 'inherit',
        shell: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, message: `Authentication exited with code ${code}` });
        }
      });

      child.on('error', (error) => {
        resolve({ success: false, message: error.message });
      });
    });
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Configure git user name and email
 */
async function configureGitIdentity(rl) {
  subheader('Git Identity Configuration');

  console.log('Git needs your name and email for commits.');
  console.log(color('This is required for all git operations.', 'dim'));
  console.log('');

  const name = await ask(rl, 'Your name (for git commits)');
  const email = await ask(rl, 'Your email (for git commits)');

  if (!name || !email) {
    return { success: false, message: 'Name and email are required' };
  }

  try {
    // Use spawnSync with array args to prevent command injection
    const nameResult = spawnSync('git', ['config', '--global', 'user.name', name], { encoding: 'utf8' });
    if (nameResult.error) throw nameResult.error;

    const emailResult = spawnSync('git', ['config', '--global', 'user.email', email], { encoding: 'utf8' });
    if (emailResult.error) throw emailResult.error;

    log(`Git configured as: ${name} <${email}>`, 'success');
    return { success: true, name, email };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Validate GitHub Personal Access Token
 */
async function validateGitHubToken(token) {
  try {
    // Use native https module to prevent command injection
    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/user',
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'claude-code-setup',
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
    if (data.login) {
      return { valid: true, username: data.login };
    }
    return { valid: false, message: 'Token is invalid or expired' };
  } catch (error) {
    return { valid: false, message: error.message };
  }
}

/**
 * Setup GitHub Personal Access Token for MCP
 */
async function setupGitHubToken(rl) {
  subheader('GitHub Personal Access Token');

  console.log('A Personal Access Token (PAT) is needed for the GitHub MCP server.');
  console.log('');
  console.log(color('To create a token:', 'bright'));
  console.log(`  1. Go to: ${color('https://github.com/settings/tokens?type=beta', 'cyan')}`);
  console.log('  2. Click "Generate new token"');
  console.log('  3. Give it a name (e.g., "Claude Code MCP")');
  console.log('  4. Select repository access (recommend: All repositories)');
  console.log('  5. Select permissions: Contents (read/write), Pull requests (read/write)');
  console.log('  6. Click "Generate token" and copy it');
  console.log('');

  const token = await askSecret(rl, 'Paste your GitHub Personal Access Token (or press Enter to skip)');

  if (!token) {
    return { success: false, skipped: true };
  }

  // Validate the token
  log('Validating token...', 'info');
  const validation = await validateGitHubToken(token);

  if (validation.valid) {
    log(`Token valid! Authenticated as: ${validation.username}`, 'success');
    return { success: true, token, username: validation.username };
  } else {
    log(`Token validation failed: ${validation.message}`, 'error');
    const retry = await askYesNo(rl, 'Would you like to try a different token?', true);
    if (retry) {
      return setupGitHubToken(rl);
    }
    return { success: false, message: validation.message };
  }
}

/**
 * Main GitHub setup function (REQUIRED STEP)
 */
async function setupGitHub(rl, platformInfo) {
  const { header } = require('./ui.cjs');
  header('GitHub Setup (Required)');

  console.log('GitHub integration is required for this project.');
  console.log('This step will configure:');
  console.log(`  ${ICONS.bullet} Git identity (name & email)`);
  console.log(`  ${ICONS.bullet} GitHub CLI authentication`);
  console.log(`  ${ICONS.bullet} Personal Access Token for MCP`);
  console.log('');

  const results = {
    gitConfigured: false,
    ghInstalled: false,
    ghAuthenticated: false,
    tokenConfigured: false,
    token: null,
  };

  // Step 1: Check and configure git identity
  subheader('Step 1: Git Identity');
  const gitConfig = checkGitConfig();

  if (gitConfig.configured) {
    log(`Git already configured as: ${gitConfig.name} <${gitConfig.email}>`, 'success');
    results.gitConfigured = true;

    const changeIdentity = await askYesNo(rl, 'Would you like to change this?', false);
    if (changeIdentity) {
      const identityResult = await configureGitIdentity(rl);
      results.gitConfigured = identityResult.success;
    }
  } else {
    log('Git identity not configured', 'warning');
    const identityResult = await configureGitIdentity(rl);
    if (!identityResult.success) {
      log('Git identity is required. Please configure it to continue.', 'error');
      const retry = await askYesNo(rl, 'Would you like to try again?', true);
      if (retry) {
        const retryResult = await configureGitIdentity(rl);
        results.gitConfigured = retryResult.success;
      }
      if (!results.gitConfigured) {
        throw new Error('Git identity configuration is required to continue setup.');
      }
    } else {
      results.gitConfigured = true;
    }
  }

  // Step 2: Check and install GitHub CLI
  subheader('Step 2: GitHub CLI');
  let ghStatus = checkGitHubCLIInstalled();

  if (ghStatus.installed) {
    log(`GitHub CLI installed (v${ghStatus.version})`, 'success');
    results.ghInstalled = true;
  } else {
    log('GitHub CLI (gh) is not installed', 'warning');
    console.log('');
    console.log(color('GitHub CLI provides the best experience for:', 'dim'));
    console.log(color('  - Creating pull requests', 'dim'));
    console.log(color('  - Managing issues', 'dim'));
    console.log(color('  - Repository operations', 'dim'));
    console.log('');

    const installGh = await askYesNo(rl, 'Would you like to install GitHub CLI now?', true);

    if (installGh) {
      const installResult = await installGitHubCLI(platformInfo);
      if (installResult.success) {
        results.ghInstalled = true;
        ghStatus = checkGitHubCLIInstalled();
        log(`GitHub CLI installed successfully (v${ghStatus.version})`, 'success');
      } else {
        log(`Failed to install: ${installResult.message}`, 'error');
        console.log('');
        console.log(color('Manual installation instructions:', 'yellow'));
        console.log(getGitHubCLIInstallInstructions(platformInfo));
        console.log('');
        log('You can continue without GitHub CLI, but some features will be limited.', 'warning');
      }
    } else {
      log('Skipping GitHub CLI installation', 'info');
      console.log(color('You can install it later from https://cli.github.com/', 'dim'));
    }
  }

  // Step 3: Authenticate with GitHub CLI (if installed)
  if (results.ghInstalled) {
    subheader('Step 3: GitHub Authentication');
    const authStatus = checkGitHubAuthenticated();

    if (authStatus.authenticated) {
      log(`Already authenticated as: ${authStatus.username}`, 'success');
      results.ghAuthenticated = true;
    } else {
      log('Not authenticated with GitHub', 'warning');

      const authenticate = await askYesNo(rl, 'Would you like to authenticate now?', true);

      if (authenticate) {
        const authResult = await authenticateGitHub(rl);
        if (authResult.success) {
          const newAuthStatus = checkGitHubAuthenticated();
          if (newAuthStatus.authenticated) {
            log(`Authenticated as: ${newAuthStatus.username}`, 'success');
            results.ghAuthenticated = true;
          }
        } else {
          log(`Authentication failed: ${authResult.message}`, 'error');
        }
      }
    }
  }

  // Step 4: Setup Personal Access Token for MCP
  subheader('Step 4: Personal Access Token (for MCP)');

  console.log('The GitHub MCP server requires a Personal Access Token.');
  console.log(color('This is separate from GitHub CLI authentication and is optional.', 'dim'));
  console.log(color('You can add it later to your .env file if you skip this step.', 'dim'));
  console.log('');

  const setupToken = await askYesNo(rl, 'Would you like to configure GitHub PAT now?', true);

  if (setupToken) {
    const tokenResult = await setupGitHubToken(rl);

    if (tokenResult.success) {
      results.tokenConfigured = true;
      results.token = tokenResult.token;
      results.tokenUsername = tokenResult.username;
    } else if (tokenResult.skipped) {
      log('Token setup skipped - you can add it later to .env', 'info');
    } else {
      log('Token setup failed - you can try again later', 'warning');
    }
  } else {
    log('Skipping GitHub PAT setup - you can add it later to .env', 'info');
  }

  // Step 5: Enable GitHub MCP Server
  if (results.tokenConfigured && results.token) {
    subheader('Step 5: GitHub MCP Server');

    console.log('The GitHub MCP server enables Claude Code to interact with GitHub:');
    console.log(`  ${ICONS.bullet} Create and manage pull requests`);
    console.log(`  ${ICONS.bullet} Search repositories and issues`);
    console.log(`  ${ICONS.bullet} Read and write files`);
    console.log('');

    const enableMcp = await askYesNo(rl, 'Enable GitHub MCP server?', true);

    if (enableMcp) {
      results.mcpEnabled = true;
      log('GitHub MCP server will be enabled', 'success');
      console.log(color('  This will be configured in the MCP setup step', 'dim'));
    } else {
      results.mcpEnabled = false;
      log('GitHub MCP server will not be enabled', 'info');
    }
  } else {
    results.mcpEnabled = false;
  }

  // Summary
  console.log('');
  console.log(color('─── GitHub Setup Summary ───', 'cyan'));
  console.log(`  Git identity: ${results.gitConfigured ? color('configured', 'green') : color('not configured', 'red')}`);
  console.log(`  GitHub CLI: ${results.ghInstalled ? color('installed', 'green') : color('not installed', 'yellow')}`);
  console.log(`  CLI authenticated: ${results.ghAuthenticated ? color('yes', 'green') : color('no', 'yellow')}`);
  console.log(`  MCP token: ${results.tokenConfigured ? color('configured', 'green') : color('not configured', 'yellow')}`);
  console.log(`  MCP server: ${results.mcpEnabled ? color('enabled', 'green') : color('disabled', 'yellow')}`);
  console.log('');

  return results;
}

module.exports = {
  setupGitHub,
  checkGitHubCLIInstalled,
  checkGitHubAuthenticated,
  checkGitConfig,
};
