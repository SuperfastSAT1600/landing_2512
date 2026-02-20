/**
 * Package.json and dependency management
 * Handles package.json creation/update and dependency installation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { log, subheader, header, color, ICONS } = require('./ui.cjs');
const { ask, askYesNo, askChoice } = require('./input.cjs');
const { PACKAGE_JSON_TEMPLATE } = require('./config.cjs');

/**
 * Check if package.json exists
 */
function checkPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  return fs.existsSync(packageJsonPath);
}

/**
 * Read existing package.json
 */
function readPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  try {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Merge recommended scripts into existing package.json
 * Only adds scripts that don't already exist
 */
function mergeScripts(existing, template) {
  const merged = { ...existing };
  const added = [];

  for (const [scriptName, scriptCmd] of Object.entries(template)) {
    if (!existing[scriptName]) {
      merged[scriptName] = scriptCmd;
      added.push(scriptName);
    }
  }

  return { scripts: merged, added };
}

/**
 * Merge recommended devDependencies
 * Only adds dependencies that don't already exist
 */
function mergeDependencies(existing, template) {
  const merged = { ...existing };
  const added = [];

  for (const [depName, depVersion] of Object.entries(template)) {
    if (!existing[depName]) {
      merged[depName] = depVersion;
      added.push(depName);
    }
  }

  return { deps: merged, added };
}

/**
 * Setup package.json
 */
async function setupPackageJson(rl) {
  header('Package.json Setup');

  console.log('This step ensures your project has a properly configured package.json');
  console.log('with recommended scripts and dependencies for Claude Code workflows.');
  console.log('');

  const results = {
    created: false,
    updated: false,
    exists: false,
    skipped: false,
  };

  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (checkPackageJson()) {
    results.exists = true;
    subheader('Existing package.json Found');

    const existingPackageJson = readPackageJson();
    if (!existingPackageJson) {
      log('Failed to read package.json', 'error');
      return results;
    }

    log(`Project: ${existingPackageJson.name || 'unnamed'}`, 'info');
    console.log('');

    // Check if user wants to enhance it
    const enhance = await askYesNo(rl, 'Would you like to add recommended scripts and dependencies?', true);

    if (!enhance) {
      log('Keeping existing package.json unchanged', 'info');
      results.skipped = true;
      return results;
    }

    // Merge scripts
    const scriptsResult = mergeScripts(
      existingPackageJson.scripts || {},
      PACKAGE_JSON_TEMPLATE.scripts
    );

    // Merge devDependencies
    const devDepsResult = mergeDependencies(
      existingPackageJson.devDependencies || {},
      PACKAGE_JSON_TEMPLATE.devDependencies
    );

    if (scriptsResult.added.length === 0 && devDepsResult.added.length === 0) {
      log('package.json already has all recommended configurations', 'success');
      return results;
    }

    // Show what will be added
    if (scriptsResult.added.length > 0) {
      console.log(color('Scripts to add:', 'bright'));
      for (const script of scriptsResult.added) {
        console.log(color(`  ${ICONS.bullet} ${script}`, 'dim'));
      }
      console.log('');
    }

    if (devDepsResult.added.length > 0) {
      console.log(color('Dev dependencies to add:', 'bright'));
      for (const dep of devDepsResult.added) {
        console.log(color(`  ${ICONS.bullet} ${dep}`, 'dim'));
      }
      console.log('');
    }

    const proceed = await askYesNo(rl, 'Add these to package.json?', true);

    if (!proceed) {
      log('Skipping package.json updates', 'info');
      results.skipped = true;
      return results;
    }

    // Update package.json
    existingPackageJson.scripts = scriptsResult.scripts;
    existingPackageJson.devDependencies = devDepsResult.deps;

    // Ensure engines field
    if (!existingPackageJson.engines) {
      existingPackageJson.engines = PACKAGE_JSON_TEMPLATE.engines;
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(existingPackageJson, null, 2) + '\n', 'utf8');

    log('Updated package.json', 'success');
    console.log(color(`  Added ${scriptsResult.added.length} scripts, ${devDepsResult.added.length} dependencies`, 'dim'));

    results.updated = true;

  } else {
    subheader('Creating New package.json');

    const createNew = await askYesNo(rl, 'No package.json found. Create one?', true);

    if (!createNew) {
      log('Skipping package.json creation', 'info');
      results.skipped = true;
      return results;
    }

    // Get project details
    const projectName = await ask(rl, 'Project name') || 'my-project';
    const description = await ask(rl, 'Description (optional)') || '';

    // Create package.json from template
    const newPackageJson = {
      ...PACKAGE_JSON_TEMPLATE,
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      description: description || PACKAGE_JSON_TEMPLATE.description,
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2) + '\n', 'utf8');

    log('Created package.json', 'success');
    results.created = true;
  }

  // Summary
  console.log('');
  console.log(color('─── Package.json Summary ───', 'cyan'));
  if (results.created) {
    console.log(`  ${color('Created new package.json', 'green')}`);
  } else if (results.updated) {
    console.log(`  ${color('Updated existing package.json', 'green')}`);
  } else if (results.skipped) {
    console.log(`  ${color('No changes made', 'yellow')}`);
  }
  console.log('');

  return results;
}

/**
 * Detect available package managers
 */
function detectPackageManagers() {
  const managers = [];

  // Check npm (should always be available with Node.js)
  try {
    execSync('npm --version', { stdio: 'pipe' });
    managers.push({ name: 'npm', command: 'npm install' });
  } catch {}

  // Check pnpm
  try {
    execSync('pnpm --version', { stdio: 'pipe' });
    managers.push({ name: 'pnpm', command: 'pnpm install' });
  } catch {}

  // Check yarn
  try {
    execSync('yarn --version', { stdio: 'pipe' });
    managers.push({ name: 'yarn', command: 'yarn install' });
  } catch {}

  // Check bun
  try {
    execSync('bun --version', { stdio: 'pipe' });
    managers.push({ name: 'bun', command: 'bun install' });
  } catch {}

  return managers;
}

/**
 * Determine preferred package manager from lock files
 */
function detectPreferredManager(managers) {
  const cwd = process.cwd();

  // Check for lock files
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return managers.find(m => m.name === 'pnpm');
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return managers.find(m => m.name === 'yarn');
  }
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
    return managers.find(m => m.name === 'bun');
  }
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
    return managers.find(m => m.name === 'npm');
  }

  // Default to npm
  return managers.find(m => m.name === 'npm') || managers[0];
}

/**
 * Install dependencies
 */
async function installDependencies(rl, providedManagers = null) {
  header('Dependency Installation');

  console.log('This step installs all dependencies defined in package.json.');
  console.log('');

  const results = {
    installed: false,
    packageManager: null,
    errors: [],
  };

  // Check if package.json exists
  if (!checkPackageJson()) {
    log('No package.json found - skipping dependency installation', 'warning');
    return results;
  }

  // Check if node_modules already exists
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    const reinstall = await askYesNo(rl, 'node_modules already exists. Reinstall dependencies?', false);

    if (!reinstall) {
      log('Skipping dependency installation', 'info');
      results.installed = true; // Consider it already installed
      return results;
    }
  }

  // Ask if user wants to install
  const install = await askYesNo(rl, 'Would you like to install dependencies now?', true);

  if (!install) {
    log('Skipping dependency installation', 'info');
    console.log(color('You can install later with: npm install', 'dim'));
    return results;
  }

  // Detect package managers
  subheader('Package Manager Selection');

  const managers = providedManagers || detectPackageManagers();

  if (managers.length === 0) {
    log('No package manager found!', 'error');
    results.errors.push('No package manager available');
    return results;
  }

  let selectedManager;

  if (managers.length === 1) {
    selectedManager = managers[0];
    log(`Using ${selectedManager.name}`, 'info');
  } else {
    // Check for preferred manager from lock files
    const preferred = detectPreferredManager(managers);

    if (preferred) {
      console.log(color(`Detected preferred package manager: ${preferred.name}`, 'dim'));
    }

    const usePreferred = preferred && await askYesNo(rl, `Use ${preferred.name}?`, true);

    if (usePreferred) {
      selectedManager = preferred;
    } else {
      // Let user choose
      const choices = managers.map(m => ({
        label: m.name,
        value: m,
        description: m.command,
      }));

      selectedManager = await askChoice(rl, 'Select package manager:', choices);

      if (!selectedManager) {
        selectedManager = managers[0];
      }
    }
  }

  results.packageManager = selectedManager.name;

  // Run installation
  subheader('Installing Dependencies');

  log(`Running: ${selectedManager.command}`, 'info');
  console.log('');

  try {
    execSync(selectedManager.command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true,
    });

    // Verify installation
    if (fs.existsSync(nodeModulesPath)) {
      log('Dependencies installed successfully', 'success');
      results.installed = true;
    } else {
      log('Installation completed but node_modules not found', 'warning');
      results.errors.push('node_modules not created');
    }
  } catch (error) {
    log(`Installation failed: ${error.message}`, 'error');
    results.errors.push(error.message);

    // Offer to retry with different manager
    if (managers.length > 1) {
      const retry = await askYesNo(rl, 'Would you like to try a different package manager?', true);

      if (retry) {
        const otherManagers = managers.filter(m => m.name !== selectedManager.name);
        const choices = otherManagers.map(m => ({
          label: m.name,
          value: m,
          description: m.command,
        }));

        const altManager = await askChoice(rl, 'Select alternative package manager:', choices);

        if (altManager) {
          log(`Trying: ${altManager.command}`, 'info');

          try {
            execSync(altManager.command, {
              stdio: 'inherit',
              cwd: process.cwd(),
              shell: true,
            });

            if (fs.existsSync(nodeModulesPath)) {
              log('Dependencies installed successfully', 'success');
              results.installed = true;
              results.packageManager = altManager.name;
              results.errors = [];
            }
          } catch (retryError) {
            log(`Retry failed: ${retryError.message}`, 'error');
            results.errors.push(retryError.message);
          }
        }
      }
    }
  }

  // Summary
  console.log('');
  console.log(color('─── Dependency Installation Summary ───', 'cyan'));
  console.log(`  Package manager: ${results.packageManager || 'none'}`);
  console.log(`  Installed: ${results.installed ? color('yes', 'green') : color('no', 'red')}`);

  if (results.errors.length > 0) {
    console.log(`  Errors: ${results.errors.length}`);
  }
  console.log('');

  return results;
}

module.exports = {
  setupPackageJson,
  installDependencies,
  detectPackageManagers,
};
