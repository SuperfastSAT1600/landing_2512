---
name: websocket-patterns
description: Production-ready patterns for real-time bidirectional communication based on RFC 6455 and Socket.io best practices.
---

# WebSocket Patterns

Production-ready patterns for real-time bidirectional communication. Based on RFC 6455 (WebSocket Protocol), Socket.io v4 docs, and MDN WebSocket API.

**Sources:** RFC 6455, Socket.io Documentation, MDN Web Docs

---

## Connection Lifecycle (RFC 6455)

**States:** CONNECTING (0), OPEN (1), CLOSING (2), CLOSED (3)

### Server (Socket.io)
```typescript
const io = new Server(server, {
  pingTimeout: 60000,      // Close if no pong after 60s
  pingInterval: 25000,     // Send ping every 25s
  cors: { origin: process.env.CLIENT_URL }
});

io.on('connection', (socket) => {
  socket.on('disconnect', (reason) => {
    // 'transport close', 'client namespace disconnect', etc.
  });
});
```

### Client Reconnection
```typescript
const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionDelay: 1000,         // Start at 1s
  reconnectionDelayMax: 5000,      // Max 5s
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  // Rejoin rooms, sync state
});
```

---

## Authentication (Pre-Connection)

```typescript
// Server middleware (runs before connection event)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.data.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    next(new Error('Auth failed'));
  }
});

// Client
const socket = io({ auth: { token: getToken() } });
```

---

## Message Patterns

### Rooms (Pub/Sub)
```typescript
// Join room
socket.join(roomId);

// Emit to room (including sender)
io.to(roomId).emit('event', data);

// Emit to room (excluding sender)
socket.to(roomId).emit('event', data);
```

### Acknowledgements (Request-Response)
```typescript
// Server: callback = ack function
socket.on('send-msg', (msg, callback) => {
  if (!msg.text) return callback({ error: 'Required' });
  callback({ success: true, id: saved.id });
});

// Client: wait for ack
socket.emit('send-msg', msg, (response) => {
  if (response.error) handleError();
});
```

### Broadcast
```typescript
io.emit('event', data);              // All clients
socket.broadcast.emit('event', data); // All except sender
```

---

## Heartbeat/Ping-Pong (RFC 6455 §5.5.2-5.5.3)

Socket.io handles automatically via `pingInterval`/`pingTimeout`. Native WebSocket:

```typescript
// Client
const ws = new WebSocket('ws://localhost');
ws.addEventListener('open', () => {
  setInterval(() => ws.send('ping'), 30000);
});
```

---

## Error Handling

### Connection Errors
```typescript
// Client
socket.on('connect_error', (err) => {
  if (err.message === 'Auth failed') redirectLogin();
});

// Server
socket.on('error', (err) => {
  logger.error({ socketId: socket.id, err });
});
```

### Message Validation
```typescript
socket.on('chat-msg', (msg) => {
  const result = schema.safeParse(msg);
  if (!result.success) return socket.emit('error', 'Invalid');
  // Process
});
```

---

## Scalability (Multi-Server)

### Redis Adapter (Socket.io)
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
// Now events sync across all server instances
```

### Sticky Sessions (Required)
Use IP-based routing or session ID cookies to route client to same server instance.

---

## Resources

- **RFC 6455**: https://datatracker.ietf.org/doc/html/rfc6455
- **Socket.io Docs**: https://socket.io/docs/v4/
- **MDN WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Redis Adapter**: https://socket.io/docs/v4/redis-adapter/
