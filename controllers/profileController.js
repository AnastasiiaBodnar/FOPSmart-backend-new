'use strict';

const { validationResult } = require('express-validator');
const User = require('../models/User');
const LimitService = require('../services/limitService');
const { getLimitByGroup } = require('../config/fopLimits');

class ProfileController {
    
    static async getFopInfo(req, res) {
        try {
            const userId = req.user.id;
            
            const fopInfo = await User.getFopInfo(userId);
            
            if (!fopInfo || !fopInfo.fop_group) {
                return res.json({
                    configured: false,
                    message: 'FOP settings not configured'
                });
            }
            
            const limitInfo = getLimitByGroup(fopInfo.fop_group);
            
            res.json({
                configured: true,
                fopGroup: fopInfo.fop_group,
                taxSystem: fopInfo.tax_system,
                limit: {
                    annual: limitInfo.annualLimitUAH,
                    description: limitInfo.description,
                    taxRate: limitInfo.taxRate
                }
            });
            
        } catch (error) {
            console.error('Get FOP info error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async updateFopSettings(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const userId = req.user.id;
            const { fopGroup, taxSystem } = req.body;
            
            if (!fopGroup || ![1, 2, 3].includes(fopGroup)) {
                return res.status(400).json({
                    message: 'Invalid FOP group. Must be 1, 2, or 3'
                });
            }
            
            const updated = await User.updateFopSettings(userId, fopGroup, taxSystem || 'single_tax');
            
            const limitInfo = getLimitByGroup(updated.fop_group);
            
            res.json({
                message: 'FOP settings updated successfully',
                fopGroup: updated.fop_group,
                taxSystem: updated.tax_system,
                limit: {
                    annual: limitInfo.annualLimitUAH,
                    description: limitInfo.description
                }
            });
            
        } catch (error) {
            console.error('Update FOP settings error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getLimitStatus(req, res) {
        try {
            const userId = req.user.id;
            const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
            
            const limitCheck = await LimitService.checkUserLimit(userId, year);
            
            if (!limitCheck.hasLimit) {
                return res.json({
                    configured: false,
                    message: limitCheck.message
                });
            }
            
            res.json({
                configured: true,
                year: limitCheck.year,
                fopGroup: limitCheck.fopGroup,
                currentIncome: (limitCheck.currentIncomeUAH / 100).toFixed(2), 
                limit: (limitCheck.annualLimitUAH / 100).toFixed(2),           
                percentage: limitCheck.percentage,
                remaining: (limitCheck.remainingUAH / 100).toFixed(2),         
                status: limitCheck.status
            });
            
        } catch (error) {
            console.error('Get limit status error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            const fopInfo = await User.getFopInfo(userId);
            
            res.json({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                fopGroup: fopInfo?.fop_group || null,
                taxSystem: fopInfo?.tax_system || null,
                createdAt: user.created_at,
                isActive: user.is_active
            });
            
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }

    static async updateProfile(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Помилка валідації',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { firstName, lastName, email } = req.body;

            if (email) {
                const emailExists = await User.checkEmailExists(email, userId);
                if (emailExists) {
                    return res.status(409).json({
                        message: 'Користувач з таким email вже існує'
                    });
                }
            }

            const updated = await User.updateProfile(userId, {
                firstName,
                lastName,
                email
            });

            res.json({
                message: 'Профіль успішно оновлено',
                user: {
                    id: updated.id,
                    email: updated.email,
                    firstName: updated.first_name,
                    lastName: updated.last_name
                }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ message: 'Внутрішня помилка сервера' });
        }
    }

    static async changePassword(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Помилка валідації',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;

            const user = await User.findByEmail(req.user.email);
            if (!user) {
                return res.status(404).json({
                    message: 'Користувача не знайдено'
                });
            }

            const isValidPassword = await User.validatePassword(currentPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    message: 'Невірний поточний пароль'
                });
            }

            await User.updatePassword(userId, newPassword);

            res.json({
                message: 'Пароль успішно змінено'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ message: 'Внутрішня помилка сервера' });
        }
    }

    static async deleteAccount(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Помилка валідації',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { password } = req.body;

            const user = await User.findByEmail(req.user.email);
            if (!user) {
                return res.status(404).json({
                    message: 'Користувача не знайдено'
                });
            }

            const isValidPassword = await User.validatePassword(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    message: 'Невірний пароль'
                });
            }

            await User.deactivate(userId);

            res.json({
                message: 'Акаунт успішно видалено'
            });

        } catch (error) {
            console.error('Delete account error:', error);
            res.status(500).json({ message: 'Внутрішня помилка сервера' });
        }
    }
}

module.exports = ProfileController;