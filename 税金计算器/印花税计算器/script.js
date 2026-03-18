// 印花税计算器 - script.js
// 版本：2026.03-001

// 税率配置
const taxRates = {
    loan: { label: '借款合同', rate: 0.00005, unit: '0.05‰' },
    buy: { label: '买卖合同', rate: 0.0003, unit: '0.3‰' },
    lease_building: { label: '建筑安装工程承包合同', rate: 0.0003, unit: '0.3‰' },
    lease_property: { label: '财产租赁合同', rate: 0.001, unit: '1‰' },
    transport: { label: '货物运输合同', rate: 0.0005, unit: '0.5‰' },
    warehouse: { label: '仓储保管合同', rate: 0.001, unit: '1‰' },
    insurance: { label: '财产保险合同', rate: 0.001, unit: '1‰' },
    tech: { label: '技术合同', rate: 0.0003, unit: '0.3‰' },
    transfer: { label: '产权转移书据', rate: 0.0005, unit: '0.5‰' },
    business: { label: '营业账簿', rate: 0.00025, unit: '0.25‰' },
    stock_trade: { label: '证券交易', rate: 0.001, unit: '1‰' },
    land_right: { label: '土地使用权出让/转让', rate: 0.0005, unit: '0.5‰' }
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

// 计算印花税
function calculateStampTax() {
    const contractType = document.getElementById('contractType').value;
    const amount = parseFloat(document.getElementById('contractAmount').value) || 0;
    const copies = parseInt(document.getElementById('contractCopies').value) || 1;
    const isFixedAmount = document.getElementById('fixedAmount').checked;

    if (!contractType && !isFixedAmount) {
        alert('请选择应税凭证类型');
        return;
    }

    let taxAmount = 0;
    let rateDisplay = '';
    let formula = '';

    if (isFixedAmount) {
        // 定额税率
        taxAmount = 5 * copies;
        rateDisplay = '5元/件';
        formula = `应纳税额 = 5元 × ${copies}份 = ${taxAmount}元`;
    } else {
        // 比例税率
        const taxConfig = taxRates[contractType];
        taxAmount = amount * taxConfig.rate * copies;
        rateDisplay = taxConfig.unit;

        formula = `应纳税额 = ${formatMoney(amount)} × ${taxConfig.unit}`;
        if (copies > 1) {
            formula += ` × ${copies}份`;
        }
        formula += ` = ${formatMoney(taxAmount)}`;
    }

    // 确保税额不低于0.1元（不足0.1元按0.1元计算）
    if (taxAmount > 0 && taxAmount < 0.1) {
        taxAmount = 0.1;
        formula += '（不足0.1元按0.1元计算）';
    }

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = isFixedAmount ? '定额税率凭证' : taxRates[contractType].label;
    document.getElementById('resultAmount').textContent = formatMoney(amount);
    document.getElementById('resultRate').textContent = rateDisplay;
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 表单提交事件
document.getElementById('stampTaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateStampTax();
});

// 定额税率复选框变化时禁用/启用下拉框
document.getElementById('fixedAmount').addEventListener('change', function() {
    const contractType = document.getElementById('contractType');
    const contractAmount = document.getElementById('contractAmount');

    if (this.checked) {
        contractType.disabled = true;
        contractAmount.disabled = true;
        contractType.removeAttribute('required');
        contractAmount.removeAttribute('required');
    } else {
        contractType.disabled = false;
        contractAmount.disabled = false;
        contractType.setAttribute('required', '');
        contractAmount.setAttribute('required', '');
    }
});

// 输入框实时格式化
document.getElementById('contractAmount').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
