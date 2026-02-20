# Templates Directory

Code templates for generating consistent, standardized files across the project.

---

## What Are Templates?

Templates are boilerplate files with placeholders that can be used to quickly scaffold new components, routes, tests, and other common file types while maintaining project standards.

---

## Available Templates (19)

### Code Templates (.template files)

| Template | Purpose | Usage |
|----------|---------|-------|
| `component.tsx.template` | React component with TypeScript | New UI components |
| `api-route.ts.template` | Next.js API route handler | New API endpoints |
| `test.spec.ts.template` | Test file with common patterns | New test files |
| `migration.sql.template` | Database migration script | Schema changes |
| `pr-description.md.template` | Pull request description | PR creation |
| `form.tsx.template` | React Hook Form + Zod validation | Form components |
| `guard.ts.template` | Auth guard/route protection | Middleware/guards |
| `hook.ts.template` | Custom React hook | Custom hooks |
| `context.tsx.template` | React Context provider | Global state management |
| `hoc.tsx.template` | Higher-Order Component | Component composition |
| `service.ts.template` | Business logic service class | Service layer |
| `middleware.ts.template` | Express/Next.js middleware | API middleware |
| `error-handler.ts.template` | Centralized error handling | Error management |

### Configuration Templates

| Template | Purpose | Usage |
|----------|---------|-------|
| `github-workflow.yml` | GitHub Actions CI/CD pipeline | CI/CD setup |

### Documentation Templates

| Template | Purpose | Usage |
|----------|---------|-------|
| `api-documentation.md` | API reference documentation | Documenting APIs |

---

## Placeholder Syntax

Templates use the following placeholder format:

```
{{PLACEHOLDER_NAME}}
```

### Common Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{{COMPONENT_NAME}}` | PascalCase component name | `UserProfile` |
| `{{COMPONENT_NAME_LOWER}}` | camelCase component name | `userProfile` |
| `{{ROUTE_NAME}}` | API route name | `users` |
| `{{TABLE_NAME}}` | Database table name | `user_sessions` |
| `{{DATE}}` | Current date | `2026-01-21` |
| `{{AUTHOR}}` | Developer name | `John Doe` |
| `{{TICKET_ID}}` | Issue/ticket reference | `PROJ-123` |

---

## Usage

### Manual Usage

1. Copy the template file
2. Rename to target filename
3. Replace all `{{PLACEHOLDER}}` values
4. Remove template comments

### With Claude Code

Ask Claude to create a new file using a template:

```
"Create a new React component called UserProfile using the component template"

"Create an API route for /api/orders using the api-route template"

"Create a test file for the PaymentService using the test template"
```

---

## Template Guidelines

### When Creating Templates

1. **Use meaningful placeholders**: Names should be self-explanatory
2. **Include comments**: Explain customization points
3. **Follow project standards**: Match existing code style
4. **Keep it minimal**: Include only essential boilerplate
5. **Document variations**: Note alternative patterns in comments

### Template Structure

```
# Template header comment explaining purpose
# Placeholders: List all placeholders used

[Template content with {{PLACEHOLDERS}}]

# Optional: Alternative patterns as comments
```

---

## Customization

### Adding New Templates

1. Create new `.template` file in this directory
2. Use consistent placeholder naming
3. Add entry to this README
4. Include usage instructions in template comments

### Modifying Templates

1. Update template file
2. Test with sample generation
3. Update README if placeholders change
4. Notify team of changes

---

## Best Practices

- **Don't over-template**: Only template truly repetitive patterns
- **Keep templates current**: Update when project standards change
- **Document assumptions**: Note any dependencies or prerequisites
- **Version templates**: Track significant changes in git history
