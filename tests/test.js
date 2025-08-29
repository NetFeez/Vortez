/// @ts-check

import Vortez, { Logger, Debug, Utilities } from "../build/Vortez.js";
import "./debug.js";
import "./utilities.js";

/* | ENABLING ALL THE Vortez LOGS IN CONSOLE | */
Debug.showAll = true;
/* | CREATING DEBUG INSTANCE TO THE TESTS | */
const debug = new Logger({ prefix: '[TEST]' });

/* | CREATING ENV VARIABLES FOR THE TESTS | */

await Utilities.Env.load('tests/test.env');
// Utilities.Env.loadSync('tests/test.env');

const HOST = process.env.HOST;
const PORT = process.env.PORT ?
Number(process.env.PORT)
? Number(process.env.PORT)
: 5050 : 5050;
const WEBSOCKET_URL = process.env['REMOTE-WS'] ?? `ws://${HOST ?? 'localhost'}:${PORT}`;

/* | CREATING SERVER | */
const server = new Vortez({ port: 3000 });

/* | FILE RULE TEST | */
server.router.addFile('/File', 'changes.md')
server.router.addFile('/favicon.ico', 'Global/Source/Logo_SM_960.png');

/* | FILE RULE TEST USING AUTH EXEC | */
server.router.addFile('/FileWA', 'changes.md',
    (Request) => (Request.searchParams.Auth != null && Request.searchParams.Auth == 'AuthYes')
)

/* | CREATING RULES WITH THE RULE CONSTRUCTOR | */
server.router.addRules(
    new Vortez.Router.Rule('File', 'GET', '/MyFile/*', 'Test/Test.js', () => true)
);

/* | FOLDER RULES TEST | */
server.router.addFolder('/Folder', '.debug');

/* | ACTION RULES TEST | */
server.router.addAction('ALL', '/', (Rq, Rs) => {
    Rs.sendTemplate('tests/test.vhtml', {
        Tittle: '[NetFeez-Labs] · Tests',
        Sources: {
            File: '/File',
            FileWithAuthFunction_NoAuth: '/FileWA',
            FileWithAuthFunction_Auth: '/FileWA?Auth=AuthYes',
            Folder: '/Folder',
            RuleParams: '/RuleParams/param1/param2/param3/XD',
            WebSocket: '/WebSocket'
        }
    });
});

/* | URL RULE PARAMS TEST | */
server.router.addAction('ALL', '/RuleParams/$?param1/$?b/$?c/*', (Rq, Rs) => {
    Rs.sendJson({
        Url: Rq.url,
        RuleParams: Rq.ruleParams
    })
});

/* | WEBSOCKET RULE TEST | */
/**
 * @typedef {import('../build/Server/WebSocket/WebSocket.js').WebSocket} WebSocket
 */
/** @type {Set<WebSocket>} */
const clients = new Set();
/** @type {Set<string>} */
const usernames = new Set();

/**
 * 
 * @param {string | Buffer} message 
 * @param {WebSocket | null | undefined} exclude 
 */
function broadCast(message, exclude = null) {
    clients.forEach(client => {
        if (!exclude || client !== exclude) client.send(message)
    })
}

server.router.addAction('ALL', 'WebSocket', (Rq, Rs) => {
    Rs.sendTemplate('tests/websocket.vhtml', {
        Host: `${WEBSOCKET_URL}/WebSocket`
    });
});

server.router.addWebSocket('/WebSocket/$?username', (request, socket) => {
    const username = request.ruleParams.username;
    if (!username) {
        socket.send('error: no username');
        socket.end();
        return;
    }
    if (usernames.has(username)) {
        socket.send('error: username already in use');
        socket.end();
        return;
    }
    usernames.add(username)
    clients.add(socket);
    debug.log("[WebSocket]", "new client", username);
    
    socket.send("[server] hallo");
    broadCast('[server] new client: ' + username, socket);

    socket.on('message', (data, info) => {
        if (info.opCode !== 0x1) return;
        const message = username + ': ' + data.toString();
        debug.log(['[WebSocket]', message]);
        broadCast(message, socket);
    });
    socket.on('error', (Error) => {
        debug.log('[WebSocket-Error]: ' + Error.message);
    });
    socket.on('finish', () => {
        clients.delete(socket);
        usernames.delete(username);
        broadCast('[server] client disconnected: ' + username);
        debug.log('[WebSocket-Finish]: client disconnected')
    });
});

server.start();