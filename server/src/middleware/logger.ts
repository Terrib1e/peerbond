import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  logger.http(`${req.method} ${req.url} - ${req.ip}`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ${req.ip}`
    );
    
    // Call original end method and return this
    originalEnd.call(this, chunk, encoding);
    return this;
  };
  
  next();
};