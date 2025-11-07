'use strict';

const db = require('../db/pool');
const { getLimitByGroup, calculateLimitProgress, getAlertType } = require('../config/fopLimits');

class LimitService {
    
    static async getUserIncomeForYear(userId, year) {
        const query = `
            SELECT total_income 
            FROM income_tracking 
            WHERE user_id = $1 
              AND year = $2 
              AND quarter IS NULL 
              AND month IS NULL
        `;
        
        const result = await db.query(query, [userId, year]);
        return result.rows[0]?.total_income || 0;
    }

    static async getUserFopGroup(userId) {
        const query = `
            SELECT fop_group, tax_system 
            FROM users 
            WHERE id = $1
        `;
        
        const result = await db.query(query, [userId]);
        const user = result.rows[0];
        
        if (!user || !user.fop_group) {
            return null;
        }
        
        return {
            fopGroup: user.fop_group,
            taxSystem: user.tax_system
        };
    }

    static async checkUserLimit(userId, year = new Date().getFullYear()) {
        const fopInfo = await this.getUserFopGroup(userId);
        
        if (!fopInfo) {
            return {
                hasLimit: false,
                message: 'FOP group not set'
            };
        }
        
        const limitInfo = getLimitByGroup(fopInfo.fopGroup);
        const currentIncome = await this.getUserIncomeForYear(userId, year);
        const progress = calculateLimitProgress(currentIncome, limitInfo.annualLimit);
        
        return {
            hasLimit: true,
            fopGroup: fopInfo.fopGroup,
            taxSystem: fopInfo.taxSystem,
            year,
            ...progress
        };
    }

    static async shouldSendAlert(userId, year = new Date().getFullYear()) {
        const limitCheck = await this.checkUserLimit(userId, year);
        
        if (!limitCheck.hasLimit) {
            return { shouldSend: false };
        }
        
        const alertType = getAlertType(limitCheck.percentage);
        
        if (!alertType) {
            return { shouldSend: false };
        }

        const lastAlert = await this.getLastAlert(userId, year, alertType);
        
        if (lastAlert) {
            return { shouldSend: false, reason: 'Alert already sent' };
        }
        
        return {
            shouldSend: true,
            alertType,
            limitCheck
        };
    }

    static async getLastAlert(userId, year, alertType) {
        const query = `
            SELECT * 
            FROM limit_alerts 
            WHERE user_id = $1 
              AND year = $2 
              AND alert_type = $3
            ORDER BY sent_at DESC 
            LIMIT 1
        `;
        
        const result = await db.query(query, [userId, year, alertType]);
        return result.rows[0] || null;
    }

    static async createAlert(userId, alertType, limitCheck) {
        const query = `
            INSERT INTO limit_alerts 
            (user_id, alert_type, threshold_percentage, income_amount, 
             limit_amount, period_type, year, message)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        
        const message = this.generateAlertMessage(alertType, limitCheck);
        
        const values = [
            userId,
            alertType,
            Math.round(limitCheck.percentage),
            limitCheck.currentIncome,
            limitCheck.annualLimit,
            'annual',
            limitCheck.year,
            message
        ];
        
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static generateAlertMessage(alertType, limitCheck) {
        const percentage = Math.round(limitCheck.percentage);
        const remaining = (limitCheck.remainingUAH / 100).toLocaleString('uk-UA');
        
        if (alertType === 'warning') {
            return `Ви використали ${percentage}% річного ліміту. Залишилось ${remaining} грн.`;
        } else if (alertType === 'critical') {
            return `УВАГА! Ви використали ${percentage}% річного ліміту. Залишилось лише ${remaining} грн.`;
        } else if (alertType === 'exceeded') {
            return `ЛІМІТ ПЕРЕВИЩЕНО! Ви перевищили річний ліміт на ${Math.abs(remaining)} грн.`;
        }
        
        return `Стан ліміту: ${percentage}%`;
    }

    static async checkAndNotify(userId, year = new Date().getFullYear()) {
        try {
            const alertCheck = await this.shouldSendAlert(userId, year);
            
            if (!alertCheck.shouldSend) {
                return {
                    notificationSent: false,
                    reason: alertCheck.reason || 'No notification needed'
                };
            }

            await this.createAlert(userId, alertCheck.alertType, alertCheck.limitCheck);

       
            const NotificationService = require('./notificationService');
            const notification = await NotificationService.sendLimitWarning(
                userId, 
                alertCheck.limitCheck
            );

            return {
                notificationSent: true,
                alertType: alertCheck.alertType,
                notification: notification
            };

        } catch (error) {
            console.error('[LimitService] Error in checkAndNotify:', error);
            return {
                notificationSent: false,
                error: error.message
            };
        }
    }
}

module.exports = LimitService;