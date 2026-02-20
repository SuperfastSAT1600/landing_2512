# Template Variants

Framework-specific code templates organized by technology.

---

## Directory Structure

```
variants/
├── generic/        # Framework-agnostic templates
│   ├── test.spec.ts.template
│   ├── migration.sql.template
│   ├── pr-description.md.template
│   ├── error-handler.ts.template
│   ├── guard.ts.template
│   ├── middleware.ts.template
│   ├── service.ts.template
│   ├── hook.ts.template
│   └── Dockerfile.template
├── react/          # React-specific templates
│   ├── component.tsx.template
│   ├── form.tsx.template
│   ├── hook.ts.template
│   ├── context.tsx.template
│   └── hoc.tsx.template
├── nextjs/         # Next.js App Router templates
│   └── api-route.ts.template
└── vue/            # Vue-specific templates
    └── (empty - add your Vue templates)
```

---

## How Templates Work

**IMPORTANT**: Claude looks for templates in `.claude/templates/*.template`, NOT in subdirectories.

The `variants/` directory is for **organization only**. Templates must be in the root `.claude/templates/` directory to be used by Claude.

### Structure

```
.claude/templates/
├── *.template              # Working templates (Claude uses these)
└── variants/               # Organized source templates
    ├── generic/            # Copy these to root (always)
    ├── react/              # Copy these to root (if using React)
    ├── nextjs/             # Copy these to root (if using Next.js)
    └── vue/                # Copy these to root (if using Vue)
```

## Usage

### Default Setup (Generic Templates Only)

By default, all generic templates are already copied to `.claude/templates/` and ready to use:
- ✅ `test.spec.ts.template`
- ✅ `migration.sql.template`
- ✅ `pr-description.md.template`
- ✅ `error-handler.ts.template`
- ✅ `guard.ts.template`
- ✅ `middleware.ts.template`
- ✅ `service.ts.template`
- ✅ `hook.ts.template`

**No action needed** - these work out of the box.

### Adding Framework-Specific Templates

If you're using React, Next.js, or Vue, copy those templates to the root:

```bash
# Using React?
cp .claude/templates/variants/react/*.template .claude/templates/

# Using Next.js?
cp .claude/templates/variants/nextjs/*.template .claude/templates/

# Using Vue?
cp .claude/templates/variants/vue/*.template .claude/templates/
```

### Removing Unused Templates

If you're NOT using certain frameworks, you can:

1. **Delete from root templates** (Claude won't see them):
   ```bash
   # Not using React?
   rm .claude/templates/component.tsx.template
   rm .claude/templates/form.tsx.template
   ```

2. **Delete variant directories** (optional cleanup):
   ```bash
   rm -rf .claude/templates/variants/react/
   rm -rf .claude/templates/variants/nextjs/
   ```

### For Template Maintainers

When adding new templates:

1. **Determine if it's framework-specific**:
   - Generic (works with any framework) → `generic/`
   - React-only (uses JSX, React hooks) → `react/`
   - Next.js-only (uses Next.js APIs) → `nextjs/`
   - Vue-only (uses Vue composition API) → `vue/`

2. **Add the template** to the appropriate directory

3. **Update this README** with the new template

---

## Template Descriptions

### Generic Templates

| Template | Purpose | Use With |
|----------|---------|----------|
| `test.spec.ts.template` | Unit/integration test | Any TypeScript project |
| `migration.sql.template` | Database migration | Any SQL database |
| `pr-description.md.template` | Pull request description | Any project with git |
| `error-handler.ts.template` | Custom error classes | Any TypeScript project |
| `guard.ts.template` | Route/permission guards | Express, Next.js, any framework |
| `middleware.ts.template` | Middleware functions | Express, Next.js, any framework |
| `service.ts.template` | Business logic services | Any TypeScript backend |
| `hook.ts.template` | Custom utility hook | Any TypeScript project |
| `Dockerfile.template` | Docker container | Any project |

### React Templates

| Template | Purpose | Use With |
|----------|---------|----------|
| `component.tsx.template` | React component with props | React, Next.js, Remix |
| `form.tsx.template` | Form with validation | React, Next.js, Remix |
| `hook.ts.template` | Custom React hook | React, Next.js, Remix |
| `context.tsx.template` | React Context provider | React, Next.js, Remix |
| `hoc.tsx.template` | Higher-Order Component | React, Next.js, Remix |

### Next.js Templates

| Template | Purpose | Use With |
|----------|---------|----------|
| `api-route.ts.template` | App Router API route | Next.js 14+ App Router |

### Vue Templates

| Template | Purpose | Use With |
|----------|---------|----------|
| *(empty)* | Add Vue-specific templates here | Vue 3, Nuxt 3 |

---

## Creating New Variants

### Adding a Vue Component Template

1. **Create the template**:
   ```bash
   touch .claude/templates/variants/vue/component.vue.template
   ```

2. **Write the template content**:
   ```vue
   <script setup lang="ts">
   // {{COMPONENT_NAME}} Component
   // {{COMPONENT_DESCRIPTION}}

   interface {{COMPONENT_NAME}}Props {
     // Define props
   }

   const props = defineProps<{{COMPONENT_NAME}}Props>();
   </script>

   <template>
     <div class="{{COMPONENT_NAME_KEBAB}}">
       <!-- Component content -->
     </div>
   </template>

   <style scoped>
   .{{COMPONENT_NAME_KEBAB}} {
     /* Component styles */
   }
   </style>
   ```

3. **Update this README** with the new template

### Adding a Svelte Component Template

1. **Create directory** if it doesn't exist:
   ```bash
   mkdir -p .claude/templates/variants/svelte
   ```

2. **Create template**:
   ```bash
   touch .claude/templates/variants/svelte/component.svelte.template
   ```

3. **Update this README**

---

## Migration Guide

### From Flat Structure to Variants

If you have templates in `.claude/templates/` (old structure):

1. **Create variants directories**:
   ```bash
   mkdir -p .claude/templates/variants/{generic,react,nextjs,vue}
   ```

2. **Move templates**:
   ```bash
   # Generic templates
   mv .claude/templates/test.spec.ts.template .claude/templates/variants/generic/
   mv .claude/templates/migration.sql.template .claude/templates/variants/generic/
   mv .claude/templates/pr-description.md.template .claude/templates/variants/generic/

   # React templates
   mv .claude/templates/component.tsx.template .claude/templates/variants/react/
   mv .claude/templates/form.tsx.template .claude/templates/variants/react/

   # Next.js templates
   mv .claude/templates/api-route.ts.template .claude/templates/variants/nextjs/
   ```

3. **Copy back what you need**:
   ```bash
   # Copy generic (always)
   cp .claude/templates/variants/generic/* .claude/templates/

   # Copy framework-specific (only if you use it)
   cp .claude/templates/variants/react/* .claude/templates/
   ```

---

## Best Practices

1. **Keep templates small** - Each template should do one thing
2. **Use clear placeholders** - `{{COMPONENT_NAME}}`, `{{ROUTE_PATH}}`, etc.
3. **Include usage examples** - Show how to use the template
4. **Document assumptions** - What framework version, what libraries, etc.
5. **Test templates** - Ensure they work with Claude Code's replacement logic

---

## Troubleshooting

### "Template not found"

**Cause**: Template is in `variants/` but not copied to root `templates/`

**Fix**: Copy the template:
```bash
cp .claude/templates/variants/react/component.tsx.template .claude/templates/
```

### "Wrong framework patterns in template"

**Cause**: Using React template in Vue project

**Fix**: Delete React variants, only keep relevant ones:
```bash
rm -rf .claude/templates/variants/react/
rm -rf .claude/templates/variants/nextjs/
```

---

**Last Updated**: 2026-01-28
