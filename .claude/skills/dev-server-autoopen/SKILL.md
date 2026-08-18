---
name: dev-server-autoopen
description: Provides quick reference for configuring automatic localhost opening across modern development frameworks and build tools.
---

# Dev Server Auto-Open Patterns

Quick reference for configuring automatic localhost opening across frameworks.

## Overview

Modern development servers can automatically open applications in the default browser when they start.

**Benefits**:
- Immediate feedback when starting development
- Reduces manual steps in workflow
- Consistent experience across projects

## Framework Configuration

### Vite (Recommended)
**File**: `vite.config.ts`
- Set `server.open: true` for default browser
- Set `server.open: '/path'` for specific route
- Set `server.port` for custom port
- Environment-specific: `open: mode === 'development'`

### Next.js
**Method 1 (CLI)**: Add `--open` flag to dev script in package.json
**Method 2 (Custom Server)**: Use `open` package after server starts
**Environment Control**: Use `BROWSER=none` to disable

### Create React App (CRA)
- Set `BROWSER=true` in `.env.local`
- Set `BROWSER=chrome` for specific browser
- Set `BROWSER=none` to disable

### Vue CLI
**File**: `vue.config.js`
- Set `devServer.open: true`
- Set `devServer.open: 'chrome'` for specific browser

### Angular
**File**: `angular.json`
- Set `serve.options.open: true`
- Set specific browser in configuration

### Remix
- Add `--open` flag to dev script
- Or use `open` package after server

### SvelteKit
**File**: `svelte.config.js`
- Set `kit.devServer.open: true`

### Astro
**File**: `astro.config.mjs`
- Set `server.open: true`

### Nuxt
**File**: `nuxt.config.ts`
- Set `devServer.open: true`

### Webpack Dev Server
**File**: `webpack.config.js`
- Set `devServer.open: true`

## Script Usage

### Python Browser Opener (Included)

This skill includes a cross-platform Python script for opening browsers automatically.

**Location**: `scripts/open_browser.py`

**Usage**:
```bash
python scripts/open_browser.py              # Opens http://localhost:3000
python scripts/open_browser.py 5173         # Opens http://localhost:5173
python scripts/open_browser.py 8080 /admin  # Opens http://localhost:8080/admin
```

**Features**:
- Cross-platform (Windows, macOS, Linux)
- Waits for server to be ready before opening
- Respects `BROWSER=none` and `CI=true` environment variables
- Python 3.6+ compatible, no dependencies
- Handles common dev server ports

**Integration Examples**:

```json
{
  "scripts": {
    "dev": "vite & python .claude/skills/dev-server-autoopen/scripts/open_browser.py 5173",
    "dev:next": "next dev & python .claude/skills/dev-server-autoopen/scripts/open_browser.py 3000",
    "dev:custom": "node server.js & python .claude/skills/dev-server-autoopen/scripts/open_browser.py 8080 /dashboard"
  }
}
```

**Concurrent Mode** (recommended for better reliability):
```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"python .claude/skills/dev-server-autoopen/scripts/open_browser.py 5173\"",
    "dev:next": "concurrently \"next dev\" \"python .claude/skills/dev-server-autoopen/scripts/open_browser.py 3000\""
  }
}
```

**Direct Shell Usage**:
```bash
# Windows
start /B npm run dev & python .claude/skills/dev-server-autoopen/scripts/open_browser.py 3000

# macOS/Linux
npm run dev & python .claude/skills/dev-server-autoopen/scripts/open_browser.py 3000
```

**Disable Opening**:
```bash
BROWSER=none npm run dev
CI=true npm run dev
```

## Custom Solutions

### Using 'open' Package
Install: `npm install -D open`
Usage: Import and call after server starts
Cross-platform support for all browsers

### Shell Scripts
Create npm script that starts server and opens browser
Use OS-specific commands (Windows: `start`, macOS: `open`, Linux: `xdg-open`)

## Environment Control

### Disable Auto-Open
- Set environment variable: `BROWSER=none`
- Conditional config: only open in development mode
- User preference: `.env.local` for per-developer settings

### CI/CD Environments
Always disable auto-open in CI/CD pipelines
Check for `CI` environment variable

## Browser Selection

### Specify Browser
- Chrome: `'chrome'` or `'google chrome'`
- Firefox: `'firefox'`
- Safari: `'safari'`
- Edge: `'msedge'`

### System Default
Use `true` to open system default browser

## Troubleshooting

### Port Already in Use
- Server won't start if port occupied
- Auto-open won't trigger
- Solution: Change port or kill existing process

### Browser Doesn't Open
- Check browser is installed
- Verify spelling of browser name
- Check file permissions on config
- Try system default (true) instead of specific browser

### Opens Wrong Browser
- Specify browser explicitly
- Check system default browser settings
- Use full path to browser executable

### Opens Multiple Times
- Ensure only one server running
- Check for duplicate scripts
- Remove multiple auto-open configs

## Best Practices

### Development
- Enable auto-open in development mode
- Open to specific route when needed
- Use system default browser unless specific browser required

### CI/CD
- Always disable in continuous integration
- Set `BROWSER=none` or `CI=true`
- Don't rely on auto-open for automated testing

### Team Consistency
- Document in README
- Add to `.env.example`
- Allow per-developer override in `.env.local`

### Performance
- Auto-open adds minimal overhead
- No impact on hot module replacement
- No build time impact

## Platform-Specific Notes

### Windows
- Use `start` command for shell scripts
- Browser names: 'chrome', 'firefox', 'msedge'
- WSL requires special configuration

### macOS
- Use `open` command for shell scripts
- Browser paths in `/Applications/`
- System default works reliably

### Linux
- Use `xdg-open` for system default
- Browser commands: `google-chrome`, `firefox`
- May require display server (X11/Wayland)

## Quick Reference Table

| Framework | Config File | Setting |
|-----------|-------------|---------|
| Vite | vite.config.ts | `server.open: true` |
| Next.js | package.json | `"dev": "next dev --open"` |
| CRA | .env.local | `BROWSER=true` |
| Vue | vue.config.js | `devServer.open: true` |
| Angular | angular.json | `serve.options.open: true` |
| Remix | package.json | `"dev": "remix dev --open"` |
| SvelteKit | svelte.config.js | `kit.devServer.open: true` |
| Astro | astro.config.mjs | `server.open: true` |
| Nuxt | nuxt.config.ts | `devServer.open: true` |
| Webpack | webpack.config.js | `devServer.open: true` |
