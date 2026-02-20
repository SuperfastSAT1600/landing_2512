/**
 * Environment file setup
 * Creates .env and .env.local files from template and collected variables
 */

const fs = require('fs');
const path = require('path');
const { log, subheader, header, color, ICONS } = require('./ui.cjs');
const { askYesNo } = require('./input.cjs');

/**
 * Placeholder mappings for .env.example template
 */
const PLACEHOLDER_MAPPINGS = {
  'your_github_token_here': 'GITHUB_PERSONAL_ACCESS_TOKEN',
  'YOUR_GITHUB_TOKEN_HERE': 'GITHUB_PERSONAL_ACCESS_TOKEN',
  'your_slack_bot_token_here': 'SLACK_BOT_TOKEN',
  'YOUR_SLACK_BOT_TOKEN_HERE': 'SLACK_BOT_TOKEN',
  'your_slack_team_id_here': 'SLACK_TEAM_ID',
  'YOUR_SLACK_TEAM_ID_HERE': 'SLACK_TEAM_ID',
  'your_vercel_token_here': 'VERCEL_API_TOKEN',
  'YOUR_VERCEL_TOKEN_HERE': 'VERCEL_API_TOKEN',
  'your_render_api_key_here': 'RENDER_API_KEY',
  'YOUR_RENDER_API_KEY_HERE': 'RENDER_API_KEY',
  'your_firecrawl_api_key_here': 'FIRECRAWL_API_KEY',
  'YOUR_FIRECRAWL_API_KEY_HERE': 'FIRECRAWL_API_KEY',
  'your_cloudflare_token_here': 'CLOUDFLARE_API_TOKEN',
  'YOUR_CLOUDFLARE_TOKEN_HERE': 'CLOUDFLARE_API_TOKEN',
  'YOUR_SUPABASE_URL_HERE': 'SUPABASE_URL',
  'YOUR_SUPABASE_SERVICE_KEY_HERE': 'SUPABASE_SERVICE_KEY',
};

/**
 * Read .env.example template
 */
function readEnvTemplate() {
  const templatePath = path.join(process.cwd(), '.claude', 'templates', '.env.example');

  if (!fs.existsSync(templatePath)) {
    return { success: false, error: '.claude/templates/.env.example not found' };
  }

  try {
    const content = fs.readFileSync(templatePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: `Failed to read template: ${error.message}` };
  }
}

/**
 * Replace placeholders in template with collected values
 */
function replacePlaceholders(content, collectedEnvVars) {
  let result = content;
  const replacedVars = [];

  // First, replace known placeholders
  for (const [placeholder, varName] of Object.entries(PLACEHOLDER_MAPPINGS)) {
    if (collectedEnvVars[varName]) {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, collectedEnvVars[varName]);
        if (!replacedVars.includes(varName)) {
          replacedVars.push(varName);
        }
      }
    }
  }

  // Also handle direct variable replacements (VARNAME=placeholder_value)
  for (const [varName, value] of Object.entries(collectedEnvVars)) {
    // Match lines like: VARNAME=some_placeholder_value
    const lineRegex = new RegExp(`^(${varName}=)(.*)$`, 'gm');
    const matches = result.match(lineRegex);

    if (matches) {
      for (const match of matches) {
        const currentValue = match.split('=')[1];
        // Only replace if current value looks like a placeholder
        if (currentValue.includes('your_') || currentValue.includes('YOUR_') ||
            currentValue.includes('_here') || currentValue.includes('_HERE') ||
            currentValue.includes('placeholder')) {
          result = result.replace(match, `${varName}=${value}`);
          if (!replacedVars.includes(varName)) {
            replacedVars.push(varName);
          }
        }
      }
    }
  }

  return { content: result, replacedVars };
}

/**
 * Parse existing .env file into key-value pairs
 */
function parseEnvFile(content) {
  const vars = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    vars[key] = value;
  }

  return vars;
}

/**
 * Merge new values into existing env content
 */
function mergeEnvContent(existingContent, collectedEnvVars) {
  const existingVars = parseEnvFile(existingContent);
  let result = existingContent;
  const addedVars = [];

  for (const [varName, value] of Object.entries(collectedEnvVars)) {
    if (existingVars[varName]) {
      // Variable exists, check if it's a placeholder
      const currentValue = existingVars[varName];
      if (currentValue.includes('your_') || currentValue.includes('YOUR_') ||
          currentValue.includes('_here') || currentValue.includes('_HERE') ||
          currentValue.includes('placeholder')) {
        // Replace placeholder
        const regex = new RegExp(`^(${varName}=)(.*)$`, 'gm');
        result = result.replace(regex, `${varName}=${value}`);
        addedVars.push(varName);
      }
      // If it's a real value, don't overwrite
    } else {
      // Variable doesn't exist, add it at the end
      result = result.trimEnd() + `\n${varName}=${value}\n`;
      addedVars.push(varName);
    }
  }

  return { content: result, addedVars };
}

/**
 * Show security warning about .env files
 */
function showSecurityWarning() {
  console.log('');
  console.log(color('╔══════════════════════════════════════════════════════════╗', 'yellow'));
  console.log(color('║  SECURITY WARNING                                        ║', 'yellow'));
  console.log(color('║                                                          ║', 'yellow'));
  console.log(color('║  Your .env file contains sensitive credentials.          ║', 'yellow'));
  console.log(color('║  NEVER commit this file to version control!              ║', 'yellow'));
  console.log(color('║                                                          ║', 'yellow'));
  console.log(color('║  The .gitignore file should already exclude it.          ║', 'yellow'));
  console.log(color('╚══════════════════════════════════════════════════════════╝', 'yellow'));
  console.log('');
}

/**
 * Setup environment files
 */
async function setupEnvironmentFiles(rl, collectedEnvVars = {}) {
  header('Environment File Setup');

  console.log('This step creates your .env file with the collected API keys');
  console.log('and other configuration from previous steps.');
  console.log('');

  const results = {
    created: false,
    envFiles: [],
    variables: [],
    warnings: [],
  };

  // Check for template
  const templateResult = readEnvTemplate();
  if (!templateResult.success) {
    log(templateResult.error, 'warning');
    console.log(color('Skipping .env creation - no template found.', 'dim'));
    results.warnings.push(templateResult.error);
    return results;
  }

  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');

  // Check if .env already exists
  subheader('Creating .env File');

  if (fs.existsSync(envPath)) {
    log('.env file already exists', 'info');

    const overwrite = await askYesNo(rl, 'Would you like to update it with new values?', true);

    if (overwrite) {
      const existingContent = fs.readFileSync(envPath, 'utf8');
      const { content, addedVars } = mergeEnvContent(existingContent, collectedEnvVars);

      if (addedVars.length > 0) {
        fs.writeFileSync(envPath, content, 'utf8');
        log(`Updated .env with ${addedVars.length} values`, 'success');
        results.variables.push(...addedVars);

        for (const varName of addedVars) {
          console.log(color(`  ${ICONS.bullet} ${varName}`, 'dim'));
        }
      } else {
        log('No new values to add', 'info');
      }

      results.created = true;
      results.envFiles.push('.env');
    } else {
      log('Keeping existing .env file', 'info');
      results.envFiles.push('.env');
    }
  } else {
    // Create new .env from template
    const { content, replacedVars } = replacePlaceholders(templateResult.content, collectedEnvVars);

    fs.writeFileSync(envPath, content, 'utf8');
    log('Created .env file from template', 'success');

    if (replacedVars.length > 0) {
      console.log(color(`  Filled in ${replacedVars.length} values:`, 'dim'));
      for (const varName of replacedVars) {
        console.log(color(`    ${ICONS.bullet} ${varName}`, 'dim'));
      }
      results.variables.push(...replacedVars);
    }

    results.created = true;
    results.envFiles.push('.env');
  }

  // Optionally create .env.local for local overrides
  subheader('Local Environment Overrides');

  console.log('.env.local can be used for machine-specific settings that');
  console.log('override .env values (e.g., different ports, local database URLs).');
  console.log('');

  if (!fs.existsSync(envLocalPath)) {
    const createLocal = await askYesNo(rl, 'Create .env.local for local overrides?', false);

    if (createLocal) {
      const localContent = `# Local environment overrides
# This file is for machine-specific settings
# Values here override those in .env

# Example overrides:
# PORT=3001
# DATABASE_URL=postgresql://localhost:5432/mydb_local
`;
      fs.writeFileSync(envLocalPath, localContent, 'utf8');
      log('Created .env.local', 'success');
      results.envFiles.push('.env.local');
    }
  } else {
    log('.env.local already exists', 'info');
    results.envFiles.push('.env.local');
  }

  // Show security warning
  showSecurityWarning();

  // Summary
  console.log(color('─── Environment Setup Summary ───', 'cyan'));
  console.log(`  Files: ${results.envFiles.join(', ')}`);
  console.log(`  Variables configured: ${results.variables.length}`);

  if (results.warnings.length > 0) {
    console.log(`  Warnings: ${results.warnings.length}`);
  }
  console.log('');

  return results;
}

module.exports = {
  setupEnvironmentFiles,
};
