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
                currentIncome: limitCheck.currentIncomeUAH,
                limit: limitCheck.annualLimitUAH,
                percentage: limitCheck.percentage,
                remaining: limitCheck.remainingUAH,
                status: limitCheck.status
            });
            
        } catch (error) {
            console.error('Get limit status error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = ProfileController;