// 环境保护税计算器 - script.js
// 版本：2026.03-001

// 配置
const config = {
    // 大气污染物
    air: {
        so2: { label: '二氧化硫', equivalent: 0.95 },
        nox: { label: '氮氧化物', equivalent: 0.95 },
        co: { label: '一氧化碳', equivalent: 16.7 },
        pm: { label: '一般性粉尘', equivalent: 4 }
    },
    // 水污染物
    water: {
        cod: { label: '化学需氧量COD', equivalent: 1 },
        nh3n: { label: '氨氮', equivalent: 0.8 },
        total_phosphorus: { label: '总磷', equivalent: 0.25 },
        total_nitrogen: { label: '总氮', equivalent: 0.8 }
    },
    // 固体废物
    solid: {
        hazardous: { label: '危险废物', rate: 1000, unit: '元/吨' },
        smelting_slag: { label: '冶炼渣', rate: 25, unit: '元/吨' },
        fly_ash: { label: '粉煤灰', rate: 25, unit: '元/吨' },
        slag: { label: '炉渣', rate: 25, unit: '元/吨' },
        coal_gangue: { label: '煤矸石', rate: 5, unit: '元/吨' },
        tailings: { label: '尾矿', rate: 15, unit: '元/吨' },
        other: { label: '其他固体废物', rate: 25, unit: '元/吨' }
    },
    // 噪声
    noise: {
        level_1: { label: '超标1-3分贝', rate: 350, unit: '元/月' },
        level_2: { label: '超标4-6分贝', rate: 700, unit: '元/月' },
        level_3: { label: '超标7-9分贝', rate: 1400, unit: '元/月' },
        level_4: { label: '超标10-12分贝', rate: 2800, unit: '元/月' },
        level_5: { label: '超标13-15分贝', rate: 5600, unit: '元/月' },
        level_6: { label: '超标16分贝以上', rate: 11200, unit: '元/月' }
    }
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

// 显示结果
function showResult(type, basis, rate, tax, formula) {
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = type;
    document.getElementById('resultBasis').textContent = basis;
    document.getElementById('resultRate').textContent = rate;
    document.getElementById('resultTax').textContent = formatMoney(tax) + ' (' + numberToChinese(tax) + ')';
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 大气污染物计算
document.getElementById('airForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const pollutant = document.getElementById('airPollutant').value;
    const emission = parseFloat(document.getElementById('airEmission').value) || 0;
    const taxRate = parseFloat(document.getElementById('airTaxRate').value) || 1.2;

    if (!pollutant) {
        alert('请选择污染物类型');
        return;
    }

    const pollutantConfig = config.air[pollutant];
    const equivalents = emission / pollutantConfig.equivalent;
    const tax = equivalents * taxRate;

    const formula = `污染当量数 = ${emission}kg ÷ ${pollutantConfig.equivalent}kg/当量 = ${equivalents.toFixed(2)}当量\n`;
    formula += `应纳税额 = ${equivalents.toFixed(2)}当量 × ${taxRate}元/当量 = ${formatMoney(tax)}`;

    showResult(pollutantConfig.label, `${equivalents.toFixed(2)}污染当量`, `${taxRate}元/污染当量`, tax, formula);
});

// 水污染物计算
document.getElementById('waterForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const pollutant = document.getElementById('waterPollutant').value;
    const emission = parseFloat(document.getElementById('waterEmission').value) || 0;
    const taxRate = parseFloat(document.getElementById('waterTaxRate').value) || 1.4;

    if (!pollutant) {
        alert('请选择污染物类型');
        return;
    }

    const pollutantConfig = config.water[pollutant];
    const equivalents = emission / pollutantConfig.equivalent;
    const tax = equivalents * taxRate;

    const formula = `污染当量数 = ${emission}kg ÷ ${pollutantConfig.equivalent}kg/当量 = ${equivalents.toFixed(2)}当量\n`;
    formula += `应纳税额 = ${equivalents.toFixed(2)}当量 × ${taxRate}元/当量 = ${formatMoney(tax)}`;

    showResult(pollutantConfig.label, `${equivalents.toFixed(2)}污染当量`, `${taxRate}元/污染当量`, tax, formula);
});

// 固体废物计算
document.getElementById('solidForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const solidType = document.getElementById('solidType').value;
    const quantity = parseFloat(document.getElementById('solidQuantity').value) || 0;

    if (!solidType) {
        alert('请选择固体废物类型');
        return;
    }

    const solidConfig = config.solid[solidType];
    const tax = quantity * solidConfig.rate;

    const formula = `应纳税额 = ${quantity}吨 × ${solidConfig.rate}元/吨 = ${formatMoney(tax)}`;

    showResult(solidConfig.label, `${quantity}吨`, `${solidConfig.rate}元/吨`, tax, formula);
});

// 噪声计算
document.getElementById('noiseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const noiseLevel = document.getElementById('noiseLevel').value;
    const months = parseInt(document.getElementById('noiseMonths').value) || 1;

    if (!noiseLevel) {
        alert('请选择噪声超标档位');
        return;
    }

    const noiseConfig = config.noise[noiseLevel];
    const tax = noiseConfig.rate * months;

    const formula = `应纳税额 = ${noiseConfig.rate}元/月 × ${months}月 = ${formatMoney(tax)}`;

    showResult(noiseConfig.label, `${months}个月`, `${noiseConfig.rate}元/月`, tax, formula);
});

// 固体废物类型变化时自动填充税率
document.getElementById('solidType').addEventListener('change', function() {
    const type = this.value;
    if (type && config.solid[type]) {
        // 税率已在select中显示，此处仅作提示
    }
});
