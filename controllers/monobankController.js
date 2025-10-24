'use strict';

const { validationResult } = require('express-validator');
const MonobankConnection = require('../models/MonobankConnection');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
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

            let clientInfo;
            try {
                clientInfo = await monobankService.getClientInfo(token);
            } catch (error) {
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

            const accounts = await Account.bulkCreate(
                userId,
                connection.id,
                clientInfo.accounts
            );

            res.status(201).json({
                message: 'Monobank connected successfully',
                connection: {
                    id: connection.id,
                    clientName: connection.client_name,
                    clientId: connection.client_id,
                    connectedAt: connection.created_at
                },
                accounts: accounts.map(acc => ({
                    id: acc.id,
                    balance: acc.balance,
                    currencyCode: acc.currency_code,
                    iban: acc.iban,
                    type: acc.account_type
                }))
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

            const accounts = await Account.findByUserId(userId);

            res.json({
                connected: true,
                connection: {
                    clientName: connection.client_name,
                    clientId: connection.client_id,
                    lastSync: connection.last_sync_at,
                    connectedAt: connection.created_at
                },
                accountsCount: accounts.length
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

    /**
     * Get client info and accounts
     * GET /api/monobank/client-info
     */
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

    /**
     * Sync transactions from Monobank
     * POST /api/monobank/sync
     */
    static async syncTransactions(req, res) {
        try {
            const userId = req.user.id;

            const token = await MonobankConnection.getToken(userId);
            if (!token) {
                return res.status(404).json({
                    message: 'No Monobank connection found. Please connect first.'
                });
            }

            const accounts = await Account.findByUserId(userId);
            if (!accounts || accounts.length === 0) {
                return res.status(404).json({
                    message: 'No accounts found. Please reconnect Monobank.'
                });
            }

            let totalSynced = 0;
            const errors = [];

            for (const account of accounts) {
                try {
                    const toTimestamp = Math.floor(Date.now() / 1000);
                    const fromTimestamp = toTimestamp - (31 * 24 * 60 * 60);

                    const monobankTransactions = await monobankService.getStatements(
                        token,
                        account.account_id,
                        fromTimestamp,
                        toTimestamp
                    );

                    const transactionsToSave = monobankTransactions.map(tx => ({
                        userId: userId,
                        accountId: account.id,
                        monobankTransactionId: tx.id,
                        amount: tx.amount,
                        balance: tx.balance,
                        currencyCode: tx.currencyCode || 980,
                        description: tx.description,
                        comment: tx.comment || null,
                        mcc: tx.mcc || 0,
                        originalMcc: tx.originalMcc || null,
                        hold: tx.hold || false,
                        time: tx.time,
                        transactionDate: new Date(tx.time * 1000),
                        counterIban: tx.counterIban || null,
                        counterName: tx.counterName || null,
                        counterEdrpou: tx.counterEdrpou || null,
                        receiptId: tx.receiptId || null,
                        invoiceId: tx.invoiceId || null,
                        cashbackAmount: tx.cashbackAmount || 0,
                        commissionRate: tx.commissionRate || 0
                    }));

                    const synced = await Transaction.bulkCreate(transactionsToSave);
                    totalSynced += synced;

                    if (monobankTransactions.length > 0) {
                        const latestBalance = monobankTransactions[0].balance;
                        await Account.updateBalance(account.id, latestBalance);
                    }

                } catch (error) {
                    console.error(`Error syncing account ${account.account_id}:`, error);
                    errors.push({
                        accountId: account.account_id,
                        error: error.message
                    });
                }
            }

            await MonobankConnection.updateLastSync(userId);

            res.json({
                message: 'Sync completed',
                syncedTransactions: totalSynced,
                accountsProcessed: accounts.length,
                errors: errors.length > 0 ? errors : undefined,
                lastSync: new Date().toISOString()
            });

        } catch (error) {
            console.error('Sync transactions error:', error);
            
            if (error.message.includes('Too many requests')) {
                return res.status(429).json({
                    message: error.message
                });
            }

            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }
}

module.exports = MonobankController;