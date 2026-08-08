"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
function validate(schema) {
    return async (req, res, next) => {
        try {
            if (schema.body) {
                req.body = await schema.body.parseAsync(req.body);
            }
            if (schema.query) {
                req.query = (await schema.query.parseAsync(req.query));
            }
            if (schema.params) {
                req.params = (await schema.params.parseAsync(req.params));
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                logger_1.logger.warn(`❌ Validation failure on ${req.method} ${req.originalUrl}: ${JSON.stringify(details)}`);
                return res.status(400).json({
                    error: 'Validation Error',
                    details,
                });
            }
            next(error);
        }
    };
}
