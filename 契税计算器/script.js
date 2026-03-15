// 契税计算器 - script.js
// 版本：2026.03-001

// 税率配置
const taxRates = {
    first_small: { label: '首套房（≤140㎡）', rate: 0.01, unit: '1%' },
    first_large: { label: '首套房（＞140㎡）', rate: 0.015, unit: '1.5%' },
    second_small: { label: '二套房（≤140㎡）', rate: 0.01, unit: '1%' },
    second_large: { label: '二套房（＞140㎡）', rate: 0.02, unit: '2%' },
    third: { label: '三套及以上', rate: 0.03, unit: '3%' }
};

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

// 计算契税
function calculateDeedTax() {
    const houseType = document.getElementById('houseType').value;
    const price = parseFloat(document.getElementById('housePrice').value) || 0;
    const area = parseFloat(document.getElementById('houseArea').value) || 0;

    if (!houseType) {
        alert('请选择购房类型');
        return;
    }

    if (price <= 0) {
        alert('请输入有效的房屋成交价格');
        return;
    }

    // 验证面积与选择的类型是否匹配
    if (area > 0) {
        const isSmall = area <= 140;
        const selectedSmall = houseType.includes('small');
        if (isSmall !== selectedSmall && houseType !== 'third') {
            console.log('提示：选择的面积档位与输入面积不完全匹配，以选择的类型为准');
        }
    }

    const taxConfig = taxRates[houseType];
    const taxAmount = price * taxConfig.rate;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = taxConfig.label;
    document.getElementById('resultPrice').textContent = formatMoney(price);
    document.getElementById('resultRate').textContent = taxConfig.unit;
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';

    const formula = `应纳契税 = ${formatMoney(price)} × ${taxConfig.unit} = ${formatMoney(taxAmount)}`;
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 表单提交事件
document.getElementById('deedTaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateDeedTax();
});

// 输入框实时格式化
document.getElementById('housePrice').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
