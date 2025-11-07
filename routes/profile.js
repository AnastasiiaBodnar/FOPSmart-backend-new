'use strict';

const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');
const { 
    updateFopSettingsValidation,
    updateProfileValidation,
    changePasswordValidation,
    deleteAccountValidation
} = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: User profile and FOP settings management
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get full user profile
 *     description: Returns complete user profile including FOP settings
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 fopGroup:
 *                   type: integer
 *                 taxSystem:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/', verifyToken, ProfileController.getProfile);

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update user's first name, last name, or email
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Іван
 *                 description: Нове ім'я (опціонально)
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Петренко
 *                 description: Нове прізвище (опціонально)
 *               email:
 *                 type: string
 *                 format: email
 *                 example: new.email@example.com
 *                 description: Новий email (опціонально)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Профіль успішно оновлено
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 *       401:
 *         description: Unauthorized
 */
router.put('/', verifyToken, updateProfileValidation, ProfileController.updateProfile);

/**
 * @swagger
 * /api/profile/password:
 *   put:
 *     summary: Change password
 *     description: Change user's password (requires current password)
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: oldpassword123
 *                 description: Поточний пароль
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: newpassword456
 *                 description: Новий пароль (мінімум 6 символів)
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: newpassword456
 *                 description: Підтвердження нового паролю
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Пароль успішно змінено
 *       400:
 *         description: Validation error (passwords don't match or new password same as old)
 *       401:
 *         description: Current password is incorrect or unauthorized
 */
router.put('/password', verifyToken, changePasswordValidation, ProfileController.changePassword);

/**
 * @swagger
 * /api/profile/fop:
 *   get:
 *     summary: Get FOP profile information
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: FOP profile info
 */
router.get('/fop', verifyToken, ProfileController.getFopInfo);

/**
 * @swagger
 * /api/profile/fop:
 *   put:
 *     summary: Update FOP settings
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fopGroup
 *             properties:
 *               fopGroup:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 example: 2
 *               taxSystem:
 *                 type: string
 *                 enum: [single_tax, general, simplified]
 *                 example: single_tax
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/fop', verifyToken, updateFopSettingsValidation, ProfileController.updateFopSettings);

/**
 * @swagger
 * /api/profile/limit-status:
 *   get:
 *     summary: Get current limit status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: year
 *         in: query
 *         schema:
 *           type: integer
 *         description: Year to check
 *     responses:
 *       200:
 *         description: Limit status
 */
router.get('/limit-status', verifyToken, ProfileController.getLimitStatus);

/**
 * @swagger
 * /api/profile/delete:
 *   delete:
 *     summary: Delete user account
 *     description: |
 *       Permanently deactivates user account (soft delete).
 *       Requires password confirmation and explicit confirmation text.
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - confirmation
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 example: mypassword123
 *                 description: Поточний пароль для підтвердження
 *               confirmation:
 *                 type: string
 *                 example: DELETE_MY_ACCOUNT
 *                 description: Введіть "DELETE_MY_ACCOUNT" для підтвердження видалення
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Акаунт успішно видалено
 *       400:
 *         description: Validation error or confirmation text incorrect
 *       401:
 *         description: Password incorrect or unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/delete', verifyToken, deleteAccountValidation, ProfileController.deleteAccount);

module.exports = router;