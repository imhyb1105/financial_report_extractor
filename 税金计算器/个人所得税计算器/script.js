// 个人所得税计算器 - script.js
// 版本：2026.03-001

// 综合所得税率表
const wageBrackets = [
    { max: 36000, rate: 0.03, quickDeduction: 0 },
    { max: 144000, rate: 0.10, quickDeduction: 2520 },
    { max: 300000, rate: 0.20, quickDeduction: 16920 },
    { max: 420000, rate: 0.25, quickDeduction: 31920 },
    { max: 660000, rate: 0.30, quickDeduction: 52920 },
    { max: 960000, rate: 0.35, quickDeduction: 85920 },
    { max: Infinity, rate: 0.45, quickDeduction: 181920 }
];

// 全年一次性奖金税率表
const bonusBrackets = [
    { max: 3000, rate: 0.03, quickDeduction: 0 },
    { max: 12000, rate: 0.10, quickDeduction: 210 },
    { max: 25000, rate: 0.20, quickDeduction: 1410 },
    { max: 35000, rate: 0.25, quickDeduction: 2660 },
    { max: 55000, rate: 0.30, quickDeduction: 4410 },
    { max: 80000, rate: 0.35, quickDeduction: 7160 },
    { max: Infinity, rate: 0.45, quickDeduction: 15160 }
];

// 劳务报酬税率表
const laborBrackets = [
    { max: 20000, rate: 0.20, quickDeduction: 0 },
    { max: 50000, rate: 0.30, quickDeduction: 2000 },
    { max: Infinity, rate: 0.40, quickDeduction: 7000 }
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
    return (value * 100) + '%';
}

// 格式化大写金额
function numberToChinese(num) {
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟'];
    const bigUnits = ['', '万', '亿', '兆'];

    if (num === 0) return '零元整';
    if (num < 0) return '负' + numberToChinese(-num);

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

// 获取适用税率档位
function getBracket(taxableIncome, brackets) {
    for (const bracket of brackets) {
        if (taxableIncome <= bracket.max) {
            return bracket;
        }
    }
    return brackets[brackets.length - 1];
}

// 显示结果
function showResult(type, basis, rate, quickDeduction, tax, formula) {
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = type;
    document.getElementById('resultBasis').textContent = formatMoney(basis);
    document.getElementById('resultRate').textContent = formatPercent(rate);
    document.getElementById('resultQuickDeduction').textContent = formatMoney(quickDeduction);
    document.getElementById('resultTax').textContent = formatMoney(tax) + ' (' + numberToChinese(tax) + ')';
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 工资薪金计算
document.getElementById('wageForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const income = parseFloat(document.getElementById('wageIncome').value) || 0;
    const insurance = parseFloat(document.getElementById('wageInsurance').value) || 0;
    const deduction = parseFloat(document.getElementById('wageDeduction').value) || 0;
    const other = parseFloat(document.getElementById('wageOther').value) || 0;

    if (income <= 0) {
        alert('请输入年收入');
        return;
    }

    // 计算应纳税所得额
    const taxableIncome = Math.max(0, income - 60000 - insurance - deduction - other);

    // 获取适用税率
    const bracket = getBracket(taxableIncome, wageBrackets);

    // 计算应纳税额
    const tax = taxableIncome * bracket.rate - bracket.quickDeduction;

    let formula = `应纳税所得额 = ${formatMoney(income)} - 60000 - ${formatMoney(insurance)} - ${formatMoney(deduction)} - ${formatMoney(other)}\n`;
    formula += `             = ${formatMoney(taxableIncome)}\n\n`;
    formula += `适用税率：${formatPercent(bracket.rate)}，速算扣除数：${formatMoney(bracket.quickDeduction)}\n\n`;
    formula += `应纳税额 = ${formatMoney(taxableIncome)} × ${formatPercent(bracket.rate)} - ${formatMoney(bracket.quickDeduction)} = ${formatMoney(tax)}`;

    showResult('综合所得（工资薪金）', taxableIncome, bracket.rate, bracket.quickDeduction, tax, formula);
});

// 全年一次性奖金计算
document.getElementById('bonusForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const bonus = parseFloat(document.getElementById('bonusAmount').value) || 0;
    const method = document.getElementById('bonusMethod').value;

    if (bonus <= 0) {
        alert('请输入奖金金额');
        return;
    }

    let formula = '';

    if (method === 'alone') {
        // 单独计税：除以12找税率
        const monthlyBonus = bonus / 12;
        const bracket = getBracket(monthlyBonus, bonusBrackets.map(b => ({
            max: b.max * 12,
            rate: b.rate,
            quickDeduction: b.quickDeduction * 12
        })));

        const tax = bonus * bracket.rate - bracket.quickDeduction;

        formula = `月均奖金 = ${formatMoney(bonus)} ÷ 12 = ${formatMoney(monthlyBonus)}\n`;
        formula += `适用税率：${formatPercent(bracket.rate)}，速算扣除数：${formatMoney(bracket.quickDeduction)}\n\n`;
        formula += `应纳税额 = ${formatMoney(bonus)} × ${formatPercent(bracket.rate)} - ${formatMoney(bracket.quickDeduction)} = ${formatMoney(tax)}`;

        showResult('全年一次性奖金（单独计税）', bonus, bracket.rate, bracket.quickDeduction, tax, formula);
    } else {
        alert('并入综合所得计算请使用工资薪金计算器，将奖金加到年收入中');
    }
});

// 劳务报酬计算
document.getElementById('laborForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const income = parseFloat(document.getElementById('laborIncome').value) || 0;

    if (income <= 0) {
        alert('请输入劳务报酬收入');
        return;
    }

    // 计算应纳税所得额
    let taxableIncome = 0;
    let formula = '';

    if (income <= 4000) {
        taxableIncome = Math.max(0, income - 800);
        formula = `收入 ≤ 4000元，应纳税所得额 = ${formatMoney(income)} - 800 = ${formatMoney(taxableIncome)}\n`;
    } else {
        taxableIncome = income * 0.8;
        formula = `收入 > 4000元，应纳税所得额 = ${formatMoney(income)} × (1-20%) = ${formatMoney(taxableIncome)}\n`;
    }

    // 获取适用税率
    const bracket = getBracket(taxableIncome, laborBrackets);

    // 计算应纳税额
    const tax = taxableIncome * bracket.rate - bracket.quickDeduction;

    formula += `\n适用税率：${formatPercent(bracket.rate)}，速算扣除数：${formatMoney(bracket.quickDeduction)}\n\n`;
    formula += `应纳税额 = ${formatMoney(taxableIncome)} × ${formatPercent(bracket.rate)} - ${formatMoney(bracket.quickDeduction)} = ${formatMoney(tax)}`;

    showResult('劳务报酬所得', taxableIncome, bracket.rate, bracket.quickDeduction, tax, formula);
});

// 其他所得计算
document.getElementById('otherForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const otherType = document.getElementById('otherType').value;
    const income = parseFloat(document.getElementById('otherIncome').value) || 0;

    if (!otherType) {
        alert('请选择所得类型');
        return;
    }

    if (income <= 0) {
        alert('请输入收入金额');
        return;
    }

    const typeLabels = {
        interest: '利息、股息、红利所得',
        property_rental: '财产租赁所得',
        property_transfer: '财产转让所得',
        contingent: '偶然所得'
    };

    // 其他所得一般按20%税率计算
    const rate = 0.20;
    let taxableIncome = income;
    let formula = '';

    if (otherType === 'property_rental') {
        // 财产租赁：月收入≤4000扣800，>4000扣20%
        if (income <= 4000) {
            taxableIncome = Math.max(0, income - 800);
            formula = `月收入 ≤ 4000元，应纳税所得额 = ${formatMoney(income)} - 800 = ${formatMoney(taxableIncome)}\n`;
        } else {
            taxableIncome = income * 0.8;
            formula = `月收入 > 4000元，应纳税所得额 = ${formatMoney(income)} × (1-20%) = ${formatMoney(taxableIncome)}\n`;
        }
    } else {
        formula = `应纳税所得额 = ${formatMoney(income)}\n`;
    }

    const tax = taxableIncome * rate;

    formula += `\n适用税率：20%\n\n`;
    formula += `应纳税额 = ${formatMoney(taxableIncome)} × 20% = ${formatMoney(tax)}`;

    showResult(typeLabels[otherType], taxableIncome, rate, 0, tax, formula);
});
