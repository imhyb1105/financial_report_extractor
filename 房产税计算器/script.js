// 房产税计算器 - script.js
// 版本：2026.03-001

// 格式化金额
function formatMoney(amount) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
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

// 从价计征计算
function calculateFromValue() {
    const propertyValue = parseFloat(document.getElementById('propertyValue').value) || 0;
    const deductionRate = parseFloat(document.getElementById('deductionRate').value) || 30;

    if (propertyValue <= 0) {
        alert('请输入有效的房产原值');
        return;
    }

    const taxBasis = propertyValue * (1 - deductionRate / 100);
    const taxAmount = taxBasis * 0.012;
    const monthlyTax = taxAmount / 12;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = '从价计征（自用）';
    document.getElementById('resultBasis').textContent = formatMoney(taxBasis) + '（房产原值扣除' + deductionRate + '%）';
    document.getElementById('resultRate').textContent = '1.2%';
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + '/年 (' + numberToChinese(taxAmount) + ')';
    document.getElementById('resultMonthlyTax').textContent = formatMoney(monthlyTax) + '/月';

    const formula = `年应纳税额 = ${formatMoney(propertyValue)} × (1 - ${deductionRate}%) × 1.2%\n`;
    formula += `             = ${formatMoney(taxBasis)} × 1.2%\n`;
    formula += `             = ${formatMoney(taxAmount)}`;
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 从租计征计算
function calculateFromRent() {
    const rentIncome = parseFloat(document.getElementById('rentIncome').value) || 0;

    if (rentIncome <= 0) {
        alert('请输入有效的年租金收入');
        return;
    }

    const taxAmount = rentIncome * 0.12;
    const monthlyTax = taxAmount / 12;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = '从租计征（出租）';
    document.getElementById('resultBasis').textContent = formatMoney(rentIncome) + '（年租金收入）';
    document.getElementById('resultRate').textContent = '12%';
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + '/年 (' + numberToChinese(taxAmount) + ')';
    document.getElementById('resultMonthlyTax').textContent = formatMoney(monthlyTax) + '/月';

    const formula = `年应纳税额 = ${formatMoney(rentIncome)} × 12% = ${formatMoney(taxAmount)}`;
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 从价计征表单提交
document.getElementById('fromValueForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateFromValue();
});

// 从租计征表单提交
document.getElementById('fromRentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateFromRent();
});

// 输入框实时格式化
document.getElementById('propertyValue').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});

document.getElementById('rentIncome').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
