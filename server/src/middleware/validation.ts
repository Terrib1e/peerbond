import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { logger } from '../utils/logger';

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors:', {
        errors: errors.array(),
        url: req.url,
        method: req.method,
        body: req.body,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array().map(error => ({
          field: 'param' in error ? error.param : 'unknown',
          message: error.msg,
          value: 'value' in error ? error.value : 'unknown'
        })),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};