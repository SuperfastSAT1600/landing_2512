/**
 * Claude Code CLI installation functions
 * Handles installation check, npm global install, and authentication guidance
 */

const { execSync } = require('child_process');
const { log, subheader, header, color, ICONS } = require('./ui.cjs');
const { askYesNo } = require('./input.cjs');

/**
 * Check if Claude Code CLI is installed
 */
function checkClaudeCodeInstalled() {
  try {
    const result = execSync('claude --version', { stdio: 'pipe', encoding: 'utf8' });
    // Parse version from output like "claude-code version 1.0.0"
    const match = result.match(/(\d+\.\d+\.\d+)/);
    return { installed: true, version: match ? match[1] : 'unknown' };
  } catch {
    return { installed: false, version: null };
  }
}

/**
 * Get Claude Code installation instructions based on platform
 */
function getInstallInstructions(platformInfo) {
  const npmInstall = 'npm install -g @anthropic-ai/claude-code';

  if (platformInfo.isWindows) {
    return `Install Claude Code CLI:
    ${npmInstall}

    Note: Run this in an elevated terminal (Admin PowerShell/CMD)`;
  } else if (platformInfo.isMac) {
    return `Install Claude Code CLI:
    ${npmInstall}

    Or with sudo if needed:
    sudo ${npmInstall}`;
  } else {
    return `Install Claude Code CLI:
    ${npmInstall}

    Or with sudo if needed:
    sudo ${npmInstall}`;
  }
}

/**
 * Install Claude Code via npm
 */
async function installClaudeCode(platformInfo) {
  const command = 'npm install -g @anthropic-ai/claude-code';

  log('Installing Claude Code CLI...', 'info');
  console.log(color(`  Running: ${command}`, 'dim'));
  console.log('');

  try {
    execSync(command, { stdio: 'inherit', shell: true });

    // Verify installation
    const status = checkClaudeCodeInstalled();
    if (status.installed) {
      return { success: true, version: status.version };
    }
    return { success: false, message: 'Installation completed but claude not found in PATH' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Show authentication guidance for Claude Code
 */
function showAuthGuidance() {
  subheader('Claude Code Authentication');

  console.log('To authenticate Claude Code, run:');
  console.log('');
  console.log(color('  claude auth login', 'cyan'));
  console.log('');
  console.log('This will:');
  console.log(`  ${ICONS.bullet} Open a browser to authenticate with Anthropic`);
  console.log(`  ${ICONS.bullet} Link your Anthropic account to the CLI`);
  console.log(`  ${ICONS.bullet} Store credentials securely on your machine`);
  console.log('');
  console.log(color('Tip: You can also use an API key with:', 'dim'));
  console.log(color('  claude auth login --api-key YOUR_KEY', 'dim'));
  console.log('');
}

/**
 * Main Claude Code setup function (Optional step)
 */
async function setupClaudeCode(rl, platformInfo) {
  header('Claude Code Setup (Optional)');

  console.log('Claude Code is the CLI tool you\'re using to interact with Claude.');
  console.log('This step will ensure it\'s properly installed and show auth guidance.');
  console.log('');

  const results = {
    installed: false,
    version: null,
    wasInstalled: false,
  };

  // Step 1: Check if Claude Code is installed
  subheader('Checking Claude Code Installation');
  const status = checkClaudeCodeInstalled();

  if (status.installed) {
    log(`Claude Code is installed (v${status.version})`, 'success');
    results.installed = true;
    results.version = status.version;
  } else {
    log('Claude Code CLI is not installed', 'warning');
    console.log('');

    const install = await askYesNo(rl, 'Would you like to install Claude Code now?', true);

    if (install) {
      const installResult = await installClaudeCode(platformInfo);

      if (installResult.success) {
        log(`Claude Code installed successfully (v${installResult.version})`, 'success');
        results.installed = true;
        results.version = installResult.version;
        results.wasInstalled = true;
      } else {
        log(`Failed to install: ${installResult.message}`, 'error');
        console.log('');
        console.log(color('Manual installation instructions:', 'yellow'));
        console.log(getInstallInstructions(platformInfo));
        console.log('');

        // Check if npm permissions issue
        if (installResult.message.includes('EACCES') || installResult.message.includes('permission')) {
          console.log(color('Tip: You may need elevated permissions (sudo on macOS/Linux, Admin on Windows)', 'yellow'));
        }
      }
    } else {
      log('Skipping Claude Code installation', 'info');
      console.log(color('You can install it later with: npm install -g @anthropic-ai/claude-code', 'dim'));
    }
  }

  // Step 2: Show authentication guidance
  if (results.installed) {
    showAuthGuidance();
  }

  // Summary
  console.log('');
  console.log(color('─── Claude Code Setup Summary ───', 'cyan'));
  console.log(`  Installed: ${results.installed ? color(`yes (v${results.version})`, 'green') : color('no', 'yellow')}`);
  if (results.wasInstalled) {
    console.log(`  ${color('Newly installed this session', 'green')}`);
  }
  console.log('');

  return results;
}

module.exports = {
  setupClaudeCode,
  checkClaudeCodeInstalled,
};
