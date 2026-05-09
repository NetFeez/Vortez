import { Schema, Flatten } from "@netfeez/common";
import { Path } from "@netfeez/common-node";

import _Loader from "./Loader.js";

export const DEFAULT_FOLDER_TEMPLATE = Path.module('global/template/folder.vhtml');
export const DEFAULT_ERROR_TEMPLATE = Path.module('global/template/error.vhtml');

export const SCHEMA_LOGGER_PROP = new Schema({ type: 'object', properties: {
    show: { type: 'boolean', default: true },
    save: { type: 'boolean', default: true }
}});

export const SCHEMA_LOGGER = new Schema({ type: 'object', properties: {
    showAll: { type: 'boolean', default: false },
    server: SCHEMA_LOGGER_PROP.root,
    request: SCHEMA_LOGGER_PROP.root,
    response: SCHEMA_LOGGER_PROP.root,
    websocket: SCHEMA_LOGGER_PROP.root
}});

export const SCHEMA_SSL = new Schema({ type: 'object', properties: {
    cert: { type: 'string', required: true },
    key: { type: 'string', required: true },
    port: { type: 'number', default: 443, minimum: 0, maximum: 65535 }
}});

export const SCHEMA_TEMPLATES = new Schema({ type: 'object', properties: {
    folder: { type: 'string', default: DEFAULT_FOLDER_TEMPLATE },
    error: { type: 'string', default: DEFAULT_ERROR_TEMPLATE }
}});

export const SCHEMA_ROUTING = new Schema({ type: 'object', properties: {
    algorithm: { type: 'string', enum: ['FIFO', 'Tree'], default: 'FIFO' }
}});

export const SCHEMA_HANDLER = Schema.fromObject({
    host: { type: 'string', default: 'localhost' },
    port: { type: 'number', default: 80, minimum: 0, maximum: 65535 },
    ssl: SCHEMA_SSL.root,
    routing: SCHEMA_ROUTING.root,
    templates: SCHEMA_TEMPLATES.root,
    logger: SCHEMA_LOGGER.root
});

export type SCHEMA_HANDLER = typeof SCHEMA_HANDLER;

export class Config {
    public data: Config.data;
    protected props: Config.props;
    public constructor(data: Config.toProcess) {
        this.data = SCHEMA_HANDLER.processData(data);
        this.props = Flatten.object(this.data);
    }

    /**
     * Gets a config property by its path.
     * @param path - The path to the config property.
     * @returns The value of the config property at the specified path.
     */
    public get<T extends keyof Config.props>(path: T): Config.props[T] {
        return this.props[path];
    }
    public set<T extends keyof Config.props>(path: T, value: Config.props[T]): void {
        this.props[path] = value;
        this.data = Flatten.unObject(this.props);
    }
    /**
     * Saves the config to the specified path.
     * @param path - The path to save the config file to.
     * @returns A promise that resolves when the config is saved.
     */
    public save(path: string): Promise<void> {
        this.data = Flatten.unObject(this.props);
        return Config.Loader.save(path, this);
    }

    /** Converts the config to a JSON string. */
    public toJson(): string { return JSON.stringify(this.data, null, 4); }
}
export namespace Config {
    export import Loader = _Loader;

    export type toProcess = typeof SCHEMA_HANDLER.inferToProcess;
    export type data = typeof SCHEMA_HANDLER.infer;
    export type props = Flatten.Object<Config.data>;
}
export default Config;