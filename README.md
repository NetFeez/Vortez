# Vortez

A lightweight, production-ready Node.js web framework for building APIs, websites, single-page applications (SPAs), and progressive web apps (PWAs). Built with TypeScript and designed for simplicity without sacrificing power.

The package exports a default `Vortez` server class, plus named exports for `Router`, `Config`, `Template`, `Utilities`, `ServerError`, `Logger`, and `Beta`.

[![npm version](https://img.shields.io/npm/v/vortez?style=flat-square)](https://www.npmjs.com/package/vortez)
[![License](https://img.shields.io/npm/l/vortez?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen?style=flat-square)](https://nodejs.org/)

## Features

- 🚀 **Fast and Lightweight** — Minimal overhead, maximum performance
- 📦 **Built with TypeScript** — Full type safety with compiled JavaScript output
- 🔄 **Flexible Routing** — Pattern-based routing with wildcards and dynamic parameters
- 🔌 **WebSocket Support** — Real-time bidirectional communication out of the box
- 🛡️ **HTTPS/SSL Ready** — Secure connections with easy configuration
- 🎯 **Middleware Pipeline** — Composable, snapshot-based middleware system
- 📝 **Request/Response Helpers** — Simplified APIs for JSON, files, and text responses
- ⚙️ **Modular Architecture** — Use what you need, extend what you want
- 🔐 **Beta Features** — JWT authentication and email support (development version)

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Configuration Files](#configuration-files)
- [Examples Repository](#examples-repository)
- [Core Concepts](#core-concepts)
- [Routing Rules](#routing-rules)
- [Server Configuration](#server-configuration)
- [Use Cases](#use-cases)
- [Development Features](#development-features)

---

## Quick Start

### Installation

```console
npm install vortez
```

**Development version** (with beta features):

```console
npm install vortez@dev
```

### Requirements

- **Node.js** ≥ 16.0.0
- **ES Modules** — Set `"type": "module"` in your `package.json`

```json
{
  "name": "my-app",
  "type": "module",
  "main": "index.js"
}
```

> [!IMPORTANT]
> CommonJS support will be added in a future release. For now, ES modules are required.

### Minimal Example

```js
import Vortez from 'vortez';

const server = new Vortez({ port: 3000 });

// Define a route
server.router.addAction('GET', '/hello', (request, response) => {
  response.sendJson({ message: 'Hello World' });
});

// Start the server
await server.start();
// Server running on http://localhost:3000
```

---

## Installation

Vortez is available on npm:

```console
npm install vortez
```

For the latest development version with experimental features:

```console
npm install vortez@dev
```

---

## Getting Started

### Creating a Server

```js
import Vortez from 'vortez';

const server = new Vortez();

// Configure (optional)
server.config.set('port', 3000);
server.config.set('host', 'localhost');

// Add routes
server.router.addAction('GET', '/', (request, response) => {
  response.sendJson({ status: 'ok' });
});
server.router.addFile('/favicon.ico', '/assets/icon.ico');

// Start listening
await server.start();
```

### Constructor Options

```js
const server = new Vortez({
  host: 'localhost',      // Default: 'localhost'
  port: 80,               // Default: 80
  ssl: null               // Optional HTTPS configuration
});
```

### Configuration Files

You can also build a `Config` directly or load one from disk.

```js
import Vortez, { Config } from 'vortez';

const config = new Config({
  host: 'localhost',
  port: 3000,
  routing: {
    algorithm: 'FIFO'
  }
});

console.log(config.toJson());
```

```js
import Vortez, { Config } from 'vortez';

const config = await Config.Loader.load('config.json');
// You can directly use of Vortez import
const config = await Vortez.Config.Loader.load('config.json');

const server = new Vortez(config);
await server.start();
```

This workflow is also covered in the dedicated examples repository.

### Examples Repository

The runnable examples are being moved to a separate repository to keep this package focused.

Until that repository is published, the snippets in this README remain the canonical reference.

---

## Core Concepts

### URL Rules

URL rules define how requests are matched to routes. They use patterns with special markers:

| Pattern | Behavior | Example |
|---------|----------|---------|
| `/` | Root path | `/` |
| `/path` | Literal segment | `/api/users` |
| `/$param` | Dynamic parameter | `/$id` captures `123` as `id` |
| `/*` | Wildcard (matches all sub-routes) | `/files/*` matches `/files/a/b/c` |
| `/path/$id/sub` | Mixed patterns | `/user/$id/posts` |

**Examples:**

```js
// Static routes
server.router.addAction('GET', '/', homeHandler);
server.router.addAction('GET', '/api/status', statusHandler);

// Dynamic routes with parameters
server.router.addAction('GET', '/api/users/$id', (request, response) => {
  const userId = request.ruleParams.id;
  // Handle request...
});

// Wildcard routes
server.router.addAction('GET', '/api/*', catchAllHandler);
server.router.addFile('/docs/*', 'public/docs/index.html');
```

### Request Object

The `request` object contains information about the incoming HTTP request:

```js
server.router.addAction('GET', '/api/$action/$id', (request, response) => {
  console.log(request.method);        // 'GET', 'POST', etc.
  console.log(request.url);           // Full URL
  console.log(request.ruleParams);    // { action: '...', id: '...' }
  console.log(request.searchParams);  // Query parameters object (Record<string, string | undefined>)
  console.log(request.headers);       // HTTP headers
  // For body, use: const body = await request.post;
});
```

### Response Object

The `response` object provides methods to send data back to the client:

```js
// Send JSON
response.sendJson({ key: 'value' });

// Send HTML/text
response.send('Hello World');

// Send file
response.sendFile('path/to/file.html');

// Send with custom status and headers
response.sendJson({ id: 123 }, {
  status: 201,
  headers: {
    'X-Test': 'TestHeader'
  }
});

// The same options shape is supported by send, sendJson, sendFile and sendTemplate
```

### Middleware Execution Model

Vortez uses a **snapshot middleware composition model**:

- Global middleware registered via `router.httpMiddleware.use()` / `router.httpMiddleware.useError()`
  and `router.wsMiddleware.use()` / `router.wsMiddleware.useError()` is captured at rule registration time
- Middleware is not updated retroactively for existing rules
- When mounting sub-routers, child middleware is appended after parent middleware

**Key principle:** Register all global middleware first, then add routes.

The `router.use()` helper merges middleware instances; individual middleware functions are added on `router.httpMiddleware` or `router.wsMiddleware`.

```js
const router = server.router;

// Register middleware first
router.httpMiddleware.use(authMiddleware);
router.httpMiddleware.use(loggingMiddleware);

// Add routes (they capture current middleware)
router.addAction('GET', '/old', oldHandler);
// old → [authMiddleware, loggingMiddleware]

// Add more middleware
router.httpMiddleware.use(newMiddleware);

// New routes get updated middleware
router.addAction('GET', '/new', newHandler)
  // Add a middleware only to a single rule
  .httpMiddleware.use(otherMiddleware); 
// new → [authMiddleware, loggingMiddleware, newMiddleware]

// Old routes still use original middleware!
// old → [authMiddleware, loggingMiddleware]
```

**Practical example with sub-routers:**

```js
const apiRouter = new Vortez.Router();
apiRouter.httpMiddleware.use(apiAuthMiddleware);
apiRouter.addAction('GET', '/users', getUsersHandler);

server.router.httpMiddleware.use(globalMiddleware);
server.router.mount(apiRouter, '/api');
// Final middleware chain: [globalMiddleware, apiAuthMiddleware]
```

---

## Static Pages

You can use **Vortez** to serve static pages:

```js
// Importing Vortez
import Vortez from 'vortez';

// Creating the server
const server = new Vortez();

// Adding rules
server.router.addFolder('/source', 'source');
server.router.addFile('/', 'source/index.html');

// Set all other routes or an specific rule for the static page
server.router.addFile('/*', 'source/index.html');
server.router.addFile('/app/*', 'source/index.html');

// Starting the server
await server.start();
```

---

## REST APIs

Build a complete REST API:

```js
import Vortez from 'vortez';

const server = new Vortez({ port: 3000 });

// Users resource
server.router.addAction('GET', '/api/users', (req, res) => {
  res.sendJson([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' }
  ]);
});

server.router.addAction('GET', '/api/users/$id', (req, res) => {
  const id = req.ruleParams.id;
  res.sendJson({ id, name: `User ${id}` });
});

server.router.addAction('POST', '/api/users', async (req, res) => {
  const user = await req.post;
  res.sendJson({ id: 123, ...user }, { status: 201 });
});

server.router.addAction('PUT', '/api/users/$id', async (req, res) => {
  const id = req.ruleParams.id;
  const body = await req.post;
  res.sendJson({ id, ...body });
});

server.router.addAction('DELETE', '/api/users/$id', (req, res) => {
  res.send('', { status: 204 });
});

await server.start();
```

---

## Single Page Applications

Serve an SPA with client-side routing:

```js
import Vortez from 'vortez';

const server = new Vortez();

// Serve the main app shell for all app routes
server.router.addFile('/app', 'public/app.html');
server.router.addFile('/app/*', 'public/app.html');

// Serve static assets
server.router.addFolder('/public', 'public');

// Optional: API routes
server.router.addAction('GET', '/api/data', (req, res) => {
  res.sendJson({ /* ... */ });
});

await server.start();
```

---

## Routing Rules

### Serving Folders

Serve an entire directory and its subdirectories:

```js
server.router.addFolder('/public', 'public');
server.router.addFolder('/docs', 'documentation');

// Absolute paths are supported
server.router.addFolder('/cdn', '/var/www/cdn');
```

> [!WARNING]
> Never expose sensitive directories:
> - ❌ `server.router.addFolder('/', '.')` — Exposes the entire project
> - ❌ `server.router.addFolder('/', 'src')` — Exposes source code
>
> Exposed contents include:
> - Private certificate keys
> - Database credentials in configuration files
> - API tokens and secrets
> - Source code and internal structure

### Serving Files

Serve a single file at a specific route:

```js
server.router.addFile('/', 'public/index.html');
server.router.addFile('/sitemap.xml', 'public/sitemap.xml');

// Useful for SPAs - serve the same file for multiple routes
server.router.addFile('/app/*', 'public/app.html');
```

### Action Routes

Execute code to handle requests dynamically:

```js
// Simple JSON API
server.router.addAction('GET', '/api/status', (request, response) => {
  response.sendJson({ 
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// With route parameters
server.router.addAction('GET', '/api/users/$id', (request, response) => {
  const userId = request.ruleParams.id;
  response.sendJson({ id: userId, name: 'User ' + userId });
});

// With query parameters
server.router.addAction('GET', '/api/search', (request, response) => {
  const query = request.searchParams.q;
  response.sendJson({ results: [], query });
});

// POST with body
server.router.addAction('POST', '/api/data', async (request, response) => {
  const body = await request.post;
  response.sendJson({ received: body }, { status: 201 });
});

// Multiple methods
server.router.addAction('GET', '/resource/$id', getResourceHandler);
server.router.addAction('PUT', '/resource/$id', updateResourceHandler);
server.router.addAction('DELETE', '/resource/$id', deleteResourceHandler);
```

### WebSocket Routes

Handle real-time WebSocket connections:

```js
const connections = new Set();

server.router.addWebsocket('/chat', (request, socket) => {
  console.log('[WS] New connection from:', request.url);
  
  // Notify others
  connections.forEach(conn => {
    conn.send('A user connected');
  });
  connections.add(socket);

  // Handle incoming messages
  socket.on('message', (data, info) => {
    console.log('Message:', data.toString());
    
    // Broadcast to all connections
    connections.forEach(conn => {
      if (conn !== socket) {
        conn.send(data);
      }
    });
  });

  // Handle disconnection
  socket.on('finish', () => {
    connections.delete(socket);
    connections.forEach(conn => {
      conn.send('A user disconnected');
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('[WS-Error]:', error);
  });
});
```

> [!NOTE]
> WebSocket routes use a separate namespace from HTTP routes, so you can have `/api` as both an HTTP action and a WebSocket route without conflicts.

---

## Server Configuration

### Configuration Methods

Configure the server using `server.config`:

```js
import Vortez from 'vortez';
const server = new Vortez();

// Set individual values
server.config.set('port', 3000);
server.config.set('host', '0.0.0.0');

// Set nested values
server.config.set('ssl.cert', 'path/to/cert.pem');
server.config.set('ssl.key', 'path/to/key.pem');

// Get values
const port = server.config.get('port');
const algorithm = server.config.get('routing.algorithm');
```

### Constructor Configuration

Pass configuration to the constructor:

```js
const server = new Vortez({
  host: '0.0.0.0',
  port: 8080,
  ssl: {
    cert: 'path/to/cert.pem',
    key: 'path/to/key.pem',
    port: 443
  }
});
```

### HTTPS/SSL Configuration

Enable HTTPS with SSL certificates:

```js
server.config.set('ssl', {
  cert: 'path/to/certificate.pem',
  key: 'path/to/private-key.pem',
  port: 443  // Optional: HTTPS port (default: 443)
});
```

The framework will automatically create an HTTPS server alongside the HTTP server.

### Available Configuration Keys

```js
server.config.set('host', 'localhost');           // Server hostname
server.config.set('port', 80);                    // HTTP port
server.config.set('ssl.cert', 'cert.pem');        // SSL certificate path
server.config.set('ssl.key', 'key.pem');          // SSL private key path
server.config.set('ssl.port', 443);               // HTTPS port
server.config.set('templates.error', 'error.html');    // Error page template
server.config.set('templates.folder', 'folder.html');  // Folder listing template
server.config.set('routing.algorithm', 'FIFO');   // Routing algorithm ('FIFO' or 'Tree')
```

---

## Real-World Example (ArtFolder Style)

This is a complete composition pattern based on the real-world project structure used in ArtFolder,
with separated routers for UI pages, API endpoints, and WebSocket endpoints.

```js
import Vortez, { ServerError, Template } from 'vortez';

const config = await Vortez.Config.Loader.load('.config.json');
const server = new Vortez(config);

const clientRouter = new Vortez.Router();
const apiRouter = new Vortez.Router();
const socketRouter = new Vortez.Router();

// -------------------------
// Shared API middleware
// -------------------------
apiRouter.httpMiddleware.useError((error, request, response, next, state) => {
  if (error instanceof ServerError) {
    return response.sendJson({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return response.sendJson({ error: message }, { status: 500 });
});

apiRouter.httpMiddleware.use(async (request, response, next, state) => {
  const page = Number(request.searchParams.page ?? '1');
  const limit = Number(request.searchParams.limit ?? '20');
  if (!Number.isFinite(page) || !Number.isFinite(limit)) {
    throw new ServerError('Invalid pagination params', 400);
  }
  state.page = page;
  state.limit = limit;
  return next();
});

// -------------------------
// Client router (SSR + static)
// -------------------------
clientRouter.addAction('GET', '/', async (request, response) => {
  const importMap = await Template.load('assets/importmap.json', {});
  await response.sendTemplate('assets/app.html', {
    title: 'Art Folder',
    style: '/client/styles/styles.css',
    logic: '/client/logic/build/logic.js',
    importMap
  });
});

clientRouter.addAction('GET', '/app/*', async (request, response) => {
  const importMap = await Template.load('assets/importmap.json', {});
  await response.sendTemplate('assets/app.html', {
    title: 'Art Folder',
    style: '/client/styles/styles.css',
    logic: '/client/logic/build/logic.js',
    importMap
  });
});

clientRouter.addFolder('/client', 'client');
clientRouter.addFile('/favicon.ico', 'client/source/images/Mochis.gif');

// -------------------------
// API router
// -------------------------
apiRouter.addAction('GET', '/health', (request, response, state) => {
  response.sendJson({ ok: true, page: state.page, limit: state.limit });
});

apiRouter.addAction('POST', '/echo', async (request, response) => {
  const body = await request.post;
  response.sendJson({ received: body }, { status: 201 });
});

apiRouter.addAction('GET', '/user/$uuid', (request, response) => {
  response.sendJson({ userId: request.ruleParams.uuid });
});

apiRouter.addAction('GET', '*', (request) => {
  throw new ServerError(`No route found for ${request.method} -> ${request.url}`, 404);
});

// -------------------------
// WebSocket router
// -------------------------
socketRouter.addWebsocket('/user/$uuid', (request, socket) => {
  socket.sendJson({
    type: 'welcome',
    uuid: request.ruleParams.uuid,
    queryUuid: request.searchParams.uuid
  });

  socket.on('message', (data) => {
    socket.sendJson({ type: 'echo', data: data.toString('utf8') });
  });
});

// Mount everything
server.router.mount(clientRouter);
server.router.mount(apiRouter, '/api');
server.router.mount(socketRouter, '/rtc');

await server.start();
```

This pattern keeps each concern isolated and mirrors how larger applications organize routes in production.

---

## Use Cases

### Static Website

Simple static site with assets:

```js
import Vortez from 'vortez';

const server = new Vortez();

server.router.addFile('/', 'public/index.html');
server.router.addFolder('/assets', 'public');

await server.start();
```

### Full-Stack Application

Combine API endpoints with static frontend:

```js
import Vortez from 'vortez';

const server = new Vortez();

// API
server.router.addAction('GET', '/api/posts', getPosts);
server.router.addAction('POST', '/api/posts', createPost);

// Frontend
server.router.addFile('/', 'public/index.html');
server.router.addFolder('/assets', 'public');

await server.start();
```

### Single Page Application

Serve a client-side routed application shell:

```js
import Vortez from 'vortez';

const server = new Vortez();

server.router.addFile('/', 'public/app.html');
server.router.addFile('/app/*', 'public/app.html');
server.router.addFolder('/assets', 'public');

server.router.addAction('GET', '/api/status', (request, response) => {
  response.sendJson({ status: 'ok' });
});

await server.start();
```

### Real-Time Chat Application

WebSocket-powered chat:

```js
import Vortez from 'vortez';

const server = new Vortez();
const clients = new Set();

server.router.addWebsocket('/chat', (request, socket) => {
  clients.add(socket);
  
  socket.on('message', (data) => {
    clients.forEach(client => client.send(data));
  });
  
  socket.on('finish', () => clients.delete(socket));
});

server.router.addFile('/', 'public/index.html');
await server.start();
```

---

# Development Features

## Beta Features

The development version includes experimental functionality:

```console
npm install vortez@dev
```

Access beta features:

```js
import { Beta } from 'vortez';
const { Mail, JwtManager } = Beta;

// JWT token management
const jwt = new JwtManager({ alg: 'HS256', key: 'secret' });
const token = jwt.sign({ userId: 1 });

// Email functionality
const mailer = new Mail({
  host: 'smtp.example.com',
  port: 587,
  username: 'user',
  password: 'secret',
  email: 'user@example.com',
  useStartTLS: true
});
```

> [!WARNING]
> Beta features are experimental and may change significantly. Use with caution in production.

---

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests on the repository.

## License

Licensed under the terms specified in the [LICENSE](LICENSE) file.

---

## Support

For questions, issues, or feature requests, please open an issue on the GitHub repository.

