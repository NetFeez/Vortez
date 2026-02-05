/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds a session system to `Vortez`.
 * @license Apache-2.0
 */

// Note: sessions could be stored persistently in the future.
// Note: it's necessary to check the validity of a ss_uuid, because
//   if a 'SS_UUID' cookie exists and its session is not in 'sessions',
//   a new session will be created even if it's not valid.
// Note: a public/private key system should be implemented to prevent
//   users from using someone else's ss_uuid to access their data.

import CRYPTO from 'crypto';
import Cookie from './Cookie.js';

export class Session {
    /** Stores session instances. */
    private static instances: Map<string, Session> = new Map;
    /**
     * Creates or retrieves the current session instance from cookies.
     * @param cookies - The Cookie instance from the request.
     * @returns The current session instance.
     */
    public static get(cookies: Cookie) {
        const id = this.extractID(cookies);
        const session = this.instances.get(id);
        if (session) return session;

        const newSession = new Session(id);
        this.instances.set(id, newSession);
        return newSession;
    }
    private static extractID(cookies: Cookie): string {
        let id = cookies.get('Session');
        if (id) return id;
        do id = CRYPTO.randomUUID();
        while (Session.instances.has(id));
        cookies.set('Session', id, {
            secure: true, httpOnly: true,
            path: '/',
            expires: this.getExpiration()
        });
        return id;
    }
    private static getExpiration(): Date {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date;
    }
    /** Stores the session's SS_UUID. */
    public readonly id: string;
    /** Stores session data. */
    private data: Map<string, any>;
    /**
     * Constructs a session instance with the given ID.
     * @param sessionID - The session's unique ID.
     */
    private constructor(sessionID: string) {
        this.data = new Map();
        this.id = sessionID;
    }
    /**
     * Checks whether a given key exists in the session.
     * @param name - The key to check in the session data.
     * @returns True if the key exists, false otherwise.
     */
    public has(name: string): boolean { return this.data.has(name); }
    /**
     * Retrieves a session value by its key, if it exists.
     * @param name - The key to retrieve from the session.
     * @returns The value associated with the key or undefined.
     */
    public get(name: string): any | undefined { return this.data.get(name); }
    /**
     * Returns a plain object containing all session data.
     * - The returned object is not reactive; changes to it won't affect the session.
     * @returns An object with all session key-value pairs.
     */
    public getAll(): Session.SessionObject {
        const Data: Session.SessionObject = {};
        this.data.forEach((Value, Key) => Data[Key] = Value);
        return Data;
    }
    /**
     * Sets or replaces a session value by key.
     * @param name - The key to set in the session.
     * @param value - The value to assign to the key.
     */
    public set(name: string, value: any): void { this.data.set(name, value); }
    /**
     * Deletes a session value by key, if it exists.
     * @param name - The key to delete from the session.
     */
    public delete(name: string): void { this.data.delete(name); }
}

export namespace Session {
    export interface SessionObject {
        [key: string]: any
    }
}

export default Session;