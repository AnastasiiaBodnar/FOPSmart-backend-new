'use strict';

const PDFDocument = require('pdfkit');
const moment = require('moment');

class PDFService {
    static generateFinancialReport(data) {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
                Title: 'Фінансовий звіт FOPSmart',
                Author: 'FOPSmart',
                Subject: 'Фінансовий звіт',
                Creator: 'FOPSmart Backend'
            }
        });

        this.addHeader(doc, data);

        this.addPeriodInfo(doc, data.period);

        this.addFinancialSummary(doc, data.summary);

        if (data.limitStatus) {
            this.addLimitStatus(doc, data.limitStatus);
        }

        if (data.topCategories && data.topCategories.length > 0) {
            this.addTopCategories(doc, data.topCategories);
        }

        if (data.monthlyData && data.monthlyData.length > 0) {
            this.addMonthlyBreakdown(doc, data.monthlyData);
        }

        this.addFooter(doc);

        doc.end();

        return doc;
    }

    static addHeader(doc, data) {
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Фінансовий звіт FOPSmart', { align: 'center' });

        doc.moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`${data.user.firstName} ${data.user.lastName}`, { align: 'center' });
        
        doc.fontSize(10)
           .fillColor('#666666')
           .text(data.user.email, { align: 'center' });

        if (data.user.fopGroup) {
            doc.text(`ФОП ${data.user.fopGroup} група`, { align: 'center' });
        }

        doc.moveDown(1);
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke('#cccccc');
        doc.moveDown(1);
    }

    static addPeriodInfo(doc, period) {
        doc.fillColor('#000000')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Період звіту', { underline: false });

        doc.moveDown(0.5);

        doc.fontSize(11)
           .font('Helvetica')
           .text(`З: ${moment(period.from).format('DD.MM.YYYY')}`, { continued: true })
           .text(`     До: ${moment(period.to).format('DD.MM.YYYY')}`);

        doc.text(`Днів у періоді: ${period.days}`);

        doc.moveDown(1);
    }

    static addFinancialSummary(doc, summary) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Фінансова зводка');

        doc.moveDown(0.5);

        const startY = doc.y;
        const boxHeight = 100;
        const boxWidth = 150;
        const spacing = 25;

        this.drawSummaryBox(doc, 50, startY, boxWidth, boxHeight, {
            title: 'Доходи',
            amount: summary.income.toFixed(2) + ' ₴',
            color: '#10B981',
            count: summary.incomeCount
        });

        this.drawSummaryBox(doc, 50 + boxWidth + spacing, startY, boxWidth, boxHeight, {
            title: 'Витрати',
            amount: summary.expenses.toFixed(2) + ' ₴',
            color: '#EF4444',
            count: summary.expenseCount
        });

        this.drawSummaryBox(doc, 50 + (boxWidth + spacing) * 2, startY, boxWidth, boxHeight, {
            title: 'Чистий дохід',
            amount: summary.netIncome.toFixed(2) + ' ₴',
            color: summary.netIncome >= 0 ? '#10B981' : '#EF4444',
            count: summary.totalTransactions
        });

        doc.y = startY + boxHeight + 20;
        doc.moveDown(1);
    }

    static drawSummaryBox(doc, x, y, width, height, data) {
        doc.rect(x, y, width, height)
           .stroke('#E5E7EB');

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#6B7280')
           .text(data.title, x + 10, y + 15, { width: width - 20, align: 'center' });

        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor(data.color)
           .text(data.amount, x + 10, y + 40, { width: width - 20, align: 'center' });

        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#9CA3AF')
           .text(`${data.count} транзакцій`, x + 10, y + 70, { width: width - 20, align: 'center' });
    }

    static addLimitStatus(doc, limitStatus) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Статус ліміту ФОП');

        doc.moveDown(0.5);

        const percentage = limitStatus.percentage;
        let statusColor = '#10B981';
        let statusText = 'Норма';

        if (percentage >= 100) {
            statusColor = '#DC2626';
            statusText = 'ПЕРЕВИЩЕНО';
        } else if (percentage >= 90) {
            statusColor = '#F59E0B';
            statusText = 'Критично';
        } else if (percentage >= 80) {
            statusColor = '#F59E0B';
            statusText = 'Попередження';
        }

        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#000000')
           .text('Статус: ', { continued: true })
           .fillColor(statusColor)
           .font('Helvetica-Bold')
           .text(statusText);

        doc.moveDown(0.3);

        const barWidth = 450;
        const barHeight = 25;
        const barX = 50;
        const barY = doc.y;

        doc.rect(barX, barY, barWidth, barHeight)
           .fill('#E5E7EB');

        const fillWidth = Math.min((barWidth * percentage) / 100, barWidth);
        doc.rect(barX, barY, fillWidth, barHeight)
           .fill(statusColor);

        doc.rect(barX, barY, barWidth, barHeight)
           .stroke('#9CA3AF');

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text(`${percentage.toFixed(1)}%`, barX, barY + 6, { width: barWidth, align: 'center' });

        doc.y = barY + barHeight + 15;

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`Поточний дохід: ${limitStatus.currentIncome.toFixed(2)} ₴`);
        
        doc.text(`Річний ліміт: ${limitStatus.limit.toFixed(2)} ₴`);
        
        doc.text(`Залишок: ${limitStatus.remaining.toFixed(2)} ₴`);

        doc.moveDown(1.5);
    }

    static addTopCategories(doc, categories) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Топ-5 категорій витрат');

        doc.moveDown(0.5);

        const tableTop = doc.y;
        const colWidths = [30, 200, 100, 120];
        const rowHeight = 25;

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#6B7280');

        doc.text('#', 50, tableTop, { width: colWidths[0] });
        doc.text('Категорія', 50 + colWidths[0], tableTop, { width: colWidths[1] });
        doc.text('Транзакції', 50 + colWidths[0] + colWidths[1], tableTop, { width: colWidths[2] });
        doc.text('Сума', 50 + colWidths[0] + colWidths[1] + colWidths[2], tableTop, { width: colWidths[3], align: 'right' });

        doc.moveTo(50, tableTop + 18)
           .lineTo(550, tableTop + 18)
           .stroke('#E5E7EB');

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000');

        let currentY = tableTop + 25;

        categories.slice(0, 5).forEach((cat, index) => {
            doc.text((index + 1).toString(), 50, currentY, { width: colWidths[0] });
            doc.text(cat.category || 'Інше', 50 + colWidths[0], currentY, { width: colWidths[1] });
            doc.text(cat.transactionCount.toString(), 50 + colWidths[0] + colWidths[1], currentY, { width: colWidths[2] });
            doc.text(cat.totalSpent.toFixed(2) + ' ₴', 50 + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[3], align: 'right' });

            currentY += rowHeight;

            if (index < categories.length - 1) {
                doc.moveTo(50, currentY - 5)
                   .lineTo(550, currentY - 5)
                   .stroke('#F3F4F6');
            }
        });

        doc.y = currentY + 10;
        doc.moveDown(1);
    }

    static addMonthlyBreakdown(doc, monthlyData) {
        if (doc.y > 650) {
            doc.addPage();
        }

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Помісячний розклад');

        doc.moveDown(0.5);

        const tableTop = doc.y;
        const colWidths = [100, 120, 120, 120];
        const rowHeight = 25;

        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#6B7280');

        doc.text('Місяць', 50, tableTop, { width: colWidths[0] });
        doc.text('Доходи', 50 + colWidths[0], tableTop, { width: colWidths[1], align: 'right' });
        doc.text('Витрати', 50 + colWidths[0] + colWidths[1], tableTop, { width: colWidths[2], align: 'right' });
        doc.text('Чистий дохід', 50 + colWidths[0] + colWidths[1] + colWidths[2], tableTop, { width: colWidths[3], align: 'right' });

        doc.moveTo(50, tableTop + 18)
           .lineTo(550, tableTop + 18)
           .stroke('#E5E7EB');

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000');

        let currentY = tableTop + 25;

        monthlyData.forEach((month, index) => {
            const monthName = moment(month.period).format('MMMM YYYY');
            const netIncome = month.income - month.expenses;

            doc.text(monthName, 50, currentY, { width: colWidths[0] });
            doc.text(month.income.toFixed(2) + ' ₴', 50 + colWidths[0], currentY, { width: colWidths[1], align: 'right' });
            doc.text(month.expenses.toFixed(2) + ' ₴', 50 + colWidths[0] + colWidths[1], currentY, { width: colWidths[2], align: 'right' });
            
            doc.fillColor(netIncome >= 0 ? '#10B981' : '#EF4444')
               .text(netIncome.toFixed(2) + ' ₴', 50 + colWidths[0] + colWidths[1] + colWidths[2], currentY, { width: colWidths[3], align: 'right' });

            doc.fillColor('#000000');

            currentY += rowHeight;

            if (index < monthlyData.length - 1) {
                doc.moveTo(50, currentY - 5)
                   .lineTo(550, currentY - 5)
                   .stroke('#F3F4F6');
            }

            if (currentY > 700 && index < monthlyData.length - 1) {
                doc.addPage();
                currentY = 50;
            }
        });

        doc.y = currentY + 10;
    }

    static addFooter(doc) {
        const pageCount = doc.bufferedPageRange().count;
        
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);

            doc.moveTo(50, 770)
               .lineTo(550, 770)
               .stroke('#E5E7EB');

            doc.fontSize(8)
               .font('Helvetica')
               .fillColor('#9CA3AF')
               .text(
                   `Згенеровано ${moment().format('DD.MM.YYYY HH:mm')} | FOPSmart`,
                   50,
                   775,
                   { align: 'center', width: 500 }
               );

            doc.text(
                `Сторінка ${i + 1} з ${pageCount}`,
                50,
                785,
                { align: 'center', width: 500 }
            );
        }
    }

    static generateQuickSummary(data) {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('Швидка фінансова зводка', { align: 'center' });

        doc.moveDown();

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Період: ${moment(data.period.from).format('DD.MM.YYYY')} - ${moment(data.period.to).format('DD.MM.YYYY')}`);

        doc.moveDown();

        doc.fontSize(14)
           .text(`Доходи: ${data.summary.income.toFixed(2)} ₴`, { continued: false });
        doc.text(`Витрати: ${data.summary.expenses.toFixed(2)} ₴`);
        doc.text(`Чистий дохід: ${data.summary.netIncome.toFixed(2)} ₴`);

        doc.end();

        return doc;
    }
}

module.exports = PDFService;