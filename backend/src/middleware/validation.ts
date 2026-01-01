import { Request, Response, NextFunction } from 'express';
import { query, param, validationResult } from 'express-validator';

/**
 * Validate event query parameters
 */
export const validateEventQuery = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('search')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters'),
    query('organizer')
        .optional()
        .matches(/^0x[a-fA-F0-9]{64}$/)
        .withMessage('Invalid Sui address format'),
    query('is_active')
        .optional()
        .isBoolean()
        .withMessage('is_active must be a boolean'),
    query('upcoming')
        .optional()
        .isBoolean()
        .withMessage('upcoming must be a boolean'),
    handleValidationErrors
];

/**
 * Validate event ID parameter
 */
export const validateEventId = [
    param('id')
        .matches(/^0x[a-fA-F0-9]{64}$/)
        .withMessage('Invalid event ID format (must be a valid Sui object ID)'),
    handleValidationErrors
];

/**
 * Validate organizer address parameter
 */
export const validateAddress = [
    param('address')
        .matches(/^0x[a-fA-F0-9]{64}$/)
        .withMessage('Invalid Sui address format'),
    handleValidationErrors
];

/**
 * Handle validation errors
 */
function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
}

export default {
    validateEventQuery,
    validateEventId,
    validateAddress
};
