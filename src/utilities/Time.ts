/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides time-related utilities, such as sleep functions for delaying execution.
 * @license Apache-2.0
 */
export class Time {
    /**
     * Converts a timestamp in milliseconds to seconds.
     * @param timestamp - The timestamp in milliseconds to convert.
     * @returns The equivalent timestamp in seconds.
     */
    public static timestampToSecond(timestamp: number): number {
        return Math.floor(timestamp / 1000);
    }
    /**
     * Pauses execution for a specified duration.
     * @param ms - The number of milliseconds to sleep.
     * @returns A promise that resolves after the given time.
     */
    public static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export namespace Time {}
export default Time;