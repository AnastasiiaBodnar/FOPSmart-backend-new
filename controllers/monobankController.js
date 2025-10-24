'use strict';

const { validationResult } = require('express-validator');
const MonobankConnection = require('../models/MonobankConnection');
const monobankService = require('../services/monobankService');

class MonobankController {
    /**
     * Connect user's Monobank account
     * POST /api/monobank/connect
     */
 static async connect(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { token } = req.body;
            const userId = req.user.id;

            const existingConnection = await MonobankConnection.hasConnection(userId);
            if (existingConnection) {
                return res.status(409).json({
                    message: 'Monobank connection already exists. Please disconnect first.'
                });
            }

            let clientInfo;
            try {
                clientInfo = await monobankService.getClientInfo(token);
            } catch (error) {
                console.error('Monobank API error:', error);
                return res.status(400).json({
                    message: error.message || 'Invalid Monobank token'
                });
            }

            const connection = await MonobankConnection.create({
                userId,
                token,
                clientName: clientInfo.name,
                clientId: clientInfo.clientId
            });

            res.status(201).json({
                message: 'Monobank connected successfully',
                connection: {
                    id: connection.id,
                    clientName: connection.client_name,
                    clientId: connection.client_id,
                    connectedAt: connection.created_at
                },
                accounts: clientInfo.accounts
            });

        } catch (error) {
            console.error('Monobank connect error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get connection status
     * GET /api/monobank/status
     */
    static async getStatus(req, res) {
        try {
            const userId = req.user.id;
            const connection = await MonobankConnection.findByUserId(userId);

            if (!connection) {
                return res.json({
                    connected: false
                });
            }

            res.json({
                connected: true,
                connection: {
                    clientName: connection.client_name,
                    clientId: connection.client_id,
                    lastSync: connection.last_sync_at,
                    connectedAt: connection.created_at
                }
            });

        } catch (error) {
            console.error('Get status error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    /**
     * Disconnect Monobank account
     * DELETE /api/monobank/disconnect
     */
    static async disconnect(req, res) {
        try {
            const userId = req.user.id;

            const hasConnection = await MonobankConnection.hasConnection(userId);
            if (!hasConnection) {
                return res.status(404).json({
                    message: 'No Monobank connection found'
                });
            }

            await MonobankConnection.deactivate(userId);

            res.json({
                message: 'Monobank disconnected successfully'
            });

        } catch (error) {
            console.error('Disconnect error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getClientInfo(req, res) {
        try {
            const userId = req.user.id;

            const token = await MonobankConnection.getToken(userId);
            if (!token) {
                return res.status(404).json({
                    message: 'No Monobank connection found'
                });
            }

            const clientInfo = await monobankService.getClientInfo(token);

            res.json({
                clientId: clientInfo.clientId,
                name: clientInfo.name,
                accounts: clientInfo.accounts
            });

        } catch (error) {
            console.error('Get client info error:', error);

            if (error.message.includes('Invalid')) {
                return res.status(401).json({
                    message: 'Monobank token is invalid or expired. Please reconnect.'
                });
            }

            res.status(500).json({
                message: error.message || 'Internal server error'
            });
        }
    }
}

module.exports = MonobankController;
