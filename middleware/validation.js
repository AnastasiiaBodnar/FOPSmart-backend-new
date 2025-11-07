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

const createManualTransactionValidation = [
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0')
        .custom((value) => {
            if (value > 10000000) {
                throw new Error('Amount is too large');
            }
            return true;
        }),
    
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 1, max: 500 })
        .withMessage('Description must be between 1 and 500 characters'),
    
    body('transactionDate')
        .notEmpty()
        .withMessage('Transaction date is required')
        .isISO8601()
        .withMessage('Invalid date format')
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            
            if (date > now) {
                throw new Error('Transaction date cannot be in the future');
            }
            
            const threeYearsAgo = new Date();
            threeYearsAgo.setFullYear(now.getFullYear() - 3);
            if (date < threeYearsAgo) {
                throw new Error('Transaction date cannot be more than 3 years ago');
            }
            
            return true;
        }),
    
    body('type')
        .notEmpty()
        .withMessage('Transaction type is required')
        .isIn(['income', 'expense'])
        .withMessage('Type must be "income" or "expense"'),
    
    body('mcc')
        .optional()
        .isInt({ min: 0, max: 9999 })
        .withMessage('Invalid MCC code'),
    
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment must not exceed 500 characters'),
    
    body('accountId')
        .optional()
        .isInt()
        .withMessage('Invalid account ID')
];

const updateManualTransactionValidation = [
    body('amount')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0')
        .custom((value) => {
            if (value > 10000000) {
                throw new Error('Amount is too large');
            }
            return true;
        }),
    
    body('description')
        .optional()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Description must be between 1 and 500 characters'),
    
    body('transactionDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format')
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            
            if (date > now) {
                throw new Error('Transaction date cannot be in the future');
            }
            
            const threeYearsAgo = new Date();
            threeYearsAgo.setFullYear(now.getFullYear() - 3);
            if (date < threeYearsAgo) {
                throw new Error('Transaction date cannot be more than 3 years ago');
            }
            
            return true;
        }),
    
    body('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type must be "income" or "expense"'),
    
    body('mcc')
        .optional()
        .isInt({ min: 0, max: 9999 })
        .withMessage('Invalid MCC code'),
    
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment must not exceed 500 characters')
];

const updateProfileValidation = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Ім\'я повинно містити від 2 до 50 символів'),
    
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Прізвище повинно містити від 2 до 50 символів'),
    
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Будь ласка, введіть коректний email')
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Поточний пароль обов\'язковий'),
    
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Новий пароль повинен містити мінімум 6 символів')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('Новий пароль повинен відрізнятись від поточного');
            }
            return true;
        }),
    
    body('confirmPassword')
        .notEmpty()
        .withMessage('Підтвердження паролю обов\'язкове')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Паролі не співпадають');
            }
            return true;
        })
];

const deleteAccountValidation = [
    body('password')
        .notEmpty()
        .withMessage('Пароль обов\'язковий для видалення акаунту'),
    
    body('confirmation')
        .notEmpty()
        .withMessage('Підтвердження обов\'язкове')
        .equals('DELETE_MY_ACCOUNT')
        .withMessage('Будь ласка, введіть "DELETE_MY_ACCOUNT" для підтвердження')
];

module.exports = {
    registerValidation,
    loginValidation,
    connectMonobankValidation,
    updateFopSettingsValidation,
    createManualTransactionValidation,
    updateManualTransactionValidation,
    updateProfileValidation,
    changePasswordValidation,
    deleteAccountValidation
};