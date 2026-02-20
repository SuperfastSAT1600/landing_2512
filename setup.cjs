#!/usr/bin/env node

/**
 * Cross-Platform Project Setup Script (MCP-Only)
 *
 * This script configures the project using ONLY Model Context Protocol (MCP) servers.
 * Run with: node setup.cjs
 *
 * Features:
 * - Platform detection (Windows/macOS/Linux)
 * - Prerequisites checking (git, node, npm only - NO CLIs)
 * - MCP server configuration (GitHub, Supabase, Slack, etc.)
 * - API credential collection for MCP servers
 * - Environment file setup
 * - Claude Code installation
 * - Optional dependency installation
 *
 * What's NOT included (MCP-only approach):
 * - NO GitHub CLI installation or authentication
 * - NO Supabase CLI installation or authentication
 * - NO Vercel CLI installation
 * - All interactions happen through MCP servers
 */

// =============================================================================
// BOOTSTRAP: Auto-install required dependencies
// =============================================================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Check if a module is installed and auto-install if missing
 */
function ensureDependency(moduleName) {
  try {
    require.resolve(moduleName);
    return true;
  } catch (e) {
    console.log(`\n📦 Installing required dependency: ${moduleName}...`);
    try {
      // Detect package manager
      const hasYarn = fs.existsSync(path.join(process.cwd(), 'yarn.lock'));
      const hasPnpm = fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'));

      let installCmd;
      if (hasPnpm) {
        installCmd = `pnpm add ${moduleName}`;
      } else if (hasYarn) {
        installCmd = `yarn add ${moduleName}`;
      } else {
        installCmd = `npm install ${moduleName}`;
      }

      execSync(installCmd, { stdio: 'inherit' });
      console.log(`✅ ${moduleName} installed successfully\n`);
      return true;
    } catch (installError) {
      console.error(`\n❌ Failed to install ${moduleName}`);
      console.error(`Please run manually: npm install ${moduleName}\n`);
      process.exit(1);
    }
  }
}

// Ensure enquirer is installed before importing other modules
ensureDependency('enquirer');

// =============================================================================
// Import modules
// =============================================================================
const { color, log, header } = require('./lib/ui.cjs');
const { getPlatformInfo } = require('./lib/platform.cjs');
const { checkPrerequisites } = require('./lib/prerequisites.cjs');
const { ask, askYesNo } = require('./lib/input.cjs');
const { setupClaudeCode } = require('./lib/claude-code.cjs');
const { configureAutoOpenLocalhost } = require('./lib/localhost.cjs');
const { configureMcpServers } = require('./lib/mcp.cjs');
const { setupEnvironmentFiles } = require('./lib/env.cjs');
const { createDirectories, createConfigFiles, updateGitignore } = require('./lib/files.cjs');
const { setupPackageJson, installDependencies } = require('./lib/dependencies.cjs');
const { showSummary } = require('./lib/summary.cjs');
const { setupClaudeMd } = require('./lib/claude-md.cjs');
// Note: GitHub and Supabase setup removed - using MCP-only approach

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function displayPrerequisiteIssues(prereqs, platformInfo) {
  console.log('');
  header('Prerequisites Not Met');
  console.log(color('The following issues must be resolved before continuing:', 'red'));
  console.log('');

  for (const issue of prereqs.issues) {
    if (typeof issue === 'string') {
      console.log(color(`  • ${issue}`, 'yellow'));
    } else {
      console.log(color(`  • ${issue.message}`, 'yellow'));
      if (issue.instructions) {
        console.log(color(`    ${issue.instructions}`, 'dim'));
      }
    }
  }
  console.log('');
}

async function attemptAutoInstall(prereqs, platformInfo) {
  console.log('');
  const tryAutoInstall = await askYesNo(
    null,
    'Would you like to attempt automatic installation of missing dependencies?',
    true
  );

  if (!tryAutoInstall) {
    return false;
  }

  let installedSomething = false;
  // Auto-install logic would go here
  // For now, return false
  return installedSomething;
}

async function continueSetup(platformInfo, prereqs, results) {
  // Step 1: Tech Stack Detection & CLAUDE.md Setup
  results.claudeMd = await setupClaudeMd(null);

  // Step 2: MCP Configuration (CORE STEP - replaces CLI-based setup)
  // This collects all API credentials and configures MCP servers
  results.mcp = await configureMcpServers(
    null,
    platformInfo,
    null, // No GitHub CLI config
    null, // No Supabase CLI config
    null  // No Vercel config - all done via MCP
  );

  // Step 3: Claude Code Installation
  results.claudeCode = await setupClaudeCode(null, platformInfo);

  // Step 4: Auto-open localhost configuration
  results.localhost = await configureAutoOpenLocalhost(null);

  // Step 5: Environment Files
  const collectedEnvVars = {};
  if (results.mcp?.collectedEnvVars) {
    Object.assign(collectedEnvVars, results.mcp.collectedEnvVars);
  }

  results.env = await setupEnvironmentFiles(null, collectedEnvVars);

  // Step 6: Create Directories
  results.directories = createDirectories();

  // Step 7: Create Config Files
  results.configFiles = createConfigFiles();

  // Step 8: Update .gitignore
  results.gitignore = updateGitignore();

  // Step 9: Package.json Setup
  results.packageJson = await setupPackageJson(null);

  // Step 10: Install Dependencies
  // Always offer to install, whether package.json was created, updated, or existed
  if (results.packageJson?.created || results.packageJson?.updated || results.packageJson?.exists) {
    results.dependencies = await installDependencies(null, prereqs.packageManagers);
  }

  // Show Summary
  showSummary(results);
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

async function main() {
  console.log('\n');
  console.log(color('  ╔═══════════════════════════════════════════════════════╗', 'cyan'));
  console.log(color('  ║                                                       ║', 'cyan'));
  console.log(color('  ║', 'cyan') + color('         Claude Code Project Setup Wizard', 'bright') + color('            ║', 'cyan'));
  console.log(color('  ║                                                       ║', 'cyan'));
  console.log(color('  ╚═══════════════════════════════════════════════════════╝', 'cyan'));

  const platformInfo = getPlatformInfo();
  const results = {};

  // Check prerequisites (pass platformInfo)
  let prereqs = checkPrerequisites(platformInfo);

  // If prerequisites failed, show detailed instructions
  if (!prereqs.passed) {
    displayPrerequisiteIssues(prereqs, platformInfo);

    // Attempt auto-install of missing dependencies
    const installedSomething = await attemptAutoInstall(prereqs, platformInfo);

    if (installedSomething) {
      // Re-check prerequisites after installation
      console.log('\n');
      prereqs = checkPrerequisites(platformInfo);

      if (!prereqs.passed) {
        displayPrerequisiteIssues(prereqs, platformInfo);
        console.log(color('Please fix the remaining issues and run setup again.', 'red'));
        process.exit(1);
      }

      log('All prerequisites now satisfied!', 'success');
    } else {
      console.log(color('Please fix the above issues and run setup again.', 'red'));
      process.exit(1);
    }

    // Continue with setup
    await continueSetup(platformInfo, prereqs, results);
    return;
  }

  // Show warnings even if passed
  if (prereqs.warnings && prereqs.warnings.length > 0) {
    console.log('');
    for (const warning of prereqs.warnings) {
      if (typeof warning === 'string') {
        log(warning, 'warning');
      } else {
        log(warning.message, 'warning');
      }
    }
  }

  try {
    await continueSetup(platformInfo, prereqs, results);
  } catch (error) {
    console.error('\n' + color(`Setup failed: ${error.message}`, 'red'));
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('\n' + color(`Fatal error: ${error.message}`, 'red'));
  console.error(error.stack);
  process.exit(1);
});
