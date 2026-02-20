/**
 * Setup summary display
 */

const { log, header, subheader, color, ICONS } = require('./ui.cjs');

/**
 * Show setup summary
 */
function showSummary(results) {
  console.log('');
  console.log(color('═'.repeat(60), 'cyan'));
  console.log(color('  MCP-Only Setup Complete!', 'bright'));
  console.log(color('═'.repeat(60), 'cyan'));
  console.log('');

  // MCP Servers
  if (results.mcp) {
    subheader('MCP Servers (No CLI Tools Required)');
    console.log(`  ${ICONS.success} Configuration: ${results.mcp.configured ? color('Complete', 'green') : color('Incomplete', 'yellow')}`);
    if (results.mcp.enabledServers && results.mcp.enabledServers.length > 0) {
      console.log(`  ${ICONS.success} Enabled servers: ${color(results.mcp.enabledServers.length, 'cyan')}`);
      results.mcp.enabledServers.forEach(server => {
        console.log(`    ${ICONS.bullet} ${server}`);
      });
    }
    console.log('');
  }

  // Claude Code
  if (results.claudeCode) {
    subheader('Claude Code CLI');
    console.log(`  ${ICONS.success} Installed: ${results.claudeCode.installed ? color('Yes', 'green') : color('Not installed (run manually)', 'yellow')}`);
    console.log('');
  }

  // Environment
  if (results.env) {
    subheader('Environment Files');
    console.log(`  ${ICONS.success} .env files: ${results.env.created ? color('Created', 'green') : color('Not created', 'yellow')}`);
    if (results.env.variables) {
      console.log(`  ${ICONS.success} Variables configured: ${color(results.env.variables.length, 'cyan')}`);
    }
    console.log('');
  }

  // Dependencies
  if (results.dependencies) {
    subheader('Dependencies');
    console.log(`  ${ICONS.success} Installed: ${results.dependencies.installed ? color('Yes', 'green') : color('No', 'yellow')}`);
    console.log('');
  }

  // Next Steps
  console.log(color('─'.repeat(60), 'cyan'));
  subheader('Next Steps');
  console.log('');
  console.log(color('  1. Authenticate MCP servers:', 'bright'));
  console.log('     claude /mcp');
  console.log(color('     (Select each server and choose "Authenticate")', 'dim'));
  console.log('');
  console.log(color('  2. Start Claude Code:', 'bright'));
  console.log('     claude');
  console.log('');
  console.log(color('  3. Start development:', 'bright'));
  console.log('     npm run dev');
  console.log('');
  console.log(color('  4. Run tests:', 'bright'));
  console.log('     npm test');
  console.log('');

  // Helpful Resources
  console.log(color('─'.repeat(60), 'cyan'));
  subheader('Helpful Resources');
  console.log('');
  console.log(`  ${ICONS.bullet} Project docs: ${color('./README.md', 'cyan')}`);
  console.log(`  ${ICONS.bullet} MCP-Only Architecture: ${color('./.claude/docs/system/mcp-only-architecture.md', 'cyan')}`);
  console.log(`  ${ICONS.bullet} Claude Code config: ${color('./.claude/', 'cyan')}`);
  console.log(`  ${ICONS.bullet} MCP Protocol: ${color('https://modelcontextprotocol.io/', 'cyan')}`);
  console.log('');

  // Warnings
  const warnings = [];
  if (results.mcp && !results.mcp.configured) {
    warnings.push('MCP servers not fully configured - run setup again');
  }
  if (results.mcp && results.mcp.enabledServers && results.mcp.enabledServers.length === 0) {
    warnings.push('No MCP servers enabled - Claude Code functionality will be limited');
  }
  if (results.dependencies && !results.dependencies.installed) {
    warnings.push('Dependencies not installed - run npm install to continue');
  }

  if (warnings.length > 0) {
    console.log(color('─'.repeat(60), 'yellow'));
    console.log(color('  ⚠️  Warnings:', 'yellow'));
    console.log('');
    warnings.forEach(warning => {
      console.log(color(`  ${ICONS.bullet} ${warning}`, 'yellow'));
    });
    console.log('');
  }

  console.log(color('═'.repeat(60), 'cyan'));
  console.log('');
  log('Setup completed successfully! Happy coding! 🚀', 'success');
  console.log('');
}

module.exports = {
  showSummary,
};
