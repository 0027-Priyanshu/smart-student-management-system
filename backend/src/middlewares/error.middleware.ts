import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error using Winston logger
  logger.error(`${status} - ${message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  return res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
