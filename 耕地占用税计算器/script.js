// 耕地占用税计算器 - script.js
// 版本：2026.03-001

// 占用类型配置
const occupationConfig = {
    permanent: { label: '永久占用', multiplier: 1, refundable: false },
    temporary: { label: '临时占用（可退还）', multiplier: 1, refundable: true }
};

// 减免类型配置
const reductionConfig = {
    none: { label: '无减免', multiplier: 1 },
    rural_resident: { label: '农村居民新建自用住宅', multiplier: 0.5 }
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

// 格式化面积
function formatArea(area) {
    if (area >= 10000) {
        return area.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + ' 平方米（约' + (area / 666.67).toFixed(2) + '亩）';
    }
    return area.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + ' 平方米';
}

// 计算耕地占用税
function calculateFarmlandTax() {
    const occupationArea = parseFloat(document.getElementById('occupationArea').value) || 0;
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const occupationType = document.getElementById('occupationType').value;
    const basicFarmland = document.getElementById('basicFarmland').value;
    const reductionType = document.getElementById('reductionType').value;

    if (occupationArea <= 0) {
        alert('请输入有效的占用耕地面积');
        return;
    }

    if (taxRate <= 0) {
        alert('请输入有效的当地适用税额');
        return;
    }

    if (!occupationType) {
        alert('请选择占用类型');
        return;
    }

    // 计算基础税额
    let baseTax = occupationArea * taxRate;

    // 基本农田加征
    let surchargeMultiplier = 1;
    let surchargeText = '不适用';
    if (basicFarmland === 'yes') {
        surchargeMultiplier = 1.5;
        surchargeText = '按150%征收';
    }
    let taxAfterSurcharge = baseTax * surchargeMultiplier;

    // 减免计算
    let reductionMultiplier = reductionConfig[reductionType].multiplier;
    let reductionText = reductionConfig[reductionType].label;
    let finalTax = taxAfterSurcharge * reductionMultiplier;

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultArea').textContent = formatArea(occupationArea);
    document.getElementById('resultRate').textContent = taxRate + ' 元/平方米';
    document.getElementById('resultType').textContent = occupationConfig[occupationType].label;
    document.getElementById('resultSurcharge').textContent = surchargeText;
    document.getElementById('resultReduction').textContent = reductionText;

    let taxDisplay = formatMoney(finalTax) + ' (' + numberToChinese(finalTax) + ')';
    if (occupationConfig[occupationType].refundable) {
        taxDisplay += ' <small class="text-muted">（临时占用，恢复原状可退还）</small>';
    }
    document.getElementById('resultTax').innerHTML = taxDisplay;

    // 计算公式
    let formula = `应纳税额 = ${occupationArea.toLocaleString()}平方米 × ${taxRate}元/平方米`;
    if (basicFarmland === 'yes') {
        formula += ` × 150%（基本农田）`;
    }
    if (reductionMultiplier < 1) {
        formula += ` × ${reductionMultiplier * 10}折（${reductionText}）`;
    }
    formula += ` = ${formatMoney(finalTax)}`;

    document.getElementById('formula').innerHTML = `<code>${formula}</code>`;
}

// 表单提交事件
document.getElementById('farmlandForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateFarmlandTax();
});
