/**
 * @author NetFeez <codefeez.dev@gmail.com>.
 * @description Adds a class that manages events.
 * @module vortez
 * @license Apache-2.0
 */
export class Events<EventMap extends Events.EventMap = Events.EventMap> {
    private listeners: Events.ListenerList<EventMap> = {};
    private onceListeners: Events.ListenerList<EventMap> = {};
    public get EventMap(): EventMap { return {} as any; }
    /**
     * Adds an event to the EventManager.
     * @param name The name of the event.
     * @param listener The callback that will be executed.
     */
    public on<E extends string & keyof EventMap>(name: E, listener: Events.Listener<EventMap[E]>): void {
        const listeners = this.listeners[name] ?? new Set();
        listeners.add(listener);
        this.listeners[name] = listeners;
    }
    /**
     * Adds an once event to the EventManager.
     * @param name The name of the event.     * @param callback The callback that will be executed.
     */
    public once<E extends string & keyof EventMap>(name: E, listener: Events.Listener<EventMap[E]>): void {
        const listeners = this.onceListeners[name] ?? new Set();
        listeners.add(listener);
        this.onceListeners[name] = listeners;
    }
    /**
     * Removes an event from the EventManager.
     * @param name The name of the event to remove.
     * @param listener The callback of the event to remove.
     */
    public off<E extends string & keyof EventMap>(name: E, listener: Events.Listener<EventMap[E]>): void {
        const list = this.listeners[name];
        if (!list) return;
    
        list.delete(listener);
        if (list.size === 0) delete this.listeners[name];
    }
    /**
     * Removes an once event from the EventManager.
     * @param name The name of the event to remove.
     * @param listener The callback of the event to remove.
     */
    public offOnce<E extends string & keyof EventMap>(name: E, listener: Events.Listener<EventMap[E]>): void {
        const list = this.onceListeners[name];
        if (!list) return;
    
        list.delete(listener);
        if (list.size === 0) delete this.onceListeners[name];
    }
    /**
     * Removes all listeners from an event.
     * @param name The name of the event from which the callbacks will be removed.
     */
    public offAll(name: string): void {
        delete this.listeners[name];
    }
    /**
     * Removes all listeners from an once event.
     * @param name The name of the event from which the callbacks will be removed.
     */
    public offAllOnce(name: string): void {
        delete this.onceListeners[name];
    }
    /**
     * Executes an event.
     * @param name The name of the event to execute.
     * @param args The arguments that will be passed to the callbacks.
     */
    protected emit<E extends string & keyof EventMap>(...event: [name: E, ...args: EventMap[E]]): void {
        const [name, ...args] = event;
        const persistent = this.listeners[name]
            ? Array.from(this.listeners[name]!)
            : undefined;
        const once = this.onceListeners[name];
        if (once) delete this.onceListeners[name];
        if (persistent) for (const listener of persistent) {
            listener(...args);
        }
        if (once) for (const listener of once) {
            listener(...args);
        }
    }
    /**
     * Returns the number of callbacks of an event.
     * @param name The name of the event.
     * @returns The number of callbacks of the event.
     */
    public eventCount(name: string): number {
        const listenerCount = this.listeners[name]?.size ?? 0;
        const onceCount     = this.onceListeners[name]?.size ?? 0;
        return listenerCount + onceCount;
    }
}
export class PublicEmitter<EventMap extends Events.EventMap = Events.EventMap> extends Events<EventMap> {
    public override emit<E extends string & keyof EventMap>(...event: [name: E, ...args: EventMap[E]]): void {
        super.emit(...event);
    }
    /**
     * Returns the emitter itself, allowing to emit events from outside the class.
     * @returns The emitter itself.
     */
    public get emitter(): Events<EventMap> { return this; }
}
export namespace PublicEmitter {}
export namespace Events {
    export import Emitter = PublicEmitter;

    export type Listener<T extends any[]> = (...args: T) => void;
    export type ListenerList<eventMap extends EventMap> = {
        [name in keyof eventMap]?: Set<
            Listener<eventMap[name]>
        >;
    }
    export interface EventMap {
        [name: string]: [...args: any[]];
    }
}
export default Events;