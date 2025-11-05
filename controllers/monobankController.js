'use strict';

const { validationResult } = require('express-validator');
const MonobankConnection = require('../models/MonobankConnection');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const monobankService = require('../services/monobankService');
const IncomeTrackingService = require('../services/incomeTrackingService'); // [NEW] Додано require

class MonobankController {

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

            const fopAccounts = accounts.filter(acc => acc.account_type === 'fop');

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
                    type: acc.account_type,
                    isFop: acc.account_type === 'fop'
                })),
                fopAccounts: fopAccounts.map(acc => ({
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

    static async getStatus(req, res) {
        try {
            const userId = req.user.id;
            const connection = await MonobankConnection.findByUserId(userId);

            if (!connection) {
                return res.json({
                    connected: false
                });
            }

            const allAccounts = await Account.findByUserId(userId);
            const fopAccounts = await Account.getFopAccounts(userId);

            res.json({
                connected: true,
                connection: {
                    clientName: connection.client_name,
                    clientId: connection.client_id,
                    lastSync: connection.last_sync_at,
                    connectedAt: connection.created_at
                },
                accountsCount: allAccounts.length,
                fopAccountsCount: fopAccounts.length,
                accounts: allAccounts.map(acc => ({
                    id: acc.id,
                    type: acc.account_type,
                    isFop: acc.account_type === 'fop',
                    iban: acc.iban
                }))
            });

        } catch (error) {
            console.error('Get status error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

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

            const accountsWithFopFlag = clientInfo.accounts.map(acc => ({
                ...acc,
                isFop: acc.type === 'fop'
            }));

            const fopAccounts = accountsWithFopFlag.filter(acc => acc.isFop);

            res.json({
                clientId: clientInfo.clientId,
                name: clientInfo.name,
                accounts: accountsWithFopFlag,
                fopAccounts: fopAccounts,
                totalAccounts: accountsWithFopFlag.length,
                fopAccountsCount: fopAccounts.length
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

    static async syncTransactions(req, res) {
        try {
            const userId = req.user.id;

            const token = await MonobankConnection.getToken(userId);
            if (!token) {
                return res.status(404).json({
                    message: 'No Monobank connection found. Please connect first.'
                });
            }

            const fopAccounts = await Account.getFopAccounts(userId);
            
            if (!fopAccounts || fopAccounts.length === 0) {
                return res.status(404).json({
                    message: 'No FOP accounts found. Please ensure you have a FOP account in Monobank.'
                });
            }

            let totalSynced = 0;
            const errors = [];
            const syncedAccounts = [];

            for (const account of fopAccounts) {
                try {
                    const toTimestamp = Math.floor(Date.now() / 1000);
                    const fromTimestamp = toTimestamp - (31 * 24 * 60 * 60); // 31 день

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

                    syncedAccounts.push({
                        accountId: account.account_id,
                        iban: account.iban,
                        transactionsSynced: synced
                    });

                } catch (error) {
                    console.error(`Error syncing FOP account ${account.account_id}:`, error);
                    errors.push({
                        accountId: account.account_id,
                        iban: account.iban,
                        error: error.message
                    });
                }
            }

            await MonobankConnection.updateLastSync(userId);
            
            try {
                await IncomeTrackingService.updateUserIncome(userId);
            } catch (error) {
                console.error('Failed to update income tracking:', error);
            }

            res.json({
                message: 'Sync completed (FOP accounts only)',
                syncedTransactions: totalSynced,
                fopAccountsProcessed: fopAccounts.length,
                syncedAccounts: syncedAccounts,
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