import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err?.code === 'LIMIT_FILE_SIZE' || err?.message?.includes('File too large')) {
    return res.status(400).json({ error: 'Image is too large. Maximum allowed size is 5 MB.' });
  }

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
