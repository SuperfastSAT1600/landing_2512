# Skills Directory

Welcome to the skills system. This guide will help you understand, use, and create skills for Claude Code.

---

## What Are Skills?

Skills are **modular, self-contained packages** that extend Claude's capabilities with specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains—they transform Claude from a general-purpose agent into a specialized agent equipped with procedural knowledge.

### Skills vs Rules vs CLAUDE.md

| Type | Purpose | When Active | Examples |
|------|---------|-------------|----------|
| **Rule** | Enforce standards | Always | "No hardcoded secrets", "80% test coverage" |
| **Skill** | Teach patterns | When relevant | "How to implement auth", "React component patterns" |
| **CLAUDE.md** | Project specifics | Always | "We use Stripe for payments", "Auth goes in /auth route" |

**Use Rule**: When you need enforcement
**Use Skill**: When you need education and reusable patterns
**Use CLAUDE.md**: When it's project-specific configuration or context

---

## Directory Structure

Skills use a standardized directory structure with progressive disclosure:

```
skill-name/
├── SKILL.md              (required) - Core skill instructions
│   ├── YAML frontmatter  (required) - Metadata
│   │   ├── name:         (required) - Skill identifier
│   │   └── description:  (required) - When to use this skill
│   └── Markdown content  (required) - Instructions and patterns
│
└── Bundled Resources     (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation loaded as needed
    ├── templates/        - Code templates for this domain
    └── assets/           - Files used in output (icons, etc.)
```

---

## Progressive Disclosure System

Skills use a three-level loading system to manage context efficiently:

### Level 1: Metadata (Always in Context)
- **What**: `name` and `description` from YAML frontmatter
- **Size**: ~100 words
- **Purpose**: Help Claude decide when to load the skill

```yaml
---
name: react-patterns
description: Comprehensive guide to React best practices including component patterns, custom hooks, state management, performance optimization, and testing strategies.
---
```

### Level 2: SKILL.md Body (When Skill Triggers)
- **What**: Core instructions and workflow guidance
- **Size**: <5k words (keep lean)
- **Purpose**: Provide essential procedural knowledge

### Level 3: Bundled Resources (As Needed)
- **What**: Scripts, references, and assets
- **Size**: Unlimited (scripts can execute without loading)
- **Purpose**: Detailed documentation and reusable code

**Design Principle**: Information should live in either SKILL.md or references, not both. Keep SKILL.md lean with essential workflows; move detailed documentation to references.

---

## YAML Frontmatter Requirements

Every `SKILL.md` must start with YAML frontmatter containing two required fields:

```yaml
---
name: skill-name
description: This skill should be used when users want to accomplish X. Provides Y functionality including Z patterns.
---
```

### Writing Quality Descriptions

The description determines when Claude uses the skill. Be specific:

**Good descriptions:**
```yaml
description: Provides essential patterns for GraphQL APIs including schema design, resolvers, DataLoader for N+1 prevention, authorization, and pagination.
```

**Bad descriptions:**
```yaml
description: GraphQL stuff
```

**Style Guide:**
- Use third-person: "This skill provides..." not "Use this skill to..."
- Be specific about what the skill covers
- Include key topics/patterns the skill addresses
- Explain when it should be used

---

## Bundled Resources

### Scripts (`scripts/`)

**Purpose**: Executable code for deterministic tasks that are repeatedly rewritten.

**When to include:**
- Same code being rewritten repeatedly
- Deterministic reliability needed
- Token efficiency important

**Example**: `dev-server-autoopen/scripts/open_browser.py`

```
dev-server-autoopen/
├── SKILL.md
└── scripts/
    └── open_browser.py    # Opens localhost URLs automatically
```

**Benefits:**
- Token efficient (may execute without loading into context)
- Deterministic and reliable
- Reduces repetitive code generation

**Note**: Scripts may still need to be read for patching or environment-specific adjustments.

---

### References (`references/`)

**Purpose**: Documentation and reference material loaded as needed to inform Claude's work.

**When to include:**
- Database schemas
- API documentation
- Domain knowledge
- Company policies
- Detailed workflow guides
- Code examples and patterns

**Example**: `react-patterns/references/`

```
react-patterns/
├── SKILL.md              # Quick reference table + overview
└── references/
    ├── component-patterns.md    # Functional, Compound, etc.
    ├── custom-hooks.md          # Hook patterns and examples
    ├── state-management.md      # useState, useReducer, Context
    ├── performance.md           # memo, useMemo, useCallback
    ├── error-handling.md        # Error boundaries
    └── form-handling.md         # React Hook Form patterns
```

**Benefits:**
- Keeps SKILL.md lean and scannable
- Loaded only when Claude determines it's needed
- Organizes related information logically
- Makes information discoverable without hogging context

**Best Practice**: If files are large (>10k words), include grep search patterns in SKILL.md to help Claude find specific sections efficiently.

---

### Assets (`assets/`)

**Purpose**: Files used in the final output Claude produces (not loaded into context).

**When to include:**
- Template files (HTML, React boilerplate)
- Brand assets (logos, icons)
- Document templates (PowerPoint, Word)
- Fonts and typography resources
- Boilerplate code that gets copied/modified

**Example**: `brand-guidelines/assets/`

```
brand-guidelines/
├── SKILL.md
└── assets/
    ├── logo.png
    ├── style-guide.pdf
    └── templates/
        └── presentation.pptx
```

**Benefits:**
- Separates output resources from documentation
- Claude can use files without loading them into context
- Provides consistent starting points for generated content

---

## Skill Examples

### Minimal Skill (No Bundled Resources)

**Use case**: Simple patterns that fit in a single document.

```
coding-standards/
└── SKILL.md              # All content in one file
```

**SKILL.md structure:**
```yaml
---
name: coding-standards
description: Provides language-agnostic best practices and language-specific coding patterns for writing clean, maintainable code.
---

# Coding Standards

## General Principles
[SOLID, DRY, KISS principles...]

## TypeScript/JavaScript
[Language-specific patterns...]

## Python
[Language-specific patterns...]
```

---

### Skill with References

**Use case**: Complex domain with multiple sub-topics.

```
react-patterns/
├── SKILL.md              # Quick reference + when to use each pattern
└── references/
    ├── component-patterns.md
    ├── custom-hooks.md
    ├── state-management.md
    ├── performance.md
    ├── error-handling.md
    └── form-handling.md
```

**SKILL.md structure:**
```yaml
---
name: react-patterns
description: Comprehensive guide to React best practices including component patterns, custom hooks, state management, performance optimization, and testing strategies.
---

# React Patterns

Quick reference guide. For detailed implementations, see `references/` directory.

## When to Use Each Pattern

| Pattern | Use When | Reference |
|---------|----------|-----------|
| **Functional Components** | All new components | [component-patterns.md](react-patterns/references/component-patterns.md) |
| **Custom Hooks** | Extracting reusable logic | [custom-hooks.md](react-patterns/references/custom-hooks.md) |
| **useReducer** | Complex state | [state-management.md](react-patterns/references/state-management.md) |

[Instructions on when/how to load each reference...]
```

---

### Skill with Scripts

**Use case**: Repetitive tasks requiring deterministic code.

```
dev-server-autoopen/
├── SKILL.md
└── scripts/
    └── open_browser.py   # Opens localhost URLs cross-platform
```

**SKILL.md structure:**
```yaml
---
name: dev-server-autoopen
description: Provides quick reference for configuring automatic localhost opening across modern development frameworks and build tools.
---

# Dev Server Auto-Open

## Using the Browser Opening Script

When users request opening a localhost URL:

1. Use `scripts/open_browser.py` for cross-platform reliability
2. Pass the URL as argument: `python scripts/open_browser.py http://localhost:3000`
3. Script handles platform detection automatically

[Framework-specific configuration examples...]
```

---

### Skill with All Resource Types

**Use case**: Complex skill with scripts, documentation, and templates.

```
frontend-webapp-builder/
├── SKILL.md
├── scripts/
│   ├── scaffold_project.py
│   └── install_deps.py
├── references/
│   ├── architecture.md
│   └── best-practices.md
└── assets/
    └── templates/
        ├── hello-world/
        └── dashboard/
```

---

## Using Skills in Claude Code

### Automatic Loading

Claude automatically loads skills when relevant to the task:

```
User: "Implement user authentication"
→ Claude loads: auth-patterns skill
→ References: auth-patterns/references/oauth.md
```

### Explicit Reference

You can explicitly request a skill:

```
User: "Use the react-patterns skill to refactor this component"
→ Claude loads: react-patterns skill
→ Uses patterns from references as needed
```

### Multiple Skills

Claude can combine multiple skills:

```
User: "Build a GraphQL API with authentication"
→ Claude loads: graphql-patterns + auth-patterns
→ Combines patterns from both
```

---

## Creating New Skills

**Quick Start**: Use the skill-creator skill for detailed guidance.

### Step 1: Initialize Skill Structure

Use the initialization script to create the proper directory structure:

```bash
# From skills directory
python skill-creator/scripts/init_skill.py my-skill-name
```

This creates:
```
my-skill-name/
├── SKILL.md              # Template with TODOs
├── scripts/
│   └── example_script.py
├── references/
│   └── example_reference.md
└── assets/
    └── example_asset.txt
```

### Step 2: Edit SKILL.md

1. **Update frontmatter** with proper name and description
2. **Write core instructions** using imperative/infinitive form
3. **Reference bundled resources** so Claude knows how to use them
4. **Keep it lean** - move detailed docs to references/

**YAML Frontmatter Template:**
```yaml
---
name: my-skill-name
description: This skill should be used when [specific use case]. Provides [key capabilities] including [main patterns/features].
---
```

**Writing Style:**
- Use imperative/infinitive form: "To accomplish X, do Y"
- Not second person: ~~"You should do X"~~
- Objective and instructional
- Focus on procedural knowledge

### Step 3: Add Bundled Resources

Delete example files and add your actual resources:

- **scripts/**: Add Python/Bash scripts for repetitive tasks
- **references/**: Add detailed documentation by topic
- **assets/**: Add templates, images, or boilerplate files

### Step 4: Validate and Package

Use the validation script to check your skill:

```bash
# Quick validation (checks structure and metadata)
python skill-creator/scripts/quick_validate.py my-skill-name/

# Full package (validates + creates distributable zip)
python skill-creator/scripts/package_skill.py my-skill-name/
```

The packaging script will:
1. Validate YAML frontmatter format
2. Check required fields (name, description)
3. Verify directory structure
4. Check description quality
5. Create distributable zip if all checks pass

### Step 5: Test and Iterate

1. Test the skill on real tasks
2. Notice struggles or inefficiencies
3. Update SKILL.md or bundled resources
4. Revalidate and test again

---

## When to Create a New Skill

**Create a skill when:**
- ✅ Reusable knowledge applies to multiple features
- ✅ Complex patterns need detailed explanation
- ✅ Same manual workflow repeated 3+ times
- ✅ Domain-specific knowledge (e.g., payment processing, PDF manipulation)
- ✅ Tool integration requires procedural steps

**Don't create a skill for:**
- ❌ One-time implementation details
- ❌ Project-specific configuration → Use CLAUDE.md
- ❌ Enforcement rules → Use `.claude/rules/`
- ❌ Simple facts → Use project documentation

---

## Skill Maintenance

### Keep Skills Up-to-Date

- Update when framework versions change
- Add new patterns as discovered
- Remove deprecated patterns
- Refresh examples to match current best practices

### Self-Improvement System

This system continuously improves itself. When Claude encounters issues in skills:

1. **During tasks**: Claude notes observations about skill issues
2. **After completion**: Claude reports and fixes issues
3. **Auto-fixes**: Broken references, typos, structural issues
4. **Proposes**: Content updates, new patterns, refactoring

See `.claude/rules/self-improvement.md` for details.

---

## Available Skills

Currently available: 21 skills

### Meta Skills
- **coding-standards** - Language-agnostic and language-specific patterns
- **project-guidelines** - Template for project-specific customization
- **tdd-workflow** - Test-Driven Development methodology
- **user-intent-patterns** - Natural language intent detection
- **skill-creator** - Guide for creating effective skills

### Backend Skills
- **backend-patterns** - Server-side architecture and API design
- **nodejs-patterns** - Node.js backend development best practices
- **database-patterns** - Relational database design patterns
- **auth-patterns** - Authentication and authorization patterns
- **rest-api-design** - RESTful API design standards
- **graphql-patterns** - GraphQL schema design and best practices
- **websocket-patterns** - Real-time communication patterns

### Frontend Skills
- **frontend-patterns** - Client-side architecture and UI patterns
- **react-patterns** - React component patterns and hooks
- **nextjs-patterns** - Next.js App Router patterns

### DevOps Skills
- **docker-patterns** - Containerization and orchestration
- **github-actions** - CI/CD workflow patterns

### Specialized Skills
- **prompt-engineering** - LLM prompt design techniques
- **rag-patterns** - Retrieval-Augmented Generation patterns
- **documentation-patterns** - Code and project documentation standards
- **dev-server-autoopen** - Auto-opening localhost across frameworks

For the complete list with descriptions, see `INDEX.md`.

---

## Validation Scripts

### Quick Validation

Check skill structure without packaging:

```bash
python skill-creator/scripts/quick_validate.py path/to/skill/
```

**Validates:**
- YAML frontmatter format
- Required fields (name, description)
- Directory structure
- Naming conventions
- Description quality

### Package Skill

Validate and create distributable zip:

```bash
python skill-creator/scripts/package_skill.py path/to/skill/

# With custom output directory
python skill-creator/scripts/package_skill.py path/to/skill/ ./dist/
```

**Output:** `skill-name.zip` ready for distribution

---

## Best Practices

### For SKILL.md

1. **Keep it lean** - Move detailed docs to references/
2. **Use tables** - For quick pattern selection
3. **Link to references** - Help Claude find detailed info
4. **Write imperatively** - "To do X, do Y" not "You should do Y"
5. **Be specific** - Clear when/how to use each pattern

### For References

1. **Organize by topic** - One reference file per major topic
2. **Include examples** - Every pattern needs working code
3. **Explain trade-offs** - When to use and when NOT to use
4. **Keep focused** - Each file should be scannable
5. **Use headers** - Make grep-friendly for Claude to search

### For Scripts

1. **Cross-platform** - Handle Windows, Mac, Linux
2. **Error handling** - Clear error messages
3. **Documentation** - Docstrings and usage examples
4. **Dependencies** - Use stdlib when possible

### For Assets

1. **Minimal** - Only include what's needed
2. **Well-organized** - Group related assets
3. **Documented** - README in assets/ explaining each file
4. **Version controlled** - Track changes to templates

---

## Troubleshooting

### "Claude isn't using my skill"

**Possible causes:**
- Description doesn't match the use case clearly
- Skill not relevant to current task
- Skill name doesn't match conventions

**Solutions:**
- Improve description to be more specific
- Explicitly mention skill: "Use the X skill to..."
- Check validation with `quick_validate.py`

### "Skill validation fails"

**Common issues:**
- Missing YAML frontmatter
- Missing required fields (name, description)
- Description too short or generic
- SKILL.md not found

**Solutions:**
- Check YAML syntax (triple dashes, proper formatting)
- Ensure name and description are present
- Make description more specific (aim for 20+ words)
- Verify file is named `SKILL.md` (case-sensitive)

### "References not loading"

**Possible causes:**
- Reference not mentioned in SKILL.md
- File path incorrect in SKILL.md
- Claude doesn't think reference is needed

**Solutions:**
- Add reference links/mentions in SKILL.md
- Use relative paths: `references/filename.md`
- Include table showing when to use each reference
- Add search patterns for large reference files

### "Script execution fails"

**Common issues:**
- Missing dependencies
- Platform-specific code
- Incorrect file paths
- Permission issues

**Solutions:**
- Document dependencies in SKILL.md
- Use cross-platform libraries (pathlib, not os.path)
- Use absolute paths or skill-relative paths
- Check executable permissions on Unix systems

---

## Resources

### For Skill Creation
- [skill-creator/SKILL.md](skill-creator/SKILL.md) - Detailed creation guide
- [skill-creator/scripts/init_skill.py](skill-creator/scripts/init_skill.py) - Initialization script
- [skill-creator/scripts/quick_validate.py](skill-creator/scripts/quick_validate.py) - Validation tool
- [skill-creator/scripts/package_skill.py](skill-creator/scripts/package_skill.py) - Package and distribute

### For Self-Improvement
- [.claude/rules/self-improvement.md](../.claude/rules/self-improvement.md) - System evolution rules
- [.claude/user/changelog.md](../.claude/user/changelog.md) - System change log (user data)

### For Usage
- [INDEX.md](INDEX.md) - Complete skill catalog with descriptions
- [CLAUDE.md](../../CLAUDE.md) - Project-wide guidelines

---

## Quick Reference

### Directory Structure
```
skill-name/
├── SKILL.md              # Required: Core instructions + YAML frontmatter
├── scripts/              # Optional: Executable code
├── references/           # Optional: Detailed documentation
├── templates/            # Optional: Code templates for this domain
└── assets/               # Optional: Icons and resources
```

### YAML Frontmatter
```yaml
---
name: skill-name
description: Specific description of when/how to use this skill
---
```

### Common Commands
```bash
# Initialize new skill
python skill-creator/scripts/init_skill.py my-skill

# Validate skill
python skill-creator/scripts/quick_validate.py my-skill/

# Package skill
python skill-creator/scripts/package_skill.py my-skill/
```

---

**Remember**: Skills are teaching tools. Make them clear, practical, and filled with examples. When in doubt, add more code examples and move details to references!
