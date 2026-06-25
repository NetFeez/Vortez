/// <reference types="node" />
import { Async } from '@netfeez/common-node';

import Vortez, { Logger } from "./build/Vortez.js";

const logger = Logger.default;
const server = new Vortez({ port: 3000 });

server.router.addWebsocket('/ws', async (request, websocket) => {
    logger.log("New WebSocket connection established");
    websocket.on('message:text', (message) => {
        logger.log("Received message from client:", message);
    });
    websocket.send('Hello from WebSocket server!');
});

await server.start();

try {
    const client = await Vortez.WebSocket.connect('ws://localhost:3000/ws');
    client.autoFlush = true;
    logger.log("WebSocket client connected to server");
    client.on('message:text', (message) => {
        logger.log("Received message from server:", message);
    });
    client.send('Hello from WebSocket client!');
    // client.flush();
    await Async.delay(5000);
    server.stop();
} catch (error) {
    logger.error("Error connecting WebSocket client:", error);
}