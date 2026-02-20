/**
 * Auto-open localhost configuration
 * Detects frameworks and configures dev servers to auto-open browsers
 */

const fs = require('fs');
const path = require('path');
const { log, subheader, header, color, ICONS } = require('./ui.cjs');
const { askYesNo, askChoice } = require('./input.cjs');

/**
 * Framework detection configuration
 */
const FRAMEWORK_DETECTORS = [
  {
    name: 'Vite',
    files: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'],
    configMethod: 'vite',
  },
  {
    name: 'Next.js',
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    configMethod: 'nextjs',
  },
  {
    name: 'Vue CLI',
    files: ['vue.config.js'],
    configMethod: 'vue',
  },
  {
    name: 'Angular',
    files: ['angular.json'],
    configMethod: 'angular',
  },
  {
    name: 'Nuxt',
    files: ['nuxt.config.ts', 'nuxt.config.js'],
    configMethod: 'nuxt',
  },
];

/**
 * Detect framework from project files
 */
function detectFramework() {
  const cwd = process.cwd();

  // Check explicit framework config files
  for (const detector of FRAMEWORK_DETECTORS) {
    for (const file of detector.files) {
      if (fs.existsSync(path.join(cwd, file))) {
        return { name: detector.name, configMethod: detector.configMethod, configFile: file };
      }
    }
  }

  // Check package.json for CRA or other frameworks
  const packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for Create React App
      if (deps['react-scripts'] || (scripts.start && scripts.start.includes('react-scripts'))) {
        return { name: 'Create React App', configMethod: 'cra', configFile: 'package.json' };
      }

      // Check for Vite in dependencies (sometimes no config file)
      if (deps['vite']) {
        return { name: 'Vite', configMethod: 'vite', configFile: null };
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  return null;
}

/**
 * Configure Vite for auto-open
 */
function configureVite(configFile) {
  const cwd = process.cwd();
  let configPath = configFile ? path.join(cwd, configFile) : null;

  // Find or create config file
  if (!configPath || !fs.existsSync(configPath)) {
    const possibleFiles = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
    for (const file of possibleFiles) {
      const fullPath = path.join(cwd, file);
      if (fs.existsSync(fullPath)) {
        configPath = fullPath;
        break;
      }
    }
  }

  if (!configPath || !fs.existsSync(configPath)) {
    // Create a basic vite.config.ts
    configPath = path.join(cwd, 'vite.config.ts');
    const newConfig = `import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    open: true,
  },
})
`;
    fs.writeFileSync(configPath, newConfig, 'utf8');
    return { success: true, method: 'created vite.config.ts with server.open: true' };
  }

  // Read and modify existing config
  let content = fs.readFileSync(configPath, 'utf8');

  // Check if already configured
  if (content.includes('open: true') || content.includes('open:true')) {
    return { success: true, method: 'already configured', alreadyConfigured: true };
  }

  // Try to add server.open configuration
  if (content.includes('server:') || content.includes('server :')) {
    // Server block exists, add open: true to it
    content = content.replace(
      /(server\s*:\s*\{)/,
      '$1\n    open: true,'
    );
  } else if (content.includes('defineConfig({') || content.includes('defineConfig( {')) {
    // Add server block
    content = content.replace(
      /(defineConfig\s*\(\s*\{)/,
      '$1\n  server: {\n    open: true,\n  },'
    );
  } else {
    return { success: false, message: 'Could not parse Vite config file' };
  }

  fs.writeFileSync(configPath, content, 'utf8');
  return { success: true, method: 'added server.open: true to vite config' };
}

/**
 * Configure Next.js for auto-open
 */
function configureNextjs() {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return { success: false, message: 'package.json not found' };
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const devScript = packageJson.scripts.dev || 'next dev';

    // Check if already has --open or -o flag
    if (devScript.includes('--open') || devScript.includes(' -o ') || devScript.endsWith(' -o')) {
      return { success: true, method: 'already configured', alreadyConfigured: true };
    }

    // Note: Next.js doesn't have a built-in --open flag like Vite
    // We'll use the BROWSER environment variable approach instead
    if (!devScript.startsWith('BROWSER=') && !devScript.includes('cross-env BROWSER=')) {
      // For cross-platform compatibility, suggest using cross-env
      const hasCrossEnv = packageJson.devDependencies?.['cross-env'] || packageJson.dependencies?.['cross-env'];

      if (hasCrossEnv) {
        packageJson.scripts.dev = `cross-env BROWSER=true ${devScript}`;
      } else {
        // Just prepend for Unix-like systems, suggest cross-env for Windows
        packageJson.scripts.dev = `BROWSER=true ${devScript}`;
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
      return { success: true, method: 'added BROWSER=true to dev script' };
    }

    return { success: true, method: 'already configured', alreadyConfigured: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Configure Create React App for auto-open
 */
function configureCRA() {
  const cwd = process.cwd();
  const envLocalPath = path.join(cwd, '.env.local');

  let content = '';
  if (fs.existsSync(envLocalPath)) {
    content = fs.readFileSync(envLocalPath, 'utf8');

    // Check if already configured
    if (content.includes('BROWSER=')) {
      if (content.includes('BROWSER=true') || content.includes('BROWSER=1')) {
        return { success: true, method: 'already configured', alreadyConfigured: true };
      }
    }
  }

  // Add or update BROWSER setting
  if (content.includes('BROWSER=')) {
    content = content.replace(/BROWSER=.*/g, 'BROWSER=true');
  } else {
    content = content.trimEnd() + (content ? '\n' : '') + 'BROWSER=true\n';
  }

  fs.writeFileSync(envLocalPath, content, 'utf8');
  return { success: true, method: 'added BROWSER=true to .env.local' };
}

/**
 * Configure Vue CLI for auto-open
 */
function configureVue() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'vue.config.js');

  if (!fs.existsSync(configPath)) {
    // Create config file
    const newConfig = `module.exports = {
  devServer: {
    open: true,
  },
}
`;
    fs.writeFileSync(configPath, newConfig, 'utf8');
    return { success: true, method: 'created vue.config.js with devServer.open: true' };
  }

  let content = fs.readFileSync(configPath, 'utf8');

  // Check if already configured
  if (content.includes('open: true') || content.includes('open:true')) {
    return { success: true, method: 'already configured', alreadyConfigured: true };
  }

  // Try to add devServer.open configuration
  if (content.includes('devServer:') || content.includes('devServer :')) {
    content = content.replace(
      /(devServer\s*:\s*\{)/,
      '$1\n    open: true,'
    );
  } else if (content.includes('module.exports = {') || content.includes('module.exports= {')) {
    content = content.replace(
      /(module\.exports\s*=\s*\{)/,
      '$1\n  devServer: {\n    open: true,\n  },'
    );
  } else {
    return { success: false, message: 'Could not parse Vue config file' };
  }

  fs.writeFileSync(configPath, content, 'utf8');
  return { success: true, method: 'added devServer.open: true to vue.config.js' };
}

/**
 * Configure Angular for auto-open
 */
function configureAngular() {
  const cwd = process.cwd();
  const angularJsonPath = path.join(cwd, 'angular.json');

  if (!fs.existsSync(angularJsonPath)) {
    return { success: false, message: 'angular.json not found' };
  }

  try {
    const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));

    // Find the default project or first project
    const projects = angularJson.projects || {};
    const projectNames = Object.keys(projects);

    if (projectNames.length === 0) {
      return { success: false, message: 'No projects found in angular.json' };
    }

    const projectName = angularJson.defaultProject || projectNames[0];
    const project = projects[projectName];

    if (!project?.architect?.serve?.options) {
      // Create the structure if it doesn't exist
      if (!project.architect) project.architect = {};
      if (!project.architect.serve) project.architect.serve = {};
      if (!project.architect.serve.options) project.architect.serve.options = {};
    }

    if (project.architect.serve.options.open === true) {
      return { success: true, method: 'already configured', alreadyConfigured: true };
    }

    project.architect.serve.options.open = true;

    fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2) + '\n', 'utf8');
    return { success: true, method: 'added open: true to angular.json serve options' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Configure Nuxt for auto-open
 */
function configureNuxt(configFile) {
  const cwd = process.cwd();
  let configPath = configFile ? path.join(cwd, configFile) : null;

  if (!configPath || !fs.existsSync(configPath)) {
    const possibleFiles = ['nuxt.config.ts', 'nuxt.config.js'];
    for (const file of possibleFiles) {
      const fullPath = path.join(cwd, file);
      if (fs.existsSync(fullPath)) {
        configPath = fullPath;
        break;
      }
    }
  }

  if (!configPath || !fs.existsSync(configPath)) {
    return { success: false, message: 'Nuxt config file not found' };
  }

  let content = fs.readFileSync(configPath, 'utf8');

  // Check if already configured
  if (content.includes('open: true')) {
    return { success: true, method: 'already configured', alreadyConfigured: true };
  }

  // Nuxt 3 uses devServer config
  if (content.includes('devServer:')) {
    content = content.replace(
      /(devServer\s*:\s*\{)/,
      '$1\n    open: true,'
    );
  } else if (content.includes('defineNuxtConfig({') || content.includes('defineNuxtConfig( {')) {
    content = content.replace(
      /(defineNuxtConfig\s*\(\s*\{)/,
      '$1\n  devServer: {\n    open: true,\n  },'
    );
  } else if (content.includes('export default {')) {
    content = content.replace(
      /(export default\s*\{)/,
      '$1\n  devServer: {\n    open: true,\n  },'
    );
  } else {
    return { success: false, message: 'Could not parse Nuxt config file' };
  }

  fs.writeFileSync(configPath, content, 'utf8');
  return { success: true, method: 'added devServer.open: true to nuxt config' };
}

/**
 * Apply configuration based on framework
 */
function applyConfiguration(framework) {
  switch (framework.configMethod) {
    case 'vite':
      return configureVite(framework.configFile);
    case 'nextjs':
      return configureNextjs();
    case 'cra':
      return configureCRA();
    case 'vue':
      return configureVue();
    case 'angular':
      return configureAngular();
    case 'nuxt':
      return configureNuxt(framework.configFile);
    default:
      return { success: false, message: `Unknown framework: ${framework.name}` };
  }
}

/**
 * Main auto-open configuration function
 */
async function configureAutoOpenLocalhost(rl) {
  header('Auto-Open Localhost (Optional)');

  console.log('This step configures your dev server to automatically open');
  console.log('a browser when you run your development server.');
  console.log('');

  const results = {
    configured: false,
    framework: null,
    method: null,
    skipped: false,
  };

  // Detect framework
  subheader('Detecting Framework');
  const framework = detectFramework();

  if (!framework) {
    log('No supported framework detected', 'info');
    console.log('');
    console.log(color('Supported frameworks:', 'dim'));
    console.log(color('  - Vite', 'dim'));
    console.log(color('  - Next.js', 'dim'));
    console.log(color('  - Create React App', 'dim'));
    console.log(color('  - Vue CLI', 'dim'));
    console.log(color('  - Angular', 'dim'));
    console.log(color('  - Nuxt', 'dim'));
    console.log('');
    console.log(color('You can configure auto-open manually in your framework config.', 'dim'));

    results.skipped = true;
    return results;
  }

  log(`Detected framework: ${framework.name}`, 'success');
  if (framework.configFile) {
    console.log(color(`  Config file: ${framework.configFile}`, 'dim'));
  }
  console.log('');

  results.framework = framework.name;

  // Ask user if they want to configure
  const configure = await askYesNo(rl, `Would you like to configure auto-open for ${framework.name}?`, true);

  if (!configure) {
    log('Skipping auto-open configuration', 'info');
    results.skipped = true;
    return results;
  }

  // Apply configuration
  subheader('Configuring Auto-Open');
  const configResult = applyConfiguration(framework);

  if (configResult.success) {
    if (configResult.alreadyConfigured) {
      log('Auto-open is already configured', 'success');
    } else {
      log(`Configured auto-open: ${configResult.method}`, 'success');
    }
    results.configured = true;
    results.method = configResult.method;
  } else {
    log(`Failed to configure: ${configResult.message}`, 'error');
    console.log('');
    console.log(color('You may need to configure auto-open manually.', 'yellow'));
  }

  // Summary
  console.log('');
  console.log(color('─── Auto-Open Summary ───', 'cyan'));
  console.log(`  Framework: ${results.framework || 'not detected'}`);
  console.log(`  Configured: ${results.configured ? color('yes', 'green') : color('no', 'yellow')}`);
  if (results.method && !results.method.includes('already')) {
    console.log(`  Method: ${results.method}`);
  }
  console.log('');

  return results;
}

module.exports = {
  configureAutoOpenLocalhost,
  detectFramework,
};
