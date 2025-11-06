'use strict';

const { validationResult } = require('express-validator');
const NotificationService = require('../services/notificationService');
const PushToken = require('../models/PushToken');
const PushNotificationService = require('../services/pushNotificationService');

class NotificationController {

    static async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const {
                unreadOnly = false,
                limit = 50,
                offset = 0,
                type = null
            } = req.query;

            const result = await NotificationService.getUserNotifications(userId, {
                unreadOnly: unreadOnly === 'true',
                limit: parseInt(limit),
                offset: parseInt(offset),
                type
            });

            res.json({
                notifications: result.notifications,
                unreadCount: result.unreadCount,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });

        } catch (error) {
            console.error('Get notifications error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const Notification = require('../models/Notification');
            const count = await Notification.getUnreadCount(userId);

            res.json({
                unreadCount: count
            });

        } catch (error) {
            console.error('Get unread count error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async markAsRead(req, res) {
        try {
            const userId = req.user.id;
            const notificationId = parseInt(req.params.id);

            const notification = await NotificationService.markAsRead(notificationId, userId);

            if (!notification) {
                return res.status(404).json({
                    message: 'Notification not found'
                });
            }

            res.json({
                message: 'Notification marked as read',
                notification
            });

        } catch (error) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;
            const count = await NotificationService.markAllAsRead(userId);

            res.json({
                message: `${count} notifications marked as read`,
                count
            });

        } catch (error) {
            console.error('Mark all as read error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async deleteNotification(req, res) {
        try {
            const userId = req.user.id;
            const notificationId = parseInt(req.params.id);

            const deleted = await NotificationService.deleteNotification(notificationId, userId);

            if (!deleted) {
                return res.status(404).json({
                    message: 'Notification not found'
                });
            }

            res.json({
                message: 'Notification deleted successfully'
            });

        } catch (error) {
            console.error('Delete notification error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async registerPushToken(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { fcmToken, platform, deviceInfo } = req.body;

            if (!['android', 'web'].includes(platform)) {
                return res.status(400).json({
                    message: 'Invalid platform. Must be: android or web'
                });
            }

            // Optional: Validate token with Firebase
            // const isValid = await PushNotificationService.validateToken(fcmToken);
            // if (!isValid) {
            //     return res.status(400).json({
            //         message: 'Invalid FCM token'
            //     });
            // }

            const token = await PushToken.upsert({
                userId,
                fcmToken,
                platform,
                deviceInfo: deviceInfo || {}
            });

            res.json({
                message: 'Push token registered successfully',
                token: {
                    id: token.id,
                    platform: token.platform,
                    registeredAt: token.created_at
                }
            });

        } catch (error) {
            console.error('Register push token error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async deactivatePushToken(req, res) {
        try {
            const userId = req.user.id;
            const { platform } = req.body;

            if (!platform) {
                return res.status(400).json({
                    message: 'Platform is required'
                });
            }

            const deactivated = await PushToken.deactivate(userId, platform);

            if (!deactivated) {
                return res.status(404).json({
                    message: 'Token not found'
                });
            }

            res.json({
                message: 'Push token deactivated successfully'
            });

        } catch (error) {
            console.error('Deactivate push token error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getPushTokens(req, res) {
        try {
            const userId = req.user.id;
            const tokens = await PushToken.findByUserId(userId);

            res.json({
                tokens: tokens.map(t => ({
                    id: t.id,
                    platform: t.platform,
                    deviceInfo: t.device_info,
                    registeredAt: t.created_at,
                    lastUsed: t.last_used_at
                }))
            });

        } catch (error) {
            console.error('Get push tokens error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async sendTestNotification(req, res) {
        try {
            const userId = req.user.id;

            const result = await NotificationService.sendCustom(
                userId,
                ' Тестове сповіщення',
                'Push-сповіщення FOPSmart працюють правильно!',
                { test: true },
                true
            );

            res.json({
                message: 'Test notification sent',
                pushSent: result.pushSent,
                notification: result.notification
            });

        } catch (error) {
            console.error('Send test notification error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }
}

module.exports = NotificationController;