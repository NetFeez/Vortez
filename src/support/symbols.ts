//
// ========== Rule Symbols ==========
//

export const RULE_BASE = Symbol('RULE_BASE');
export const RULE_HTTP = Symbol('RULE_HTTP');
export const RULE_ROUTER = Symbol('RULE_ROUTER');
export const RULE_WEBSOCKET = Symbol('RULE_WEBSOCKET');

export const RULE: {
    BASE: typeof RULE_BASE;
    HTTP: typeof RULE_HTTP;
    ROUTER: typeof RULE_ROUTER;
    WEBSOCKET: typeof RULE_WEBSOCKET;
} = {
    BASE: RULE_BASE,
    HTTP: RULE_HTTP,
    ROUTER: RULE_ROUTER,
    WEBSOCKET: RULE_WEBSOCKET,
}

//
// ========== Middleware Symbols ==========
//

export const MIDDLEWARE_BASE = Symbol('MW_BASE');
export const MIDDLEWARE_HTTP = Symbol('MW_HTTP');
export const MIDDLEWARE_WEBSOCKET = Symbol('MW_WEBSOCKET');
export const MIDDLEWARE_HTTP_ERROR = Symbol('MW_HTTP_ERROR');
export const MIDDLEWARE_WEBSOCKET_ERROR = Symbol('MW_WEBSOCKET_ERROR');

export const MIDDLEWARE: {
    BASE: typeof MIDDLEWARE_BASE;
    HTTP: typeof MIDDLEWARE_HTTP;
    WEBSOCKET: typeof MIDDLEWARE_WEBSOCKET;
    HTTP_ERROR: typeof MIDDLEWARE_HTTP_ERROR;
    WEBSOCKET_ERROR: typeof MIDDLEWARE_WEBSOCKET_ERROR;
} = {
    BASE: MIDDLEWARE_BASE,
    HTTP: MIDDLEWARE_HTTP,
    WEBSOCKET: MIDDLEWARE_WEBSOCKET,
    HTTP_ERROR: MIDDLEWARE_HTTP_ERROR,
    WEBSOCKET_ERROR: MIDDLEWARE_WEBSOCKET_ERROR,
}

//
// ========== Client Symbols ==========
//

export const CLIENT_HTTP = Symbol('CLIENT_HTTP');
export const CLIENT_WEBSOCKET = Symbol('CLIENT_WEBSOCKET');

export const CLIENT: {
    HTTP: typeof CLIENT_HTTP;
    WEBSOCKET: typeof CLIENT_WEBSOCKET;
} = {
    HTTP: CLIENT_HTTP,
    WEBSOCKET: CLIENT_WEBSOCKET,
}