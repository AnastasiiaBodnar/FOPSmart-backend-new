'use strict';

const FOP_LIMITS_2025 = {
    1: {
        annualLimit: 167 * 3028,
        description: 'ФОП 1 група',
        taxRate: 0
    },
    2: {
        annualLimit: 1000 * 3028,
        description: 'ФОП 2 група',
        taxRate: 2
    },
    3: {
        annualLimit: 7000000 ,
        description: 'ФОП 3 група',
        taxRate: 5
    }
};

const ALERT_THRESHOLDS = {
    warning: 80,
    critical: 90,
    exceeded: 100
};

function getLimitByGroup(fopGroup) {
    const limit = FOP_LIMITS_2025[fopGroup];
    
    if (!limit) {
        throw new Error(`Invalid FOP group: ${fopGroup}`);
    }
    
    return {
        group: fopGroup,
        annualLimit: limit.annualLimit,
        annualLimitUAH: limit.annualLimit,
        description: limit.description,
        taxRate: limit.taxRate
    };
}

function calculateLimitProgress(currentIncome, annualLimit) {
    const percentage = (currentIncome / annualLimit);
    const remaining = annualLimit - currentIncome;
    
    let status = 'ok';
    if (percentage >= ALERT_THRESHOLDS.exceeded) {
        status = 'exceeded';
    } else if (percentage >= ALERT_THRESHOLDS.critical) {
        status = 'critical';
    } else if (percentage >= ALERT_THRESHOLDS.warning) {
        status = 'warning';
    }
    
    return {
        currentIncome,
        currentIncomeUAH: currentIncome ,
        annualLimit,
        annualLimitUAH: annualLimit,
        percentage: Math.round(percentage * 100) / 100,
        remaining,
        remainingUAH: remaining ,
        status
    };
}

function getAlertType(percentage) {
    if (percentage >= ALERT_THRESHOLDS.exceeded) {
        return 'exceeded';
    } else if (percentage >= ALERT_THRESHOLDS.critical) {
        return 'critical';
    } else if (percentage >= ALERT_THRESHOLDS.warning) {
        return 'warning';
    }
    return null;
}

module.exports = {
    FOP_LIMITS_2025,
    ALERT_THRESHOLDS,
    getLimitByGroup,
    calculateLimitProgress,
    getAlertType
};