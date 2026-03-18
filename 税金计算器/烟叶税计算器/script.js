// 烟叶税计算器 - script.js
// 版本：2026.03-001

// 税率配置
const TAX_RATE = 0.20; // 20%

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

// 计算烟叶税
function calculateTobaccoTax() {
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value) || 0;
    const subsidyRate = parseFloat(document.getElementById('subsidyRate').value) || 0;

    if (purchasePrice <= 0) {
        alert('请输入有效的收购价款');
        return;
    }

    // 计算价外补贴
    const subsidy = purchasePrice * (subsidyRate / 100);

    // 计算收购金额
    const purchaseAmount = purchasePrice + subsidy;

    // 计算应纳税额
    const tax = purchaseAmount * TAX_RATE;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultPrice').textContent = formatMoney(purchasePrice);
    document.getElementById('resultSubsidy').textContent = formatMoney(subsidy) + ' (' + subsidyRate + '%)';
    document.getElementById('resultAmount').textContent = formatMoney(purchaseAmount);
    document.getElementById('resultTax').textContent = formatMoney(tax) + ' (' + numberToChinese(tax) + ')';

    // 计算公式
    const formula = `收购金额 = ${formatMoney(purchasePrice)} × (1 + ${subsidyRate}%) = ${formatMoney(purchaseAmount)}
应纳税额 = ${formatMoney(purchaseAmount)} × 20% = ${formatMoney(tax)}`;

    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 表单提交事件
document.getElementById('tobaccoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateTobaccoTax();
});
