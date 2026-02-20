/**
 * Configuration constants and templates
 */

const CONFIG = {
  // Node.js requirements
  nodeMinVersion: 18,

  // Claude Code system requirements
  claudeCode: {
    // Minimum OS versions
    minOsVersions: {
      darwin: '13.0',      // macOS 13.0+
      linux: '20.04',      // Ubuntu 20.04+ (checked via lsb_release)
      win32: '10.0',       // Windows 10+
    },
    // Minimum RAM in GB
    minRamGB: 4,
  },

  // Required tools for this project
  requiredTools: ['git', 'npm'],

  // Claude Code dependencies
  claudeCodeDependencies: {
    // Required for all platforms
    common: ['git'],
    // Required for native installation on Unix
    unix: ['curl'],
    // Windows needs either WSL or Git Bash
    windows: {
      options: ['wsl', 'bash'],  // At least one required
      preferred: 'bash',         // Git Bash is simpler
    },
    // Recommended but not strictly required
    recommended: ['rg'],         // ripgrep - bundled but good to have
  },

  // Optional package managers
  optionalTools: ['pnpm', 'yarn', 'bun'],

  templateFiles: [
    { from: '.env.example', to: '.env' },
  ],
  directoriesToCreate: [
    'src',  // Required for TypeScript config
  ],
};

// Package.json template with all dependencies needed for Claude Code hooks and workflows
const PACKAGE_JSON_TEMPLATE = {
  name: 'claude-code-project',
  version: '1.0.0',
  description: 'Project configured with Claude Code development tools',
  type: 'module',
  scripts: {
    // Development
    'dev': 'echo "Add your dev server command here"',
    'build': 'tsc --build',
    'start': 'node dist/index.js',

    // Code Quality (used by hooks)
    'format': 'prettier --write "**/*.{ts,tsx,js,jsx,json,css,scss,md}"',
    'format:check': 'prettier --check "**/*.{ts,tsx,js,jsx,json,css,scss,md}"',
    'lint': 'eslint . --ext .ts,.tsx,.js,.jsx',
    'lint:fix': 'eslint . --ext .ts,.tsx,.js,.jsx --fix',
    'typecheck': 'tsc --noEmit',

    // Testing
    'test': 'vitest run',
    'test:watch': 'vitest',
    'test:coverage': 'vitest run --coverage',
    'test:e2e': 'playwright test',

    // Combined commands
    'check': 'npm run format:check && npm run lint && npm run typecheck',
    'fix': 'npm run format && npm run lint:fix',

    // Database (if using Prisma)
    'db:generate': 'prisma generate',
    'db:migrate': 'prisma migrate dev',
    'db:push': 'prisma db push',
    'db:studio': 'prisma studio',

    // Security & Analysis
    'audit': 'npm audit',
    'deps:check': 'depcheck',
    'deps:unused': 'ts-prune',
    'analyze': 'echo "Add bundle analyzer command here"',
  },
  devDependencies: {
    // TypeScript
    'typescript': '^5.3.0',
    '@types/node': '^20.10.0',

    // Code Formatting (required for hooks)
    'prettier': '^3.2.0',

    // Linting (required for hooks)
    'eslint': '^8.56.0',
    '@typescript-eslint/parser': '^6.21.0',
    '@typescript-eslint/eslint-plugin': '^6.21.0',
    'eslint-config-prettier': '^9.1.0',
    'eslint-plugin-prettier': '^5.1.0',

    // Testing
    'vitest': '^1.2.0',
    '@vitest/coverage-v8': '^1.2.0',
    '@playwright/test': '^1.41.0',

    // Code Analysis
    'depcheck': '^1.4.7',
    'ts-prune': '^0.10.3',

    // Security
    'license-checker': '^25.0.1',
  },
  dependencies: {
    // Add your runtime dependencies here
  },
  engines: {
    node: '>=18.0.0',
  },
};

module.exports = {
  CONFIG,
  PACKAGE_JSON_TEMPLATE,
};
