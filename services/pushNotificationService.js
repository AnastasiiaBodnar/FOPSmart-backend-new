'use strict';

const admin = require('firebase-admin');
const config = require('../config');
const PushToken = require('../models/PushToken');

let firebaseApp = null;

function initializeFirebase() {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        if (config.firebase.serviceAccountPath) {
            const serviceAccount = require(config.firebase.serviceAccountPath);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        else if (config.firebase.serviceAccountJson) {
            const serviceAccount = JSON.parse(config.firebase.serviceAccountJson);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        else {
            throw new Error('Firebase configuration not found');
        }

        console.log('[FCM] Firebase Admin SDK initialized successfully');
        return firebaseApp;
    } catch (error) {
        console.error('[FCM] Failed to initialize Firebase:', error.message);
        throw error;
    }
}

class PushNotificationService {

    static async sendToUser(userId, notification) {
        try {
            initializeFirebase();

            const tokens = await PushToken.findByUserId(userId);
            
            if (!tokens || tokens.length === 0) {
                console.log(`[FCM] No active push tokens for user ${userId}`);
                return {
                    success: false,
                    reason: 'no_tokens',
                    sentCount: 0
                };
            }

            const fcmTokens = tokens.map(t => t.fcm_token);
            const result = await this.sendMulticast(fcmTokens, notification);

            return {
                success: result.successCount > 0,
                sentCount: result.successCount,
                failedCount: result.failureCount,
                tokens: tokens.length
            };

        } catch (error) {
            console.error('[FCM] Error sending notification:', error);
            throw error;
        }
    }


    static async sendMulticast(tokens, notification) {
        const message = {
            notification: {
                title: notification.title,
                body: notification.message
            },
            data: {
                type: notification.type,
                ...(notification.data || {})
            },
            tokens: tokens
        };

        message.android = {
            priority: 'high',
            notification: {
                channelId: 'fop_limits',
                sound: 'default',
                color: notification.type.includes('exceeded') ? '#DC2626' :
                       notification.type.includes('critical') ? '#F59E0B' : '#10B981'
            }
        };

        message.webpush = {
            notification: {
                icon: '/icon-192.png',
                badge: '/badge-72.png',
                requireInteraction: notification.type.includes('exceeded') || notification.type.includes('critical')
            }
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);

            console.log(`[FCM] Sent ${response.successCount}/${tokens.length} notifications`);

            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`[FCM] Failed to send to token ${idx}:`, resp.error);
                        
                        if (resp.error.code === 'messaging/invalid-registration-token' ||
                            resp.error.code === 'messaging/registration-token-not-registered') {
                            failedTokens.push(tokens[idx]);
                        }
                    }
                });

                // TODO: Clean up invalid tokens from database
                // await this.cleanupInvalidTokens(failedTokens);
            }

            return {
                successCount: response.successCount,
                failureCount: response.failureCount
            };

        } catch (error) {
            console.error('[FCM] Error sending multicast:', error);
            throw error;
        }
    }

    static async sendLimitWarning(userId, limitData) {
        const { alertType, percentage, currentIncome, limit, remaining } = limitData;

        let title, message, type;

        if (alertType === 'warning') {
            title = ' Попередження про ліміт';
            message = `Ви використали ${percentage}% річного ліміту. Залишилось ${remaining.toLocaleString('uk-UA')} грн.`;
            type = 'limit_warning';
        } else if (alertType === 'critical') {
            title = ' Критичний стан ліміту';
            message = `УВАГА! Використано ${percentage}% ліміту. Залишилось лише ${remaining.toLocaleString('uk-UA')} грн!`;
            type = 'limit_critical';
        } else if (alertType === 'exceeded') {
            title = ' ЛІМІТ ПЕРЕВИЩЕНО';
            message = `Ви перевищили річний ліміт на ${Math.abs(remaining).toLocaleString('uk-UA')} грн!`;
            type = 'limit_exceeded';
        }

        return await this.sendToUser(userId, {
            title,
            message,
            type,
            data: {
                percentage: percentage.toString(),
                currentIncome: currentIncome.toString(),
                limit: limit.toString(),
                remaining: remaining.toString()
            }
        });
    }

    static async sendSyncComplete(userId, transactionCount) {
        return await this.sendToUser(userId, {
            title: ' Синхронізація завершена',
            message: `Оброблено ${transactionCount} нових транзакцій`,
            type: 'sync_complete',
            data: {
                transactionCount: transactionCount.toString()
            }
        });
    }

    static async sendTestNotification(token) {
        initializeFirebase();

        const message = {
            notification: {
                title: ' Test Notification',
                body: 'FOPSmart push notifications working!'
            },
            data: {
                type: 'test'
            },
            token: token
        };

        const messageId = await admin.messaging().send(message);
        console.log('[FCM] Test notification sent:', messageId);
        return messageId;
    }

    static async validateToken(token) {
        try {
            initializeFirebase();
            const message = {
                data: { test: 'validation' },
                token: token,
                dryRun: true 
            };
            await admin.messaging().send(message);
            return true;
        } catch (error) {
            console.error('[FCM] Token validation failed:', error.code);
            return false;
        }
    }
}

module.exports = PushNotificationService;