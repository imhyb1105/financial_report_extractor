// 资源税计算器 - script.js
// 版本：2026.03-001

// 资源税配置
const resourceConfig = {
    crude_oil: { label: '原油', minRate: 6, maxRate: 30, unit: '元/吨', defaultUnit: 'ton' },
    natural_gas: { label: '天然气', minRate: 2, maxRate: 15, unit: '元/千立方米', defaultUnit: 'thousand_cubic' },
    coal: { label: '煤炭', minRate: 2, maxRate: 20, unit: '元/吨', defaultUnit: 'ton' },
    other_coal: { label: '其他煤炭', minRate: 0.3, maxRate: 5, unit: '元/吨', defaultUnit: 'ton' },
    iron_ore: { label: '铁矿', minRate: 5, maxRate: 25, unit: '元/吨', defaultUnit: 'ton' },
    gold_ore: { label: '金矿', minRate: 2, maxRate: 10, unit: '元/吨', defaultUnit: 'ton' },
    copper_ore: { label: '铜矿', minRate: 3, maxRate: 15, unit: '元/吨', defaultUnit: 'ton' },
    aluminum_ore: { label: '铝土矿', minRate: 3, maxRate: 20, unit: '元/吨', defaultUnit: 'ton' },
    rare_earth: { label: '稀土', minRate: 7.5, maxRate: 30, unit: '元/吨', defaultUnit: 'ton' },
    other_metal: { label: '其他有色金属矿', minRate: 2, maxRate: 20, unit: '元/吨', defaultUnit: 'ton' },
    salt: { label: '盐', minRate: 2, maxRate: 10, unit: '元/吨', defaultUnit: 'ton' },
    limestone: { label: '石灰石', minRate: 1, maxRate: 10, unit: '元/吨', defaultUnit: 'ton' },
    clay: { label: '粘土、砂石', minRate: 0.1, maxRate: 5, unit: '元/吨或立方米', defaultUnit: 'ton' },
    granite: { label: '花岗岩', minRate: 3, maxRate: 15, unit: '元/立方米', defaultUnit: 'cubic' },
    marble: { label: '大理石', minRate: 3, maxRate: 15, unit: '元/立方米', defaultUnit: 'cubic' },
    other_nonmetal: { label: '其他非金属矿', minRate: 0.5, maxRate: 20, unit: '元/吨或立方米', defaultUnit: 'ton' }
};

// 单位名称映射
const unitNames = {
    ton: '吨',
    cubic: '立方米',
    thousand_cubic: '千立方米'
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

// 计算资源税
function calculateResourceTax() {
    const resourceType = document.getElementById('resourceType').value;
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const unit = document.getElementById('unit').value;
    const rate = parseFloat(document.getElementById('taxRate').value) || 0;

    if (!resourceType) {
        alert('请选择资源类型');
        return;
    }

    if (quantity <= 0) {
        alert('请输入有效的销售/开采数量');
        return;
    }

    if (rate <= 0) {
        alert('请输入有效的适用税额');
        return;
    }

    const config = resourceConfig[resourceType];

    // 计算应纳税额
    const taxAmount = quantity * rate;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = config.label;
    document.getElementById('resultQuantity').textContent = quantity.toLocaleString() + ' ' + unitNames[unit];
    document.getElementById('resultRate').textContent = rate + ' ' + config.unit;
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';

    const formula = `应纳税额 = ${quantity.toLocaleString()}${unitNames[unit]} × ${rate}${config.unit} = ${formatMoney(taxAmount)}`;
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 资源类型变化时自动填充推荐税额和单位
document.getElementById('resourceType').addEventListener('change', function() {
    const type = this.value;
    if (type && resourceConfig[type]) {
        const config = resourceConfig[type];
        const avgRate = (config.minRate + config.maxRate) / 2;
        document.getElementById('taxRate').value = avgRate.toFixed(1);
        document.getElementById('taxRate').placeholder = `推荐范围：${config.minRate}-${config.maxRate}${config.unit}`;
        document.getElementById('unit').value = config.defaultUnit;
    }
});

// 表单提交事件
document.getElementById('resourceTaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateResourceTax();
});

// 输入框实时格式化
document.getElementById('quantity').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
