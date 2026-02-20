/**
 * Prerequisites checking for Claude Code and project setup
 */

const { execSync } = require('child_process');
const { CONFIG } = require('./config.cjs');
const { log, subheader, color } = require('./ui.cjs');

/**
 * Check if a command exists
 */
function checkCommand(cmd) {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    execSync(checkCmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get command version
 */
function getCommandVersion(cmd, versionFlag = '--version') {
  try {
    const result = execSync(`${cmd} ${versionFlag}`, { stdio: 'pipe', encoding: 'utf8' });
    // Extract version number from output
    const match = result.match(/(\d+\.\d+(\.\d+)?)/);
    return match ? match[1] : 'unknown';
  } catch {
    return null;
  }
}

/**
 * Get Node.js version
 */
function getNodeVersion() {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);
    return { version, major };
  } catch {
    return { version: 'unknown', major: 0 };
  }
}

/**
 * Compare version strings (e.g., "14.2.1" >= "13.0")
 */
function compareVersions(current, minimum) {
  if (current === 'unknown') return false;

  const currentParts = current.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);

  for (let i = 0; i < minimumParts.length; i++) {
    const curr = currentParts[i] || 0;
    const min = minimumParts[i] || 0;

    if (curr > min) return true;
    if (curr < min) return false;
  }
  return true; // Equal
}

/**
 * Get installation instructions for a tool
 */
function getInstallInstructions(tool, platformInfo) {
  const instructions = {
    git: {
      darwin: 'Install Xcode Command Line Tools: xcode-select --install\n    Or install via Homebrew: brew install git',
      linux: platformInfo.isDebian
        ? 'sudo apt-get update && sudo apt-get install -y git'
        : platformInfo.isRHEL
          ? 'sudo dnf install -y git'
          : 'Install git using your package manager',
      win32: 'Download from https://git-scm.com/downloads/win\n    Or use: winget install Git.Git',
    },
    curl: {
      darwin: 'curl is included with macOS',
      linux: platformInfo.isDebian
        ? 'sudo apt-get update && sudo apt-get install -y curl'
        : platformInfo.isRHEL
          ? 'sudo dnf install -y curl'
          : 'Install curl using your package manager',
      win32: 'curl is included with Windows 10+',
    },
    rg: {
      darwin: 'brew install ripgrep',
      linux: platformInfo.isDebian
        ? 'sudo apt-get update && sudo apt-get install -y ripgrep'
        : platformInfo.isRHEL
          ? 'sudo dnf install -y ripgrep'
          : platformInfo.isAlpine
            ? 'apk add ripgrep'
            : 'Install ripgrep from https://github.com/BurntSushi/ripgrep',
      win32: 'winget install BurntSushi.ripgrep.MSVC\n    Or: choco install ripgrep',
    },
    node: {
      darwin: 'brew install node\n    Or download from https://nodejs.org/',
      linux: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\n    sudo apt-get install -y nodejs',
      win32: 'Download from https://nodejs.org/\n    Or: winget install OpenJS.NodeJS.LTS',
    },
    npm: {
      darwin: 'npm is included with Node.js',
      linux: 'npm is included with Node.js',
      win32: 'npm is included with Node.js',
    },
    wsl: {
      win32: 'wsl --install\n    Then restart your computer',
    },
    bash: {
      win32: 'Install Git for Windows: https://git-scm.com/downloads/win\n    Git Bash is included',
    },
  };

  const toolInstructions = instructions[tool];
  if (!toolInstructions) return `Install ${tool} from its official website`;

  return toolInstructions[platformInfo.platform] || `Install ${tool} from its official website`;
}

/**
 * Check Claude Code specific dependencies
 */
function checkClaudeCodeDependencies(platformInfo) {
  const results = {
    passed: true,
    issues: [],
    warnings: [],
    dependencies: {},
  };

  // Check common dependencies
  for (const tool of CONFIG.claudeCodeDependencies.common) {
    const installed = checkCommand(tool);
    const version = installed ? getCommandVersion(tool) : null;
    results.dependencies[tool] = { installed, version, required: true };

    if (!installed) {
      results.passed = false;
      results.issues.push({
        tool,
        message: `${tool} is not installed (required for Claude Code)`,
        instructions: getInstallInstructions(tool, platformInfo),
      });
    }
  }

  // Check Unix-specific dependencies
  if (!platformInfo.isWindows) {
    for (const tool of CONFIG.claudeCodeDependencies.unix) {
      const installed = checkCommand(tool);
      results.dependencies[tool] = { installed, required: true };

      if (!installed) {
        results.passed = false;
        results.issues.push({
          tool,
          message: `${tool} is not installed (required for native Claude Code installation)`,
          instructions: getInstallInstructions(tool, platformInfo),
        });
      }
    }
  }

  // Check Windows-specific dependencies
  if (platformInfo.isWindows) {
    const { options, preferred } = CONFIG.claudeCodeDependencies.windows;
    const hasAny = options.some(opt => checkCommand(opt));

    for (const opt of options) {
      const installed = checkCommand(opt);
      results.dependencies[opt] = { installed, required: false };
    }

    if (!hasAny) {
      results.passed = false;
      results.issues.push({
        tool: 'shell',
        message: 'Claude Code on Windows requires either WSL or Git Bash',
        instructions: `Option 1 (Recommended): Install Git for Windows\n    ${getInstallInstructions('bash', platformInfo)}\n\n    Option 2: Install WSL\n    ${getInstallInstructions('wsl', platformInfo)}`,
      });
    }
  }

  // Check recommended dependencies
  for (const tool of CONFIG.claudeCodeDependencies.recommended) {
    const installed = checkCommand(tool);
    const version = installed ? getCommandVersion(tool) : null;
    results.dependencies[tool] = { installed, version, required: false };

    if (!installed) {
      results.warnings.push({
        tool,
        message: `${tool} (ripgrep) is not installed - search functionality may be limited`,
        instructions: getInstallInstructions(tool, platformInfo),
      });
    }
  }

  // Check Alpine Linux specific requirements
  if (platformInfo.isAlpine) {
    const alpineDeps = ['libgcc', 'libstdc++'];
    results.warnings.push({
      tool: 'alpine-deps',
      message: 'Alpine Linux requires additional dependencies for Claude Code',
      instructions: `apk add libgcc libstdc++ ripgrep\nSET USE_BUILTIN_RIPGREP=0`,
    });
  }

  return results;
}

/**
 * Check OS version meets requirements
 */
function checkOsVersion(platformInfo) {
  const minVersions = CONFIG.claudeCode.minOsVersions;
  const minVersion = minVersions[platformInfo.platform];

  if (!minVersion) {
    return { passed: true, message: 'OS version check not applicable' };
  }

  const currentVersion = platformInfo.osVersion;
  const meetsRequirement = compareVersions(currentVersion, minVersion);

  return {
    passed: meetsRequirement,
    currentVersion,
    minVersion,
    message: meetsRequirement
      ? `${platformInfo.displayName} ${currentVersion} meets minimum requirement (${minVersion}+)`
      : `${platformInfo.displayName} ${currentVersion} does not meet minimum requirement (${minVersion}+)`,
  };
}

/**
 * Check system RAM
 */
function checkSystemRam(platformInfo) {
  const minRamGB = CONFIG.claudeCode.minRamGB;
  const currentRamGB = platformInfo.ramGB;
  const meetsRequirement = currentRamGB >= minRamGB;

  return {
    passed: meetsRequirement,
    currentRamGB,
    minRamGB,
    message: meetsRequirement
      ? `${currentRamGB}GB RAM meets minimum requirement (${minRamGB}GB+)`
      : `${currentRamGB}GB RAM does not meet minimum requirement (${minRamGB}GB+)`,
  };
}

/**
 * Main prerequisites check function
 */
function checkPrerequisites(platformInfo) {
  const { header, ICONS } = require('./ui.cjs');
  header('Checking Prerequisites');

  const results = {
    passed: true,
    issues: [],
    warnings: [],
    packageManagers: ['npm'],
  };

  // --- System Requirements ---
  subheader('System Requirements');

  // Check OS version
  const osCheck = checkOsVersion(platformInfo);
  if (osCheck.passed) {
    log(osCheck.message, 'success');
  } else {
    log(osCheck.message, 'error');
    results.passed = false;
    results.issues.push(`Upgrade to ${platformInfo.displayName} ${osCheck.minVersion} or higher`);
  }

  // Check RAM
  const ramCheck = checkSystemRam(platformInfo);
  if (ramCheck.passed) {
    log(ramCheck.message, 'success');
  } else {
    log(ramCheck.message, 'warning');
    results.warnings.push(`Low RAM may cause performance issues (${ramCheck.currentRamGB}GB < ${ramCheck.minRamGB}GB)`);
  }

  // WSL info for Windows
  if (platformInfo.isWindows) {
    const hasWSL = checkCommand('wsl');
    const hasBash = checkCommand('bash');
    if (hasWSL) {
      log('WSL is available', 'success');
    }
    if (hasBash) {
      log('Git Bash is available', 'success');
    }
  }

  // WSL detection for Linux
  if (platformInfo.isWSL) {
    log('Running in WSL environment', 'info');
  }

  // --- Node.js & npm ---
  subheader('Node.js & npm');

  // Check Node.js version
  const nodeInfo = getNodeVersion();
  if (nodeInfo.major >= CONFIG.nodeMinVersion) {
    log(`Node.js ${nodeInfo.version} ${color(`(>= ${CONFIG.nodeMinVersion} required)`, 'dim')}`, 'success');
  } else {
    log(`Node.js ${nodeInfo.version} - version ${CONFIG.nodeMinVersion}+ required`, 'error');
    results.passed = false;
    results.issues.push(`Upgrade Node.js to version ${CONFIG.nodeMinVersion} or higher`);
  }

  // Check npm
  if (checkCommand('npm')) {
    const npmVersion = getCommandVersion('npm');
    log(`npm ${npmVersion || ''} is installed`, 'success');
  } else {
    log('npm is not installed', 'error');
    results.passed = false;
    results.issues.push('Install npm (included with Node.js)');
  }

  // --- Claude Code Dependencies ---
  subheader('Claude Code Dependencies');

  const claudeDepCheck = checkClaudeCodeDependencies(platformInfo);

  // Report on dependencies
  for (const [tool, info] of Object.entries(claudeDepCheck.dependencies)) {
    if (info.installed) {
      const versionStr = info.version ? ` ${info.version}` : '';
      const requiredStr = info.required ? '' : color(' (recommended)', 'dim');
      log(`${tool}${versionStr} is installed${requiredStr}`, 'success');
    } else if (info.required) {
      log(`${tool} is not installed ${color('(required)', 'red')}`, 'error');
    } else {
      log(`${tool} is not installed ${color('(recommended)', 'dim')}`, 'warning');
    }
  }

  // Add issues from Claude Code dependency check
  if (!claudeDepCheck.passed) {
    results.passed = false;
    for (const issue of claudeDepCheck.issues) {
      results.issues.push({
        message: issue.message,
        instructions: issue.instructions,
      });
    }
  }

  // Add warnings
  for (const warning of claudeDepCheck.warnings) {
    results.warnings.push({
      message: warning.message,
      instructions: warning.instructions,
    });
  }

  // --- Optional Package Managers ---
  subheader('Package Managers');

  log('npm is available (default)', 'success');

  for (const tool of CONFIG.optionalTools) {
    if (checkCommand(tool)) {
      const version = getCommandVersion(tool);
      log(`${tool} ${version || ''} is available ${color('(optional)', 'dim')}`, 'success');
      results.packageManagers.push(tool);
    }
  }

  return results;
}

module.exports = {
  checkCommand,
  getCommandVersion,
  getNodeVersion,
  compareVersions,
  getInstallInstructions,
  checkClaudeCodeDependencies,
  checkOsVersion,
  checkSystemRam,
  checkPrerequisites,
};
