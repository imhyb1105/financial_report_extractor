// 消费税计算器 - script.js
// 版本：2026.03-001

// 消费税配置
const taxConfig = {
    // 烟类
    cigarette_a: { label: '甲类卷烟', ad_valorem: 0.56, specific: 0.003, unit: '元/支', method: '复合计征' },
    cigarette_b: { label: '乙类卷烟', ad_valorem: 0.36, specific: 0.003, unit: '元/支', method: '复合计征' },
    cigarette_wholesale: { label: '卷烟批发', ad_valorem: 0.11, specific: 0.005, unit: '元/支', method: '复合计征' },
    cigar: { label: '雪茄烟', ad_valorem: 0.36, specific: 0, unit: '', method: '从价计征' },
    cut_tobacco: { label: '烟丝', ad_valorem: 0.30, specific: 0, unit: '', method: '从价计征' },
    // 酒类
    baijiu: { label: '白酒', ad_valorem: 0.20, specific: 0.5, unit: '元/500克', method: '复合计征' },
    yellow_wine: { label: '黄酒', ad_valorem: 0, specific: 240, unit: '元/吨', method: '从量计征' },
    beer_a: { label: '甲类啤酒', ad_valorem: 0, specific: 250, unit: '元/吨', method: '从量计征' },
    beer_b: { label: '乙类啤酒', ad_valorem: 0, specific: 220, unit: '元/吨', method: '从量计征' },
    other_alcohol: { label: '其他酒', ad_valorem: 0.10, specific: 0, unit: '', method: '从价计征' },
    // 化妆品
    high_cosmetics: { label: '高档化妆品', ad_valorem: 0.15, specific: 0, unit: '', method: '从价计征' },
    // 成品油
    gasoline: { label: '汽油', ad_valorem: 0, specific: 1.52, unit: '元/升', method: '从量计征' },
    diesel: { label: '柴油', ad_valorem: 0, specific: 1.20, unit: '元/升', method: '从量计征' },
    // 小汽车
    car_small: { label: '小汽车（≤1.0L）', ad_valorem: 0.01, specific: 0, unit: '', method: '从价计征' },
    car_1_0_1_5: { label: '小汽车（1.0L-1.5L）', ad_valorem: 0.03, specific: 0, unit: '', method: '从价计征' },
    car_1_5_2_0: { label: '小汽车（1.5L-2.0L）', ad_valorem: 0.05, specific: 0, unit: '', method: '从价计征' },
    car_2_0_2_5: { label: '小汽车（2.0L-2.5L）', ad_valorem: 0.09, specific: 0, unit: '', method: '从价计征' },
    car_2_5_3_0: { label: '小汽车（2.5L-3.0L）', ad_valorem: 0.12, specific: 0, unit: '', method: '从价计征' },
    car_3_0_4_0: { label: '小汽车（3.0L-4.0L）', ad_valorem: 0.25, specific: 0, unit: '', method: '从价计征' },
    car_over4_0: { label: '小汽车（＞4.0L）', ad_valorem: 0.40, specific: 0, unit: '', method: '从价计征' },
    // 其他
    jewelry: { label: '贵重首饰珠宝玉石', ad_valorem: 0.10, specific: 0, unit: '', method: '从价计征' },
    fireworks: { label: '鞭炮焰火', ad_valorem: 0.15, specific: 0, unit: '', method: '从价计征' }
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

// 通用计算函数
function calculateConsumptionTax(type, amount, quantity) {
    const config = taxConfig[type];
    if (!config) {
        alert('请选择应税消费品类型');
        return;
    }

    let taxAmount = 0;
    let basis = '';
    let rateDisplay = '';
    let formula = '';

    if (config.method === '从价计征') {
        if (!amount || amount <= 0) {
            alert('请输入销售额');
            return;
        }
        taxAmount = amount * config.ad_valorem;
        basis = formatMoney(amount);
        rateDisplay = (config.ad_valorem * 100) + '%';
        formula = `应纳税额 = ${formatMoney(amount)} × ${rateDisplay} = ${formatMoney(taxAmount)}`;

    } else if (config.method === '从量计征') {
        if (!quantity || quantity <= 0) {
            alert('请输入销售数量');
            return;
        }
        taxAmount = quantity * config.specific;
        basis = quantity + config.unit.replace('元/', '');
        rateDisplay = config.specific + config.unit;
        formula = `应纳税额 = ${quantity} × ${config.specific}${config.unit} = ${formatMoney(taxAmount)}`;

    } else if (config.method === '复合计征') {
        if (!amount || amount <= 0) {
            alert('请输入销售额');
            return;
        }
        if (!quantity || quantity <= 0) {
            alert('请输入销售数量');
            return;
        }
        const adValoremTax = amount * config.ad_valorem;
        const specificTax = quantity * config.specific;
        taxAmount = adValoremTax + specificTax;
        basis = `${formatMoney(amount)} + ${quantity}${config.unit.replace('元/', '')}`;
        rateDisplay = `${(config.ad_valorem * 100)}% + ${config.specific}${config.unit}`;
        formula = `从价税额 = ${formatMoney(amount)} × ${(config.ad_valorem * 100)}% = ${formatMoney(adValoremTax)}\n`;
        formula += `从量税额 = ${quantity} × ${config.specific}${config.unit} = ${formatMoney(specificTax)}\n`;
        formula += `应纳税额 = ${formatMoney(adValoremTax)} + ${formatMoney(specificTax)} = ${formatMoney(taxAmount)}`;
    }

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = config.label;
    document.getElementById('resultBasis').textContent = basis;
    document.getElementById('resultMethod').textContent = config.method;
    document.getElementById('resultRate').textContent = rateDisplay;
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 烟类表单
document.getElementById('tobaccoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('tobaccoType').value;
    const amount = parseFloat(document.getElementById('tobaccoAmount').value) || 0;
    const quantity = parseFloat(document.getElementById('tobaccoQuantity').value) || 0;
    calculateConsumptionTax(type, amount, quantity);
});

// 酒类表单
document.getElementById('alcoholForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('alcoholType').value;
    const amount = parseFloat(document.getElementById('alcoholAmount').value) || 0;
    const quantity = parseFloat(document.getElementById('alcoholQuantity').value) || 0;
    calculateConsumptionTax(type, amount, quantity);
});

// 化妆品表单
document.getElementById('cosmeticsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('cosmeticsType').value;
    const amount = parseFloat(document.getElementById('cosmeticsAmount').value) || 0;
    calculateConsumptionTax(type, amount, 0);
});

// 成品油表单
document.getElementById('fuelForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('fuelType').value;
    const quantity = parseFloat(document.getElementById('fuelQuantity').value) || 0;
    calculateConsumptionTax(type, 0, quantity);
});

// 小汽车表单
document.getElementById('carForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('carType').value;
    const amount = parseFloat(document.getElementById('carAmount').value) || 0;
    calculateConsumptionTax(type, amount, 0);
});

// 其他表单
document.getElementById('otherForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const type = document.getElementById('otherType').value;
    const amount = parseFloat(document.getElementById('otherAmount').value) || 0;
    calculateConsumptionTax(type, amount, 0);
});
