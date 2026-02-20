/**
 * Directory and config file creation
 */

const fs = require('fs');
const path = require('path');
const { log, subheader, color, ICONS } = require('./ui.cjs');
const { CONFIG } = require('./config.cjs');

/**
 * Create required directories
 */
function createDirectories() {
  const results = {
    created: [],
    skipped: [],
    errors: [],
  };

  const directories = CONFIG.directoriesToCreate || ['src'];

  for (const dir of directories) {
    const dirPath = path.resolve(process.cwd(), dir);

    try {
      if (fs.existsSync(dirPath)) {
        results.skipped.push(dir);
      } else {
        fs.mkdirSync(dirPath, { recursive: true });
        results.created.push(dir);
        log(`Created directory: ${dir}`, 'success');
      }
    } catch (error) {
      results.errors.push({ dir, error: error.message });
      log(`Failed to create ${dir}: ${error.message}`, 'error');
    }
  }

  if (results.skipped.length > 0) {
    log(`Directories already exist: ${results.skipped.join(', ')}`, 'info');
  }

  return results;
}

/**
 * TypeScript configuration template
 */
const TSCONFIG_TEMPLATE = {
  compilerOptions: {
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'bundler',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*'],
    },
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist'],
};

/**
 * ESLint configuration template
 */
const ESLINT_CONFIG_TEMPLATE = {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'warn',
  },
};

/**
 * Prettier configuration template
 */
const PRETTIER_CONFIG_TEMPLATE = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
};

/**
 * Create configuration files
 */
function createConfigFiles() {
  const results = {
    created: [],
    skipped: [],
    errors: [],
  };

  const configFiles = [
    {
      name: 'tsconfig.json',
      content: TSCONFIG_TEMPLATE,
    },
    {
      name: '.eslintrc.json',
      content: ESLINT_CONFIG_TEMPLATE,
    },
    {
      name: '.prettierrc',
      content: PRETTIER_CONFIG_TEMPLATE,
    },
  ];

  for (const file of configFiles) {
    const filePath = path.resolve(process.cwd(), file.name);

    try {
      if (fs.existsSync(filePath)) {
        results.skipped.push(file.name);
      } else {
        fs.writeFileSync(filePath, JSON.stringify(file.content, null, 2) + '\n', 'utf8');
        results.created.push(file.name);
        log(`Created ${file.name}`, 'success');
      }
    } catch (error) {
      results.errors.push({ file: file.name, error: error.message });
      log(`Failed to create ${file.name}: ${error.message}`, 'error');
    }
  }

  if (results.skipped.length > 0) {
    log(`Config files already exist: ${results.skipped.join(', ')}`, 'info');
  }

  return results;
}

/**
 * Required entries for .gitignore
 */
const GITIGNORE_REQUIRED_ENTRIES = [
  '.env',
  '.env.local',
  '.env.*.local',
  '.mcp.json',
  'node_modules/',
  'dist/',
  'build/',
];

/**
 * Update .gitignore file to ensure required entries exist
 */
function updateGitignore() {
  const results = {
    updated: false,
    created: false,
    added: [],
    alreadyPresent: [],
  };

  const gitignorePath = path.resolve(process.cwd(), '.gitignore');

  try {
    let existingContent = '';

    if (fs.existsSync(gitignorePath)) {
      existingContent = fs.readFileSync(gitignorePath, 'utf8');
    } else {
      results.created = true;
    }

    // Parse existing entries (handle Windows and Unix line endings)
    const existingLines = existingContent
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    // Check which entries need to be added
    const entriesToAdd = [];

    for (const entry of GITIGNORE_REQUIRED_ENTRIES) {
      // Check if entry exists (exact match or with trailing slash variation)
      const entryWithoutSlash = entry.replace(/\/$/, '');
      const entryWithSlash = entryWithoutSlash + '/';

      const exists = existingLines.some(line => {
        const lineWithoutSlash = line.replace(/\/$/, '');
        return lineWithoutSlash === entryWithoutSlash;
      });

      if (exists) {
        results.alreadyPresent.push(entry);
      } else {
        entriesToAdd.push(entry);
        results.added.push(entry);
      }
    }

    // Add missing entries
    if (entriesToAdd.length > 0) {
      const sectionHeader = '\n# Added by setup script\n';
      const newContent = existingContent.trimEnd() + sectionHeader + entriesToAdd.join('\n') + '\n';

      fs.writeFileSync(gitignorePath, newContent, 'utf8');
      results.updated = true;

      if (results.created) {
        log('Created .gitignore with required entries', 'success');
      } else {
        log(`Added ${entriesToAdd.length} entries to .gitignore`, 'success');
      }

      for (const entry of entriesToAdd) {
        console.log(color(`  ${ICONS.bullet} ${entry}`, 'dim'));
      }
    } else {
      log('.gitignore already has all required entries', 'success');
    }

  } catch (error) {
    log(`Failed to update .gitignore: ${error.message}`, 'error');
    return { ...results, error: error.message };
  }

  return results;
}

module.exports = {
  createDirectories,
  createConfigFiles,
  updateGitignore,
};
