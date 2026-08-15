export class TrackerError extends Error {
    public constructor(message: string, options: ErrorOptions = {}) {
        super(message, options);
        this.name = 'TrackerError';
    }
}

export namespace TrackerError {}

export default TrackerError;
