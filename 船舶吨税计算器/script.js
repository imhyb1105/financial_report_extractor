// 船舶吨税计算器 - script.js
// 版本：2026.03-001

// 税率配置
const taxConfig = {
    normal: {
        label: '普通税率',
        30: [
            { maxTonnage: 2000, rate: 2.9 },
            { maxTonnage: 10000, rate: 3.4 },
            { maxTonnage: 50000, rate: 3.9 },
            { maxTonnage: Infinity, rate: 4.6 }
        ],
        90: [
            { maxTonnage: 2000, rate: 8.7 },
            { maxTonnage: 10000, rate: 10.2 },
            { maxTonnage: 50000, rate: 11.7 },
            { maxTonnage: Infinity, rate: 13.8 }
        ]
    },
    preferential: {
        label: '优惠税率',
        30: [
            { maxTonnage: 2000, rate: 1.5 },
            { maxTonnage: 10000, rate: 1.7 },
            { maxTonnage: 50000, rate: 2.0 },
            { maxTonnage: Infinity, rate: 2.3 }
        ],
        90: [
            { maxTonnage: 2000, rate: 4.5 },
            { maxTonnage: 10000, rate: 5.1 },
            { maxTonnage: 50000, rate: 6.0 },
            { maxTonnage: Infinity, rate: 6.9 }
        ]
    }
};

// 执照期限配置
const licenseConfig = {
    30: { label: '30天', multiplier: 1 },
    90: { label: '90天', multiplier: 1 },
    365: { label: '1年', multiplier: 4 }
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

// 获取适用税率
function getApplicableRate(tonnage, period, rateType) {
    const rates = taxConfig[rateType][period];
    for (const tier of rates) {
        if (tonnage <= tier.maxTonnage) {
            return tier.rate;
        }
    }
    return rates[rates.length - 1].rate;
}

// 计算船舶吨税
function calculateTonnageTax() {
    const netTonnage = parseInt(document.getElementById('netTonnage').value) || 0;
    const licensePeriod = document.getElementById('licensePeriod').value;
    const rateType = document.getElementById('rateType').value;

    if (netTonnage <= 0) {
        alert('请输入有效的船舶净吨位');
        return;
    }

    if (!licensePeriod) {
        alert('请选择执照期限');
        return;
    }

    if (!rateType) {
        alert('请选择适用税率类型');
        return;
    }

    // 确定计算用的期限（1年按90天计算）
    const calcPeriod = licensePeriod === '365' ? '90' : licensePeriod;
    const multiplier = licenseConfig[licensePeriod].multiplier;

    // 获取适用税率
    const rate = getApplicableRate(netTonnage, parseInt(calcPeriod), rateType);

    // 计算应纳税额
    const tax = netTonnage * rate * multiplier;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultTonnage').textContent = netTonnage.toLocaleString() + ' 吨';
    document.getElementById('resultPeriod').textContent = licenseConfig[licensePeriod].label;
    document.getElementById('resultRateType').textContent = taxConfig[rateType].label;
    document.getElementById('resultRate').textContent = rate + ' 元/吨' + (multiplier > 1 ? ' × ' + multiplier : '');
    document.getElementById('resultTax').textContent = formatMoney(tax) + ' (' + numberToChinese(tax) + ')';

    let formula = `应纳税额 = ${netTonnage.toLocaleString()}吨 × ${rate}元/吨`;
    if (multiplier > 1) {
        formula += ` × ${multiplier}`;
    }
    formula += ` = ${formatMoney(tax)}`;

    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 表单提交事件
document.getElementById('tonnageForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateTonnageTax();
});
