---
description: Fetch the latest 100 logs from a Render service
allowed-tools: mcp__render__list_services, mcp__render__get_service, mcp__render__list_logs
---

# Server Log Command

Fetch the latest 100 log entries from a Render service using the Render API.

---

## Usage

```
/serverlog
/serverlog <service-name>
/serverlog <service-name> --type app
/serverlog <service-name> --type request
/serverlog <service-name> --type build
/serverlog <service-name> --filter <text>
```

**Examples:**
```
/serverlog
/serverlog eden-api
/serverlog eden-api --type app
/serverlog eden-api --filter "error"
/serverlog eden-api --type request --filter "POST /api/auth"
```

---

## Workflow

### Step 1 — Resolve the service

Call `mcp__render__list_services` to get all services.

- If a `<service-name>` argument was provided: match by name (case-insensitive, partial match ok). If ambiguous, list the matches and ask the user to clarify.
- If no argument: if there is exactly one non-preview service, use it automatically. If there are multiple, list them and ask which one.

### Step 2 — Fetch logs

Call `mcp__render__list_logs` with:
- `resource`: `[serviceId]` from Step 1
- `limit`: `100`
- `direction`: `"backward"` (most recent first)
- `type`: if `--type` flag provided, pass as array e.g. `["app"]`
- `text`: if `--filter` flag provided, pass as array e.g. `["error"]`

### Step 3 — Display

Print logs oldest-first (reverse the backward response) so the most recent entry is at the bottom — natural reading order for a tail.

Format each line:

```
[timestamp]  [level]  message
```

- Timestamp: format as `HH:MM:SS` (local time) for readability, not raw RFC3339
- Level: only show if present; color-hint in text: ERROR, WARN, INFO
- If `hasMore: true` in the response, note at the top: `(showing latest 100 — more logs available)`

Group by type with a header if the response contains mixed types (app + request):

```
── app logs ──────────────────────────────
[10:42:01]  INFO  Server started on port 3000
[10:42:03]  ERROR Failed to connect to Redis

── request logs ──────────────────────────
[10:42:05]  200  GET /api/health  12ms
```

---

## Log Types

| Type | What it contains |
|------|-----------------|
| `app` | Application stdout/stderr — your console.log, errors, warnings |
| `request` | HTTP request logs — method, path, status code, duration |
| `build` | Build output — deploy logs, install steps, compile output |

Default (no `--type`): fetches all types.

---

## Example Output

```
/serverlog eden-api

Fetching latest 100 logs from: eden-api (srv-abc123)
(showing latest 100 — more logs available)

── app logs ──────────────────────────────────────────
[10:41:55]  INFO   Connected to database
[10:41:58]  INFO   Server listening on port 10000
[10:42:03]  ERROR  Unhandled rejection: Cannot read properties of undefined
[10:42:03]  ERROR    at processPayment (src/services/payment.ts:88)
[10:43:12]  WARN   Rate limit approaching for user usr_xxx

── request logs ──────────────────────────────────────
[10:42:01]  200  GET  /api/health         4ms
[10:42:09]  201  POST /api/orders         143ms
[10:42:11]  401  POST /api/auth/login     22ms
[10:43:14]  500  POST /api/payments       88ms
```

---

## Flags

| Flag | Description |
|------|-------------|
| `--type app` | Application logs only |
| `--type request` | HTTP request logs only |
| `--type build` | Build/deploy logs only |
| `--filter <text>` | Text filter (wildcards supported, e.g. `--filter "error*"`) |

---

## When to Use

- Debugging a production error
- Checking if a recent deploy is healthy
- Investigating a spike in 4xx/5xx responses
- Tailing what happened in the last few minutes

## Related Commands

- `/checkpoint` — run local tests before checking prod logs
- `/spike` — investigate a production issue before fixing
