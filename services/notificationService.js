'use strict';

const Notification = require('../models/Notification');
const PushNotificationService = require('./pushNotificationService');

class NotificationService {

    static async create(data, sendPush = true) {
        const { userId, type, title, message, notificationData } = data;

        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            data: notificationData || {},
            sentVia: ['in_app']
        });

        let pushResult = null;

        if (sendPush) {
            try {
                pushResult = await PushNotificationService.sendToUser(userId, {
                    title,
                    message,
                    type,
                    data: notificationData
                });

                if (pushResult.success) {
              
                    await this.updateSentVia(notification.id, ['in_app', 'push']);
                }
            } catch (error) {
                console.error('[NotificationService] Failed to send push:', error);
    
            }
        }

        return {
            notification,
            pushSent: pushResult?.success || false,
            pushSentCount: pushResult?.sentCount || 0
        };
    }

    static async sendLimitWarning(userId, limitCheck) {
        const { status, percentage, currentIncomeUAH, annualLimitUAH, remainingUAH } = limitCheck;

        let type, title, message;

        if (status === 'warning') {
            type = 'limit_warning';
            title = ' Попередження про ліміт';
            message = `Ви використали ${percentage}% річного ліміту ФОП. Залишилось ${(remainingUAH / 100).toLocaleString('uk-UA')} грн.`;
        } else if (status === 'critical') {
            type = 'limit_critical';
            title = ' Критичний стан ліміту';
            message = `УВАГА! Використано ${percentage}% ліміту. Залишилось лише ${(remainingUAH / 100).toLocaleString('uk-UA')} грн!`;
        } else if (status === 'exceeded') {
            type = 'limit_exceeded';
            title = ' ЛІМІТ ПЕРЕВИЩЕНО';
            message = `Ви перевищили річний ліміт ФОП на ${Math.abs(remainingUAH / 100).toLocaleString('uk-UA')} грн!`;
        } else {
            return null; 
        }

        return await this.create({
            userId,
            type,
            title,
            message,
            notificationData: {
                percentage: percentage.toString(),
                currentIncome: (currentIncomeUAH / 100).toString(),
                limit: (annualLimitUAH / 100).toString(),
                remaining: (remainingUAH / 100).toString(),
                status
            }
        }, true);
    }

    static async sendSyncComplete(userId, transactionCount, sendPush = false) {
        return await this.create({
            userId,
            type: 'sync_complete',
            title: ' Синхронізація завершена',
            message: `Оброблено ${transactionCount} нових транзакцій з Monobank`,
            notificationData: {
                transactionCount: transactionCount.toString()
            }
        }, sendPush);
    }

    static async sendCustom(userId, title, message, data = {}, sendPush = true) {
        return await this.create({
            userId,
            type: 'custom',
            title,
            message,
            notificationData: data
        }, sendPush);
    }

    static async updateSentVia(notificationId, sentVia) {
        const db = require('../db/pool');
        await db.query(
            'UPDATE notifications SET sent_via = $1 WHERE id = $2',
            [sentVia, notificationId]
        );
    }

    static async getUserNotifications(userId, options = {}) {
        const notifications = await Notification.findByUserId(userId, options);
        const unreadCount = await Notification.getUnreadCount(userId);

        return {
            notifications,
            unreadCount,
            total: notifications.length
        };
    }

    static async markAsRead(notificationId, userId) {
        return await Notification.markAsRead(notificationId, userId);
    }

    static async markAllAsRead(userId) {
        return await Notification.markAllAsRead(userId);
    }

    static async deleteNotification(notificationId, userId) {
        return await Notification.delete(notificationId, userId);
    }
}

module.exports = NotificationService;