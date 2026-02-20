/**
 * Supabase setup functions
 * Handles Supabase CLI installation, authentication, project linking, and credentials
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const https = require('https');
const { URL } = require('url');
const { log, subheader, header, color, ICONS } = require('./ui.cjs');
const { ask, askYesNo, askSecret, askChoice } = require('./input.cjs');

/**
 * Check if Supabase CLI is installed
 */
function checkSupabaseCLIInstalled() {
  try {
    const result = execSync('supabase --version', { stdio: 'pipe', encoding: 'utf8' });
    const match = result.match(/([\d.]+)/);
    return { installed: true, version: match ? match[1] : 'unknown' };
  } catch {
    // If not in PATH, check Scoop installation directory (Windows)
    if (process.platform === 'win32') {
      const scoopPath = getScoopPath();
      if (scoopPath) {
        const supabasePath = path.join(scoopPath, 'shims', 'supabase.exe');
        if (fs.existsSync(supabasePath)) {
          try {
            const result = execSync(`"${supabasePath}" --version`, { stdio: 'pipe', encoding: 'utf8' });
            const match = result.match(/([\d.]+)/);
            return { installed: true, version: match ? match[1] : 'unknown', path: supabasePath };
          } catch {
            // Binary exists but can't execute
            return { installed: true, version: 'unknown', path: supabasePath };
          }
        }
      }
    }
    return { installed: false, version: null };
  }
}

/**
 * Check if user is logged in to Supabase CLI
 */
function checkSupabaseLoggedIn() {
  // Primary method: Check for credential files directly
  const homeDir = process.env.USERPROFILE || process.env.HOME;
  const credPath = path.join(homeDir, '.supabase', 'access-token');

  if (fs.existsSync(credPath)) {
    return { loggedIn: true };
  }

  // Fallback: Try CLI command (may fail in Git Bash)
  try {
    // Use full path if Scoop-installed
    const scoopPath = getScoopPath();
    let command = 'supabase';

    if (scoopPath && process.platform === 'win32') {
      const supabasePath = path.join(scoopPath, 'shims', 'supabase.exe');
      if (fs.existsSync(supabasePath)) {
        command = `"${supabasePath}"`;
      }
    }

    execSync(`${command} projects list`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 10000
    });
    return { loggedIn: true };
  } catch {
    return { loggedIn: false };
  }
}

/**
 * Check if Supabase is initialized in current directory
 */
function checkSupabaseInitialized() {
  const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
  return fs.existsSync(configPath);
}

/**
 * Check if project is linked to a Supabase project
 */
function checkSupabaseLinked() {
  // Primary method: Check for config.toml file with project_id
  const configPath = path.join(process.cwd(), 'supabase', 'config.toml');

  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      // If config has a project_id, it's linked
      if (configContent.includes('project_id =')) {
        return { linked: true, status: 'linked via config.toml' };
      }
    } catch {
      // Fall through to CLI check
    }
  }

  // Fallback: Try CLI command
  try {
    // Use full path if Scoop-installed
    const scoopPath = getScoopPath();
    let command = 'supabase';

    if (scoopPath && process.platform === 'win32') {
      const supabasePath = path.join(scoopPath, 'shims', 'supabase.exe');
      if (fs.existsSync(supabasePath)) {
        command = `"${supabasePath}"`;
      }
    }

    const result = execSync(`${command} status`, {
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 10000
    });
    return { linked: !result.includes('not linked'), status: result };
  } catch {
    return { linked: false, status: null };
  }
}

/**
 * Get Supabase CLI installation instructions
 */
function getSupabaseCLIInstallInstructions(platformInfo) {
  if (platformInfo.isWindows) {
    return `Install Supabase CLI:
    Option 1 (Recommended - via Scoop):
      1. Install Scoop if needed: https://scoop.sh
      2. Run: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
      3. Run: scoop install supabase

    Option 2 (Direct download):
      Download from https://github.com/supabase/cli/releases
      Extract and add to PATH

    Note: npm install -g supabase is NO LONGER SUPPORTED`;
  } else if (platformInfo.isMac) {
    return `Install Supabase CLI:
    brew install supabase/tap/supabase`;
  } else {
    return `Install Supabase CLI:
    brew install supabase/tap/supabase
    Or download from https://github.com/supabase/cli/releases`;
  }
}

/**
 * Get Scoop installation path
 */
function getScoopPath() {
  const userProfile = process.env.USERPROFILE;
  const defaultPath = path.join(userProfile, 'scoop', 'shims', 'scoop.cmd');
  const globalPath = path.join(process.env.ProgramData || 'C:\\ProgramData', 'scoop', 'shims', 'scoop.cmd');

  if (fs.existsSync(defaultPath)) {
    return path.join(userProfile, 'scoop');
  }
  if (fs.existsSync(globalPath)) {
    return path.join(process.env.ProgramData || 'C:\\ProgramData', 'scoop');
  }
  return null;
}

/**
 * Check if Scoop is installed (Windows package manager)
 */
function checkScoopInstalled() {
  try {
    execSync('scoop --version', { stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch {
    // Check if Scoop exists in the default installation directory
    const scoopPath = getScoopPath();
    return scoopPath !== null;
  }
}

/**
 * Install Scoop package manager (Windows)
 */
async function installScoop() {
  log('Installing Scoop package manager...', 'info');
  console.log(color('  Scoop will be installed to your user profile', 'dim'));
  console.log('');

  try {
    // Install Scoop using PowerShell
    const command = `powershell -ExecutionPolicy Bypass -Command "& {Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force; Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression}"`;

    execSync(command, { stdio: 'inherit', shell: true });

    // Check if Scoop was installed
    const scoopPath = getScoopPath();

    if (scoopPath) {
      // Add Scoop to PATH for current process
      const scoopShims = path.join(scoopPath, 'shims');
      process.env.PATH = `${scoopShims};${process.env.PATH}`;

      log('Scoop installed successfully', 'success');
      console.log(color('  Note: Scoop is now available in this session', 'dim'));
      return { success: true };
    } else {
      return { success: false, message: 'Scoop installation failed - could not find installation directory' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Install Supabase CLI
 */
async function installSupabaseCLI(platformInfo, rl) {
  const commands = {
    darwin: 'brew install supabase/tap/supabase',
    linux: 'brew install supabase/tap/supabase',
    win32: null,
  };

  const command = commands[platformInfo.platform];

  // Handle Windows installation
  if (!command) {
    if (platformInfo.isWindows) {
      let scoopInstalled = checkScoopInstalled();

      // If Scoop is not installed, offer to install it
      if (!scoopInstalled) {
        log('Scoop package manager not found', 'warning');
        console.log('');
        console.log(color('Scoop is a package manager for Windows that makes installing CLI tools easy.', 'dim'));
        console.log(color('Installing Scoop will enable automatic installation of Supabase CLI.', 'dim'));
        console.log('');

        const installScoopChoice = await askYesNo(rl, 'Would you like to install Scoop now?', true);

        if (installScoopChoice) {
          const scoopResult = await installScoop();
          if (scoopResult.success) {
            scoopInstalled = true;
          } else {
            log(`Failed to install Scoop: ${scoopResult.message}`, 'error');
            return {
              success: false,
              message: 'Scoop installation failed. Please install manually or download Supabase CLI directly.'
            };
          }
        } else {
          return {
            success: false,
            message: 'Auto-install requires Scoop. Install Scoop first or download Supabase CLI manually.'
          };
        }
      }

      // Now install Supabase CLI via Scoop
      if (scoopInstalled) {
        log('Installing Supabase CLI via Scoop...', 'info');

        // Ensure Scoop is in PATH for current process
        const scoopPath = getScoopPath();
        if (scoopPath) {
          const scoopShims = path.join(scoopPath, 'shims');
          if (!process.env.PATH.includes(scoopShims)) {
            process.env.PATH = `${scoopShims};${process.env.PATH}`;
          }
        }

        try {
          // Add Supabase bucket if not already added
          log('Adding Supabase bucket...', 'info');
          try {
            execSync('scoop bucket add supabase https://github.com/supabase/scoop-bucket.git', {
              stdio: 'inherit',
              shell: true
            });
          } catch {
            // Bucket might already exist, ignore error
          }

          // Install Supabase CLI
          console.log('');
          log('Installing Supabase CLI (this may take a minute)...', 'info');
          execSync('scoop install supabase', { stdio: 'inherit', shell: true });

          // Add Supabase to PATH for current process
          if (scoopPath) {
            const scoopShims = path.join(scoopPath, 'shims');
            process.env.PATH = `${scoopShims};${process.env.PATH}`;
          }

          const cliCheck = checkSupabaseCLIInstalled();
          if (cliCheck.installed) {
            return { success: true };
          }
          return { success: false, message: 'Installation completed but supabase not found in PATH. You may need to restart your terminal.' };
        } catch (error) {
          return { success: false, message: error.message };
        }
      }
    }
    return { success: false, message: 'Auto-install not available. Please install manually.' };
  }

  log('Installing Supabase CLI...', 'info');
  console.log(color(`  Running: ${command}`, 'dim'));

  try {
    execSync(command, { stdio: 'inherit', shell: true });
    if (checkSupabaseCLIInstalled().installed) {
      return { success: true };
    }
    return { success: false, message: 'Installation completed but supabase not found in PATH' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Login to Supabase CLI
 */
async function loginSupabase(rl) {
  log('Starting Supabase login...', 'info');
  console.log('');
  console.log(color('This will open a browser to authenticate with Supabase.', 'dim'));
  console.log(color('Follow the prompts to complete authentication.', 'dim'));
  console.log('');

  try {
    return new Promise((resolve) => {
      const child = spawn('supabase', ['login'], {
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
 * Initialize Supabase in current directory
 */
async function initSupabase() {
  log('Initializing Supabase in current directory...', 'info');

  try {
    const result = execSync('supabase init', {
      stdio: 'pipe',
      shell: true,
      encoding: 'utf8',
      timeout: 30000 // 30 second timeout
    });
    if (result) {
      console.log(color(result, 'dim'));
    }
    return { success: true };
  } catch (error) {
    // Show error output if available
    if (error.stderr) {
      console.log(color(error.stderr, 'yellow'));
    }
    return { success: false, message: error.message };
  }
}

/**
 * List Supabase projects
 */
function listSupabaseProjects() {
  try {
    const result = execSync('supabase projects list', { stdio: 'pipe', encoding: 'utf8', timeout: 30000 });
    const lines = result.trim().split('\n').filter(line => line.trim());
    const projects = [];
    let headerFound = false;

    for (const line of lines) {
      if (line.includes('──') || line.includes('LINKED')) {
        headerFound = true;
        continue;
      }
      if (headerFound && line.trim()) {
        const parts = line.split('│').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          projects.push({
            name: parts[0],
            id: parts[1],
            org: parts[2] || '',
            region: parts[3] || '',
          });
        }
      }
    }

    return { success: true, projects };
  } catch (error) {
    return { success: false, projects: [], message: error.message };
  }
}

/**
 * Link to a Supabase project
 */
async function linkSupabaseProject(projectRef) {
  log(`Linking to project: ${projectRef}...`, 'info');

  try {
    return new Promise((resolve) => {
      const child = spawn('supabase', ['link', '--project-ref', projectRef], {
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
 * Get Supabase project credentials from dashboard or CLI
 */
async function getSupabaseCredentials(rl, projectRef) {
  subheader('Supabase Project Credentials');

  console.log('Your Supabase project needs the following credentials:');
  console.log('');
  console.log(color('To find these values:', 'bright'));
  console.log(`  1. Go to: ${color('https://supabase.com/dashboard/project/' + (projectRef || '[your-project]') + '/settings/api', 'cyan')}`);
  console.log('  2. Copy the values from the API Settings page');
  console.log('');

  const credentials = {};

  console.log(color('Project URL:', 'bright'));
  console.log(color('  Found under "Project URL" in API Settings', 'dim'));
  const url = await ask(rl, `  ${color('SUPABASE_URL', 'cyan')} (e.g., https://xxxxx.supabase.co)`);
  if (url) {
    credentials.SUPABASE_URL = url;
    credentials.NEXT_PUBLIC_SUPABASE_URL = url;
  }

  console.log('');
  console.log(color('Anon/Public Key:', 'bright'));
  console.log(color('  Found under "Project API keys" → "anon public"', 'dim'));
  const anonKey = await askSecret(rl, `  ${color('SUPABASE_ANON_KEY', 'cyan')}`);
  if (anonKey) {
    credentials.SUPABASE_ANON_KEY = anonKey;
    credentials.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
  }

  console.log('');
  console.log(color('Service Role Key (SECRET - server-side only):', 'bright'));
  console.log(color('  Found under "Project API keys" → "service_role secret"', 'dim'));
  console.log(color('  ⚠️  This key bypasses RLS - never expose to client!', 'yellow'));
  const serviceKey = await askSecret(rl, `  ${color('SUPABASE_SERVICE_ROLE_KEY', 'cyan')} (or Enter to skip)`);
  if (serviceKey) {
    credentials.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  }

  console.log('');
  console.log(color('Database Connection String (optional):', 'bright'));
  console.log(color('  Found under "Database Settings" → "Connection string"', 'dim'));
  const dbUrl = await askSecret(rl, `  ${color('DATABASE_URL', 'cyan')} (or Enter to skip)`);
  if (dbUrl) {
    credentials.DATABASE_URL = dbUrl;
  }

  return credentials;
}

/**
 * Validate Supabase credentials
 */
async function validateSupabaseCredentials(credentials) {
  if (!credentials.SUPABASE_URL || !credentials.SUPABASE_ANON_KEY) {
    return { valid: false, message: 'URL and Anon Key are required' };
  }

  if (!credentials.SUPABASE_URL.includes('supabase.co') && !credentials.SUPABASE_URL.includes('supabase.in')) {
    return { valid: false, message: 'URL does not appear to be a valid Supabase URL' };
  }

  try {
    // Use native https module to prevent command injection
    const parsedUrl = new URL(`${credentials.SUPABASE_URL}/rest/v1/`);

    const statusCode = await new Promise((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        method: 'GET',
        headers: {
          'apikey': credentials.SUPABASE_ANON_KEY,
        },
      };

      const req = https.request(options, (res) => {
        res.resume(); // Consume response data
        resolve(res.statusCode);
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });

    if (statusCode === 200 || statusCode === 404) {
      return { valid: true };
    } else if (statusCode === 401) {
      return { valid: false, message: 'Invalid API key' };
    } else {
      return { valid: false, message: `Unexpected status code: ${statusCode}` };
    }
  } catch (error) {
    log('Could not validate credentials (network issue) - assuming valid', 'warning');
    return { valid: true };
  }
}

/**
 * Main Supabase setup function (REQUIRED STEP)
 */
async function setupSupabase(rl, platformInfo) {
  header('Supabase Setup (Required)');

  console.log('Supabase is required for this project\'s database and authentication.');
  console.log('You can choose to:');
  console.log(`  ${ICONS.bullet} Set up Supabase MCP server only (recommended - no CLI needed)`);
  console.log(`  ${ICONS.bullet} Full setup with CLI (for local development & migrations)`);
  console.log('');

  const setupChoice = await askChoice(rl, 'How would you like to set up Supabase?', [
    { value: 'mcp-only', label: 'MCP Server Only', description: 'API credentials + MCP (no CLI)' },
    { value: 'full', label: 'Full Setup', description: 'CLI + MCP + credentials' },
  ]);

  const results = {
    cliInstalled: false,
    loggedIn: false,
    initialized: false,
    linked: false,
    credentials: {},
    projectRef: null,
    mcpEnabled: false,
  };

  // If MCP-only mode, skip CLI steps
  const skipCLI = (setupChoice === 'mcp-only');

  // Step 1: CLI (skip if MCP-only mode)
  if (!skipCLI) {
    subheader('Step 1: Supabase CLI');
    let cliStatus = checkSupabaseCLIInstalled();

    if (cliStatus.installed) {
    log(`Supabase CLI installed (v${cliStatus.version})`, 'success');
    if (cliStatus.path) {
      console.log(color(`  Found at: ${cliStatus.path}`, 'dim'));
      console.log(color('  Note: You may need to restart your terminal to use it from Git Bash', 'dim'));
    }
    results.cliInstalled = true;
  } else {
    log('Supabase CLI is not installed', 'warning');
    console.log('');
    console.log(color('Supabase CLI is required for:', 'dim'));
    console.log(color('  - Local development', 'dim'));
    console.log(color('  - Database migrations', 'dim'));
    console.log(color('  - Type generation', 'dim'));
    console.log('');

    const installCli = await askYesNo(rl, 'Would you like to install Supabase CLI now?', true);

    if (installCli) {
      const installResult = await installSupabaseCLI(platformInfo, rl);
      if (installResult.success) {
        results.cliInstalled = true;
        cliStatus = checkSupabaseCLIInstalled();
        log(`Supabase CLI installed successfully (v${cliStatus.version})`, 'success');
      } else {
        log(`Failed to install: ${installResult.message}`, 'error');
        console.log('');
        console.log(color('Manual installation instructions:', 'yellow'));
        console.log(getSupabaseCLIInstallInstructions(platformInfo));
        console.log('');

        const continueWithoutCli = await askYesNo(rl, 'Continue without Supabase CLI? (you can install it later)', true);
        if (!continueWithoutCli) {
          throw new Error('Supabase CLI is required. Please install it and run setup again.');
        }
      }
    } else {
      log('Skipping Supabase CLI installation', 'info');
      console.log(color('You can install it later from https://supabase.com/docs/guides/cli', 'dim'));
    }
  }
  } // End of !skipCLI check

  // Step 2: Login (skip if MCP-only mode)
  if (!skipCLI && results.cliInstalled) {
    subheader('Step 2: Supabase Authentication');
    const loginStatus = checkSupabaseLoggedIn();

    if (loginStatus.loggedIn) {
      log('Already logged in to Supabase', 'success');
      results.loggedIn = true;
    } else {
      log('Not logged in to Supabase', 'warning');
      const login = await askYesNo(rl, 'Would you like to login now?', true);

      if (login) {
        const loginResult = await loginSupabase(rl);
        if (loginResult.success) {
          log('Successfully logged in to Supabase', 'success');
          results.loggedIn = true;
        } else {
          log(`Login failed: ${loginResult.message}`, 'error');
        }
      }
    }
  }

  // Step 3: Initialize (skip if MCP-only mode)
  if (!skipCLI && results.cliInstalled) {
    subheader('Step 3: Project Initialization');
    const isInitialized = checkSupabaseInitialized();

    if (isInitialized) {
      log('Supabase already initialized in this directory', 'success');
      results.initialized = true;
    } else {
      log('Supabase not initialized in this directory', 'warning');
      const initialize = await askYesNo(rl, 'Would you like to initialize Supabase here?', true);

      if (initialize) {
        const initResult = await initSupabase();
        if (initResult.success) {
          log('Supabase initialized successfully', 'success');
          results.initialized = true;
        } else {
          log(`Initialization failed: ${initResult.message}`, 'error');
        }
      }
    }
  }

  // Step 4: Link (skip if MCP-only mode)
  if (!skipCLI && results.cliInstalled && results.loggedIn) {
    subheader('Step 4: Project Linking');
    const linkStatus = checkSupabaseLinked();

    if (linkStatus.linked) {
      log('Project is already linked', 'success');
      results.linked = true;
    } else {
      log('Project is not linked to a Supabase project', 'warning');
      const link = await askYesNo(rl, 'Would you like to link to a Supabase project?', true);

      if (link) {
        console.log('');
        log('Fetching your Supabase projects...', 'info');
        const projectsResult = listSupabaseProjects();

        if (projectsResult.success && projectsResult.projects.length > 0) {
          console.log('');
          const projectChoices = projectsResult.projects.map(p => ({
            value: p.id,
            label: p.name,
            description: `${p.region} (${p.id})`,
          }));
          projectChoices.push({
            value: 'manual',
            label: 'Enter project ref manually',
            description: '',
          });

          const selectedProject = await askChoice(rl, 'Select a project to link:', projectChoices);

          let projectRef = selectedProject;
          if (selectedProject === 'manual') {
            projectRef = await ask(rl, '  Enter project reference ID');
          }

          if (projectRef && projectRef !== 'manual') {
            results.projectRef = projectRef;
            const linkResult = await linkSupabaseProject(projectRef);
            if (linkResult.success) {
              log('Project linked successfully', 'success');
              results.linked = true;
            } else {
              log(`Link failed: ${linkResult.message}`, 'error');
            }
          }
        } else {
          console.log('');
          console.log(color('No projects found or could not fetch projects.', 'yellow'));
          console.log('');
          const manualRef = await ask(rl, '  Enter project reference ID (or press Enter to skip)');
          if (manualRef) {
            results.projectRef = manualRef;
            const linkResult = await linkSupabaseProject(manualRef);
            if (linkResult.success) {
              log('Project linked successfully', 'success');
              results.linked = true;
            } else {
              log(`Link failed: ${linkResult.message}`, 'error');
            }
          }
        }
      }
    }
  }

  // Step 5: Project Reference (REQUIRED for MCP-only mode)
  if (skipCLI) {
    subheader('Step 1: Project Reference');
    console.log(color('The Supabase MCP server requires your project reference ID.', 'bright'));
    console.log('');
    console.log(color('To find your project reference:', 'dim'));
    console.log(color('  1. Go to: https://supabase.com/dashboard', 'dim'));
    console.log(color('  2. Select your project', 'dim'));
    console.log(color('  3. Go to Settings → API', 'dim'));
    console.log(color('  4. Copy the "Project ref" value', 'dim'));
    console.log('');

    const projectRef = await ask(rl, 'Enter your Supabase project reference (e.g., abcdefghijklmnopqr)');
    if (projectRef) {
      results.projectRef = projectRef;
      log(`Project reference set: ${projectRef}`, 'success');
    } else {
      log('No project reference provided - MCP server will need manual configuration', 'warning');
    }
    console.log('');
  }

  // Step 6: Credentials (REQUIRED for MCP)
  const stepNumber = skipCLI ? '2' : '5';
  subheader(`Step ${stepNumber}: Project Credentials`);
  if (skipCLI) {
    console.log(color('API credentials are REQUIRED for the Supabase MCP server.', 'bright'));
  } else {
    console.log(color('API credentials are recommended for the application to connect to Supabase.', 'bright'));
  }
  console.log(color('You can add these later to your .env file if you skip this step.', 'dim'));
  console.log('');

  const setupCredentials = await askYesNo(rl, 'Would you like to configure Supabase credentials now?', true);

  if (setupCredentials) {
    const credentials = await getSupabaseCredentials(rl, results.projectRef);

    if (credentials.SUPABASE_URL && credentials.SUPABASE_ANON_KEY) {
      log('Validating credentials...', 'info');
      const validation = await validateSupabaseCredentials(credentials);

      if (validation.valid) {
        log('Credentials validated successfully', 'success');
        results.credentials = credentials;
      } else {
        log(`Validation failed: ${validation.message}`, 'error');
        const retry = await askYesNo(rl, 'Would you like to re-enter credentials?', true);
        if (retry) {
          const retryCredentials = await getSupabaseCredentials(rl, results.projectRef);
          results.credentials = retryCredentials;
        } else {
          results.credentials = credentials;
          log('Using credentials without validation', 'warning');
        }
      }
    } else {
      log('No credentials provided - you can add them later to .env', 'warning');
      results.credentials = {};
    }
  } else {
    log('Skipping credentials setup - you can add them later to .env', 'info');
    results.credentials = {};
  }

  // Step 7: Supabase MCP Server (Auto-enabled)
  const mcpStepNumber = skipCLI ? '3' : '6';
  subheader(`Step ${mcpStepNumber}: Supabase MCP Server`);

  console.log('The Supabase MCP server enables Claude Code to:');
  console.log(`  ${ICONS.bullet} Query and manage database tables`);
  console.log(`  ${ICONS.bullet} Execute SQL commands`);
  console.log(`  ${ICONS.bullet} Manage authentication`);
  console.log('');

  log('Supabase MCP server will be enabled automatically', 'success');
  results.mcpEnabled = true;
  results.setupMode = skipCLI ? 'mcp-only' : 'full';

  console.log('');
  console.log(color('After setup completes, authenticate the MCP server:', 'bright'));
  console.log(color('  1. In a regular terminal (not IDE), run: claude /mcp', 'dim'));
  console.log(color('  2. Select "supabase" → "Authenticate"', 'dim'));
  console.log(color('  3. Follow the browser authentication flow', 'dim'));
  console.log('');
  console.log(color('Note: The MCP uses the cloud-hosted Supabase API (no local server needed)', 'dim'));
  console.log('');

  // Summary
  console.log('');
  console.log(color('─── Supabase Setup Summary ───', 'cyan'));
  console.log(`  Setup mode: ${results.setupMode === 'mcp-only' ? color('MCP Only', 'green') : color('Full (CLI + MCP)', 'green')}`);
  if (!skipCLI) {
    console.log(`  CLI installed: ${results.cliInstalled ? color('yes', 'green') : color('no', 'yellow')}`);
    console.log(`  Logged in: ${results.loggedIn ? color('yes', 'green') : color('no', 'yellow')}`);
    console.log(`  Initialized: ${results.initialized ? color('yes', 'green') : color('no', 'yellow')}`);
    console.log(`  Project linked: ${results.linked ? color('yes', 'green') : color('no', 'yellow')}`);
  }
  console.log(`  Credentials: ${Object.keys(results.credentials).length > 0 ? color('configured', 'green') : color('not configured', 'red')}`);
  console.log(`  MCP server: ${results.mcpEnabled ? color('enabled', 'green') : color('disabled', 'yellow')}`);
  console.log('');

  return results;
}

module.exports = {
  setupSupabase,
};
