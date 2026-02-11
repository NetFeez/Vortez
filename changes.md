# version (5.0.0)
## 📒 Notes
- **Breaking Change**: The server's debugging interface has been refactored. Users interacting with the old `DebugUI` will need to adapt to the new `ServerDebug` module.
## ➕ Added
- **(Utilities/DebugUI)**: Introduced a new generic, reusable `DebugUI` class for creating command-line interfaces.
- **(Server/ServerDebug)**: Added a new `ServerDebug` module to provide server-specific commands, built upon the new generic `DebugUI`.
- **(Server/Middleware)**: Created middleware system.
  - Implemented middleware system in Router for global middlewares.
  - Implemented middleware system in Rule for custom middlewares in single rule.
## ❌ Removed
- **(Server/DebugUI)**: Deleted the old `DebugUI.ts` which was tightly coupled with the `Server` class.
## 🐞 Fixes
## ✏️ Changes
- **(Vortez/DebugUI)**: The entire debugging system has been refactored for modularity. **This is a breaking change.**
  - The `DebugUI` is no longer part of the `Server` class but is now composed of a generic `DebugUI` from utilities and a specific `ServerDebug` module.
  - This decoupling allows other packages to leverage the `DebugUI` from `vortez`.
- **(Debug)**: Added new properties and refactored methods:
  - Debug now supports multiline formatting in prints.
  - Debug now have static default and static defaultID attributes.
  - Debug now return directly Debug.default when use getInstance without params or with id === Debug.defaultID;
- **(Server/Config)**: Introduced a new configuration system:
  - The config system is based on a `.json` file.
  - You can load config from a specific file or use the default.
  - You can still configure everything dynamically (like in older versions).
  - Using the config system is optional, not required.
  - Documentation is available in the `README.md`.
- **(Server/Router)**: Refactored Rule to support async authExec and optional parameters in url rules.
  - The rules now can accept async authExec.
  - Url rules now accept `$?<name>` as optional param `$<name>` continue as required param.
  - Added support for global middlewares.
  - added support for sub routers.
- **(Server/WebSocket)**: Overhauled the WebSocket connection lifecycle for improved security and developer experience.
  - The `WebSocket` class no longer accepts connections in its constructor. Instead, it waits in a `pending` state.
  - Added `accept()` and `reject()` methods to give the framework full control over the connection handshake.

# version (4.1.0)
## ➕ Added
  - **(Logger)**: added to help in log with prefix.
    - this was exported from `Vortez`
      ```ts
      import { Logger } from `vortez`
      ```
  - **(LoggerManager)**: added to manager the Vortez logs.
    - this was exported from namespace `Vortez`
      ```ts
      import Vortez from `vortez`
      Vortez.LoggerManager
      ```
## 🐞 Fixes
  - The default templates now use absolute path to prevent errors
    - Note: the user can use relative path`s
## ✏️ Changes
  - **(Debug)**: Debugging tools were added.
    - Added methods to help in debug time: log, warn, info and error.
    - The default value to show was changed to true.
  - **(Server)**: The server startup was changed.
    - Added methods: start, stop, restart
    - Now the user should use the method start
      ```ts
      import Vortez from 'vortez';
      const server = new Vortez();
      server.start();
      ```
    - The server config can be provided in constructor or changed after start.
      ```ts
      // example 1;
  		const server = new Vortez({
        port: 80, host: 'localhost', ssl: {
          pubKey: 'public.pem',
          privKey: 'private.pem'
          port: 443
        }
      });
      // example 2
      const server = new Vortez();
      server.config.port = 80;
      server.config.host = 'localhost';
      server.config.ssl = {
        pubKey: 'public.pem',
        privKey: 'private.pem'
        port: 443
      }
      ```

# version (4.0.0)
## 📒 Notes
  - The project was migrated to TypeScript.
  - Properties and methods now start with a camelcase.
  - Skipped version 3.7.0 to make way for 4.0.0.
## ✏️ Changes
  - **(Template)**: The `load` method now works with async/await instead of directly returning a promise.
  - **(Template)**: syntax of array changed.
    ```text
    // from
    $(name) { the key is $key with value $value }
    $(name, customKeyName, customValueName) { the key is $customKeyName with value $customValueName }
    // to
    $(name) { the key is %key% with value %value% }
    $(name, customKeyName, customValueName) { the key is %customKeyName% with value %customValueName% }
    ```
  - **(Utilities)**: Added the functions `loadEnv`, `flattenObject`, and `sleep`.
  - **(Utilities)**: Modified the `flattenObject` function to retain null and undefined values and provide better typing.
  - **(Debug)**: Can now only be used from the `getInstance` method (subject to possible changes).
  - **(Config)**: Converted to a singleton.
  - **(Response)**: The `send` method is now limited to receiving `string|buffer`.
  - **(Response)**: The `sendFile`, `sendFolder`, and `sendTemplate` methods now work with async/await.
  - **(Response)**: The `POST.content` object will no longer be a `Map` when appropriate, but a `Request.POST.VarList` object.
  - **(Response)**: The `POST.files` object will always have the type `Request.POST.FileList`.
  - **(Request)**: The `GET` attribute is now `searchParams`.
  - **(Request)**: Request body processing has been delegated to `BodyParser.ts`.
  - **(Request)**: The type of search param is no longer a `Map`, but an object `{ [key: string]: string | undefined }`.
  - **(WebSocket)**: The logic behind WebSocket reception was separated into `Chunk.ts`.
  - **(WebSocket)**: `Chunk.ts` was optimized.
  - **(Beta)**: `JsonWT` was converted to `JwtManager`.

  

# version (x.x.x)
## 📒 Notes
## ➕ Added
## ❌ Removed
## 🐞 Fixes
## ✏️ Changes