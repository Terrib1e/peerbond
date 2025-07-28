import { ToolMiddleware } from '../types';

export interface ValidationOptions {
  validatePHI?: boolean;
  validateProfanity?: boolean;
  customValidators?: Array<(args: any) => Promise<{ valid: boolean; error?: string }>>;
}

// Simple PHI detection patterns (in production, use a proper library)
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone
  /\b\d{16}\b/, // Credit card
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Date of birth
];

// Simple profanity list (in production, use a proper library)
const PROFANITY_LIST = ['badword1', 'badword2']; // Replace with actual list

export function createValidationMiddleware(options: ValidationOptions = {}): ToolMiddleware {
  const {
    validatePHI = true,
    validateProfanity = true,
    customValidators = []
  } = options;

  return async (_tool, args, _context, next) => {
    const argString = JSON.stringify(args);

    // PHI validation
    if (validatePHI) {
      for (const pattern of PHI_PATTERNS) {
        if (pattern.test(argString)) {
          return {
            success: false,
            error: 'Potential PHI detected in tool arguments. Please remove sensitive information.'
          };
        }
      }
    }

    // Profanity validation
    if (validateProfanity) {
      const lowerArgString = argString.toLowerCase();
      for (const word of PROFANITY_LIST) {
        if (lowerArgString.includes(word)) {
          return {
            success: false,
            error: 'Inappropriate content detected in tool arguments.'
          };
        }
      }
    }

    // Custom validators
    for (const validator of customValidators) {
      const result = await validator(args);
      if (!result.valid) {
        return {
          success: false,
          error: result.error || 'Validation failed'
        };
      }
    }

    return next();
  };
}