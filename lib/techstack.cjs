// Tech Stack Detection Module
const fs = require('fs');
const path = require('path');
const { log } = require('./ui.cjs');

/**
 * Detect the project's tech stack by analyzing files and directories
 */
function detectTechStack() {
  const detections = {
    framework: detectFramework(),
    backend: detectBackend(),
    database: detectDatabase(),
    testing: detectTesting(),
    packageManager: detectPackageManager(),
    hasExistingCode: hasExistingCodebase(),
  };

  return detections;
}

/**
 * Detect frontend framework
 */
function detectFramework() {
  // Check for Next.js
  if (fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs') || fs.existsSync('next.config.ts')) {
    const packageJson = readPackageJson();
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.next) {
        const version = deps.next.replace(/[\^~]/, '');
        return { name: 'Next.js', version, detected: true };
      }
    }
    return { name: 'Next.js', version: 'unknown', detected: true };
  }

  // Check for Vite (could be React, Vue, Svelte)
  if (fs.existsSync('vite.config.js') || fs.existsSync('vite.config.ts') || fs.existsSync('vite.config.mjs')) {
    const packageJson = readPackageJson();
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.react) {
        return { name: 'Vite + React', version: deps.react.replace(/[\^~]/, ''), detected: true };
      }
      if (deps.vue) {
        return { name: 'Vite + Vue', version: deps.vue.replace(/[\^~]/, ''), detected: true };
      }
      if (deps.svelte) {
        return { name: 'Vite + Svelte', version: deps.svelte.replace(/[\^~]/, ''), detected: true };
      }
    }
    return { name: 'Vite', version: 'unknown', detected: true };
  }

  // Check for SvelteKit
  if (fs.existsSync('svelte.config.js')) {
    return { name: 'SvelteKit', version: 'unknown', detected: true };
  }

  // Check for Nuxt
  if (fs.existsSync('nuxt.config.js') || fs.existsSync('nuxt.config.ts')) {
    return { name: 'Nuxt', version: 'unknown', detected: true };
  }

  // Check for Create React App
  if (fs.existsSync('public/index.html') && fs.existsSync('src/App.js')) {
    return { name: 'Create React App', version: 'unknown', detected: true };
  }

  // Check for Angular
  if (fs.existsSync('angular.json')) {
    return { name: 'Angular', version: 'unknown', detected: true };
  }

  // Check package.json for frameworks
  const packageJson = readPackageJson();
  if (packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.react && deps['react-dom']) {
      return { name: 'React', version: deps.react.replace(/[\^~]/, ''), detected: true };
    }
    if (deps.vue) {
      return { name: 'Vue', version: deps.vue.replace(/[\^~]/, ''), detected: true };
    }
    if (deps.svelte) {
      return { name: 'Svelte', version: deps.svelte.replace(/[\^~]/, ''), detected: true };
    }
  }

  return { name: 'Unknown', version: null, detected: false };
}

/**
 * Detect backend technology
 */
function detectBackend() {
  // Check for Python
  if (fs.existsSync('requirements.txt') || fs.existsSync('Pipfile') || fs.existsSync('pyproject.toml')) {
    if (fs.existsSync('requirements.txt')) {
      const content = fs.readFileSync('requirements.txt', 'utf8');
      if (content.includes('fastapi')) return { name: 'FastAPI (Python)', detected: true };
      if (content.includes('flask')) return { name: 'Flask (Python)', detected: true };
      if (content.includes('django')) return { name: 'Django (Python)', detected: true };
    }
    return { name: 'Python', detected: true };
  }

  // Check for Go
  if (fs.existsSync('go.mod')) {
    return { name: 'Go', detected: true };
  }

  // Check for Rust
  if (fs.existsSync('Cargo.toml')) {
    return { name: 'Rust', detected: true };
  }

  // Check for PHP
  if (fs.existsSync('composer.json')) {
    return { name: 'PHP', detected: true };
  }

  // Check for Ruby
  if (fs.existsSync('Gemfile')) {
    return { name: 'Ruby on Rails', detected: true };
  }

  // Check for Node.js backend
  const packageJson = readPackageJson();
  if (packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.express) return { name: 'Node.js + Express', detected: true };
    if (deps.fastify) return { name: 'Node.js + Fastify', detected: true };
    if (deps['@nestjs/core']) return { name: 'Node.js + NestJS', detected: true };
    if (deps.koa) return { name: 'Node.js + Koa', detected: true };

    // Check for Supabase
    if (deps['@supabase/supabase-js']) {
      return { name: 'Supabase (Backend as a Service)', detected: true };
    }
  }

  return { name: 'Unknown', detected: false };
}

/**
 * Detect database technology
 */
function detectDatabase() {
  const databases = [];

  // Check for Supabase
  if (fs.existsSync('supabase') && fs.existsSync('supabase/config.toml')) {
    databases.push('Supabase (PostgreSQL)');
  }

  // Check for Prisma
  if (fs.existsSync('prisma/schema.prisma')) {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
    if (schema.includes('provider = "postgresql"')) databases.push('PostgreSQL (Prisma)');
    else if (schema.includes('provider = "mysql"')) databases.push('MySQL (Prisma)');
    else if (schema.includes('provider = "sqlite"')) databases.push('SQLite (Prisma)');
    else if (schema.includes('provider = "mongodb"')) databases.push('MongoDB (Prisma)');
    else databases.push('Prisma ORM');
  }

  // Check package.json for database libraries
  const packageJson = readPackageJson();
  if (packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.pg) databases.push('PostgreSQL');
    if (deps.mysql || deps.mysql2) databases.push('MySQL');
    if (deps.sqlite3 || deps['better-sqlite3']) databases.push('SQLite');
    if (deps.mongodb) databases.push('MongoDB');
    if (deps.redis || deps.ioredis) databases.push('Redis');
    if (deps['@supabase/supabase-js'] && !databases.includes('Supabase (PostgreSQL)')) {
      databases.push('Supabase');
    }
  }

  // Check for Python database libraries
  if (fs.existsSync('requirements.txt')) {
    const content = fs.readFileSync('requirements.txt', 'utf8');
    if (content.includes('psycopg2') || content.includes('asyncpg')) databases.push('PostgreSQL');
    if (content.includes('pymongo')) databases.push('MongoDB');
    if (content.includes('redis')) databases.push('Redis');
    if (content.includes('sqlalchemy')) databases.push('SQLAlchemy ORM');
  }

  if (databases.length === 0) {
    return { name: 'Unknown', detected: false };
  }

  return { name: databases.join(', '), detected: true };
}

/**
 * Detect testing framework
 */
function detectTesting() {
  const frameworks = [];

  const packageJson = readPackageJson();
  if (packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // JavaScript/TypeScript testing
    if (deps.jest) frameworks.push('Jest');
    if (deps.vitest) frameworks.push('Vitest');
    if (deps.mocha) frameworks.push('Mocha');
    if (deps.playwright) frameworks.push('Playwright');
    if (deps.cypress) frameworks.push('Cypress');
    if (deps['@testing-library/react']) frameworks.push('React Testing Library');
    if (deps['@testing-library/vue']) frameworks.push('Vue Testing Library');
  }

  // Python testing
  if (fs.existsSync('requirements.txt')) {
    const content = fs.readFileSync('requirements.txt', 'utf8');
    if (content.includes('pytest')) frameworks.push('Pytest');
    if (content.includes('unittest')) frameworks.push('Unittest');
  }

  // Check for test directories
  if (fs.existsSync('tests') || fs.existsSync('test') || fs.existsSync('__tests__')) {
    if (frameworks.length === 0) frameworks.push('Unknown (tests directory found)');
  }

  if (frameworks.length === 0) {
    return { name: 'Unknown', detected: false };
  }

  return { name: frameworks.join(', '), detected: true };
}

/**
 * Detect package manager
 */
function detectPackageManager() {
  if (fs.existsSync('pnpm-lock.yaml')) {
    return { name: 'pnpm', detected: true };
  }
  if (fs.existsSync('yarn.lock')) {
    return { name: 'yarn', detected: true };
  }
  if (fs.existsSync('bun.lockb')) {
    return { name: 'bun', detected: true };
  }
  if (fs.existsSync('package-lock.json')) {
    return { name: 'npm', detected: true };
  }

  // Check for Python package managers
  if (fs.existsSync('Pipfile.lock')) {
    return { name: 'pipenv', detected: true };
  }
  if (fs.existsSync('poetry.lock')) {
    return { name: 'poetry', detected: true };
  }

  return { name: 'Unknown', detected: false };
}

/**
 * Check if there's existing code (not empty template)
 */
function hasExistingCodebase() {
  // Check for common source directories
  const srcDirs = ['src', 'app', 'lib', 'backend', 'frontend', 'server', 'client'];

  for (const dir of srcDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      // If directory has more than just config files, consider it existing code
      if (files.some(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.py') || f.endsWith('.go'))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Read and parse package.json
 */
function readPackageJson() {
  try {
    if (fs.existsSync('package.json')) {
      return JSON.parse(fs.readFileSync('package.json', 'utf8'));
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

/**
 * Generate CLAUDE.md content based on detected stack
 */
function generateClaudeMdContent(detections) {
  const { framework, backend, database, testing, packageManager } = detections;

  let frontendStack = framework.detected ? `${framework.name}${framework.version ? ' ' + framework.version : ''}, TypeScript` : '{{FRONTEND_STACK}}';
  let backendStack = backend.detected ? backend.name : '{{BACKEND_STACK}}';
  let testingStack = testing.detected ? testing.name : '{{TESTING_STACK}}';
  let databaseInfo = database.detected ? database.name : 'Unknown';

  // Build description
  const detected = [];
  if (framework.detected) detected.push(`Frontend: ${framework.name}`);
  if (backend.detected) detected.push(`Backend: ${backend.name}`);
  if (database.detected) detected.push(`Database: ${database.name}`);
  if (testing.detected) detected.push(`Testing: ${testing.name}`);

  return {
    frontendStack,
    backendStack,
    testingStack,
    databaseInfo,
    detectedSummary: detected.length > 0 ? detected.join('\n') : 'No tech stack detected',
  };
}

module.exports = {
  detectTechStack,
  generateClaudeMdContent,
};
