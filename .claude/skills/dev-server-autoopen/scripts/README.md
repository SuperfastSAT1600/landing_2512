# Dev Server Auto-Open Scripts

Executable scripts for automatically opening browsers to development servers.

## open_browser.py

Cross-platform Python script that opens the default browser to a localhost URL.

### Requirements
- Python 3.6 or higher (standard library only, no dependencies)

### Usage

```bash
# Open default port (3000)
python open_browser.py

# Open specific port
python open_browser.py 5173

# Open specific port and path
python open_browser.py 8080 /admin
```

### Features
- Waits for server to become ready (up to 15 seconds)
- Cross-platform support (Windows, macOS, Linux)
- Respects environment variables:
  - `BROWSER=none` - Disables opening
  - `CI=true` - Disables opening in CI environments
- Clear error messages
- Exit codes: 0 for success, 1 for failure

### Integration

Add to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite & python .claude/skills/dev-server-autoopen/scripts/open_browser.py 5173"
  }
}
```

Or use with `concurrently` for better process management:

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"python .claude/skills/dev-server-autoopen/scripts/open_browser.py 5173\""
  }
}
```

### Troubleshooting

**Browser doesn't open:**
- Verify Python 3.6+ is installed: `python --version`
- Check your default browser is set correctly
- Try opening the URL manually to ensure the server is running

**Script exits immediately:**
- Server might not be starting correctly
- Check for port conflicts
- Verify the server command is correct

**Opens too early (before server ready):**
- Script waits up to 15 seconds by default
- If your server takes longer, the browser will show an error initially
- Just refresh once the server is ready
