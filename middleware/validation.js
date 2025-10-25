'use strict';

const { body } = require('express-validator');

const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const connectMonobankValidation = [
    body('token')
        .trim()
        .notEmpty()
        .withMessage('Monobank token is required')
        .isLength({ min: 20 })
        .withMessage('Invalid token format')
];

const updateFopSettingsValidation = [
    body('fopGroup')
        .isInt({ min: 1, max: 3 })
        .withMessage('FOP group must be 1, 2, or 3'),
    
    body('taxSystem')
        .optional()
        .isIn(['single_tax', 'general', 'simplified'])
        .withMessage('Invalid tax system')
];

module.exports = {
    registerValidation,
    loginValidation,
    connectMonobankValidation,
    updateFopSettingsValidation
};