'use strict';

const { validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const IncomeTrackingService = require('../services/incomeTrackingService');
const LimitService = require('../services/limitService');

class ManualTransactionController {
    
    static async createManual(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const {
                amount,
                description,
                transactionDate,
                type,
                mcc,
                comment,
                accountId
            } = req.body;

            if (!['income', 'expense'].includes(type)) {
                return res.status(400).json({
                    message: 'Invalid transaction type. Must be "income" or "expense"'
                });
            }

            let account;
            if (accountId) {
                account = await Account.findById(accountId);
                if (!account || account.user_id !== userId || account.account_type !== 'fop') {
                    return res.status(400).json({
                        message: 'Invalid account. Account must be FOP type and belong to you'
                    });
                }
            } else {
                const fopAccounts = await Account.getFopAccounts(userId);
                if (!fopAccounts || fopAccounts.length === 0) {
                    return res.status(400).json({
                        message: 'No FOP accounts found. Please connect Monobank first'
                    });
                }
                account = fopAccounts[0];
            }

            const transactionAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

            const manualTransactionId = `manual_${Date.now()}_${userId}_${Math.random().toString(36).substr(2, 9)}`;

            const transactionData = {
                userId: userId,
                accountId: account.id,
                monobankTransactionId: manualTransactionId,
                amount: transactionAmount,
                balance: account.balance || 0, // Don't update balance for manual transactions
                currencyCode: 980, 
                description: description,
                comment: comment || null,
                mcc: mcc || 0,
                originalMcc: null,
                hold: false,
                time: Math.floor(new Date(transactionDate).getTime() / 1000),
                transactionDate: new Date(transactionDate),
                counterIban: null,
                counterName: null,
                counterEdrpou: null,
                receiptId: null,
                invoiceId: null,
                cashbackAmount: 0,
                commissionRate: 0
            };

            const transaction = await Transaction.create(transactionData);

            if (type === 'income') {
                try {
                    await IncomeTrackingService.updateUserIncome(userId);
                    await LimitService.checkAndNotify(userId);
                } catch (error) {
                    console.error('Failed to update income tracking:', error);
                }
            }

            res.status(201).json({
                message: 'Transaction created successfully',
                transaction: {
                    id: transaction.id,
                    amount: transaction.amount,
                    description: transaction.description,
                    comment: transaction.comment,
                    date: transaction.transaction_date,
                    type: transaction.amount > 0 ? 'income' : 'expense',
                    mcc: transaction.mcc,
                    account: {
                        id: account.id,
                        iban: account.iban,
                        type: account.account_type
                    },
                    createdAt: transaction.created_at
                }
            });

        } catch (error) {
            console.error('Create manual transaction error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getMccCategories(req, res) {
        try {
            const db = require('../db/pool');
            
            const query = `
                SELECT 
                    mcc_code,
                    category_name_uk,
                    category_name_en,
                    parent_category_uk,
                    color
                FROM mcc_categories
                ORDER BY category_name_uk
            `;

            const result = await db.query(query);

            res.json({
                categories: result.rows.map(cat => ({
                    mcc: cat.mcc_code,
                    nameUk: cat.category_name_uk,
                    nameEn: cat.category_name_en,
                    parentCategory: cat.parent_category_uk,
                    color: cat.color
                }))
            });

        } catch (error) {
            console.error('Get MCC categories error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getUserFopAccounts(req, res) {
        try {
            const userId = req.user.id;
            const fopAccounts = await Account.getFopAccounts(userId);

            res.json({
                accounts: fopAccounts.map(acc => ({
                    id: acc.id,
                    iban: acc.iban,
                    maskedPan: acc.masked_pan,
                    balance: acc.balance,
                    currencyCode: acc.currency_code
                }))
            });

        } catch (error) {
            console.error('Get FOP accounts error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async updateManual(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const transactionId = parseInt(req.params.id);
            const {
                amount,
                description,
                transactionDate,
                type,
                mcc,
                comment
            } = req.body;

            const db = require('../db/pool');

            const checkQuery = `
                SELECT t.*, a.account_type
                FROM transactions t
                JOIN accounts a ON t.account_id = a.id
                WHERE t.id = $1 AND t.user_id = $2
            `;
            const checkResult = await db.query(checkQuery, [transactionId, userId]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    message: 'Transaction not found'
                });
            }

            const existingTransaction = checkResult.rows[0];

            if (!existingTransaction.monobank_transaction_id.startsWith('manual_')) {
                return res.status(400).json({
                    message: 'Can only update manually created transactions'
                });
            }

            const transactionAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

            const updateQuery = `
                UPDATE transactions
                SET 
                    amount = $1,
                    description = $2,
                    transaction_date = $3,
                    time = $4,
                    mcc = $5,
                    comment = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7 AND user_id = $8
                RETURNING *
            `;

            const updateResult = await db.query(updateQuery, [
                transactionAmount,
                description,
                new Date(transactionDate),
                Math.floor(new Date(transactionDate).getTime() / 1000),
                mcc || 0,
                comment || null,
                transactionId,
                userId
            ]);

            try {
                await IncomeTrackingService.updateUserIncome(userId);
                await LimitService.checkAndNotify(userId);
            } catch (error) {
                console.error('Failed to update income tracking:', error);
            }

            const updated = updateResult.rows[0];

            res.json({
                message: 'Transaction updated successfully',
                transaction: {
                    id: updated.id,
                    amount: updated.amount,
                    description: updated.description,
                    comment: updated.comment,
                    date: updated.transaction_date,
                    type: updated.amount > 0 ? 'income' : 'expense',
                    mcc: updated.mcc,
                    updatedAt: updated.updated_at
                }
            });

        } catch (error) {
            console.error('Update manual transaction error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async deleteManual(req, res) {
        try {
            const userId = req.user.id;
            const transactionId = parseInt(req.params.id);

            const db = require('../db/pool');

            const checkQuery = `
                SELECT monobank_transaction_id
                FROM transactions
                WHERE id = $1 AND user_id = $2
            `;
            const checkResult = await db.query(checkQuery, [transactionId, userId]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    message: 'Transaction not found'
                });
            }

            if (!checkResult.rows[0].monobank_transaction_id.startsWith('manual_')) {
                return res.status(400).json({
                    message: 'Can only delete manually created transactions'
                });
            }

            const deleteQuery = `
                DELETE FROM transactions
                WHERE id = $1 AND user_id = $2
            `;
            await db.query(deleteQuery, [transactionId, userId]);

            try {
                await IncomeTrackingService.updateUserIncome(userId);
            } catch (error) {
                console.error('Failed to update income tracking:', error);
            }

            res.json({
                message: 'Transaction deleted successfully'
            });

        } catch (error) {
            console.error('Delete manual transaction error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }
}

module.exports = ManualTransactionController;