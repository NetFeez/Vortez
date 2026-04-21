/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides a console-based debugging interface for the Vortez project, allowing developers to execute commands and receive feedback in real-time. This is useful for testing and debugging purposes, providing a simple way to interact with the application through a command-line interface.
 * @license Apache-2.0
 */

import ConsoleUI from './ConsoleUI.js';
import Logger from '../logger/Logger.js';

export class DebugUI {
    protected dataHandleInstance: DebugUI.dataHandler;
    public prompt: string;
    public in: NodeJS.ReadStream;
    public out: Logger;
    public commandMap: DebugUI.CommandMap;
    public constructor(name: string = 'C-UI') {
        this.dataHandleInstance = this.dataHandler.bind(this);
        this.prompt = ConsoleUI.formatText("&C(255,180,220)[Vortez] << &C6&S");
        this.in = process.stdin;
        this.out = new Logger({ name, logger: 'console-ui' });
        this.commandMap = {};
        this.addDefaultCommands();
    }
    /** Starts the console UI. */
    protected startReadIn() {
        this.in.on('data', this.dataHandleInstance);
        ConsoleUI.send(this.prompt);
    }
    /** Stops the console UI. */
    protected stopReadIn() { this.in.off('data', this.dataHandleInstance); }
    /** Starts the console UI. */
    public start() { this.startReadIn(); }
    /** Stops the console UI. */
    public stop() { this.stopReadIn(); }
    /**
     * Handles incoming data from the client.
     * @param data - The incoming data buffer.
     */
    protected async dataHandler(data: Buffer): Promise<void> {
        const [cmd, ...args] = data.toString('utf-8').trim().split(' ');
        this.out.log(`&C(80,0,80)command received: &C3${cmd}`, args);
        try {
            const command = this.commandMap[cmd];
            if (command) await command.exec.bind(this)(cmd, args);
            else this.out.error(`&C1Unknown command: &C3${cmd}`);
        } catch(error) {
            this.out.error(`&C1Error executing command: &C3${cmd}`, error);
        }
        if (cmd !== 'exit-debug') ConsoleUI.send(this.prompt);
    }
    /**
     * Gets a command by name.
     * @param command - The name of the command.
     * @returns The command or undefined if not found.
     */
    public getCommand(command: string): DebugUI.Command | undefined { return this.commandMap[command]; }
    /**
     * Adds a command to the command map.
     * @param command - The name of the command.
     * @param exec - The command execution function.
     * @param info - Additional information about the command.
     * @returns The DebugUI instance for chaining.
     */
    public addCommand(command: string, exec: DebugUI.commandExec, info?: DebugUI.CommandInfo): this {
        this.commandMap[command] = { name: command, exec, ...info };
        return this;
    }
    /**
     * Removes a command from the command map.
     * @param command - The name of the command.
     * @returns The DebugUI instance for chaining.
     */
    public removeCommand(command: string): this {
        delete this.commandMap[command];
        return this;
    }
    /** Prints the command map to the console.*/
    protected addDefaultCommands() {
        this.addCommand('help', this.showHelp.bind(this), { description: '&C6Shows this help', usage: 'help' });
        this.addCommand('exit', () => process.exit(), { description: '&C6Exits the process', usage: 'exit' });
    }
    protected showHelp() {
		this.out.info('&C(255,180,220)╭─────────────────────────────────────────────');
        this.out.info('&C(255,180,220)│ &C1Vortez &C3Debugger &C1by NetFeez');
        this.out.info('&C(255,180,220)│ &C1Commands:');
        for (const index in this.commandMap) {
            const command = this.commandMap[index];
            this.out.info(`&C(255,180,220)│   > &C3${command.name}`);
            this.out.info(`&C(255,180,220)│     - &C(255,255,255)Usage: &C6${command.usage ?? ''}`);
            this.out.info(`&C(255,180,220)│     - &C(255,255,255)${command.description ?? ''}`);
        }
        this.out.info('&C(255,180,220)╰─────────────────────────────────────────────');
    }
}
export namespace DebugUI {
    export type dataHandler = (data: Buffer) => void;
    export type commandExec = (this: DebugUI, command: string, args: string[]) => Promise<void> | void;
    export interface CommandInfo {
        description?: string;
        usage?: string;
    }
    export interface Command extends CommandInfo {
        name: string;
        exec: commandExec;
    }
    export interface CommandMap {
        [command: string]: Command;
    }
}
export default DebugUI;