# 🚀 Vortez

This project began as a **personal journey** to deeply understand how web servers work in **Node.js**.
Throughout its development, I’ve gained **tons of new skills and insights** that I’m excited to share.

🛠️ **Continuous Improvement:**
I constantly refactor the code whenever I spot areas that can be polished or optimized.

🌟 **Real-World Usage:**
I actively use this module in my own web projects, which means I’m always finding new ideas, enhancements, and opportunities to fix bugs based on feedback.

💡 **Vision:**
My goal is to make **Vortez** a tool that helps developers build **APIs**, **PWAs**, **websites**, and—thanks to the [Vizui module](https://github.com/NetFeez/Vizui)—**SPAs** with ease and confidence.

Stay tuned for more updates and features! 🚀
That’s all for now, [NetFeez](https://NetFeez.github.io) out.

---

# Installation

You can use **npm** to install Vortez:

* **Stable version**

  ```console
  mpm install vortez
  ```
* **Development version**

  ```console
  mpm install vortez@dev
  ```

> [!IMPORTANT]
> You need to set `"type": "module"` in your `package.json` to use **Vortez**.
> This requirement will be removed in a future version, but for now please configure it like this:
>
> ```json
> {
>   "name": "my-project",
>   "main": "index.js",
>   "type": "module"
> }
> ```

---

# Documentation

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

// Starting the server
server.start();
```

---

## APIs and Websites

You can use **actions** to execute code and send responses to the client:

```js
import Vortez from 'vortez';

const server = new Vortez();

// Action with a static response
server.router.addAction('GET', '/api/test', (request, response) => {
  response.sendJson({
    message: 'Hello World',
    route: `[${request.method}] -> ${request.url}`
  });
});

// Route params and query params
// Example route param: `/api/params/$id`
// Example request: `http://localhost/api/params/123`
server.router.addAction('GET', '/api/params/$id', (request, response) => {
  response.sendJson({
    message: 'Hello World',
    route: `[${request.method}] -> ${request.url}`,
    params: request.ruleParams,
    query: request.searchParams
  });
});

// Serving files
server.router.addAction('GET', '/api/file', (request, response) => {
  response.sendFile('source/index.html');
});

// Sending simple text
server.router.addAction('GET', '/api/string', (request, response) => {
  response.send('Hello World');
});

// Starting the server
server.start();
```

---

## SPAs

You can serve a single file for multiple URLs, including recursive routes:

```js
import Vortez from 'vortez';

const server = new Vortez();

server.router.addFile('/', 'main.html');
server.router.addFile('/app/*', 'main.html');
server.router.addFolder('/public', 'public');

/*
You can also add other features like actions, files, folders, etc.
Use addWebSocket for real-time connections.
*/

server.start();
```

---

## Server Configuration

You can configure the server using the `server.config` object:

```js
import Vortez from 'vortez';
const server = new Vortez();

server.config.port = 3000;
server.config.host = 'localhost';
server.config.https = {
  key: 'path/to/key.pem',
  cert: 'path/to/cert.pem'
};
server.config.templates.error = 'error.html';
server.config.templates.folder = 'folder.html';
```

You can also create the server with a configuration object passed to the constructor:

* **Using options:**

```js
const server = new Vortez({
  port: 3000,
  host: 'localhost',
  ssl: null
});
```

* **Using the Config instance:**

```js
const config = new Vortez.Config();
config.port = 3000;
config.host = 'localhost';
config.ssl = null;

const server = new Vortez(config);
```

---

## URL Rules

URL rules are strings used to define routes handled by the router.

The main separator is `/` which indicates a new sub-route:

* **`*`**: A wildcard that captures all sub-routes.
* **`$<name>`**: A dynamic parameter you can access via `request.ruleParams`.
* **`<string>`**: A literal segment that must match exactly.

**Examples**:

* `/api/*` — Matches `/api/users`, `/api/posts/comments`, etc.
* `/user/$id` — Matches `/user/123`, capturing `123` as `id`.
* `/blog/$category/$postId` — Matches `/blog/tech/42`, capturing `tech` as `category` and `42` as `postId`.

---

## Middleware Execution Model

Vortez uses a snapshot middleware composition model.

- Global middleware from `router.use(...)` and `router.useError(...)` is copied into each rule when the rule is added.
- Existing rules are not updated retroactively if you add more global middleware later.
- `mount(...)` keeps middleware already attached to child rules and prepends destination router middleware.

Execution and composition examples:

```js
const routerA = new Vortez.Router();
const routerB = new Vortez.Router();

routerA.use(httpM1).use(httpM2).use(httpM3);
routerA.addAction('GET', '/old', actionOld); // old -> [M1, M2, M3]

routerA.use(httpM4);
routerA.addAction('GET', '/new', actionNew); // new -> [M1, M2, M3, M4]

routerB.use(httpA).use(httpB).use(httpC);
routerB.addAction('GET', '/child', actionChild); // child -> [A, B, C]

routerA.mount(routerB, '/api');
// mounted child in routerA -> [M1, M2, M3, M4, A, B, C]
```

Practical recommendation:

- Register global middleware first, then add rules.
- If you need new global middleware to affect old rules, rebuild/remount those rules.

---

## Rules

In **Vortez**, there are four types of routers:

| Type                    | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| [Folder](#folder)       | Serves a folder and its sub-folders                    |
| [File](#file)           | Serves a single file                                   |
| [Action](#action)       | Lets you handle requests programmatically              |
| [WebSocket](#websocket) | Allows managing WebSocket connections on a given route |

### Folder

Serves a folder and its sub-folders:

> [!WARNING]
> Do not share the root of your project, as this would expose **ALL** its contents:
>
> * Private certificate keys
> * Database passwords in server-side `.js` files
> * Security tokens
> * And any other sensitive data
>
> Also:
>
> * The entire assigned path will be exposed.
>
>   * **Example:** assigning `/src` would include all sub-routes like `/src/styles`.

```js
server.router.addFolder('/my-folder', 'path/to/folder');
server.router.addFolder('/my-folder-2', '/path/to/folder/absolute');
```

### File

Serves a single file:

```js
server.router.addFile('/my-file', 'path/to/file');
server.router.addFile('/my-file-2', '/path/to/file/absolute');
```

### Action

Lets you handle requests programmatically:

```js
server.router.addAction('GET', '/my-action', (request, response) => {
  response.sendJson({
    message: 'Hello World',
    route: `[${request.method}] -> ${request.url}`
  });
});
```

### WebSocket

Allows managing WebSocket connections on a given route:

> [!NOTE]
> WebSocket URLs use a separate namespace from Files, Folders, and Actions,
> so they won’t conflict even if they share the same route patterns.

```js
const connections = new Set();

server.addWebSocket('/Test/WS-Chat', (request, socket) => {
  console.log('[WS] New connection');
  connections.forEach(user => user.Send('A user has connected.'));
  connections.add(socket);

  socket.on('finish', () => connections.delete(socket));
  socket.on('error', error => console.log('[WS-Error]:', error));

  socket.on('message', (data, info) => {
    if (info.opCode === 1) {
      console.log('[WS] Message:', data.toString());
      connections.forEach(user => {
        if (user !== socket) user.Send(data.toString());
      });
    } else if (info.opCode === 8) {
      connections.forEach(user => user.Send('A user has disconnected.'));
    }
  });
});
```

---

# Development Version

## Currently in Development

The following features are under active development:

* **\[JsonWT]**: JSON Web Token (JWT) support.
* **\[Mail]**: Email sending functionality.
* **\[Server]**: Dynamic authentication system for routing.

## Installation

To install the development version:

```console
mpm install vortez@dev
```

> [!WARNING]
> This version may contain bugs.
> It includes the latest features that may not yet be fully tested.

To access development features not yet listed in `changes.md`:

```js
import { Beta } from 'vortez';
const { Mail, JwtManager } = Beta;
```