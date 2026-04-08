import { Schema, Flatten } from "../../utilities/Utilities.js";
import _Loader from "./Loader.js";

export const SCHEMA_LOGGER = new Schema({
    show: { type: 'boolean', default: true },
    save: { type: 'boolean', default: true }
});

export const SCHEMA_HANDLER = new Schema({
    host: { type: 'string', default: 'localhost' },
    port: { type: 'number', default: 80, minimum: 0, maximum: 65535 },
    ssl: { type: 'object', nullable: true, default: null, schema: {
            pubKey: { type: 'string', required: true },
            privKey: { type: 'string', required: true },
            port: { type: 'number', default: 443, minimum: 0, maximum: 65535 }
        }
    },
    templates: { type: 'object', default: {
            folder: './global/Template/Folder.vhtml',
            error: './global/Template/Error.vhtml'
        }, schema: {
            folder: { type: 'string', default: './global/Template/Folder.vhtml' },
            error: { type: 'string', default: './global/Template/Error.vhtml' }
        }
    },
    logger: { type: 'object', default: {
        showAll: false,
        server: { show: true, save: true },
        request: { show: true, save: true },
        response: { show: true, save: true },
        websocket: { show: true, save: true }
    }, schema: {
        showAll: { type: 'boolean', default: false },
        server: { type: 'object', default: {}, schema: SCHEMA_LOGGER.schema },
        request: { type: 'object', default: {}, schema: SCHEMA_LOGGER.schema },
        response: { type: 'object', default: {}, schema: SCHEMA_LOGGER.schema },
        websocket: { type: 'object', default: {}, schema: SCHEMA_LOGGER.schema }
    } },
    routing: { type: 'object', default: {
        algorithm: 'FIFO'
    }, schema: {
        algorithm: { type: 'string', enum: ['FIFO', 'Tree'], default: 'FIFO' }
    } }
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
        this.props[path] = value;
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