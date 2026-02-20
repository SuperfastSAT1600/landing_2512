// CLAUDE.md Generation Module
const fs = require('fs');
const path = require('path');
const { color, log, header } = require('./ui.cjs');
const { ask, askYesNo } = require('./input.cjs');
const { detectTechStack, generateClaudeMdContent } = require('./techstack.cjs');

/**
 * Setup CLAUDE.md with detected or user-provided tech stack
 */
async function setupClaudeMd(rl) {
  header('Tech Stack Detection');

  log('Analyzing your codebase...', 'info');

  const detections = detectTechStack();

  console.log('');
  if (detections.hasExistingCode) {
    log('Existing codebase detected!', 'success');
    console.log('');

    const { framework, backend, database, testing, packageManager } = detections;

    console.log('Detected tech stack:');
    if (framework.detected) {
      console.log(color(`  Frontend: ${framework.name}${framework.version ? ' ' + framework.version : ''}`, 'cyan'));
    }
    if (backend.detected) {
      console.log(color(`  Backend: ${backend.name}`, 'cyan'));
    }
    if (database.detected) {
      console.log(color(`  Database: ${database.name}`, 'cyan'));
    }
    if (testing.detected) {
      console.log(color(`  Testing: ${testing.name}`, 'cyan'));
    }
    if (packageManager.detected) {
      console.log(color(`  Package Manager: ${packageManager.name}`, 'cyan'));
    }

    console.log('');
  } else {
    log('No existing codebase detected (new project)', 'info');
    console.log('');
  }

  const shouldGenerate = await askYesNo(
    rl,
    'Would you like to generate/update CLAUDE.md with your tech stack?',
    true
  );

  if (!shouldGenerate) {
    log('Skipping CLAUDE.md generation. You can edit it manually later.', 'info');
    return { generated: false };
  }

  console.log('');

  // Get tech stack info (use detected or ask user)
  const stackInfo = await gatherTechStackInfo(rl, detections);

  // Generate CLAUDE.md content
  const claudeMdContent = generateClaudeMdFile(stackInfo);

  // Check if CLAUDE.md exists
  const claudeMdExists = fs.existsSync('CLAUDE.md');

  if (claudeMdExists) {
    console.log('');
    log('CLAUDE.md already exists', 'warning');
    const shouldOverwrite = await askYesNo(
      rl,
      'Do you want to overwrite it with the generated version?',
      false
    );

    if (!shouldOverwrite) {
      log('Skipping CLAUDE.md generation. Keeping existing file.', 'info');
      return { generated: false, exists: true };
    }

    // Backup existing CLAUDE.md
    fs.copyFileSync('CLAUDE.md', 'CLAUDE.md.backup');
    log('Backed up existing CLAUDE.md to CLAUDE.md.backup', 'info');
  }

  // Write CLAUDE.md
  fs.writeFileSync('CLAUDE.md', claudeMdContent, 'utf8');
  log('Generated CLAUDE.md with your tech stack', 'success');

  return { generated: true, exists: claudeMdExists };
}

/**
 * Gather tech stack info automatically from detections
 */
async function gatherTechStackInfo(rl, detections) {
  const { framework, backend, database, testing } = detections;

  // Use detected values automatically, no user prompts
  const frontend = framework.detected
    ? `${framework.name}${framework.version ? ' ' + framework.version : ''}, TypeScript`
    : '{{FRONTEND_STACK}}';

  const backendValue = backend.detected ? backend.name : '{{BACKEND_STACK}}';
  const databaseValue = database.detected ? database.name : 'Unknown';
  const testingValue = testing.detected ? testing.name : '{{TESTING_STACK}}';

  // DevOps - provide sensible default
  const devops = 'Docker, GitHub Actions';

  // Project structure - use default, no customization prompt
  const projectStructure = null;

  return {
    frontend,
    backend: backendValue,
    database: databaseValue,
    testing: testingValue,
    devops,
    projectStructure,
  };
}

/**
 * Generate CLAUDE.md file content
 */
function generateClaudeMdFile(stackInfo) {
  const { frontend, backend, database, testing, devops, projectStructure } = stackInfo;

  const structure = projectStructure || `src/
├── app/           # Application pages/routes
├── components/    # Reusable components
├── features/      # Feature modules
├── lib/           # Third-party integrations
├── hooks/         # Custom hooks (if applicable)
├── utils/         # Utility functions
└── types/         # TypeScript types`;

  return `# Team Claude Code Guidelines

Team knowledge base for Claude Code. Add mistakes here so they don't repeat.

---

## Quick Reference

**Workflow**: Main agent codes standard tasks, delegates to 34 specialized agents for expertise
**Agents (34)**: See \`.claude/agents/\` for full list and INDEX.md

**Resources**:
- Skills: \`.claude/skills/\` (react-patterns, rest-api-design, etc.)
- Workflows: \`.claude/workflows/\`
- Checklists: \`.claude/checklists/\`
- Templates: \`.claude/templates/\`
- Scripts: \`.claude/scripts/\`

---

## Self-Aware System

This setup continuously improves itself. During every task, the system observes its own configuration and proposes fixes, evolutions, and simplifications after completing your work.

- **Execution Protocol**: \`.claude/rules/task-execution-protocol.md\` (MANDATORY for all agents)
- **Rules**: \`.claude/rules/self-aware-system.md\`
- **User Data**: \`.claude/user/\` (changelog, errors, custom content)
- **Health Check**: Run \`/health-check\` for a comprehensive audit
- **Agent count**: 34 (33 specialists + 1 system-health)

### Mandatory Checkpoints (Every Task)

1. **PRE-TASK**: Identify parallel work opportunities [enforced]
2. **DURING**: Observe \`.claude/\` issues [passive noting]
3. **POST-TASK**: Auto-heal recurring patterns, report observations [enforced]

This ensures maximum speed through parallelization and continuous system improvement through auto-healing.

---

## How It Works

**Main agent codes directly** for standard tasks (CRUD, simple features, bug fixes).
**Specialists handle** complex domains (auth, databases, performance, security).

Just describe what you want in plain English:

| You say | What happens |
|---------|--------------|
| "Add a user profile page" | Main agent implements directly |
| "I want users to log in with OAuth" | Delegates to auth-specialist |
| "The checkout is broken" | Main agent fixes via quick-fix workflow |
| "Is this code secure?" | Delegates to security-reviewer |
| "Make the page faster" | Delegates to performance-optimizer |

### Main Agent Templates

When creating React code, the main agent uses:
- \`variants/react/component.tsx.template\` - React components with TypeScript
- \`variants/react/form.tsx.template\` - Form components with React Hook Form + Zod
- \`variants/react/hook.ts.template\` - Custom React hooks with proper cleanup
- \`variants/react/context.tsx.template\` - React Context providers with type safety
- \`variants/react/hoc.tsx.template\` - Higher-Order Components with ref forwarding

---

## Tech Stack

**Frontend**: ${frontend}

**Backend**: ${backend}${database !== 'Unknown' ? `\n\n**Database**: ${database}` : ''}

**Testing**: ${testing}

**DevOps**: ${devops}

---

## Project Structure

\`\`\`
${structure}
\`\`\`

---

## Dependencies

**Approved**: date-fns, zod
<!-- Add your approved dependencies here -->

**Forbidden**: moment.js, full lodash
<!-- Add your forbidden dependencies here -->

---

## Error Log

Error log is now maintained in \`.claude/user/errors.md\` to preserve it during system updates.

Main agent: append errors there when you make a mistake. Subagents: report errors in your response for the main agent to log.

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}
`;
}

module.exports = {
  setupClaudeMd,
};
