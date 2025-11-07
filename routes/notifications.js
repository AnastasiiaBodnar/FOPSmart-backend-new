'use strict';

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const NotificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Push notifications and in-app notification management
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Returns list of notifications with optional filters
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: unreadOnly
 *         in: query
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Return only unread notifications
 *       - name: type
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by notification type (limit_warning, limit_critical, etc)
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of notifications to return
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                 unreadCount:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', verifyToken, NotificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Returns the number of unread notifications for the user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   example: 3
 */
router.get('/unread-count', verifyToken, NotificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.put('/:id/read', verifyToken, NotificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 */
router.put('/mark-all-read', verifyToken, NotificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 */
router.delete('/:id', verifyToken, NotificationController.deleteNotification);

/**
 * @swagger
 * /api/notifications/push/register:
 *   post:
 *     summary: Register FCM push token
 *     description: Register device token for receiving push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fcmToken
 *               - platform
 *             properties:
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *                 example: "dQw4w9WgXcQ:APA91bH..."
 *               platform:
 *                 type: string
 *                 enum: [android, web]
 *                 description: Device platform
 *                 example: android
 *               deviceInfo:
 *                 type: object
 *                 description: Optional device information
 *                 properties:
 *                   model:
 *                     type: string
 *                   os:
 *                     type: string
 *                   appVersion:
 *                     type: string
 *     responses:
 *       200:
 *         description: Token registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/push/register', 
    verifyToken,
    [
        body('fcmToken').trim().notEmpty().withMessage('FCM token is required'),
        body('platform').isIn(['android', 'web']).withMessage('Invalid platform')
    ],
    NotificationController.registerPushToken
);

/**
 * @swagger
 * /api/notifications/push/deactivate:
 *   post:
 *     summary: Deactivate push token
 *     description: Deactivate push notifications for specific platform (logout/unsubscribe)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [android, web]
 *                 example: android
 *     responses:
 *       200:
 *         description: Token deactivated
 *       404:
 *         description: Token not found
 */
router.post('/push/deactivate', verifyToken, NotificationController.deactivatePushToken);

/**
 * @swagger
 * /api/notifications/push/tokens:
 *   get:
 *     summary: Get registered push tokens
 *     description: Returns list of user's registered push tokens
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tokens:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/push/tokens', verifyToken, NotificationController.getPushTokens);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send test notification
 *     description: Send a test push notification to verify setup
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test notification sent
 */
router.post('/test', verifyToken, NotificationController.sendTestNotification);

module.exports = router;