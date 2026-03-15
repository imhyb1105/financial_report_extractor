// 城镇土地使用税计算器 - script.js
// 版本：2026.03-001

// 城市规模配置
const cityTierConfig = {
    large_city: { label: '大城市（50万人以上）', minRate: 1.5, maxRate: 30 },
    medium_city: { label: '中等城市（20-50万人）', minRate: 1.2, maxRate: 24 },
    small_city: { label: '小城市（20万人以下）', minRate: 0.9, maxRate: 18 },
    town: { label: '县城、建制镇、工矿区', minRate: 0.6, maxRate: 12 }
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

// 计算城镇土地使用税
function calculateLandUseTax() {
    const cityTier = document.getElementById('cityTier').value;
    const area = parseFloat(document.getElementById('landArea').value) || 0;
    const rate = parseFloat(document.getElementById('taxRate').value) || 0;
    const period = document.getElementById('taxPeriod').value;

    if (!cityTier) {
        alert('请选择城市规模');
        return;
    }

    if (area <= 0) {
        alert('请输入有效的土地面积');
        return;
    }

    if (rate <= 0) {
        alert('请输入有效的适用税额');
        return;
    }

    const tierConfig = cityTierConfig[cityTier];

    // 验证税额是否在合理范围内
    if (rate < tierConfig.minRate || rate > tierConfig.maxRate) {
        console.log(`提示：输入税额${rate}不在推荐范围${tierConfig.minRate}-${tierConfig.maxRate}内，请确认`);
    }

    // 计算年应纳税额
    const yearTax = area * rate;

    // 根据计税期限计算应纳税额
    let periodTax = yearTax;
    let periodLabel = '年';

    if (period === 'month') {
        periodTax = yearTax / 12;
        periodLabel = '月';
    } else if (period === 'quarter') {
        periodTax = yearTax / 4;
        periodLabel = '季';
    }

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultTier').textContent = tierConfig.label;
    document.getElementById('resultArea').textContent = area.toLocaleString() + ' ㎡';
    document.getElementById('resultRate').textContent = rate + ' 元/㎡·年';
    document.getElementById('resultYearTax').textContent = formatMoney(yearTax) + '/年';
    document.getElementById('resultTax').textContent = formatMoney(periodTax) + '/' + periodLabel + ' (' + numberToChinese(periodTax) + ')';

    let formula = `年应纳税额 = ${area.toLocaleString()}㎡ × ${rate}元/㎡ = ${formatMoney(yearTax)}\n`;
    if (period === 'month') {
        formula += `月应纳税额 = ${formatMoney(yearTax)} ÷ 12 = ${formatMoney(periodTax)}`;
    } else if (period === 'quarter') {
        formula += `季应纳税额 = ${formatMoney(yearTax)} ÷ 4 = ${formatMoney(periodTax)}`;
    }
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 城市规模变化时自动填充推荐税额
document.getElementById('cityTier').addEventListener('change', function() {
    const tier = this.value;
    if (tier && cityTierConfig[tier]) {
        const config = cityTierConfig[tier];
        const avgRate = (config.minRate + config.maxRate) / 2;
        document.getElementById('taxRate').value = avgRate.toFixed(1);
        document.getElementById('taxRate').placeholder = `推荐范围：${config.minRate}-${config.maxRate}元/㎡·年`;
    }
});

// 表单提交事件
document.getElementById('landUseTaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateLandUseTax();
});

// 输入框实时格式化
document.getElementById('landArea').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
