#!/bin/bash
# block-dangerous-commands.sh
# PreToolUse hook: blocks destructive Bash commands even when Bash is broadly auto-approved.
# Exit 0 = allow, Exit 2 = BLOCK

COMMAND="$1"

# If no command provided, allow
if [ -z "$COMMAND" ]; then
  exit 0
fi

# --- Destructive filesystem operations ---
# rm -rf / or rm -rf /* or rm -rf ~
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?-[a-zA-Z]*r[a-zA-Z]*\s+(/|/\*|~|\$HOME)\b'; then
  echo "[Hook] BLOCKED: Destructive rm -rf on root/home detected!" >&2
  exit 2
fi
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+)?-[a-zA-Z]*f[a-zA-Z]*\s+(/|/\*|~|\$HOME)\b'; then
  echo "[Hook] BLOCKED: Destructive rm -rf on root/home detected!" >&2
  exit 2
fi

# --- Force push to main/master ---
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force(-with-lease)?\s+.*(main|master)'; then
  echo "[Hook] BLOCKED: Force push to main/master!" >&2
  exit 2
fi
if echo "$COMMAND" | grep -qE 'git\s+push\s+--force\s+origin\s+(main|master)'; then
  echo "[Hook] BLOCKED: Force push to main/master!" >&2
  exit 2
fi

# --- SQL destructive commands ---
if echo "$COMMAND" | grep -iqE 'DROP\s+(DATABASE|TABLE|SCHEMA)'; then
  echo "[Hook] BLOCKED: DROP DATABASE/TABLE/SCHEMA detected!" >&2
  exit 2
fi
if echo "$COMMAND" | grep -iqE 'TRUNCATE\s+TABLE'; then
  echo "[Hook] BLOCKED: TRUNCATE TABLE detected!" >&2
  exit 2
fi

# --- Disk/filesystem destructive ---
if echo "$COMMAND" | grep -qE 'mkfs\.' ; then
  echo "[Hook] BLOCKED: mkfs (format disk) detected!" >&2
  exit 2
fi
if echo "$COMMAND" | grep -qE 'dd\s+if=' ; then
  echo "[Hook] BLOCKED: dd command detected!" >&2
  exit 2
fi

# --- Fork bomb ---
if echo "$COMMAND" | grep -qF ':(){ :|:& };:'; then
  echo "[Hook] BLOCKED: Fork bomb detected!" >&2
  exit 2
fi

# --- Overwrite disk devices ---
if echo "$COMMAND" | grep -qE '>\s*/dev/(sda|sdb|nvme|vda)'; then
  echo "[Hook] BLOCKED: Write to block device detected!" >&2
  exit 2
fi

# --- chmod 777 on root ---
if echo "$COMMAND" | grep -qE 'chmod\s+(-R\s+)?777\s+/\s*$'; then
  echo "[Hook] BLOCKED: chmod 777 on root!" >&2
  exit 2
fi

# All checks passed — allow
exit 0
