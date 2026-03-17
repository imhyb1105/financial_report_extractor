// 企业所得税计算器 - 分步向导版
// 版本：2026.03-002
// 核心功能：应纳税所得额分步计算，自动计算限额扣除

// 全局变量存储计算数据
let calcData = {
    // 基础数据
    revenue: 0,                    // 销售(营业)收入
    accountingProfit: 0,           // 会计利润总额
    totalWages: 0,                 // 工资薪金总额
    employeeCount: 0,              // 从业人数
    totalAssets: 0,                // 资产总额

    // 限额扣除项目
    entertainment: { actual: 0, limit: 0, excess: 0 },
    advertising: { actual: 0, limit: 0, excess: 0, carryforward: 0 },
    welfare: { actual: 0, limit: 0, excess: 0 },
    union: { actual: 0, limit: 0, excess: 0 },
    education: { actual: 0, limit: 0, excess: 0, carryforward: 0 },
    donation: { actual: 0, limit: 0, excess: 0, carryforward: 0 },

    // 不得扣除项目
    nonDeductible: {
        fines: 0,
        lateFees: 0,
        sponsorship: 0,
        unrelatedExpense: 0
    },

    // 免税/不征税收入
    exemptIncome: {
        bondInterest: 0,
        dividend: 0,
        fiscalAppropriation: 0,
        nonProfitIncome: 0
    },

    // 加计扣除
    rdExpense: 0,
    disabledWage: 0,

    // 亏损弥补
    lossCarryforward: 0,

    // 企业类型
    enterpriseType: 'general',

    // 计算结果
    taxableIncome: 0,
    taxPayable: 0,
    taxRate: 0
};

// 当前步骤
let currentStep = 1;

// 格式化数字
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 获取输入值
function getInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const val = el.value;
    if (val === '' || val === undefined || val === null) return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
}

// 设置显示值
function setDisplayValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = formatNumber(value);
}

// 显示错误
function showError(msg) {
    const errorsEl = document.getElementById('errors');
    if (errorsEl) errorsEl.textContent = msg || '';
}

// 清除错误
function clearError() {
    showError('');
}

// 步骤导航
function updateStepTabs() {
    const tabs = document.querySelectorAll('#stepTabs .nav-link');
    tabs.forEach((tab, index) => {
        const stepNum = index + 1;
        tab.classList.remove('active', 'disabled');
        tab.querySelector('.badge').classList.remove('bg-primary', 'bg-secondary');
        tab.querySelector('.badge').classList.add('bg-secondary');

        if (stepNum === currentStep) {
            tab.classList.add('active');
            tab.querySelector('.badge').classList.remove('bg-secondary');
            tab.querySelector('.badge').classList.add('bg-primary');
        } else if (stepNum > currentStep) {
            tab.classList.add('disabled');
        }
    });
}

function showStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.style.display = 'none');
    const stepEl = document.getElementById('step' + step);
    if (stepEl) stepEl.style.display = 'block';
    currentStep = step;
    updateStepTabs();
}

function nextStep(current) {
    clearError();

    // 验证当前步骤
    if (current === 1) {
        calcData.revenue = getInputValue('revenue');
        calcData.accountingProfit = getInputValue('accountingProfit');
        calcData.totalWages = getInputValue('totalWages');
        calcData.employeeCount = getInputValue('employeeCount');
        calcData.totalAssets = getInputValue('totalAssets');

        if (calcData.revenue <= 0) {
            showError('请输入销售(营业)收入');
            return;
        }
        if (calcData.accountingProfit === 0 && !confirm('会计利润总额为0，是否继续？')) {
            return;
        }
        if (calcData.totalWages <= 0) {
            showError('请输入工资薪金总额');
            return;
        }
    }

    if (current === 2) {
        collectLimitDeductionData();
    }

    if (current === 3) {
        collectNonDeductibleData();
        collectExemptIncomeData();
    }

    if (current === 4) {
        collectAdditionalDeductionData();
        calcData.enterpriseType = document.querySelector('input[name="enterpriseType"]:checked')?.value || 'general';
        calculate();
        return;
    }

    showStep(current + 1);
}

function prevStep(current) {
    showStep(current - 1);
}

// 步骤2：限额扣除计算
function calculateLimitDeductions() {
    const revenue = calcData.revenue;
    const totalWages = calcData.totalWages;
    const profit = calcData.accountingProfit;

    // 业务招待费：Min(60%, 5‰)
    const entertainmentActual = getInputValue('entertainmentActual');
    const entertainment60 = entertainmentActual * 0.60;
    const entertainment5Permil = revenue * 0.005;
    const entertainmentLimit = Math.min(entertainment60, entertainment5Permil);
    const entertainmentExcess = Math.max(0, entertainmentActual - entertainmentLimit);

    setDisplayValue('entertainmentLimit', entertainmentLimit);
    setDisplayValue('entertainmentExcess', entertainmentExcess);

    calcData.entertainment = {
        actual: entertainmentActual,
        limit: entertainmentLimit,
        excess: entertainmentExcess
    };

    // 广告费：15% (可结转)
    const advertisingActual = getInputValue('advertisingActual');
    const advertisingLimit = revenue * 0.15;
    const advertisingExcess = Math.max(0, advertisingActual - advertisingLimit);

    setDisplayValue('advertisingLimit', advertisingLimit);
    setDisplayValue('advertisingExcess', advertisingExcess);
    setDisplayValue('advertisingCarryforward', advertisingExcess);

    calcData.advertising = {
        actual: advertisingActual,
        limit: advertisingLimit,
        excess: advertisingExcess,
        carryforward: advertisingExcess
    };

    // 职工福利费：14%
    const welfareActual = getInputValue('welfareActual');
    const welfareLimit = totalWages * 0.14;
    const welfareExcess = Math.max(0, welfareActual - welfareLimit);

    setDisplayValue('welfareLimit', welfareLimit);
    setDisplayValue('welfareExcess', welfareExcess);

    calcData.welfare = {
        actual: welfareActual,
        limit: welfareLimit,
        excess: welfareExcess
    };

    // 工会经费：2%
    const unionActual = getInputValue('unionActual');
    const unionLimit = totalWages * 0.02;
    const unionExcess = Math.max(0, unionActual - unionLimit);

    setDisplayValue('unionLimit', unionLimit);
    setDisplayValue('unionExcess', unionExcess);

    calcData.union = {
        actual: unionActual,
        limit: unionLimit,
        excess: unionExcess
    };

    // 职工教育经费：8% (可结转)
    const educationActual = getInputValue('educationActual');
    const educationLimit = totalWages * 0.08;
    const educationExcess = Math.max(0, educationActual - educationLimit);

    setDisplayValue('educationLimit', educationLimit);
    setDisplayValue('educationExcess', educationExcess);
    setDisplayValue('educationCarryforward', educationExcess);

    calcData.education = {
        actual: educationActual,
        limit: educationLimit,
        excess: educationExcess,
        carryforward: educationExcess
    };

    // 公益性捐赠：12% (可结转3年)
    const donationActual = getInputValue('donationActual');
    const donationLimit = Math.max(0, profit) * 0.12;
    const donationExcess = Math.max(0, donationActual - donationLimit);

    setDisplayValue('donationLimit', donationLimit);
    setDisplayValue('donationExcess', donationExcess);
    setDisplayValue('donationCarryforward', donationExcess);

    calcData.donation = {
        actual: donationActual,
        limit: donationLimit,
        excess: donationExcess,
        carryforward: donationExcess
    };

    // 更新限额扣除合计
    const totalLimitExcess = entertainmentExcess + advertisingExcess + welfareExcess +
                              unionExcess + educationExcess + donationExcess;
    document.getElementById('totalLimitExcess').textContent = formatNumber(totalLimitExcess);
}

function collectLimitDeductionData() {
    calculateLimitDeductions();
}

// 步骤3：不得扣除和免税收入
function calculateNonDeductible() {
    const total = getInputValue('fines') + getInputValue('lateFees') +
                  getInputValue('sponsorship') + getInputValue('unrelatedExpense');
    document.getElementById('totalNonDeductible').textContent = formatNumber(total);

    calcData.nonDeductible = {
        fines: getInputValue('fines'),
        lateFees: getInputValue('lateFees'),
        sponsorship: getInputValue('sponsorship'),
        unrelatedExpense: getInputValue('unrelatedExpense')
    };
}

function calculateExemptIncome() {
    const total = getInputValue('bondInterest') + getInputValue('dividend') +
                  getInputValue('fiscalAppropriation') + getInputValue('nonProfitIncome');
    document.getElementById('totalExemptIncome').textContent = formatNumber(total);

    calcData.exemptIncome = {
        bondInterest: getInputValue('bondInterest'),
        dividend: getInputValue('dividend'),
        fiscalAppropriation: getInputValue('fiscalAppropriation'),
        nonProfitIncome: getInputValue('nonProfitIncome')
    };
}

function collectNonDeductibleData() {
    calculateNonDeductible();
}

function collectExemptIncomeData() {
    calculateExemptIncome();
}

// 步骤4：加计扣除
function calculateAdditionalDeductions() {
    const rdExpense = getInputValue('rdExpense');
    const rdDeduction = rdExpense * 1.0; // 100%加计扣除
    document.getElementById('rdDeduction').textContent = formatNumber(rdDeduction);

    const disabledWage = getInputValue('disabledWage');
    const disabledDeduction = disabledWage * 1.0; // 100%加计扣除
    document.getElementById('disabledDeduction').textContent = formatNumber(disabledDeduction);

    const totalAdditional = rdDeduction + disabledDeduction;
    document.getElementById('totalAdditionalDeduction').textContent = formatNumber(totalAdditional);

    calcData.rdExpense = rdExpense;
    calcData.disabledWage = disabledWage;
    calcData.rdDeduction = rdDeduction;
    calcData.disabledDeduction = disabledDeduction;
}

function collectAdditionalDeductionData() {
    calculateAdditionalDeductions();
    calcData.lossCarryforward = getInputValue('lossCarryforward');
}

// 主计算函数
function calculate() {
    clearError();

    // 计算纳税调整增加额
    const limitExcessTotal = calcData.entertainment.excess + calcData.advertising.excess +
                             calcData.welfare.excess + calcData.union.excess +
                             calcData.education.excess + calcData.donation.excess;

    const nonDeductibleTotal = calcData.nonDeductible.fines + calcData.nonDeductible.lateFees +
                               calcData.nonDeductible.sponsorship + calcData.nonDeductible.unrelatedExpense;

    const totalIncrease = limitExcessTotal + nonDeductibleTotal;

    // 计算纳税调整减少额
    const exemptIncomeTotal = calcData.exemptIncome.bondInterest + calcData.exemptIncome.dividend +
                              calcData.exemptIncome.fiscalAppropriation + calcData.exemptIncome.nonProfitIncome;

    const additionalDeductionTotal = (calcData.rdDeduction || 0) + (calcData.disabledDeduction || 0);

    const totalDecrease = exemptIncomeTotal + additionalDeductionTotal + calcData.lossCarryforward;

    // 计算应纳税所得额
    let taxableIncome = calcData.accountingProfit + totalIncrease - totalDecrease;

    // 确保非负
    if (taxableIncome < 0) taxableIncome = 0;

    calcData.taxableIncome = taxableIncome;

    // 根据企业类型计算税额
    let taxPayable = 0;
    let taxRate = 0;
    let rateDisplay = '';

    const enterpriseType = calcData.enterpriseType;

    if (enterpriseType === 'high_tech') {
        // 高新技术企业：15%
        taxRate = 0.15;
        taxPayable = taxableIncome * taxRate;
        rateDisplay = '15%';
    } else if (enterpriseType === 'small') {
        // 小型微利企业：分档税率
        // 检查是否符合小微企业条件
        const isSmallMicro = taxableIncome <= 3000000 &&
                             calcData.employeeCount <= 300 &&
                             calcData.totalAssets <= 50000000;

        if (isSmallMicro) {
            // 2023-2027年小型微利企业分档税率
            if (taxableIncome <= 1000000) {
                // 100万以下：实际税负2.5%
                taxRate = 0.025;
                taxPayable = taxableIncome * taxRate;
                rateDisplay = '2.5%（实际税负，≤100万）';
            } else {
                // 100-300万：分段计算
                // 100万以下部分：2.5%
                // 100万以上部分：5%
                const taxUnder100 = 1000000 * 0.025;
                const taxAbove100 = (taxableIncome - 1000000) * 0.05;
                taxPayable = taxUnder100 + taxAbove100;
                taxRate = taxPayable / taxableIncome; // 计算实际税负率
                rateDisplay = `2.5%+5%（分段，实际税负${(taxRate * 100).toFixed(2)}%）`;
            }
        } else {
            // 不符合条件，按25%
            taxRate = 0.25;
            taxPayable = taxableIncome * taxRate;
            rateDisplay = '25%（不符合小微企业条件）';
        }
    } else {
        // 一般企业：25%
        taxRate = 0.25;
        taxPayable = taxableIncome * taxRate;
        rateDisplay = '25%';
    }

    calcData.taxPayable = taxPayable;
    calcData.taxRate = taxRate;

    // 显示结果
    showStep(5);
    displayResults(totalIncrease, totalDecrease, rateDisplay);
}

// 显示结果
function displayResults(totalIncrease, totalDecrease, rateDisplay) {
    // 显示主要结果
    document.getElementById('taxableIncomeDisplay').textContent = formatNumber(calcData.taxableIncome);
    document.getElementById('taxAmountDisplay').textContent = formatNumber(calcData.taxPayable);

    // 计算明细
    const breakdown = document.getElementById('calculationBreakdown');
    let breakdownHtml = '';

    breakdownHtml += `<div class="line">会计利润总额：${formatNumber(calcData.accountingProfit)} 元</div>`;
    breakdownHtml += `<div class="line">+ 纳税调整增加额：${formatNumber(totalIncrease)} 元</div>`;
    breakdownHtml += `<div class="line">- 纳税调整减少额：${formatNumber(totalDecrease)} 元</div>`;
    breakdownHtml += `<div class="line"><strong>= 应纳税所得额：${formatNumber(calcData.taxableIncome)} 元</strong></div>`;
    breakdownHtml += `<div class="line">适用税率：${rateDisplay}</div>`;
    breakdownHtml += `<div class="line"><strong>= 应纳企业所得税：${formatNumber(calcData.taxPayable)} 元</strong></div>`;

    breakdown.innerHTML = breakdownHtml;

    // 纳税调整汇总表
    const tableBody = document.getElementById('adjustmentTable');
    let tableHtml = '';

    // 限额扣除项目
    const limitItems = [
        { name: '业务招待费超限', actual: calcData.entertainment.actual, tax: calcData.entertainment.limit, increase: calcData.entertainment.excess, decrease: 0 },
        { name: '广告费超限', actual: calcData.advertising.actual, tax: calcData.advertising.limit, increase: calcData.advertising.excess, decrease: 0 },
        { name: '职工福利费超限', actual: calcData.welfare.actual, tax: calcData.welfare.limit, increase: calcData.welfare.excess, decrease: 0 },
        { name: '工会经费超限', actual: calcData.union.actual, tax: calcData.union.limit, increase: calcData.union.excess, decrease: 0 },
        { name: '职工教育经费超限', actual: calcData.education.actual, tax: calcData.education.limit, increase: calcData.education.excess, decrease: 0 },
        { name: '公益性捐赠超限', actual: calcData.donation.actual, tax: calcData.donation.limit, increase: calcData.donation.excess, decrease: 0 }
    ];

    // 不得扣除项目
    const nonDeductibleItems = [
        { name: '罚款罚金', actual: calcData.nonDeductible.fines, tax: 0, increase: calcData.nonDeductible.fines, decrease: 0 },
        { name: '税收滞纳金', actual: calcData.nonDeductible.lateFees, tax: 0, increase: calcData.nonDeductible.lateFees, decrease: 0 },
        { name: '赞助支出', actual: calcData.nonDeductible.sponsorship, tax: 0, increase: calcData.nonDeductible.sponsorship, decrease: 0 },
        { name: '无关支出', actual: calcData.nonDeductible.unrelatedExpense, tax: 0, increase: calcData.nonDeductible.unrelatedExpense, decrease: 0 }
    ];

    // 免税/不征税收入
    const exemptItems = [
        { name: '国债利息收入', actual: calcData.exemptIncome.bondInterest, tax: 0, increase: 0, decrease: calcData.exemptIncome.bondInterest },
        { name: '股息红利', actual: calcData.exemptIncome.dividend, tax: 0, increase: 0, decrease: calcData.exemptIncome.dividend },
        { name: '财政拨款', actual: calcData.exemptIncome.fiscalAppropriation, tax: 0, increase: 0, decrease: calcData.exemptIncome.fiscalAppropriation },
        { name: '非营利收入', actual: calcData.exemptIncome.nonProfitIncome, tax: 0, increase: 0, decrease: calcData.exemptIncome.nonProfitIncome }
    ];

    // 加计扣除
    const additionalItems = [
        { name: '研发费用加计扣除', actual: calcData.rdExpense, tax: calcData.rdDeduction || calcData.rdExpense * 1, increase: 0, decrease: calcData.rdDeduction || calcData.rdExpense * 1 },
        { name: '残疾人工资加计扣除', actual: calcData.disabledWage, tax: calcData.disabledDeduction || calcData.disabledWage * 1, increase: 0, decrease: calcData.disabledDeduction || calcData.disabledWage * 1 },
        { name: '亏损弥补', actual: calcData.lossCarryforward, tax: calcData.lossCarryforward, increase: 0, decrease: calcData.lossCarryforward }
    ];

    const allItems = [...limitItems, ...nonDeductibleItems, ...exemptItems, ...additionalItems];

    allItems.forEach(item => {
        if (item.actual > 0 || item.increase > 0 || item.decrease > 0) {
            tableHtml += `<tr>
                <td>${item.name}</td>
                <td class="text-end">${formatNumber(item.actual)}</td>
                <td class="text-end">${formatNumber(item.tax)}</td>
                <td class="text-end ${item.increase > 0 ? 'text-danger' : ''}">${item.increase > 0 ? formatNumber(item.increase) : '-'}</td>
                <td class="text-end ${item.decrease > 0 ? 'text-success' : ''}">${item.decrease > 0 ? formatNumber(item.decrease) : '-'}</td>
            </tr>`;
        }
    });

    tableBody.innerHTML = tableHtml;

    // 更新合计
    document.getElementById('totalIncrease').textContent = formatNumber(totalIncrease);
    document.getElementById('totalDecrease').textContent = formatNumber(totalDecrease);
}

// 重置表单
function resetForm() {
    // 重置所有输入
    document.querySelectorAll('input[type="number"]').forEach(el => {
        el.value = '';
    });

    // 重置只读字段
    document.querySelectorAll('input[readonly]').forEach(el => {
        el.value = '';
    });

    // 重置单选按钮
    document.getElementById('typeGeneral').checked = true;

    // 重置显示字段
    document.getElementById('totalLimitExcess').textContent = '0.00';
    document.getElementById('totalNonDeductible').textContent = '0.00';
    document.getElementById('totalExemptIncome').textContent = '0.00';
    document.getElementById('rdDeduction').textContent = '0.00';
    document.getElementById('disabledDeduction').textContent = '0.00';
    document.getElementById('totalAdditionalDeduction').textContent = '0.00';

    // 重置计算数据
    calcData = {
        revenue: 0, accountingProfit: 0, totalWages: 0, employeeCount: 0, totalAssets: 0,
        entertainment: { actual: 0, limit: 0, excess: 0 },
        advertising: { actual: 0, limit: 0, excess: 0, carryforward: 0 },
        welfare: { actual: 0, limit: 0, excess: 0 },
        union: { actual: 0, limit: 0, excess: 0 },
        education: { actual: 0, limit: 0, excess: 0, carryforward: 0 },
        donation: { actual: 0, limit: 0, excess: 0, carryforward: 0 },
        nonDeductible: { fines: 0, lateFees: 0, sponsorship: 0, unrelatedExpense: 0 },
        exemptIncome: { bondInterest: 0, dividend: 0, fiscalAppropriation: 0, nonProfitIncome: 0 },
        rdExpense: 0, disabledWage: 0, lossCarryforward: 0,
        enterpriseType: 'general', taxableIncome: 0, taxPayable: 0, taxRate: 0
    };

    // 返回第一步
    showStep(1);
    clearError();
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定限额扣除实时计算
    document.querySelectorAll('.limit-item').forEach(el => {
        el.addEventListener('input', calculateLimitDeductions);
    });

    // 绑定不得扣除项目实时计算
    document.querySelectorAll('.non-deductible').forEach(el => {
        el.addEventListener('input', calculateNonDeductible);
    });

    // 绑定免税收入实时计算
    document.querySelectorAll('.exempt-income').forEach(el => {
        el.addEventListener('input', calculateExemptIncome);
    });

    // 绑定加计扣除实时计算
    document.querySelectorAll('.additional-deduction').forEach(el => {
        el.addEventListener('input', calculateAdditionalDeductions);
    });

    // 步骤导航点击
    document.querySelectorAll('#stepTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const step = parseInt(this.dataset.step);
            if (step <= currentStep) {
                showStep(step);
            }
        });
    });

    showStep(1);
});
