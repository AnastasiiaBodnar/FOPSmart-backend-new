'use strict';

const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

class TransactionController {
    static async getTransactions(req, res) {
        try {
            const userId = req.user.id;
            const {
                dateFrom,
                dateTo,
                type,
                accountId,
                search,
                mcc,
                excludeHolds,
                limit,
                offset
            } = req.query;

            const filters = {
                dateFrom: dateFrom || null,
                dateTo: dateTo || null,
                type: type || 'all',
                accountId: accountId ? parseInt(accountId) : null,
                search: search || null,
                mcc: mcc ? parseInt(mcc) : null,
                excludeHolds: excludeHolds === 'true',
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0
            };

            const transactions = await Transaction.findByUserId(userId, filters);
            const total = await Transaction.count(userId, filters);

            res.json({
                transactions: transactions.map(tx => ({
                    id: tx.id,
                    amount: tx.amount,
                    balance: tx.balance,
                    currencyCode: tx.currency_code,
                    description: tx.description,
                    comment: tx.comment,
                    mcc: tx.mcc,
                    category: tx.category_name_uk,
                    categoryEn: tx.category_name_en,
                    parentCategory: tx.parent_category_uk,
                    color: tx.color,
                    date: tx.transaction_date,
                    time: tx.time,
                    hold: tx.hold,
                    counterparty: {
                        name: tx.counter_name,
                        iban: tx.counter_iban
                    },
                    account: {
                        id: tx.account_id,
                        iban: tx.iban,
                        maskedPan: tx.masked_pan
                    },
                    cashback: tx.cashback_amount,
                    receiptId: tx.receipt_id
                })),
                pagination: {
                    total,
                    limit: filters.limit,
                    offset: filters.offset,
                    page: Math.floor(filters.offset / filters.limit) + 1,
                    totalPages: Math.ceil(total / filters.limit)
                }
            });

        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getStats(req, res) {
        try {
            const userId = req.user.id;
            const { dateFrom, dateTo, accountId } = req.query;

            const filters = {
                dateFrom: dateFrom || null,
                dateTo: dateTo || null,
                accountId: accountId ? parseInt(accountId) : null
            };

            const stats = await Transaction.getStats(userId, filters);

            res.json({
                totalTransactions: parseInt(stats.total_transactions),
                income: {
                    total: parseInt(stats.total_income) || 0,
                    count: parseInt(stats.income_count) || 0
                },
                expense: {
                    total: Math.abs(parseInt(stats.total_expense)) || 0,
                    count: parseInt(stats.expense_count) || 0,
                    average: Math.abs(parseInt(stats.avg_expense)) || 0
                },
                cashback: parseInt(stats.total_cashback) || 0,
                netIncome: (parseInt(stats.total_income) || 0) + (parseInt(stats.total_expense) || 0)
            });

        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getByCategory(req, res) {
        try {
            const userId = req.user.id;
            const { dateFrom, dateTo } = req.query;

            const filters = {
                dateFrom: dateFrom || null,
                dateTo: dateTo || null
            };

            const categories = await Transaction.getByCategory(userId, filters);

            res.json({
                categories: categories.map(cat => ({
                    mcc: cat.mcc,
                    name: cat.category_name_uk,
                    nameEn: cat.category_name_en,
                    parentCategory: cat.parent_category_uk,
                    color: cat.color,
                    transactionCount: parseInt(cat.transaction_count),
                    totalSpent: parseInt(cat.total_spent)
                }))
            });

        } catch (error) {
            console.error('Get by category error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }

    static async getBalances(req, res) {
        try {
            const userId = req.user.id;

            const accounts = await Account.findByUserId(userId);
            const totalBalances = await Account.getTotalBalance(userId);

            res.json({
                accounts: accounts.map(acc => ({
                    id: acc.id,
                    balance: acc.balance,
                    currencyCode: acc.currency_code,
                    iban: acc.iban,
                    maskedPan: acc.masked_pan,
                    type: acc.account_type
                })),
                total: totalBalances.map(tb => ({
                    currencyCode: tb.currency_code,
                    balance: parseInt(tb.total_balance),
                    accountsCount: parseInt(tb.accounts_count)
                }))
            });

        } catch (error) {
            console.error('Get balances error:', error);
            res.status(500).json({
                message: 'Internal server error'
            });
        }
    }
}

module.exports = TransactionController;