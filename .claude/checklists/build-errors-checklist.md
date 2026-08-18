# Build Errors Resolution Checklist

Systematic checklist for identifying and resolving build errors.

---

## Quick Diagnostics

### Initial Assessment
- [ ] Read the full error message carefully
- [ ] Identify the error type (syntax, type, module, config)
- [ ] Note the file and line number
- [ ] Check if error is in source code or dependencies

### Common Error Categories
| Error Type | Typical Cause | First Step |
|------------|---------------|------------|
| `SyntaxError` | Typo, missing bracket | Check indicated line |
| `TypeError` | Type mismatch | Check type definitions |
| `ModuleNotFoundError` | Missing import | Install/check path |
| `ReferenceError` | Undefined variable | Check variable scope |
| `ConfigurationError` | Bad config file | Validate config |

---

## TypeScript Errors

### Type Errors
- [ ] `Type 'X' is not assignable to type 'Y'`
  - Check if types match
  - Consider union types or generics
  - Check for null/undefined handling

- [ ] `Property 'X' does not exist on type 'Y'`
  - Verify property exists in type definition
  - Check for typos in property name
  - Consider optional chaining (`?.`)

- [ ] `Cannot find name 'X'`
  - Check if variable is imported
  - Verify variable scope
  - Check for typos

- [ ] `'X' is declared but its value is never read`
  - Remove unused variable
  - Prefix with `_` if intentionally unused

### Import Errors
- [ ] `Cannot find module 'X'`
  - Run `npm install`
  - Check package.json for dependency
  - Verify import path is correct
  - Check tsconfig paths configuration

- [ ] `Module has no exported member 'X'`
  - Check the export name in source module
  - Verify named vs default export
  - Check package version

### Configuration Errors
- [ ] `Cannot find type definition file for 'X'`
  - Install `@types/X` package
  - Add to `types` in tsconfig.json

- [ ] `'X' is not a module`
  - Check if module has proper exports
  - Verify module resolution settings

---

## Build Tool Errors

### Webpack/Vite
- [ ] `Module not found: Can't resolve 'X'`
  - Check import path
  - Verify alias configuration
  - Ensure file extension is correct

- [ ] `Chunk X has been requested multiple times`
  - Check for circular dependencies
  - Review code splitting configuration

- [ ] `Invalid configuration object`
  - Validate config file syntax
  - Check webpack/vite version compatibility

### Next.js Specific
- [ ] `'X' cannot be used as a JSX component`
  - Check component return type
  - Ensure default export for pages

- [ ] `You're importing a component that needs X`
  - Add `'use client'` directive for client components
  - Or move to client component

- [ ] `Dynamic server usage`
  - Check for dynamic functions in static pages
  - Use proper data fetching methods

---

## Runtime Errors (During Build)

### Node.js
- [ ] `ENOENT: no such file or directory`
  - Verify file path exists
  - Check case sensitivity (Linux)
  - Ensure file is not gitignored incorrectly

- [ ] `EACCES: permission denied`
  - Check file permissions
  - Avoid running as root
  - Check node_modules permissions

- [ ] `ENOMEM: not enough memory`
  - Increase Node memory: `NODE_OPTIONS=--max-old-space-size=4096`
  - Optimize build configuration
  - Split builds

### Out of Memory
- [ ] `JavaScript heap out of memory`
  - Increase memory limit
  - Reduce bundle size
  - Enable source map optimization

---

## Dependency Errors

### Package Installation
- [ ] `ERESOLVE unable to resolve dependency tree`
  - Check for peer dependency conflicts
  - Use `--legacy-peer-deps` (temporary)
  - Update conflicting packages

- [ ] `Could not resolve dependency`
  - Clear npm cache: `npm cache clean --force`
  - Delete node_modules and reinstall
  - Check npm registry access

### Version Conflicts
- [ ] Peer dependency warnings
  - Check required versions
  - Update or downgrade packages
  - Use resolutions/overrides in package.json

- [ ] `Module build failed: Error: Cannot find module 'X'`
  - Check if module is in dependencies (not devDependencies)
  - Verify module exists in node_modules

---

## Resolution Steps

### Standard Cleanup
```bash
# 1. Clear caches
rm -rf node_modules
rm -rf .next .nuxt dist build
npm cache clean --force

# 2. Reinstall dependencies
npm install

# 3. Rebuild
npm run build
```

### TypeScript Reset
```bash
# Clear TypeScript build info
rm -rf tsconfig.tsbuildinfo
rm -rf .tsbuildinfo

# Regenerate types
npx tsc --noEmit
```

### Next.js Reset
```bash
# Full Next.js reset
rm -rf .next
rm -rf node_modules/.cache
npm run build
```

---

## Verification

### After Fixing
- [ ] Build completes without errors
- [ ] No new warnings introduced
- [ ] Tests still pass
- [ ] Application runs correctly
- [ ] Changes committed with descriptive message

### Prevent Recurrence
- [ ] Add/update TypeScript strict settings
- [ ] Add pre-commit build hook
- [ ] Update CI to catch similar errors
- [ ] Document fix if non-obvious

---

## Common Fixes Quick Reference

| Error Pattern | Quick Fix |
|---------------|-----------|
| Missing module | `npm install <module>` |
| Type not found | `npm install @types/<module>` |
| Path not found | Check tsconfig `paths` |
| Peer dep conflict | Update to compatible versions |
| Memory error | `NODE_OPTIONS=--max-old-space-size=4096` |
| Permission error | `chmod -R 755 node_modules` |
| Cache issue | `npm cache clean --force` |

---

## When to Escalate

Escalate to senior developer or architect when:
- [ ] Error persists after all checklist items
- [ ] Error requires architectural changes
- [ ] Multiple interdependent errors
- [ ] Build time exceeds 10 minutes
- [ ] Suspecting a toolchain bug
