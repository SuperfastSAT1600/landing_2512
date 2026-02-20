/**
 * MCP server configuration
 * Handles loading template, server selection, and API key collection
 */

const fs = require('fs');
const path = require('path');
const { log, subheader, header, color, ICONS } = require('./ui.cjs');
const { ask, askYesNo, askSecret, askChoice } = require('./input.cjs');

/**
 * Server categories for organized display
 */
const SERVER_CATEGORIES = {
  essential: {
    name: 'Essential',
    description: 'Core functionality (REQUIRED)',
    servers: ['filesystem', 'github', 'slack'],
  },
  database: {
    name: 'Database & Backend',
    description: 'Database and backend services',
    servers: ['supabase'],
  },
  deployment: {
    name: 'Deployment & Infrastructure',
    description: 'Deployment and cloud services',
    servers: ['render', 'cloudflare-docs', 'cloudflare-workers-builds', 'cloudflare-workers-bindings', 'cloudflare-observability'],
  },
  development: {
    name: 'Development Tools',
    description: 'Code assistance and documentation (auto-enabled)',
    servers: ['memory', 'context7', 'magic-ui'],
  },
};

/**
 * Environment variable mappings for auto-fill
 */
const ENV_VAR_MAPPINGS = {
  GITHUB_PERSONAL_ACCESS_TOKEN: ['github'],
  RENDER_API_KEY: ['render'],
  CLOUDFLARE_API_TOKEN: ['cloudflare-workers-builds', 'cloudflare-workers-bindings', 'cloudflare-observability'],
  SLACK_BOT_TOKEN: ['slack'],
  SLACK_TEAM_ID: ['slack'],
};

/**
 * Servers that are always required/enabled
 */
const REQUIRED_SERVERS = ['filesystem', 'slack', 'supabase'];

/**
 * Load MCP template file
 */
function loadMcpTemplate() {
  const templatePath = path.join(process.cwd(), '.claude', 'templates', 'mcp.template.json');

  if (!fs.existsSync(templatePath)) {
    return { success: false, error: '.claude/templates/mcp.template.json not found' };
  }

  try {
    const content = fs.readFileSync(templatePath, 'utf8');
    const template = JSON.parse(content);
    return { success: true, template };
  } catch (error) {
    return { success: false, error: `Failed to parse template: ${error.message}` };
  }
}

/**
 * Get required environment variables for a server
 */
function getServerEnvVars(serverConfig) {
  if (!serverConfig.env) return [];

  return Object.entries(serverConfig.env)
    .filter(([_, value]) => value.includes('YOUR_') || value.includes('_HERE'))
    .map(([key, _]) => key);
}

/**
 * Check if a server has all required env vars filled
 */
function isServerConfigured(serverConfig, collectedEnvVars) {
  const requiredVars = getServerEnvVars(serverConfig);
  if (requiredVars.length === 0) return true;

  return requiredVars.every(varName => {
    const value = collectedEnvVars[varName];
    return value && !value.includes('YOUR_') && !value.includes('_HERE');
  });
}

/**
 * Check if a server is marked as recommended
 */
function isRecommendedServer(serverConfig) {
  return serverConfig.description && serverConfig.description.includes('⭐ RECOMMENDED');
}

/**
 * Display servers grouped by category
 */
function displayServers(template, enabledServers) {
  const allServers = Object.keys(template.mcpServers);

  console.log(color('Available MCP Servers:', 'bright'));
  console.log('');

  for (const [categoryKey, category] of Object.entries(SERVER_CATEGORIES)) {
    const categoryServers = category.servers.filter(s => allServers.includes(s));
    if (categoryServers.length === 0) continue;

    console.log(color(`${category.name}`, 'cyan') + color(` (${category.description})`, 'dim'));

    for (const serverName of categoryServers) {
      const isEnabled = enabledServers.includes(serverName);
      const serverConfig = template.mcpServers[serverName];
      const isRecommended = isRecommendedServer(serverConfig);

      const status = isEnabled ? color('[enabled]', 'green') : color('[disabled]', 'dim');
      const recommendedBadge = isRecommended ? color(' ⭐', 'yellow') : '';
      console.log(`  ${ICONS.bullet} ${serverName}${recommendedBadge} ${status}`);
    }
    console.log('');
  }

  // Show uncategorized servers
  const categorizedServers = Object.values(SERVER_CATEGORIES).flatMap(c => c.servers);
  const uncategorized = allServers.filter(s => !categorizedServers.includes(s));

  if (uncategorized.length > 0) {
    console.log(color('Other', 'cyan'));
    for (const serverName of uncategorized) {
      const isEnabled = enabledServers.includes(serverName);
      const serverConfig = template.mcpServers[serverName];
      const isRecommended = isRecommendedServer(serverConfig);

      const status = isEnabled ? color('[enabled]', 'green') : color('[disabled]', 'dim');
      const recommendedBadge = isRecommended ? color(' ⭐', 'yellow') : '';
      console.log(`  ${ICONS.bullet} ${serverName}${recommendedBadge} ${status}`);
    }
    console.log('');
  }
}

/**
 * Get human-readable description for an env var
 */
function getEnvVarDescription(varName) {
  const descriptions = {
    GITHUB_PERSONAL_ACCESS_TOKEN: 'GitHub PAT (https://github.com/settings/tokens)',
    SLACK_BOT_TOKEN: 'Slack Bot Token (https://api.slack.com/apps)',
    SLACK_TEAM_ID: 'Slack Team ID (starts with T)',
    VERCEL_API_TOKEN: 'Vercel API Token (https://vercel.com/account/tokens)',
    RENDER_API_KEY: 'Render API Key (https://dashboard.render.com/account/settings)',
    FIRECRAWL_API_KEY: 'Firecrawl API key (https://firecrawl.dev/)',
    CLOUDFLARE_API_TOKEN: 'Cloudflare API Token (https://dash.cloudflare.com/profile/api-tokens)',
    SUPABASE_URL: 'Supabase Project URL',
    SUPABASE_SERVICE_KEY: 'Supabase Service Role Key',
  };

  return descriptions[varName] || varName;
}

/**
 * Collect API key from user
 */
async function collectApiKey(rl, varName, currentValue) {
  const description = getEnvVarDescription(varName);

  // Check if we already have a value that's not a placeholder
  if (currentValue && !currentValue.includes('YOUR_') && !currentValue.includes('_HERE')) {
    console.log(color(`  ${varName}: already configured`, 'green'));
    return currentValue;
  }

  const value = await askSecret(rl, `Enter ${description} (or press Enter to skip)`);
  return value || null;
}

/**
 * Collect credentials for a specific MCP server
 */
async function collectServerCredentials(rl, serverName, serverConfig) {
  const requiredVars = getServerEnvVars(serverConfig);
  if (requiredVars.length === 0) return {};

  subheader(`${serverName} Credentials`);

  const credentials = {};

  // Provide instructions for each server
  const instructions = {
    github: `
GitHub MCP requires a Personal Access Token (PAT):
  1. Go to: https://github.com/settings/tokens?type=beta
  2. Click "Generate new token"
  3. Select: Contents (read/write), Pull requests (read/write)
  4. Copy the token
`,
    slack: `
Slack MCP requires a Bot Token and Team ID:
  1. Go to: https://api.slack.com/apps
  2. Create/select your app
  3. Under "OAuth & Permissions", copy the Bot User OAuth Token
  4. Under "Basic Information", copy the Team ID
`,
  };

  if (instructions[serverName]) {
    console.log(color(instructions[serverName], 'dim'));
  }

  for (const varName of requiredVars) {
    const description = getEnvVarDescription(varName);
    const value = await askSecret(rl, `Enter ${description} (or press Enter to skip)`);
    if (value) {
      credentials[varName] = value;
    }
  }

  return credentials;
}

/**
 * Load existing .mcp.json configuration
 */
function loadExistingMcpConfig() {
  const mcpJsonPath = path.join(process.cwd(), '.mcp.json');

  if (!fs.existsSync(mcpJsonPath)) {
    return { exists: false, config: null, enabledServers: [], credentials: {}, supabaseProjectRef: null };
  }

  try {
    const content = fs.readFileSync(mcpJsonPath, 'utf8');
    const config = JSON.parse(content);

    // Extract enabled servers
    const enabledServers = [];
    const credentials = {};
    let supabaseProjectRef = null;

    if (config.mcpServers) {
      for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
        if (!serverConfig.disabled) {
          enabledServers.push(serverName);
        }

        // Extract credentials from env
        if (serverConfig.env) {
          Object.assign(credentials, serverConfig.env);
        }

        // Extract Supabase project_ref from URL
        if (serverName === 'supabase' && serverConfig.type === 'http' && serverConfig.url) {
          const match = serverConfig.url.match(/project_ref=([^&]+)/);
          if (match && match[1] && !match[1].includes('YOUR_')) {
            supabaseProjectRef = match[1];
          }
        }
      }
    }

    return { exists: true, config, enabledServers, credentials, supabaseProjectRef };
  } catch (error) {
    return { exists: false, config: null, enabledServers: [], credentials: {}, supabaseProjectRef: null, error: error.message };
  }
}

/**
 * Configure MCP servers (MCP-ONLY approach)
 */
async function configureMcpServers(rl, platformInfo, githubConfig = null, supabaseConfig = null, vercelToken = null) {
  header('MCP Server Configuration');

  console.log(color('═══ MCP-ONLY SETUP ═══', 'cyan'));
  console.log('');
  console.log('This setup uses ONLY Model Context Protocol (MCP) servers.');
  console.log(color('NO CLI tools required (GitHub CLI, Supabase CLI, etc.)', 'green'));
  console.log('All interactions happen through MCP servers.');
  console.log('');

  const results = {
    configured: false,
    enabledServers: [],
    collectedEnvVars: {},
    errors: [],
  };

  // Load template
  const templateResult = loadMcpTemplate();
  if (!templateResult.success) {
    log(templateResult.error, 'error');
    results.errors.push(templateResult.error);
    return results;
  }

  const template = templateResult.template;

  // Load existing configuration
  const existing = loadExistingMcpConfig();
  if (existing.exists) {
    log('Found existing .mcp.json configuration', 'info');
    console.log(color(`  ${existing.enabledServers.length} servers currently enabled`, 'dim'));
    console.log('');

    // Pre-fill credentials from existing config
    Object.assign(results.collectedEnvVars, existing.credentials);
  }

  // Show current configuration
  subheader(existing.exists ? 'Current MCP Servers' : 'Default MCP Servers');

  // Determine which servers to enable by default (use existing if available)
  const defaultEnabled = existing.exists && existing.enabledServers.length > 0
    ? existing.enabledServers
    : ['filesystem', 'github', 'slack', 'supabase', 'context7', 'magic-ui', 'memory'];

  if (existing.exists && existing.enabledServers.length > 0) {
    log('Using existing server configuration', 'success');
    console.log(color('You can modify these in the next step.', 'dim'));
  } else {
    log('Core MCP servers (recommended): filesystem, github, slack, supabase', 'info');
    log('Development tools (recommended): context7, magic-ui, memory', 'info');
    console.log('');
    console.log(color('These are the recommended servers for most projects.', 'dim'));
    console.log(color('You can enable/disable additional servers in the next step.', 'dim'));
  }

  console.log('');
  displayServers(template, defaultEnabled);

  // Ask about enabling servers
  const configureServers = await askYesNo(rl, 'Would you like to configure which servers to enable?', true);

  let enabledServers = [...defaultEnabled];

  if (configureServers) {
    subheader('Server Selection');

    // Group servers by category for selection
    for (const [categoryKey, category] of Object.entries(SERVER_CATEGORIES)) {
      const categoryServers = category.servers.filter(s => template.mcpServers[s]);
      if (categoryServers.length === 0) continue;

      console.log('');
      console.log(color(`${category.name}:`, 'bright'));

      for (const serverName of categoryServers) {
        // Show REQUIRED servers as always enabled
        if (REQUIRED_SERVERS.includes(serverName)) {
          console.log(color(`  ${serverName}: REQUIRED (always enabled)`, 'dim'));
          continue;
        }

        const isCurrentlyEnabled = enabledServers.includes(serverName);
        const serverConfig = template.mcpServers[serverName];
        const requiredVars = getServerEnvVars(serverConfig);
        const isRecommended = isRecommendedServer(serverConfig);

        let defaultEnable = isCurrentlyEnabled || isRecommended;
        let hint = '';

        if (isRecommended) {
          hint = ' (⭐ recommended)';
        } else if (requiredVars.length > 0) {
          hint = ` (requires: ${requiredVars.join(', ')})`;
        }

        const enable = await askYesNo(rl, `  Enable ${serverName}?${hint}`, defaultEnable);

        if (enable && !enabledServers.includes(serverName)) {
          enabledServers.push(serverName);
        } else if (!enable && enabledServers.includes(serverName)) {
          enabledServers = enabledServers.filter(s => s !== serverName);
        }
      }
    }
  }

  results.enabledServers = enabledServers;

  // Collect API keys for enabled servers
  subheader('Credential Collection');

  console.log('Now collecting credentials for each enabled server.');
  console.log(color('These credentials are stored locally and never shared.', 'dim'));
  console.log('');

  // Track Supabase project ref separately (HTTP-based, no env vars)
  let supabaseProjectRef = existing.supabaseProjectRef || null;

  // Collect credentials server by server for better UX
  for (const serverName of enabledServers) {
    const serverConfig = template.mcpServers[serverName];
    const requiredVars = getServerEnvVars(serverConfig);

    // Special handling for Supabase HTTP MCP (no env vars, just project_ref in URL)
    if (serverName === 'supabase') {
      subheader('supabase Credentials');

      // Check if we already have a project ref
      if (supabaseProjectRef) {
        console.log(color(`  Current project ref: ${supabaseProjectRef}`, 'green'));
        const keepExisting = await askYesNo(rl, '  Keep this project reference?', true);
        if (keepExisting) {
          console.log(color(`${ICONS.success} supabase: using existing project reference`, 'green'));
          console.log('');
          continue;
        }
      }

      console.log(color(`
Supabase MCP requires your project reference:
  1. Go to: https://supabase.com/dashboard
  2. Select your project
  3. Go to Settings → API
  4. Copy the "Project ref" value (e.g., abcdefghijklmnopqr)
`, 'dim'));

      const projectRef = await ask(rl, 'Enter your Supabase project reference (or press Enter to skip)');
      if (projectRef) {
        supabaseProjectRef = projectRef;
        console.log(color(`${ICONS.success} supabase: project reference saved`, 'green'));
      } else {
        console.log(color(`${ICONS.warning} supabase: skipped (you can add it later to .mcp.json)`, 'yellow'));
      }
      console.log('');
      continue;
    }

    // Skip servers with no credentials needed
    if (requiredVars.length === 0) continue;

    // Skip if already configured
    const alreadyConfigured = requiredVars.every(v => results.collectedEnvVars[v]);
    if (alreadyConfigured) {
      console.log(color(`${ICONS.success} ${serverName}: already configured`, 'green'));
      continue;
    }

    // Collect credentials for this server
    const credentials = await collectServerCredentials(rl, serverName, serverConfig);

    // Store credentials
    Object.assign(results.collectedEnvVars, credentials);

    // Show status
    const hasAllCreds = requiredVars.every(v => results.collectedEnvVars[v]);
    if (hasAllCreds) {
      console.log(color(`${ICONS.success} ${serverName}: fully configured`, 'green'));
    } else {
      console.log(color(`${ICONS.warning} ${serverName}: missing some credentials (may not work)`, 'yellow'));
    }
    console.log('');
  }

  // Generate .mcp.json
  subheader('Generating Configuration');

  const mcpConfig = { mcpServers: {} };

  for (const [serverName, serverConfig] of Object.entries(template.mcpServers)) {
    const isEnabled = enabledServers.includes(serverName);

    // Clone the server config
    const config = JSON.parse(JSON.stringify(serverConfig));

    // Special handling for Supabase MCP - insert project_ref into URL
    if (serverName === 'supabase' && config.type === 'http' && supabaseProjectRef) {
      config.url = `https://mcp.supabase.com/mcp?project_ref=${supabaseProjectRef}`;
    }

    // Fix npx commands for Windows
    if (platformInfo.isWindows && config.command === 'npx') {
      config.command = 'cmd';
      config.args = ['/c', 'npx', ...config.args];
    }

    // Fill in environment variables
    if (config.env) {
      for (const [varName, placeholder] of Object.entries(config.env)) {
        if (results.collectedEnvVars[varName]) {
          config.env[varName] = results.collectedEnvVars[varName];
        }
      }
    }

    // Set disabled status
    config.disabled = !isEnabled;

    mcpConfig.mcpServers[serverName] = config;
  }

  // Write .mcp.json
  const mcpJsonPath = path.join(process.cwd(), '.mcp.json');

  try {
    fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf8');
    log('Created .mcp.json', 'success');
    results.configured = true;
  } catch (error) {
    log(`Failed to write .mcp.json: ${error.message}`, 'error');
    results.errors.push(error.message);
  }

  // Summary
  console.log('');
  console.log(color('─── MCP Configuration Summary ───', 'cyan'));
  console.log(`  Enabled servers: ${results.enabledServers.length}`);

  for (const server of results.enabledServers) {
    const configured = isServerConfigured(template.mcpServers[server], results.collectedEnvVars);
    const status = configured ? color('ready', 'green') : color('needs API key', 'yellow');
    console.log(`    ${ICONS.bullet} ${server} (${status})`);
  }

  console.log('');
  console.log(color('═══ MCP Setup Complete ═══', 'cyan'));
  console.log('');
  console.log(color('✓ No CLI tools required - everything works through MCP servers', 'green'));
  console.log(color('✓ All credentials stored in .mcp.json (gitignored)', 'green'));
  console.log('');
  console.log(color('Next steps:', 'bright'));
  console.log(color('  1. Authenticate MCP servers: claude /mcp', 'dim'));
  console.log(color('  2. For Supabase: Select "supabase" → "Authenticate" in the MCP menu', 'dim'));
  console.log(color('  3. All interactions with GitHub, Supabase, etc. happen via MCPs', 'dim'));
  console.log('');

  return results;
}

module.exports = {
  configureMcpServers,
  loadMcpTemplate,
  loadExistingMcpConfig,
  collectServerCredentials,
};
