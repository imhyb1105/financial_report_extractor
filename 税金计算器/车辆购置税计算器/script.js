// 车辆购置税计算器 - script.js
// 版本：2026.03-001

// 税率配置
const taxConfig = {
    fuel: {
        label: '燃油汽车',
        rate: 0.10,
        unit: '10%',
        deduction: 0,
        cap: 0
    },
    new_energy_2024_2025: {
        label: '新能源汽车（2024-2025年）',
        rate: 0,
        unit: '免征',
        deduction: 1,
        cap: 30000
    },
    new_energy_2026_2027: {
        label: '新能源汽车（2026-2027年）',
        rate: 0.05,
        unit: '5%',
        deduction: 0.05,
        cap: 15000
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

// 计算车辆购置税
function calculateVehiclePurchaseTax() {
    const vehicleType = document.getElementById('vehicleType').value;
    const price = parseFloat(document.getElementById('vehiclePrice').value) || 0;

    if (!vehicleType) {
        alert('请选择车辆类型');
        return;
    }

    if (price <= 0) {
        alert('请输入有效的车辆价格');
        return;
    }

    const config = taxConfig[vehicleType];
    let taxAmount = 0;
    let deduction = 0;
    let formula = '';

    if (vehicleType === 'fuel') {
        // 燃油汽车：10%
        taxAmount = price * config.rate;
        deduction = 0;
        formula = `应纳税额 = ${formatMoney(price)} × 10% = ${formatMoney(taxAmount)}`;
    } else if (vehicleType === 'new_energy_2024_2025') {
        // 2024-2025年新能源：免征
        const fullTax = price * 0.10;
        deduction = Math.min(fullTax, config.cap);
        taxAmount = 0;
        formula = `法定税额 = ${formatMoney(price)} × 10% = ${formatMoney(fullTax)}\n`;
        formula += `减免税额 = ${formatMoney(deduction)}（不超过3万元）\n`;
        formula += `应纳税额 = ${formatMoney(fullTax)} - ${formatMoney(deduction)} = 0元（免征）`;
    } else if (vehicleType === 'new_energy_2026_2027') {
        // 2026-2027年新能源：5%，减免额不超过1.5万
        const fullTax = price * 0.10;
        const reducedTax = price * 0.05;
        const deductionAmount = Math.min(fullTax - reducedTax, config.cap);
        taxAmount = reducedTax;
        deduction = deductionAmount;
        formula = `法定税额 = ${formatMoney(price)} × 10% = ${formatMoney(fullTax)}\n`;
        formula += `减按税额 = ${formatMoney(price)} × 5% = ${formatMoney(reducedTax)}\n`;
        formula += `减免税额 = ${formatMoney(deductionAmount)}（不超过1.5万元）\n`;
        formula += `应纳税额 = ${formatMoney(taxAmount)}`;
    }

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = config.label;
    document.getElementById('resultPrice').textContent = formatMoney(price);
    document.getElementById('resultRate').textContent = config.unit;
    document.getElementById('resultDeduction').textContent = deduction > 0 ? formatMoney(deduction) : '无';
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + ' (' + numberToChinese(taxAmount) + ')';
    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 车辆类型变化时更新减免限额
document.getElementById('vehicleType').addEventListener('change', function() {
    const taxCapGroup = document.getElementById('taxCapGroup');
    const taxCapNote = document.getElementById('taxCapNote');

    if (this.value === 'new_energy_2024_2025') {
        taxCapGroup.style.display = 'block';
        document.getElementById('taxCap').value = '30000';
        taxCapNote.textContent = '每辆新能源汽车减免额不超过3万元';
    } else if (this.value === 'new_energy_2026_2027') {
        taxCapGroup.style.display = 'block';
        document.getElementById('taxCap').value = '15000';
        taxCapNote.textContent = '每辆新能源汽车减免额不超过1.5万元';
    } else {
        taxCapGroup.style.display = 'none';
    }
});

// 表单提交事件
document.getElementById('vehiclePurchaseTaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateVehiclePurchaseTax();
});

// 输入框实时格式化
document.getElementById('vehiclePrice').addEventListener('blur', function() {
    const value = parseFloat(this.value);
    if (!isNaN(value) && value > 0) {
        this.value = value.toFixed(2);
    }
});
