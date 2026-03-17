// 资源税计算器 - script.js
// 版本：2026.03-002
// 支持：从价计征 + 从量计征

// 从价计征税率配置（比例税率）
const adValoremConfig = {
    crude_oil: { label: '原油', minRate: 6, maxRate: 6, unit: '%' },
    natural_gas: { label: '天然气', minRate: 6, maxRate: 6, unit: '%' },
    coal: { label: '煤炭', minRate: 2, maxRate: 10, unit: '%' },
    shale_gas: { label: '页岩气', minRate: 1, maxRate: 2, unit: '%' },
    iron_ore: { label: '铁矿', minRate: 1, maxRate: 9, unit: '%' },
    gold_ore: { label: '金矿', minRate: 2, maxRate: 6, unit: '%' },
    copper_ore: { label: '铜矿', minRate: 2, maxRate: 8, unit: '%' },
    aluminum_ore: { label: '铝土矿', minRate: 2, maxRate: 9, unit: '%' },
    rare_earth: { label: '稀土', minRate: 7, maxRate: 12, unit: '%' },
    lead_zinc_ore: { label: '铅锌矿', minRate: 2, maxRate: 8, unit: '%' },
    salt: { label: '盐', minRate: 1, maxRate: 5, unit: '%' },
    limestone: { label: '石灰岩', minRate: 1, maxRate: 6, unit: '%' },
    granite: { label: '花岗岩', minRate: 2, maxRate: 6, unit: '%' },
    marble: { label: '大理岩', minRate: 2, maxRate: 6, unit: '%' },
    clay_sand: { label: '粘土、砂石', minRate: 1, maxRate: 5, unit: '%' },
    other_metal: { label: '其他有色金属矿', minRate: 2, maxRate: 8, unit: '%' },
    other_nonmetal: { label: '其他非金属矿', minRate: 2, maxRate: 6, unit: '%' }
};

// 从量计征税率配置（定额税率）
const quantityConfig = {
    geothermal: { label: '地热', minRate: 1, maxRate: 30, unit: '元/立方米' },
    mineral_water: { label: '矿泉水', minRate: 1, maxRate: 30, unit: '元/立方米' },
    sand_gravel: { label: '砂石', minRate: 0.1, maxRate: 5, unit: '元/立方米' }
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

// 切换计征方式
function toggleTaxType() {
    const taxType = document.getElementById('taxType').value;
    const adValoremSection = document.getElementById('adValoremSection');
    const fromQuantitySection = document.getElementById('fromQuantitySection');

    if (taxType === 'ad_valorem') {
        adValoremSection.classList.remove('d-none');
        fromQuantitySection.classList.add('d-none');
    } else {
        adValoremSection.classList.add('d-none');
        fromQuantitySection.classList.remove('d-none');
    }

    // 隐藏结果
    document.getElementById('result').classList.add('d-none');
}

// 计算从价计征资源税
function calculateAdValorem() {
    const resourceType = document.getElementById('resourceTypeAdValorem').value;
    const salesAmount = parseFloat(document.getElementById('salesAmount').value) || 0;
    const taxRate = parseFloat(document.getElementById('taxRateAdValorem').value) || 0;

    if (!resourceType) {
        alert('请选择资源类型');
        return false;
    }

    if (salesAmount <= 0) {
        alert('请输入有效的销售额');
        return false;
    }

    if (taxRate <= 0) {
        alert('请输入有效的适用税率');
        return false;
    }

    const config = adValoremConfig[resourceType];

    // 计算应纳税额
    const taxAmount = salesAmount * (taxRate / 100);

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultTaxType').textContent = '从价计征';
    document.getElementById('resultType').textContent = config.label;
    document.getElementById('resultBasis').textContent = formatMoney(salesAmount);
    document.getElementById('resultRate').textContent = taxRate + '%';
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';

    const formula = `应纳税额 = 销售额 × 税率\n= ${formatMoney(salesAmount)} × ${taxRate}%\n= ${formatMoney(taxAmount)}`;
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;

    return true;
}

// 计算从量计征资源税
function calculateFromQuantity() {
    const resourceType = document.getElementById('resourceTypeQuantity').value;
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const unit = document.getElementById('unit').value;
    const taxRate = parseFloat(document.getElementById('taxRateQuantity').value) || 0;

    if (!resourceType) {
        alert('请选择资源类型');
        return false;
    }

    if (quantity <= 0) {
        alert('请输入有效的销售数量');
        return false;
    }

    if (taxRate <= 0) {
        alert('请输入有效的适用税额');
        return false;
    }

    const config = quantityConfig[resourceType];

    // 计算应纳税额
    const taxAmount = quantity * taxRate;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultTaxType').textContent = '从量计征';
    document.getElementById('resultType').textContent = config.label;
    document.getElementById('resultBasis').textContent = quantity.toLocaleString() + ' ' + unitNames[unit];
    document.getElementById('resultRate').textContent = taxRate + ' ' + config.unit;
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';

    const formula = `应纳税额 = 销售数量 × 单位税额\n= ${quantity.toLocaleString()}${unitNames[unit]} × ${taxRate}元/${unitNames[unit]}\n= ${formatMoney(taxAmount)}`;
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;

    return true;
}

// 计算资源税
function calculateResourceTax() {
    const taxType = document.getElementById('taxType').value;

    if (taxType === 'ad_valorem') {
        return calculateAdValorem();
    } else {
        return calculateFromQuantity();
    }
}

// 资源类型变化时自动填充推荐税率
document.getElementById('resourceTypeAdValorem').addEventListener('change', function() {
    const type = this.value;
    if (type && adValoremConfig[type]) {
        const config = adValoremConfig[type];
        const avgRate = (config.minRate + config.maxRate) / 2;
        document.getElementById('taxRateAdValorem').value = avgRate.toFixed(1);
        document.getElementById('taxRateAdValorem').placeholder = `推荐范围：${config.minRate}-${config.maxRate}%`;
    }
});

document.getElementById('resourceTypeQuantity').addEventListener('change', function() {
    const type = this.value;
    if (type && quantityConfig[type]) {
        const config = quantityConfig[type];
        const avgRate = (config.minRate + config.maxRate) / 2;
        document.getElementById('taxRateQuantity').value = avgRate.toFixed(1);
        document.getElementById('taxRateQuantity').placeholder = `推荐范围：${config.minRate}-${config.maxRate}${config.unit}`;
    }
});

// 计征方式切换
document.getElementById('taxType').addEventListener('change', toggleTaxType);

// 表单提交事件
document.getElementById('resourceTaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateResourceTax();
});

// 输入框实时格式化
document.getElementById('salesAmount').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});

document.getElementById('quantity').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
