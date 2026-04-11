import Vortez, { Utilities } from "../build/Vortez.js";

export class Manual {
    public static async run(): Promise<void> {
        const server = new Vortez({ port: 8001 });
        server.router.addAction('GET', '/u', (request, response) => {
            response.send([
                `<h1>Hello, your IP address is ${request.ip}</h1>`,
                `<p>Module directory: ${Utilities.Path.moduleDir}</p>`,
                `<p>Root directory: ${Utilities.Path.rootDir}</p>`,
                `<a href="/folder">Go to folder</a>`
            ].join('\n'), { 'headers': { 'Content-Type': 'text/html' } });
        });
        server.router.addFolder('/', 'global');
        await server.start();
    }
}

export namespace Manual {}

export default Manual;

Manual.run();