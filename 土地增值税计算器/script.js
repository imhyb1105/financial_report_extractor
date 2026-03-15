// 土地增值税计算器 - script.js
// 版本：2026.03-001

// 税率配置（四级超率累进税率）
const taxBrackets = [
    { maxRate: 0.50, rate: 0.30, quickDeduction: 0.00, level: 1 },
    { maxRate: 1.00, rate: 0.40, quickDeduction: 0.05, level: 2 },
    { maxRate: 2.00, rate: 0.50, quickDeduction: 0.15, level: 3 },
    { maxRate: Infinity, rate: 0.60, quickDeduction: 0.35, level: 4 }
];

// 格式化金额
function formatMoney(amount) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// 格式化百分比
function formatPercent(value) {
    return (value * 100).toFixed(2) + '%';
}

// 格式化大写金额
function numberToChinese(num) {
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟'];
    const bigUnits = ['', '万', '亿', '兆'];

    if (num === 0) return '零元整';

    const numStr = Math.floor(num).toString();
    let result = '';
    let zeroCount = 0;

    for (let i = 0; i < numStr.length; i++) {
        const digit = parseInt(numStr[i]);
        const position = numStr.length - 1 - i;
        const unitIndex = position % 4;
        const bigUnitIndex = Math.floor(position / 4);

        if (digit === 0) {
            zeroCount++;
        } else {
            if (zeroCount > 0) {
                result += '零';
            }
            result += digits[digit] + units[unitIndex];
            zeroCount = 0;
        }

        if (unitIndex === 0 && bigUnitIndex > 0) {
            if (zeroCount < 4) {
                result += bigUnits[bigUnitIndex];
            }
            zeroCount = 0;
        }
    }

    return result + '元整';
}

// 确定适用税率档次
function getTaxBracket(appreciationRate) {
    for (const bracket of taxBrackets) {
        if (appreciationRate <= bracket.maxRate) {
            return bracket;
        }
    }
    return taxBrackets[taxBrackets.length - 1];
}

// 计算土地增值税
function calculateLandVat() {
    const income = parseFloat(document.getElementById('taxableIncome').value) || 0;
    const deduction = parseFloat(document.getElementById('deductionTotal').value) || 0;

    if (income <= 0) {
        alert('请输入有效的应税收入');
        return;
    }

    if (deduction <= 0) {
        alert('请输入有效的扣除项目金额');
        return;
    }

    // 计算增值额
    const appreciation = income - deduction;

    // 计算增值率
    const appreciationRate = appreciation / deduction;

    // 确定适用税率档次
    const bracket = getTaxBracket(appreciationRate);

    // 计算应纳税额
    // 应纳税额 = 增值额 × 适用税率 - 扣除项目金额 × 速算扣除系数
    let taxAmount = 0;
    let formula = '';

    if (appreciation <= 0) {
        // 无增值或负增值，不征税
        taxAmount = 0;
        formula = '增值额 ≤ 0，无需缴纳土地增值税';
    } else {
        taxAmount = appreciation * bracket.rate - deduction * bracket.quickDeduction;
        taxAmount = Math.max(0, taxAmount); // 确保税额不为负

        formula = `增值额 = ${formatMoney(income)} - ${formatMoney(deduction)} = ${formatMoney(appreciation)}\n`;
        formula += `增值率 = ${formatMoney(appreciation)} ÷ ${formatMoney(deduction)} = ${formatPercent(appreciationRate)}\n`;
        formula += `适用第${bracket.level}档税率：${formatPercent(bracket.rate)}，速算扣除系数：${formatPercent(bracket.quickDeduction)}\n`;
        formula += `应纳税额 = ${formatMoney(appreciation)} × ${formatPercent(bracket.rate)} - ${formatMoney(deduction)} × ${formatPercent(bracket.quickDeduction)}\n`;
        formula += `         = ${formatMoney(taxAmount)}`;
    }

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultIncome').textContent = formatMoney(income);
    document.getElementById('resultDeduction').textContent = formatMoney(deduction);
    document.getElementById('resultAppreciation').textContent = formatMoney(appreciation);
    document.getElementById('resultRate').textContent = formatPercent(appreciationRate);
    document.getElementById('resultTaxRate').textContent = formatPercent(bracket.rate);
    document.getElementById('resultQuickDeduction').textContent = formatPercent(bracket.quickDeduction);
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 表单提交事件
document.getElementById('landVatForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateLandVat();
});

// 输入框实时格式化
document.getElementById('taxableIncome').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});

document.getElementById('deductionTotal').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
