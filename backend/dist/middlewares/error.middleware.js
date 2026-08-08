"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Log error using Winston logger
    logger_1.logger.error(`${status} - ${message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    if (err.stack) {
        logger_1.logger.error(err.stack);
    }
    return res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
