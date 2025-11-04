'use strict';

const PDFDocument = require('pdfkit');
const moment = require('moment');
const path = require('path');

const FONTS = {
    regular: path.join(__dirname, '../fonts/TIMES.TTF'),
    bold: path.join(__dirname, '../fonts/TIMESBD.TTF')
};

function formatNumber(num) {
    if (typeof num !== 'number') return num;
    return num.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

        doc.registerFont('Regular', FONTS.regular);
        doc.registerFont('Bold', FONTS.bold);

        this.addHeader(doc, data);
        this.addPeriodInfo(doc, data.period);
        this.addFinancialSummary(doc, data.summary);

        if (data.limitStatus) this.addLimitStatus(doc, data.limitStatus);
        if (data.topCategories?.length) this.addTopCategories(doc, data.topCategories);
        if (data.monthlyData?.length) this.addMonthlyBreakdown(doc, data.monthlyData);

        this.addFooter(doc);
        doc.end();
        return doc;
    }

    static addHeader(doc, data) {
        doc.fontSize(24).font('Bold').text('Фінансовий звіт FOPSmart', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(12).font('Regular').text(`${data.user.firstName} ${data.user.lastName}`, { align: 'center' });
        doc.fontSize(10).fillColor('#666666').text(data.user.email, { align: 'center' });

        if (data.user.fopGroup)
            doc.text(`ФОП ${data.user.fopGroup} група`, { align: 'center' });

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#cccccc');
        doc.moveDown(1);
    }

    static addPeriodInfo(doc, period) {
        doc.fillColor('#000').fontSize(14).font('Bold').text('Період звіту');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Regular')
            .text(`З: ${moment(period.from).format('DD.MM.YYYY')}`, { continued: true })
            .text(`     До: ${moment(period.to).format('DD.MM.YYYY')}`);
        doc.text(`Днів у періоді: ${period.days}`);
        doc.moveDown(1);
    }

    static addFinancialSummary(doc, summary) {
        doc.fontSize(14).font('Bold').fillColor('#000').text('Фінансова зводка');
        doc.moveDown(0.5);

        const startY = doc.y, boxH = 100, boxW = 150, spacing = 25;
        this.drawSummaryBox(doc, 50, startY, boxW, boxH, {
            title: 'Доходи',
            amount: `${formatNumber(summary.income)} ₴`,
            color: '#10B981',
            count: summary.incomeCount
        });
        this.drawSummaryBox(doc, 50 + boxW + spacing, startY, boxW, boxH, {
            title: 'Витрати',
            amount: `${formatNumber(summary.expenses)} ₴`,
            color: '#EF4444',
            count: summary.expenseCount
        });
        this.drawSummaryBox(doc, 50 + (boxW + spacing) * 2, startY, boxW, boxH, {
            title: 'Чистий дохід',
            amount: `${formatNumber(summary.netIncome)} ₴`,
            color: summary.netIncome >= 0 ? '#10B981' : '#EF4444',
            count: summary.totalTransactions
        });
        doc.y = startY + boxH + 20;
        doc.moveDown(1);
    }

    static drawSummaryBox(doc, x, y, w, h, data) {
        doc.rect(x, y, w, h).stroke('#E5E7EB');
        doc.fontSize(10).font('Regular').fillColor('#6B7280')
            .text(data.title, x + 10, y + 15, { width: w - 20, align: 'center' });
        doc.fontSize(16).font('Bold').fillColor(data.color)
            .text(data.amount, x + 10, y + 40, { width: w - 20, align: 'center' });
        doc.fontSize(9).font('Regular').fillColor('#9CA3AF')
            .text(`${data.count} транзакцій`, x + 10, y + 70, { width: w - 20, align: 'center' });
    }

    static addLimitStatus(doc, s) {
        doc.fontSize(14).font('Bold').fillColor('#000').text('Статус ліміту ФОП');
        doc.moveDown(0.5);
        let color = '#10B981', text = 'Норма';
        if (s.percentage >= 100) { color = '#DC2626'; text = 'ПЕРЕВИЩЕНО'; }
        else if (s.percentage >= 90) { color = '#F59E0B'; text = 'Критично'; }
        else if (s.percentage >= 80) { color = '#F59E0B'; text = 'Попередження'; }

        doc.fontSize(11).font('Regular').fillColor('#000')
            .text('Статус: ', { continued: true }).fillColor(color).font('Bold').text(text);

        doc.moveDown(0.3);
        const w = 450, h = 25, x = 50, y = doc.y;
        doc.rect(x, y, w, h).fill('#E5E7EB');
        const fillW = Math.min((w * s.percentage) / 100, w);
        doc.rect(x, y, fillW, h).fill(color);
        doc.rect(x, y, w, h).stroke('#9CA3AF');

        doc.fontSize(11).font('Bold').fillColor('#FFF')
            .text(`${formatNumber(s.percentage)}%`, x, y + 6, { width: w, align: 'center' });

        doc.y = y + h + 15;
        doc.fontSize(10).font('Regular').fillColor('#000')
            .text(`Поточний дохід: ${formatNumber(s.currentIncome)} ₴`)
            .text(`Річний ліміт: ${formatNumber(s.limit)} ₴`)
            .text(`Залишок: ${formatNumber(s.remaining)} ₴`);
        doc.moveDown(1.5);
    }

    static addTopCategories(doc, cats) {
        doc.fontSize(14).font('Bold').fillColor('#000').text('Топ-5 категорій витрат', 50, doc.y);
        doc.moveDown(0.5);
        const top = doc.y, cols = [30, 200, 100, 120], rowH = 25;
        doc.fontSize(10).font('Bold').fillColor('#6B7280');
        doc.text('#', 50, top, { width: cols[0] });
        doc.text('Категорія', 50 + cols[0], top, { width: cols[1] });
        doc.text('Транзакції', 50 + cols[0] + cols[1], top, { width: cols[2] });
        doc.text('Сума', 50 + cols[0] + cols[1] + cols[2], top, { width: cols[3], align: 'right' });
        doc.moveTo(50, top + 18).lineTo(550, top + 18).stroke('#E5E7EB');

        doc.fontSize(10).font('Regular').fillColor('#000');
        let y = top + 25;
        cats.slice(0, 5).forEach((c, i) => {
            doc.text((i + 1).toString(), 50, y, { width: cols[0] });
            doc.text(c.category || 'Інше', 50 + cols[0], y, { width: cols[1] });
            doc.text(c.transactionCount.toString(), 50 + cols[0] + cols[1], y, { width: cols[2] });
            doc.text(`${formatNumber(c.totalSpent)} ₴`, 50 + cols[0] + cols[1] + cols[2], y, { width: cols[3], align: 'right' });
            y += rowH;
            if (i < cats.length - 1) doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke('#F3F4F6');
        });
        doc.y = y + 10;
        doc.moveDown(1);
    }

    static addMonthlyBreakdown(doc, data) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(14).font('Bold').fillColor('#000').text('Помісячний розклад', 50, doc.y);
        doc.moveDown(0.5);
        const top = doc.y, cols = [100, 120, 120, 120], rowH = 25;
        doc.fontSize(10).font('Bold').fillColor('#6B7280');
        doc.text('Місяць', 50, top, { width: cols[0] });
        doc.text('Доходи', 50 + cols[0], top, { width: cols[1], align: 'right' });
        doc.text('Витрати', 50 + cols[0] + cols[1], top, { width: cols[2], align: 'right' });
        doc.text('Чистий дохід', 50 + cols[0] + cols[1] + cols[2], top, { width: cols[3], align: 'right' });
        doc.moveTo(50, top + 18).lineTo(550, top + 18).stroke('#E5E7EB');
        doc.fontSize(10).font('Regular').fillColor('#000');

        let y = top + 25;
        data.forEach((m, i) => {
            const name = moment(m.period).format('MMMM YYYY');
            const net = m.income - m.expenses;
            doc.text(name, 50, y, { width: cols[0] });
            doc.text(`${formatNumber(m.income)} ₴`, 50 + cols[0], y, { width: cols[1], align: 'right' });
            doc.text(`${formatNumber(m.expenses)} ₴`, 50 + cols[0] + cols[1], y, { width: cols[2], align: 'right' });
            doc.fillColor(net >= 0 ? '#10B981' : '#EF4444')
               .text(`${formatNumber(net)} ₴`, 50 + cols[0] + cols[1] + cols[2], y, { width: cols[3], align: 'right' })
               .fillColor('#000');
            y += rowH;
            if (i < data.length - 1) doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke('#F3F4F6');
            if (y > 700 && i < data.length - 1) { doc.addPage(); y = 50; }
        });
        doc.y = y + 10;
    }

    static addFooter(doc) {
        const pages = doc.bufferedPageRange().count;
        for (let i = 0; i < pages; i++) {
            doc.switchToPage(i);
            doc.moveTo(50, 770).lineTo(550, 770).stroke('#E5E7EB');
            doc.fontSize(8).font('Regular').fillColor('#9CA3AF')
                .text(`Згенеровано ${moment().format('DD.MM.YYYY HH:mm')} | FOPSmart`, 50, 775, { align: 'center', width: 500 })
                .text(`Сторінка ${i + 1} з ${pages}`, 50, 785, { align: 'center', width: 500 });
        }
    }
}

module.exports = PDFService;