"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMiddleware = void 0;
const hasNoSqlChars = (value) => {
    if (typeof value === 'string') {
        return value.startsWith('$');
    }
    return false;
};
const sanitizeValue = (value) => {
    if (typeof value === 'string') {
        // Basic XSS escaping for common HTML tags
        return value
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    if (Array.isArray(value)) {
        return value.map(item => sanitizeValue(item));
    }
    if (value !== null && typeof value === 'object') {
        const sanitizedObj = {};
        for (const [k, v] of Object.entries(value)) {
            // Prevent NoSQL injection by dropping keys that start with '$'
            if (k.startsWith('$')) {
                continue;
            }
            sanitizedObj[k] = sanitizeValue(v);
        }
        return sanitizedObj;
    }
    return value;
};
const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }
    if (req.params) {
        req.params = sanitizeValue(req.params);
    }
    next();
};
exports.sanitizeMiddleware = sanitizeMiddleware;
