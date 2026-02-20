/**
 * Vercel setup functions (OPTIONAL)
 * Handles Vercel CLI installation, authentication, project linking, and API token
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const https = require('https');
const { log, subheader, header, color } = require('./ui.cjs');
const { askYesNo, askSecret } = require('./input.cjs');

/**
 * Check if Vercel CLI is installed
 */
function checkVercelCLIInstalled() {
  try {
    const result = execSync('vercel --version', { stdio: 'pipe', encoding: 'utf8' });
    const match = result.match(/([\d.]+)/);
    return { installed: true, version: match ? match[1] : 'unknown' };
  } catch {
    return { installed: false, version: null };
  }
}

/**
 * Check if user is logged in to Vercel CLI
 */
function checkVercelLoggedIn() {
  try {
    const result = execSync('vercel whoami', { stdio: 'pipe', encoding: 'utf8', timeout: 10000 });
    return { loggedIn: true, username: result.trim() };
  } catch {
    return { loggedIn: false, username: null };
  }
}

/**
 * Check if project is linked to Vercel
 */
function checkVercelLinked() {
  const vercelDir = path.join(process.cwd(), '.vercel');
  const projectJson = path.join(vercelDir, 'project.json');
  if (fs.existsSync(projectJson)) {
    try {
      const config = JSON.parse(fs.readFileSync(projectJson, 'utf8'));
      return { linked: true, projectId: config.projectId, orgId: config.orgId };
    } catch {
      return { linked: false };
    }
  }
  return { linked: false };
}

/**
 * Get Vercel CLI installation instructions
 */
function getVercelCLIInstallInstructions() {
  return `Install Vercel CLI:
    npm install -g vercel
    Or: pnpm add -g vercel`;
}

/**
 * Install Vercel CLI
 */
async function installVercelCLI() {
  log('Installing Vercel CLI...', 'info');
  console.log(color('  Running: npm install -g vercel', 'dim'));

  try {
    execSync('npm install -g vercel', { stdio: 'inherit', shell: true });
    if (checkVercelCLIInstalled().installed) {
      return { success: true };
    }
    return { success: false, message: 'Installation completed but vercel not found in PATH' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Login to Vercel CLI
 */
async function loginVercel() {
  log('Starting Vercel login...', 'info');
  console.log('');
  console.log(color('This will open a browser to authenticate with Vercel.', 'dim'));
  console.log('');

  try {
    return new Promise((resolve) => {
      const child = spawn('vercel', ['login'], {
        stdio: 'inherit',
        shell: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, message: `Login exited with code ${code}` });
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
 * Link project to Vercel
 */
async function linkVercelProject() {
  log('Linking project to Vercel...', 'info');
  console.log('');
  console.log(color('Follow the prompts to link this project.', 'dim'));
  console.log('');

  try {
    return new Promise((resolve) => {
      const child = spawn('vercel', ['link'], {
        stdio: 'inherit',
        shell: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, message: `Link exited with code ${code}` });
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
 * Setup Vercel API token for MCP
 */
async function setupVercelToken(rl) {
  subheader('Vercel API Token (for MCP)');

  console.log('An API token is needed for the Vercel MCP server.');
  console.log('');
  console.log(color('To create a token:', 'bright'));
  console.log(`  1. Go to: ${color('https://vercel.com/account/tokens', 'cyan')}`);
  console.log('  2. Click "Create Token"');
  console.log('  3. Give it a name (e.g., "Claude Code MCP")');
  console.log('  4. Select scope (Full Account or specific projects)');
  console.log('  5. Click "Create Token" and copy it');
  console.log('');

  const token = await askSecret(rl, 'Paste your Vercel API Token (or press Enter to skip)');

  if (!token) {
    return { success: false, skipped: true };
  }

  log('Validating token...', 'info');
  try {
    // Use native https module to prevent command injection
    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.vercel.com',
        path: '/v2/user',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    if (data.user && data.user.username) {
      log(`Token valid! Authenticated as: ${data.user.username}`, 'success');
      return { success: true, token, username: data.user.username };
    } else if (data.error) {
      log(`Token validation failed: ${data.error.message}`, 'error');
      return { success: false, message: data.error.message };
    }
  } catch {
    log('Could not validate token (network issue) - assuming valid', 'warning');
    return { success: true, token };
  }

  return { success: true, token };
}

/**
 * Main Vercel setup function (OPTIONAL)
 */
async function setupVercel(rl, platformInfo) {
  header('Vercel Setup (Optional)');

  console.log('Vercel provides deployment and hosting for your application.');
  console.log('This step is optional but recommended for deployment workflows.');
  console.log('');

  const setupVercelNow = await askYesNo(rl, 'Would you like to configure Vercel?', true);

  if (!setupVercelNow) {
    log('Skipping Vercel setup', 'info');
    console.log(color('You can set up Vercel later by running: npx vercel', 'dim'));
    return { skipped: true };
  }

  const results = {
    cliInstalled: false,
    loggedIn: false,
    linked: false,
    token: null,
    tokenConfigured: false,
  };

  // Step 1: CLI
  subheader('Step 1: Vercel CLI');
  let cliStatus = checkVercelCLIInstalled();

  if (cliStatus.installed) {
    log(`Vercel CLI installed (v${cliStatus.version})`, 'success');
    results.cliInstalled = true;
  } else {
    log('Vercel CLI is not installed', 'warning');
    const installCli = await askYesNo(rl, 'Would you like to install Vercel CLI now?', true);

    if (installCli) {
      const installResult = await installVercelCLI();
      if (installResult.success) {
        results.cliInstalled = true;
        cliStatus = checkVercelCLIInstalled();
        log(`Vercel CLI installed successfully (v${cliStatus.version})`, 'success');
      } else {
        log(`Failed to install: ${installResult.message}`, 'error');
        console.log('');
        console.log(color('Manual installation:', 'yellow'));
        console.log(getVercelCLIInstallInstructions());
      }
    }
  }

  // Step 2: Login
  if (results.cliInstalled) {
    subheader('Step 2: Vercel Authentication');
    const loginStatus = checkVercelLoggedIn();

    if (loginStatus.loggedIn) {
      log(`Already logged in as: ${loginStatus.username}`, 'success');
      results.loggedIn = true;
    } else {
      log('Not logged in to Vercel', 'warning');
      const login = await askYesNo(rl, 'Would you like to login now?', true);

      if (login) {
        const loginResult = await loginVercel();
        if (loginResult.success) {
          const newStatus = checkVercelLoggedIn();
          if (newStatus.loggedIn) {
            log(`Successfully logged in as: ${newStatus.username}`, 'success');
            results.loggedIn = true;
          }
        } else {
          log(`Login failed: ${loginResult.message}`, 'error');
        }
      }
    }
  }

  // Step 3: Link
  if (results.cliInstalled && results.loggedIn) {
    subheader('Step 3: Project Linking');
    const linkStatus = checkVercelLinked();

    if (linkStatus.linked) {
      log('Project is already linked to Vercel', 'success');
      results.linked = true;
    } else {
      log('Project is not linked to Vercel', 'warning');
      const link = await askYesNo(rl, 'Would you like to link this project to Vercel?', true);

      if (link) {
        const linkResult = await linkVercelProject();
        if (linkResult.success) {
          log('Project linked successfully', 'success');
          results.linked = true;
        } else {
          log(`Link failed: ${linkResult.message}`, 'error');
        }
      }
    }
  }

  // Step 4: Token
  subheader('Step 4: API Token (for MCP)');
  console.log('The Vercel MCP server requires an API token for deployment management.');
  console.log(color('This is separate from CLI authentication.', 'dim'));
  console.log('');

  const tokenResult = await setupVercelToken(rl);

  if (tokenResult.success) {
    results.tokenConfigured = true;
    results.token = tokenResult.token;
  } else if (tokenResult.skipped) {
    log('Token setup skipped - Vercel MCP server will not work without it', 'info');
  }

  // Summary
  console.log('');
  console.log(color('─── Vercel Setup Summary ───', 'cyan'));
  console.log(`  CLI installed: ${results.cliInstalled ? color('yes', 'green') : color('no', 'yellow')}`);
  console.log(`  Logged in: ${results.loggedIn ? color('yes', 'green') : color('no', 'yellow')}`);
  console.log(`  Project linked: ${results.linked ? color('yes', 'green') : color('no', 'yellow')}`);
  console.log(`  MCP token: ${results.tokenConfigured ? color('configured', 'green') : color('not configured', 'yellow')}`);
  console.log('');

  return results;
}

module.exports = {
  setupVercel,
};
