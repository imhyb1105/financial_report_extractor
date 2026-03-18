// 关税计算器 - script.js
// 版本：2026.03-001

// 出口关税配置
const exportConfig = {
    rare_earth: { label: '稀土', rate: 20 },
    coke: { label: '焦炭', rate: 40 },
    steel: { label: '钢铁产品', rate: 10 },
    fertilizer: { label: '化肥', rate: 5 },
    other: { label: '其他', rate: 0 }
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
function showResult(type, value, method, rate, tax, formula) {
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = type;
    document.getElementById('resultValue').textContent = value;
    document.getElementById('resultMethod').textContent = method;
    document.getElementById('resultRate').textContent = rate;
    document.getElementById('resultTax').textContent = formatMoney(tax) + ' (' + numberToChinese(tax) + ')';
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 进口计征方式切换
document.getElementById('importMethod').addEventListener('change', function() {
    const method = this.value;
    const quantityGroup = document.getElementById('quantityGroup');
    const specificRateGroup = document.getElementById('specificRateGroup');
    const customsValueGroup = document.getElementById('customsValueGroup');

    customsValueGroup.style.display = 'block';
    quantityGroup.style.display = 'none';
    specificRateGroup.style.display = 'none';

    if (method === 'specific') {
        customsValueGroup.style.display = 'none';
        quantityGroup.style.display = 'block';
        specificRateGroup.style.display = 'block';
    } else if (method === 'compound') {
        quantityGroup.style.display = 'block';
        specificRateGroup.style.display = 'block';
    }
});

// 进口关税计算
document.getElementById('importForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const method = document.getElementById('importMethod').value;
    const customsValue = parseFloat(document.getElementById('customsValue').value) || 0;
    const quantity = parseFloat(document.getElementById('importQuantity').value) || 0;
    const rate = parseFloat(document.getElementById('importRate').value) || 0;
    const specificRate = parseFloat(document.getElementById('specificRate').value) || 0;

    let tax = 0;
    let formula = '';

    if (method === 'ad_valorem') {
        if (customsValue <= 0) {
            alert('请输入完税价格');
            return;
        }
        tax = customsValue * (rate / 100);
        formula = `应纳关税 = ${formatMoney(customsValue)} × ${rate}% = ${formatMoney(tax)}`;
        showResult('进口关税（从价计征）', formatMoney(customsValue), '从价计征', rate + '%', tax, formula);
    } else if (method === 'specific') {
        if (quantity <= 0) {
            alert('请输入货物数量');
            return;
        }
        tax = quantity * specificRate;
        formula = `应纳关税 = ${quantity} × ${formatMoney(specificRate)} = ${formatMoney(tax)}`;
        showResult('进口关税（从量计征）', quantity + '（数量）', '从量计征', formatMoney(specificRate) + '/单位', tax, formula);
    } else if (method === 'compound') {
        if (customsValue <= 0 || quantity <= 0) {
            alert('请输入完税价格和货物数量');
            return;
        }
        const adValoremTax = customsValue * (rate / 100);
        const specificTax = quantity * specificRate;
        tax = adValoremTax + specificTax;
        formula = `从价税额 = ${formatMoney(customsValue)} × ${rate}% = ${formatMoney(adValoremTax)}\n`;
        formula += `从量税额 = ${quantity} × ${formatMoney(specificRate)} = ${formatMoney(specificTax)}\n`;
        formula += `应纳关税 = ${formatMoney(adValoremTax)} + ${formatMoney(specificTax)} = ${formatMoney(tax)}`;
        showResult('进口关税（复合计征）', `${formatMoney(customsValue)} + ${quantity}（数量）`, '复合计征', `${rate}% + ${formatMoney(specificRate)}/单位`, tax, formula);
    }
});

// 出口商品类型切换
document.getElementById('exportType').addEventListener('change', function() {
    const type = this.value;
    if (type && exportConfig[type]) {
        document.getElementById('exportRate').value = exportConfig[type].rate;
    }
});

// 出口关税计算
document.getElementById('exportForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const exportType = document.getElementById('exportType').value;
    const exportValue = parseFloat(document.getElementById('exportValue').value) || 0;
    const rate = parseFloat(document.getElementById('exportRate').value) || 0;

    if (!exportType) {
        alert('请选择出口商品类型');
        return;
    }

    if (exportValue <= 0) {
        alert('请输入完税价格');
        return;
    }

    const typeConfig = exportConfig[exportType];
    const tax = exportValue * (rate / 100);
    const formula = `应纳关税 = ${formatMoney(exportValue)} × ${rate}% = ${formatMoney(tax)}`;

    showResult('出口关税（' + typeConfig.label + '）', formatMoney(exportValue), '从价计征', rate + '%', tax, formula);
});
