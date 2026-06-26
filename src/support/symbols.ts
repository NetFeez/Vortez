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

export const MW_BASE = Symbol('MW_BASE');
export const MW_HTTP = Symbol('MW_HTTP');
export const MW_WEBSOCKET = Symbol('MW_WEBSOCKET');

export const MW: {
    BASE: typeof MW_BASE;
    HTTP: typeof MW_HTTP;
    WEBSOCKET: typeof MW_WEBSOCKET;
} = {
    BASE: MW_BASE,
    HTTP: MW_HTTP,
    WEBSOCKET: MW_WEBSOCKET,
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