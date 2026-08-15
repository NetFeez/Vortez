/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Request execution tracker for Vortez routing and middleware pipeline.
 * @license Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import LoggerManager from '../LoggerManager.js';
import type Request from '../Request.js';
import type Response from '../Response.js';
import type ws from '../websocket/ws.js';
import type Rule from './rule/Rule.js';
import _TrackerError from './TrackerError.js';

const logger = LoggerManager.getInstance();

export class Tracker {
    public readonly id: string;
    public readonly startTime: number;

    private vStatus: Tracker.Status = 'initialized';
    private vRule: Rule<any> | null = null;
    private vError: unknown | null = null;

    /** Tracks next() invocation status per depth index in the middleware pipeline */
    private nextCalls: Map<number, Tracker.NextState> = new Map();

    /** Recorded execution metrics for middlewares */
    private vMiddlewareStack: Tracker.MiddlewareRecord[] = [];

    public constructor(
        public readonly request: Request,
        public readonly client: Response | ws.Server
    ) {
        this.id = randomUUID();
        this.startTime = performance.now();
    }

    /** Current execution status of the request lifecycle */
    public get status(): Tracker.Status { return this.vStatus; }

    /** The matching rule resolved for this request, if any */
    public get rule(): Rule<any> | null { return this.vRule; }
    public set rule(rule: Rule<any> | null) {
        if (rule) this.vStatus = 'routed';
        this.vRule = rule;
    }

    /** Captured error if an exception occurred during pipeline execution */
    public get error(): unknown | null { return this.vError; }

    /** Recorded execution timing stack for middlewares */
    public get middlewareStack(): Tracker.MiddlewareRecord[] { return [...this.vMiddlewareStack]; }

    /** Total execution duration in milliseconds */
    public get duration(): number { return performance.now() - this.startTime; }

    /** Marks the request execution stage as middleware execution */
    public markExecuting(): void { if (this.vStatus !== 'failed') this.vStatus = 'executing'; }

    /** Marks the response as sent to the client */
    public markSent(): void { if (this.vStatus !== 'failed') this.vStatus = 'sent'; }

    /** Marks the request execution as successfully completed */
    public complete(): void { if (this.vStatus !== 'failed') this.vStatus = 'completed'; }

    /** Marks the request execution as failed with an error */
    public fail(error: unknown): void {
        this.vStatus = 'failed';
        this.vError = error;
    }

    /**
     * Registers a next() invocation at a given depth in the middleware pipeline.
     * Throws a TrackerError if next() has already been called at this depth.
     * 
     * @param depth - Current index in the middleware pipeline.
     * @param name - Identifier/name of the middleware calling next().
     */
    public beginNext(depth: number, name: string): void {
        const state = this.nextCalls.get(depth);
        if (state?.called) {
            const error = new _TrackerError(`[Tracker Error] Double next() execution detected in middleware "${name}" (depth: ${depth})`);
            logger.error(error);
            throw error;
        }

        this.nextCalls.set(depth, {
            name,
            called: true,
            completed: false,
            startTime: performance.now(),
        });
    }

    /**
     * Marks the downstream next() promise as completed for a given depth.
     * 
     * @param depth - Current index in the middleware pipeline.
     */
    public endNext(depth: number): void {
        const state = this.nextCalls.get(depth);
        if (!state) return;
        state.completed = true;
        const duration = performance.now() - state.startTime;
        this.vMiddlewareStack.push({ name: state.name, depth, duration, });
    }

    /**
     * Inspects whether next() was properly awaited by the calling middleware.
     * If the middleware function finishes before next() completes downstream, logs a warning and throws a TrackerError.
     * 
     * @param depth - Current index in the middleware pipeline.
     * @param middlewareName - Identifier of the middleware.
     * @param isNextResolved - Whether next() promise has resolved when middleware function finished.
     */
    public verifyAwait(depth: number, middlewareName: string, isNextResolved: boolean): void {
        const state = this.nextCalls.get(depth);
        if (state && state.called && !isNextResolved && !state.completed) {
            const message = `[Tracker Warning] Middleware "${middlewareName}" (depth ${depth}) did not await next(). Floating promise execution detected.`;
            logger.warn(message);
            throw new _TrackerError(message);
        }
    }
}

export namespace Tracker {
    export import TrackerError = _TrackerError;

    export type Status = 'initialized' | 'routed' | 'executing' | 'sent' | 'completed' | 'failed';

    export interface NextState {
        name: string;
        called: boolean;
        completed: boolean;
        startTime: number;
    }

    export interface MiddlewareRecord {
        name: string;
        depth: number;
        duration: number;
    }
}

export default Tracker;