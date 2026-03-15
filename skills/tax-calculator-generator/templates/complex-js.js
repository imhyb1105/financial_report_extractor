// 企业所得税计算器 - 分步向导版
// 核心功能：准确计算应纳税所得额

document.addEventListener('DOMContentLoaded', function() {
    // ==================== 配置数据 ====================
    const CONFIG = {
        // 限额扣除比例
        limits: {
            entertainment: { rate: 0.005, actualRate: 0.6, desc: '业务招待费：取实际60%与收入5‰较低者' },
            advertising: { rate: 0.15, desc: '广告费：不超过营业收入15%' },
            welfare: { rate: 0.14, desc: '职工福利费：不超过工资总额14%' },
            union: { rate: 0.02, desc: '工会经费：不超过工资总额2%' },
            education: { rate: 0.08, desc: '职工教育经费：不超过工资总额8%' },
            donation: { rate: 0.12, desc: '公益性捐赠：不超过年度利润12%' }
        },
        // 税率
        taxRates: {
            general: 0.25,
            small_tier1: 0.025,  // ≤100万
            small_tier2: 0.05,   // 100-300万
            hightech: 0.15
        },
        // 小微企业分档
        smallThreshold: {
            tier1: 1000000,
            tier2: 3000000
        }
    };

    // ==================== 步骤切换 ====================
    let currentStep = 1;

    function showStep(step) {
        document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('step' + step).classList.add('active');

        document.querySelectorAll('.wizard-step').forEach((s, i) => {
            s.classList.remove('active', 'completed');
            if (i + 1 < step) s.classList.add('completed');
            if (i + 1 === step) s.classList.add('active');
        });
        currentStep = step;
    }

    function nextStep(step) {
        if (validateStep(currentStep)) {
            if (currentStep === 1) calculateAccountingProfit();
            if (currentStep === 2) calculateLimitAdjustments();
            showStep(step);
        }
    }

    function prevStep(step) { showStep(step); }

    // ==================== 步骤1：计算会计利润 ====================
    function calculateAccountingProfit() {
        const revenue = getInputValue('mainRevenue') + getInputValue('otherRevenue')
                      + getInputValue('nonOperatingRevenue') + getInputValue('investmentIncome');
        const cost = getInputValue('mainCost') + getInputValue('otherCost')
                   + getInputValue('taxSurcharge') + getInputValue('salesExpense')
                   + getInputValue('adminExpense') + getInputValue('financeExpense')
                   + getInputValue('assetImpairment') + getInputValue('nonOperatingExpense');

        const profit = revenue - cost;
        document.getElementById('accountingProfit').textContent = formatMoney(profit);
        return profit;
    }

    // ==================== 步骤2：限额扣除计算 ====================
    function calculateLimitAdjustments() {
        const revenue = getInputValue('mainRevenue') + getInputValue('otherRevenue');
        const salaryTotal = getInputValue('salaryTotal');
        const profit = parseFloat(document.getElementById('accountingProfit').textContent.replace(/,/g, '')) || 0;

        const adjustments = {};

        // 业务招待费：取实际60%与收入5‰较低者
        const entertainment = getInputValue('entertainmentExpense');
        const entertainmentLimit = Math.min(entertainment * 0.6, revenue * 0.005);
        adjustments.entertainment = {
            actual: entertainment,
            limit: entertainmentLimit,
            exceeded: Math.max(0, entertainment - entertainmentLimit)
        };

        // 广告费：不超过营业收入15%
        const advertising = getInputValue('advertisingExpense');
        const advertisingLimit = revenue * 0.15;
        adjustments.advertising = {
            actual: advertising,
            limit: advertisingLimit,
            exceeded: Math.max(0, advertising - advertisingLimit)
        };

        // 职工福利费：不超过工资总额14%
        const welfare = getInputValue('welfareExpense');
        const welfareLimit = salaryTotal * 0.14;
        adjustments.welfare = {
            actual: welfare,
            limit: welfareLimit,
            exceeded: Math.max(0, welfare - welfareLimit)
        };

        // 工会经费：不超过工资总额2%
        const union = getInputValue('unionExpense');
        const unionLimit = salaryTotal * 0.02;
        adjustments.union = {
            actual: union,
            limit: unionLimit,
            exceeded: Math.max(0, union - unionLimit)
        };

        // 职工教育经费：不超过工资总额8%
        const education = getInputValue('educationExpense');
        const educationLimit = salaryTotal * 0.08;
        adjustments.education = {
            actual: education,
            limit: educationLimit,
            exceeded: Math.max(0, education - educationLimit)
        };

        // 公益性捐赠：不超过年度利润12%
        const donation = getInputValue('donationExpense');
        const donationLimit = profit * 0.12;
        adjustments.donation = {
            actual: donation,
            limit: donationLimit,
            exceeded: Math.max(0, donation - donationLimit)
        };

        // 更新UI
        updateLimitDisplay(adjustments);

        return adjustments;
    }

    function updateLimitDisplay(adj) {
        // 更新各项限额显示
        for (const [key, value] of Object.entries(adj)) {
            const limitEl = document.getElementById(key + 'Limit');
            const adjustEl = document.getElementById(key + 'Adjust');

            if (limitEl) {
                if (value.exceeded > 0) {
                    limitEl.className = 'limit-indicator limit-exceeded';
                    limitEl.textContent = `限额：${formatMoney(value.limit)}，超限：${formatMoney(value.exceeded)}`;
                } else {
                    limitEl.className = 'limit-indicator limit-ok';
                    limitEl.textContent = `限额：${formatMoney(value.limit)}，未超限`;
                }
            }
            if (adjustEl) {
                adjustEl.textContent = formatMoney(value.exceeded);
            }
        }

        // 计算合计
        const total = Object.values(adj).reduce((sum, v) => sum + v.exceeded, 0);
        document.getElementById('totalLimitAdjust').textContent = formatMoney(total);
    }

    // ==================== 最终计算 ====================
    function calculate() {
        // 1. 获取会计利润
        const accountingProfit = calculateAccountingProfit();

        // 2. 获取限额扣除调整
        const limitAdjustments = calculateLimitAdjustments();
        const limitAdjustTotal = Object.values(limitAdjustments).reduce((s, v) => s + v.exceeded, 0);

        // 3. 获取不得扣除项目
        const nonDeductible = getInputValue('fines') + getInputValue('lateFees')
                            + getInputValue('sponsorship') + getInputValue('unrelatedExpense')
                            + getInputValue('otherNonDeductible');

        // 4. 获取免税/不征税收入
        const exemptIncome = getInputValue('bondInterest') + getInputValue('dividendIncome')
                           + getInputValue('fiscalAppropriation') + getInputValue('otherExempt');

        // 5. 获取加计扣除
        const rdDeduction = getInputValue('rdExpense') * 1.0;
        const disabledDeduction = getInputValue('disabledWage') * 1.0;
        const totalDeduction = rdDeduction + disabledDeduction;

        // 6. 获取亏损弥补
        const priorYearLoss = getInputValue('priorYearLoss');

        // 7. 计算应纳税所得额
        let taxableIncome = accountingProfit
                          + limitAdjustTotal      // 限额扣除超限调增
                          + nonDeductible         // 不得扣除项目调增
                          - exemptIncome          // 免税收入调减
                          - totalDeduction        // 加计扣除
                          - priorYearLoss;        // 亏损弥补

        if (taxableIncome < 0) taxableIncome = 0;

        // 8. 计算应纳税额
        const enterpriseType = document.querySelector('input[name="enterpriseType"]:checked').value;
        let taxPayable;
        let taxRateDisplay;

        if (enterpriseType === 'small' && taxableIncome <= CONFIG.smallThreshold.tier2) {
            // 小微企业分档计算
            if (taxableIncome <= CONFIG.smallThreshold.tier1) {
                taxPayable = taxableIncome * CONFIG.taxRates.small_tier1;
                taxRateDisplay = '2.5%（小微≤100万）';
            } else {
                const tier1Tax = CONFIG.smallThreshold.tier1 * CONFIG.taxRates.small_tier1;
                const tier2Tax = (taxableIncome - CONFIG.smallThreshold.tier1) * CONFIG.taxRates.small_tier2;
                taxPayable = tier1Tax + tier2Tax;
                taxRateDisplay = '2.5%+5%（小微100-300万）';
            }
        } else if (enterpriseType === 'hightech') {
            taxPayable = taxableIncome * CONFIG.taxRates.hightech;
            taxRateDisplay = '15%（高新技术）';
        } else {
            taxPayable = taxableIncome * CONFIG.taxRates.general;
            taxRateDisplay = '25%（一般企业）';
        }

        // 9. 显示结果
        document.getElementById('resultAccountingProfit').textContent = formatMoney(accountingProfit);
        document.getElementById('resultAdjustment').textContent = formatMoney(limitAdjustTotal + nonDeductible - exemptIncome - totalDeduction);
        document.getElementById('resultTaxableIncome').textContent = formatMoney(taxableIncome);
        document.getElementById('resultTaxPayable').textContent = formatMoney(taxPayable);

        // 显示计算过程
        renderCalculationProcess(accountingProfit, limitAdjustTotal, nonDeductible, exemptIncome,
                                 totalDeduction, priorYearLoss, taxableIncome, taxRateDisplay, taxPayable);

        // 显示调整明细
        renderAdjustmentDetails(limitAdjustments, nonDeductible, exemptIncome, totalDeduction);

        showStep(5);
    }

    function renderCalculationProcess(profit, limitAdj, nonDed, exempt, deduction, loss, taxable, rate, tax) {
        const el = document.getElementById('calculationProcess');
        el.innerHTML = `
            <div class="adjustment-item">
                <span>会计利润</span>
                <span>${formatMoney(profit)}</span>
            </div>
            <div class="adjustment-item text-danger">
                <span>+ 限额扣除超限调增</span>
                <span>${formatMoney(limitAdj)}</span>
            </div>
            <div class="adjustment-item text-danger">
                <span>+ 不得扣除项目调增</span>
                <span>${formatMoney(nonDed)}</span>
            </div>
            <div class="adjustment-item text-success">
                <span>- 免税/不征税收入调减</span>
                <span>-${formatMoney(exempt)}</span>
            </div>
            <div class="adjustment-item text-success">
                <span>- 加计扣除（研发+残疾人工资）</span>
                <span>-${formatMoney(deduction)}</span>
            </div>
            <div class="adjustment-item text-success">
                <span>- 弥补以前年度亏损</span>
                <span>-${formatMoney(loss)}</span>
            </div>
            <div class="adjustment-item fw-bold text-primary">
                <span>= 应纳税所得额</span>
                <span>${formatMoney(taxable)}</span>
            </div>
            <div class="adjustment-item fw-bold text-primary">
                <span>应纳税额 = ${formatMoney(taxable)} × ${rate}</span>
                <span>${formatMoney(tax)}</span>
            </div>
        `;
    }

    // ==================== 工具函数 ====================
    function getInputValue(id) {
        const val = document.getElementById(id)?.value;
        if (val === '' || val === undefined) return 0;
        return parseFloat(val) || 0;
    }

    function formatMoney(num) {
        return Number(num || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function validateStep(step) {
        // 验证逻辑...
        return true;
    }

    function resetAll() {
        document.querySelectorAll('input').forEach(i => {
            if (i.type === 'number') i.value = i.defaultValue || '0';
        });
        showStep(1);
    }

    // 全局暴露函数
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.calculate = calculate;
    window.resetAll = resetAll;
});
