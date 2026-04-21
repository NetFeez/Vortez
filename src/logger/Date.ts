export class Date {
    protected readonly date: globalThis.Date;
    public constructor(date?: string | number | globalThis.Date) {
        this.date = date ? new globalThis.Date(date) : new globalThis.Date();
    }

    public get milliseconds(): string { return Date.pad(this.date.getMilliseconds(), 3); }
    public get seconds(): string { return Date.pad(this.date.getSeconds()); }
    public get minutes(): string { return Date.pad(this.date.getMinutes()); }
    public get hours(): string { return Date.pad(this.date.getHours()); }
    public get day(): string { return Date.pad(this.date.getDate()); }
    public get month(): string { return Date.pad(this.date.getMonth() + 1); }
    public get year(): string { return this.date.getFullYear().toString(); }
    /**
     * Formats the date according to the provided format string, replacing placeholders with the corresponding date components.
     * Supported placeholders include:
     * | Placeholder | Description               |
     * |-------------|---------------------------|
     * | {YYYY}      | Full year (e.g., 2024)    |
     * | {MM}        | Month (01-12)             |
     * | {DD}        | Day of the month (01-31)  |
     * | {HH}        | Hours (00-23)             |
     * | {mm}        | Minutes (00-59)           |
     * | {ss}        | Seconds (00-59)           |
     * | {ms}        | Milliseconds (000-999)    |
     * @param format - The format string containing placeholders to be replaced with date components.
     * @returns A formatted date string with the placeholders replaced by their corresponding values.
     */
    public format(format: string): string {
        return format
            .replace(/{YYYY}/g, this.year)
            .replace(/{MM}/g, this.month)
            .replace(/{DD}/g, this.day)
            .replace(/{HH}/g, this.hours)
            .replace(/{mm}/g, this.minutes)
            .replace(/{ss}/g, this.seconds)
            .replace(/{ms}/g, this.milliseconds);
    }

    protected static pad(num: number, size: number = 2): string {
        return num.toString().padStart(size, '0');
    }
}
export namespace Date {}
export default Date;