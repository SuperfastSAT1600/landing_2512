# Open Localhost Command

Automatically detect and open localhost in your default browser.

---

## Usage

```
/open-localhost [port]
```

### Examples

```
/open-localhost              # Auto-detect running dev server port
/open-localhost 3000         # Open specific port
/open-localhost 5173         # Open Vite default port
```

---

## What This Command Does

1. **Detects running dev server** by checking:
   - Custom port provided as argument
   - `PORT` environment variable in `.env`
   - Port configuration in `package.json` dev script
   - Common framework ports (3000, 5173, 8080, 4200, 5000)
   - Active network connections

2. **Validates server** is responding on detected port

3. **Opens browser** using platform-specific command:
   - **macOS**: `open`
   - **Windows**: `start`
   - **Linux**: `xdg-open`

4. **Provides helpful feedback** if no server found

---

## Implementation

### Step 1: Port Detection

Check in this order:

1. **Custom port argument**: If user provides port, use it
2. **Environment variable**: Check `.env` for `PORT=XXXX`
3. **Package.json**: Parse dev script for port flag (`--port XXXX`)
4. **Active connections**: Check which ports have listening processes
5. **Common ports**: Try standard framework ports

### Step 2: Server Validation

Test if server is actually running:

```bash
# Use curl to test connection
curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT
```

Expected responses:
- `200` - Server running, page loaded
- `301`, `302` - Server running, redirect
- `404` - Server running, route not found (still valid)
- `000`, `Connection refused` - No server on this port

### Step 3: Open Browser

Platform-specific commands:

```bash
# macOS
open "http://localhost:$PORT"

# Windows
start "" "http://localhost:$PORT"

# Linux
xdg-open "http://localhost:$PORT"
```

---

## Bash Implementation

Here's the full implementation:

```bash
#!/bin/bash

# Function to detect platform
detect_platform() {
  case "$(uname -s)" in
    Darwin*)  echo "macos" ;;
    Linux*)   echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

# Function to check if port is active
check_port() {
  local port=$1

  # Try curl first (most reliable)
  if command -v curl &> /dev/null; then
    local response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" 2>/dev/null)
    if [[ "$response" =~ ^[2-4][0-9][0-9]$ ]]; then
      return 0
    fi
  fi

  # Fallback: check if port is listening
  if command -v lsof &> /dev/null; then
    lsof -i ":$port" &> /dev/null && return 0
  elif command -v netstat &> /dev/null; then
    netstat -an | grep ":$port" | grep "LISTEN" &> /dev/null && return 0
  fi

  return 1
}

# Function to find PORT in .env
find_env_port() {
  if [[ -f .env ]]; then
    grep -E "^PORT=" .env | cut -d '=' -f2 | tr -d ' "\047'
  fi
}

# Function to find port in package.json
find_package_port() {
  if [[ -f package.json ]] && command -v grep &> /dev/null; then
    # Look for --port flag in dev script
    grep '"dev"' package.json | grep -oE '\-\-port\s+[0-9]+' | grep -oE '[0-9]+' | head -1
  fi
}

# Function to find active dev server port
find_active_port() {
  local common_ports=(3000 5173 8080 4200 5000 8000 3001 5174)

  for port in "${common_ports[@]}"; do
    if check_port "$port"; then
      echo "$port"
      return 0
    fi
  done

  return 1
}

# Function to open browser
open_browser() {
  local url=$1
  local platform=$(detect_platform)

  case "$platform" in
    macos)
      open "$url"
      ;;
    windows)
      cmd.exe /c start "" "$url" 2>/dev/null || start "" "$url"
      ;;
    linux)
      xdg-open "$url" &> /dev/null
      ;;
    *)
      echo "❌ Unknown platform. Please open $url manually."
      return 1
      ;;
  esac

  return 0
}

# Main logic
main() {
  local port=""

  # Check if custom port provided
  if [[ -n "$1" ]]; then
    port="$1"
    echo "🔍 Using custom port: $port"
  else
    echo "🔍 Detecting dev server port..."

    # Try .env
    port=$(find_env_port)
    if [[ -n "$port" ]]; then
      echo "   Found PORT=$port in .env"
    fi

    # Try package.json
    if [[ -z "$port" ]]; then
      port=$(find_package_port)
      if [[ -n "$port" ]]; then
        echo "   Found port $port in package.json"
      fi
    fi

    # Try active ports
    if [[ -z "$port" ]]; then
      port=$(find_active_port)
      if [[ -n "$port" ]]; then
        echo "   Found active server on port $port"
      fi
    fi
  fi

  # Validate port found
  if [[ -z "$port" ]]; then
    echo ""
    echo "❌ No dev server found!"
    echo ""
    echo "Make sure your dev server is running:"
    echo "  npm run dev"
    echo ""
    echo "Or specify a port manually:"
    echo "  /open-localhost 3000"
    exit 1
  fi

  # Validate port number
  if ! [[ "$port" =~ ^[0-9]+$ ]] || [[ "$port" -lt 1 ]] || [[ "$port" -gt 65535 ]]; then
    echo "❌ Invalid port number: $port"
    echo "   Port must be between 1 and 65535"
    exit 1
  fi

  # Check if server is responding
  echo "🔌 Checking if server is responding on port $port..."
  if ! check_port "$port"; then
    echo ""
    echo "⚠️  Server not responding on port $port"
    echo ""
    echo "The port is configured but the server may not be running."
    echo "Try starting your dev server:"
    echo "  npm run dev"
    exit 1
  fi

  # Open browser
  local url="http://localhost:$port"
  echo "🌐 Opening $url..."

  if open_browser "$url"; then
    echo "✅ Browser opened successfully!"
  else
    echo ""
    echo "⚠️  Could not open browser automatically"
    echo "   Please visit: $url"
  fi
}

# Run main function
main "$@"
```

---

## Usage Examples

### Example 1: Auto-detect Vite Server

```bash
# Start Vite dev server
$ npm run dev

# In another terminal or in Claude Code:
$ /open-localhost

🔍 Detecting dev server port...
   Found active server on port 5173
🔌 Checking if server is responding on port 5173...
🌐 Opening http://localhost:5173...
✅ Browser opened successfully!
```

### Example 2: Open Specific Port

```bash
# Start server on custom port
$ PORT=3001 npm run dev

# Open that specific port
$ /open-localhost 3001

🔍 Using custom port: 3001
🔌 Checking if server is responding on port 3001...
🌐 Opening http://localhost:3001...
✅ Browser opened successfully!
```

### Example 3: No Server Running

```bash
$ /open-localhost

🔍 Detecting dev server port...
❌ No dev server found!

Make sure your dev server is running:
  npm run dev

Or specify a port manually:
  /open-localhost 3000
```

### Example 4: Server Not Responding

```bash
# .env has PORT=3000 but server isn't running
$ /open-localhost

🔍 Detecting dev server port...
   Found PORT=3000 in .env
🔌 Checking if server is responding on port 3000...

⚠️  Server not responding on port 3000

The port is configured but the server may not be running.
Try starting your dev server:
  npm run dev
```

---

## Error Handling

### No Dev Server Found

**Cause**: No port detected and no common ports have active servers

**Solutions**:
1. Start dev server: `npm run dev`
2. Specify port manually: `/open-localhost 3000`
3. Check `.env` file for PORT configuration
4. Verify `package.json` has dev script

### Server Not Responding

**Cause**: Port detected but server not responding to HTTP requests

**Solutions**:
1. Ensure dev server is actually running
2. Check for startup errors in server logs
3. Verify firewall isn't blocking localhost
4. Try manually visiting `http://localhost:[port]`

### Invalid Port

**Cause**: Port number outside valid range (1-65535)

**Solutions**:
1. Check `.env` file for typos
2. Verify port in package.json is valid
3. Use standard port (3000, 5173, 8080, etc.)

### Browser Not Opening

**Cause**: Platform command not available or browser not configured

**Solutions**:
1. Verify default browser is set in system settings
2. Try manually: `open http://localhost:3000` (macOS) or `start http://localhost:3000` (Windows)
3. Install/configure default browser
4. Use the URL provided to open manually

---

## Port Detection Logic

### Detection Order

```
1. Custom port argument (highest priority)
   ↓
2. PORT in .env file
   ↓
3. --port flag in package.json dev script
   ↓
4. Active connection on common ports
   ↓
5. No port found (error)
```

### Common Ports Checked

| Port | Framework | Notes |
|------|-----------|-------|
| 3000 | Next.js, Express, CRA | Most common |
| 5173 | Vite | New default |
| 8080 | Vue CLI, Spring Boot | Traditional |
| 4200 | Angular | Angular default |
| 5000 | Flask, Create React App (old) | Common for APIs |
| 8000 | Django, Python | Backend common |
| 3001 | Alt Next.js | When 3000 busy |
| 5174 | Alt Vite | When 5173 busy |

---

## Platform-Specific Behavior

### macOS

- Uses `open` command
- Opens in default browser (Safari, Chrome, Firefox, etc.)
- Respects system default browser settings

### Windows

- Uses `start` command
- Opens in default browser (Edge, Chrome, Firefox, etc.)
- May show brief command prompt window

### Linux

- Uses `xdg-open` command
- Requires X server (GUI environment)
- Won't work in headless/SSH sessions

### CI/CD Environments

Command will fail gracefully in CI/CD or headless environments:

```bash
⚠️  Could not open browser automatically
   Please visit: http://localhost:3000
```

---

## Integration with Other Commands

### `/full-feature`

After creating a new feature, suggest:

```
✅ Feature complete!

To view your changes:
  /open-localhost
```

### `/quick-fix`

After fixing bugs:

```
✅ Bug fixed!

Test the fix:
  /open-localhost
```

### After `npm run dev`

Remind users:

```
$ npm run dev

Dev server started!

Quick open:
  /open-localhost
```

---

## Security Considerations

### Only Localhost

- ✅ Only opens localhost URLs
- ✅ Cannot open external URLs
- ✅ Port validation (1-65535)
- ✅ No arbitrary command execution

### Safe Port Numbers

```bash
# Valid
/open-localhost 3000   ✅
/open-localhost 8080   ✅

# Invalid (rejected)
/open-localhost 99999  ❌ (out of range)
/open-localhost abc    ❌ (not a number)
/open-localhost -1     ❌ (negative)
```

### No URL Injection

The command only accepts port numbers, preventing URL injection:

```bash
# Safe
/open-localhost 3000
# Opens: http://localhost:3000

# Attempted injection (fails validation)
/open-localhost 3000; rm -rf /
# Error: Invalid port number
```

---

## Troubleshooting

### Command Not Found

If `/open-localhost` doesn't work:

1. Check command is in `.claude/commands/`
2. Restart Claude Code session
3. Try using full path: `.claude/commands/open-localhost.md`

### Port Detection Fails

If auto-detection isn't working:

1. **Manually specify port**: `/open-localhost 3000`
2. **Check .env file**: Ensure `PORT=3000` is present
3. **Verify server is running**: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
4. **Try common ports**: `/open-localhost 5173` for Vite

### Browser Opens Wrong URL

If opening wrong port:

1. Check for multiple dev servers running
2. Specify exact port: `/open-localhost 5173`
3. Stop unused dev servers
4. Check `.env` file for correct PORT

### Permission Denied

If getting permission errors:

1. **macOS**: System Preferences → Security & Privacy → Privacy → Automation
2. **Linux**: Ensure `xdg-open` is installed: `sudo apt install xdg-utils`
3. **Windows**: Run terminal as administrator (if needed)

---

## Future Enhancements

Potential future improvements (not implemented):

- [ ] Open specific route: `/open-localhost /dashboard`
- [ ] Choose browser: `/open-localhost 3000 chrome`
- [ ] Open multiple services: `/open-localhost 3000,8080`
- [ ] HTTPS support: `https://localhost:3000`
- [ ] Custom hosts: `/open-localhost 3000 192.168.1.100`

---

## Related Resources

- Skill: `.claude/skills/dev-server-autoopen/SKILL.md` - Auto-open configuration patterns
- Command: `/full-feature` - May suggest opening localhost after implementation
- Setup: `setup.cjs` - Can configure auto-open during project setup

---

## Quick Reference

### Basic Usage
```bash
/open-localhost           # Auto-detect
/open-localhost 3000      # Specific port
```

### Check Server Status
```bash
# macOS/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

### Manual Browser Open
```bash
# macOS
open http://localhost:3000

# Windows
start http://localhost:3000

# Linux
xdg-open http://localhost:3000
```

---

**Last Updated**: 2025-01-22
