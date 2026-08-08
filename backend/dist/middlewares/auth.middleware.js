"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
exports.requireRole = requireRole;
const token_1 = require("../utils/token");
function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (req.query.token) {
        token = req.query.token;
    }
    if (token) {
        const payload = (0, token_1.verifyAccessToken)(token);
        if (payload) {
            req.user = payload;
            return next();
        }
    }
    return res.status(401).json({ error: 'Unauthorized. Access token missing or expired.' });
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ error: `Forbidden. Requires one of the following roles: ${allowedRoles.join(', ')}` });
        }
        next();
    };
}
