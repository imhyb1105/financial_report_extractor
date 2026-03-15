// 车船税计算器 - script.js
// 版本：2026.03-001

// 税率配置（年基准税额范围，取中间值计算）
const taxRates = {
    car_1_0: { label: '乘用车1.0L以下（含）', minRate: 60, maxRate: 360, unit: '元/年' },
    car_1_0_1_6: { label: '乘用车1.0L-1.6L（含）', minRate: 300, maxRate: 540, unit: '元/年' },
    car_1_6_2_0: { label: '乘用车1.6L-2.0L（含）', minRate: 360, maxRate: 660, unit: '元/年' },
    car_2_0_2_5: { label: '乘用车2.0L-2.5L（含）', minRate: 660, maxRate: 1200, unit: '元/年' },
    car_2_5_3_0: { label: '乘用车2.5L-3.0L（含）', minRate: 1200, maxRate: 2400, unit: '元/年' },
    car_3_0_4_0: { label: '乘用车3.0L-4.0L（含）', minRate: 2400, maxRate: 3600, unit: '元/年' },
    car_over_4_0: { label: '乘用车4.0L以上', minRate: 3600, maxRate: 5400, unit: '元/年' },
    bus_large: { label: '大型客车', rate: 480, unit: '元/辆·年' },
    bus_medium: { label: '中型客车', rate: 420, unit: '元/辆·年' },
    bus_small: { label: '小型客车', rate: 360, unit: '元/辆·年' },
    truck: { label: '货车', rate: 16, unit: '元/吨·年' },
    motorcycle: { label: '摩托车', minRate: 36, maxRate: 180, unit: '元/辆·年' }
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

// 计算车船税
function calculateVehicleTax() {
    const vehicleType = document.getElementById('vehicleType').value;
    const engineCapacity = parseFloat(document.getElementById('engineCapacity').value) || 0;
    const tonnage = parseFloat(document.getElementById('tonnage').value) || 0;

    if (!vehicleType) {
        alert('请选择车辆类型');
        return;
    }

    const taxConfig = taxRates[vehicleType];
    let taxAmount = 0;
    let basis = '';

    if (vehicleType === 'truck') {
        // 货车按整备质量计税
        if (tonnage <= 0) {
            alert('请输入货车的整备质量');
            return;
        }
        taxAmount = tonnage * taxConfig.rate;
        basis = `整备质量：${tonnage}吨`;
        document.getElementById('resultBaseTax').textContent = `${taxConfig.rate}元/吨·年`;
    } else if (vehicleType.startsWith('car_') || vehicleType === 'motorcycle') {
        // 乘用车和摩托车按排量分档
        const avgRate = (taxConfig.minRate + taxConfig.maxRate) / 2;
        taxAmount = avgRate;
        basis = `排量区间税额：${taxConfig.minRate}-${taxConfig.maxRate}元/年`;
        document.getElementById('resultBaseTax').textContent = `${taxConfig.minRate}-${taxConfig.maxRate}元/年`;
    } else {
        // 客车按辆计税
        taxAmount = taxConfig.rate;
        basis = '按辆计税';
        document.getElementById('resultBaseTax').textContent = `${taxConfig.rate}元/辆·年`;
    }

    // 显示结果
    document.getElementById('result').classList.remove('d-none');
    document.getElementById('resultType').textContent = taxConfig.label;
    document.getElementById('resultBasis').textContent = basis;
    document.getElementById('resultTax').textContent = formatMoney(taxAmount) + '/年';
}

// 车辆类型变化时显示/隐藏相应输入框
document.getElementById('vehicleType').addEventListener('change', function() {
    const engineGroup = document.getElementById('engineCapacityGroup');
    const tonnageGroup = document.getElementById('tonnageGroup');

    engineGroup.style.display = 'none';
    tonnageGroup.style.display = 'none';

    if (this.value.startsWith('car_') || this.value === 'motorcycle') {
        engineGroup.style.display = 'block';
    } else if (this.value === 'truck') {
        tonnageGroup.style.display = 'block';
    }
});

// 表单提交事件
document.getElementById('vehicleTaxForm').addEventListener('submit', function(e) {
    e.preventDefault();
    calculateVehicleTax();
});
