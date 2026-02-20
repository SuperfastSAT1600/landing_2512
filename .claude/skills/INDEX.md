# Skills Index

Lightweight directory of all available skills. Load full skill files only when needed for specific tasks.

**Total Skills**: 21 (20 domain patterns + 1 meta-skill)

**Documentation-Based Skills** (2026-01-23):
Nine skills are now sourced from authoritative references (OpenAPI Spec, OWASP, GraphQL Spec, PostgreSQL docs, GitHub docs, RFC standards, Anthropic/OpenAI guides, LangChain, academic research). See individual skill files for sources.

**Directory Structure** (2026-01-28):
Skills now use directories for bundled resources:
- `skill-name/SKILL.md` - Main skill content
- `skill-name/scripts/` - Executable scripts (1 skill)
- `skill-name/references/` - Documentation and examples (8 skills)
- Progressive disclosure: Load metadata → SKILL.md → references as needed

## Core Patterns

| Skill | Coverage | Load When |
|-------|----------|-----------|
| **coding-standards/** | Style, naming, file organization | General coding work |
| **tdd-workflow/** | Red-Green-Refactor cycle, test patterns | Test-driven development |
| **documentation-patterns/** | Documentation standards and formats (sourced from JSDoc, TSDoc, Keep a Changelog) | Writing documentation |

## Backend

| Skill | Coverage | Load When | Resources |
|-------|----------|-----------|-----------|
| **backend-patterns/** | Server architecture, API design, error handling | Backend development | references/ |
| **nodejs-patterns/** | Node.js best practices, async patterns | Node.js work | references/ |
| **rest-api-design/** | REST API design standards (sourced from OpenAPI Spec, RFC 9110, JSON:API) | REST API design | references/ |
| **database-patterns/** | Database design, normalization, and optimization (sourced from PostgreSQL docs, SQL standards, Supabase best practices) | Database work | references/ |

## Frontend

| Skill | Coverage | Load When | Resources |
|-------|----------|-----------|-----------|
| **frontend-patterns/** | Component architecture, state management | Frontend development | - |
| **react-patterns/** | Hooks, context, performance optimization | React development | references/ |
| **nextjs-patterns/** | App Router, SSR, data fetching | Next.js development | - |

## Specialized Patterns

| Skill | Coverage | Load When | Resources |
|-------|----------|-----------|-----------|
| **auth-patterns/** | Authentication and authorization patterns (sourced from OWASP, RFC 7519, RFC 6749) | Authentication work | references/ |
| **graphql-patterns/** | GraphQL schema design and best practices (sourced from GraphQL Spec, Apollo docs) | GraphQL development | references/ |
| **websocket-patterns/** | Real-time communication patterns (sourced from RFC 6455, Socket.io docs) | Real-time features | - |
| **prompt-engineering/** | LLM prompt engineering best practices (sourced from Anthropic, OpenAI guides) | AI integration | - |
| **rag-patterns/** | Retrieval-Augmented Generation implementation (sourced from LangChain, academic research) | RAG system design | - |

## DevOps & Infrastructure

| Skill | Coverage | Load When | Resources |
|-------|----------|-----------|-----------|
| **docker-patterns/** | Dockerfile, multi-stage builds, compose | Containerization | references/ |
| **github-actions/** | CI/CD workflows with GitHub Actions (sourced from official GitHub docs) | CI/CD setup | - |

## Project Utilities

| Skill | Coverage | Load When | Resources |
|-------|----------|-----------|-----------|
| **dev-server-autoopen/** | Auto-open localhost in browser | Dev server setup | scripts/ |
| **project-guidelines/** | Project-specific patterns and conventions | Project onboarding | - |
| **user-intent-patterns/** | Natural language → command routing | Intent classification | - |

## Meta Skills

| Skill | Coverage | Load When | Resources |
|-------|----------|-----------|-----------|
| **skill-creator/** | Guide for creating and updating skills | Creating new skills | references/ |

## Progressive Disclosure

Skills use a three-level loading system to minimize token usage:

### Level 1: Metadata (This Index)
- Skill name, category, and coverage summary
- Load cost: ~500 tokens (this entire INDEX.md)
- Use for: Task routing and skill selection

### Level 2: Core Content (SKILL.md)
- Essential patterns, rules, and quick references
- Load cost: 1-3k tokens per skill
- Use for: Implementation guidance

### Level 3: Bundled Resources (references/, scripts/)
- Detailed examples, templates, scripts
- Load cost: Variable (500-2k tokens per resource)
- Use for: Deep-dive learning or specific examples

**Example Loading Strategy**:
```
Task: "Build REST API with Supabase"
→ Level 1: INDEX.md identifies rest-api-design/ and database-patterns/
→ Level 2: Load rest-api-design/SKILL.md and database-patterns/SKILL.md
→ Level 3: If needed, load rest-api-design/references/openapi-example.yml
→ Context saved: ~35k tokens vs loading all skills
```

## Usage

Instead of loading all 21 skill directories (~45k tokens), reference this index to identify relevant skills, then load only those needed for the current task.

**Skills with Bundled Resources**:
- **scripts/** (1 skill): dev-server-autoopen
- **references/** (8 skills): nodejs-patterns, react-patterns, docker-patterns, backend-patterns, auth-patterns, database-patterns, rest-api-design, graphql-patterns

## Skill Selection by Task Type

| Task Type | Relevant Skills | Load Paths |
|-----------|-----------------|------------|
| **New Feature** | coding-standards, tdd-workflow, + domain-specific | coding-standards/SKILL.md, tdd-workflow/SKILL.md |
| **API Development** | rest-api-design, backend-patterns, database-patterns | rest-api-design/SKILL.md, backend-patterns/SKILL.md, database-patterns/SKILL.md |
| **React Component** | react-patterns, frontend-patterns, coding-standards | react-patterns/SKILL.md, frontend-patterns/SKILL.md |
| **Next.js Page** | nextjs-patterns, react-patterns, frontend-patterns | nextjs-patterns/SKILL.md, react-patterns/SKILL.md |
| **Authentication** | auth-patterns, backend-patterns, database-patterns | auth-patterns/SKILL.md, backend-patterns/SKILL.md |
| **Real-time Feature** | websocket-patterns, backend-patterns | websocket-patterns/SKILL.md, backend-patterns/SKILL.md |
| **Database Work** | database-patterns | database-patterns/SKILL.md |
| **CI/CD Setup** | github-actions, docker-patterns | github-actions/SKILL.md, docker-patterns/SKILL.md |
| **AI/LLM Integration** | prompt-engineering, rag-patterns | prompt-engineering/SKILL.md, rag-patterns/SKILL.md |
| **Creating New Skill** | skill-creator | skill-creator/SKILL.md |

## Benefits

- **Baseline reduction**: 45k tokens saved by not loading all skills upfront
- **Progressive disclosure**: Load metadata → content → resources as needed
- **Targeted loading**: Load only relevant patterns per task
- **Bundled resources**: Scripts and references co-located with skills
- **Faster reference**: Quick table for skill selection
- **Better context**: More room for code and analysis

## File Paths

All skills use directory structure:
```
.claude/skills/
├── skill-name/
│   ├── SKILL.md           # Main content (always present)
│   ├── scripts/           # Optional: Executable scripts
│   └── references/        # Optional: Examples and documentation
└── INDEX.md               # This file
```

To load a skill: Read `.claude/skills/skill-name/SKILL.md`
To access resources: Read files in `scripts/` or `references/` subdirectories
