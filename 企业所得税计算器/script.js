// 企业所得税计算器功能实现
// 版本：2026.03-001
// 更新：小型微利企业分档税率（≤100万：2.5%，100-300万：5%）

document.addEventListener('DOMContentLoaded', function() {
    const errorsEl = document.getElementById('errors');
    const citVersionEl = document.getElementById('citVersion');
    const citEffectiveDateEl = document.getElementById('citEffectiveDate');
    const citVersionTopEl = document.getElementById('citVersionTop');
    const citEffectiveDateTopEl = document.getElementById('citEffectiveDateTop');
    const btnCopyResult = document.getElementById('btnCopyResult');
    const btnExportPDF = document.getElementById('btnExportPDF');
    const resultCard = document.getElementById('resultCard');

    // 配置数据
    let config = {
        version: '2026.03-001',
        effective_date: '2026-01-01',
        tax_rates: {
            general: { rate: 0.25, label: '一般企业' },
            small_micro_tier1: { rate: 0.025, label: '小型微利企业（≤100万）' },
            small_micro_tier2: { rate: 0.05, label: '小型微利企业（100-300万）' },
            high_tech: { rate: 0.15, label: '高新技术企业' }
        },
        small_micro_policy: {
            tier1_limit: 1000000,
            tier2_limit: 3000000
        }
    };

    function setErrors(msg) {
        if (errorsEl) errorsEl.textContent = msg || '';
    }
    function clearErrors() { setErrors(''); }

    // 读取配置文件
    fetch('./cit.config.json').then(r => r.json()).then(cfg => {
        config = cfg;
        const v = cfg.version || '—';
        const d = cfg.effective_date || '—';
        if (citVersionEl) citVersionEl.textContent = v;
        if (citEffectiveDateEl) citEffectiveDateEl.textContent = d;
        if (citVersionTopEl) citVersionTopEl.textContent = v;
        if (citEffectiveDateTopEl) citEffectiveDateTopEl.textContent = d;
    }).catch(() => {
        const v = config.version;
        const d = config.effective_date;
        if (citVersionEl) citVersionEl.textContent = v;
        if (citEffectiveDateEl) citEffectiveDateEl.textContent = d;
        if (citVersionTopEl) citVersionTopEl.textContent = v;
        if (citEffectiveDateTopEl) citEffectiveDateTopEl.textContent = d;
    });

    // 获取计算按钮
    const generalCalculateBtn = document.getElementById('generalCalculateBtn');
    const smallCalculateBtn = document.getElementById('smallCalculateBtn');
    const hightechCalculateBtn = document.getElementById('hightechCalculateBtn');
    const generalResetBtn = document.getElementById('generalResetBtn');
    const smallResetBtn = document.getElementById('smallResetBtn');
    const hightechResetBtn = document.getElementById('hightechResetBtn');

    // 绑定计算按钮事件
    if (generalCalculateBtn) generalCalculateBtn.addEventListener('click', () => { clearErrors(); calculateGeneralTax(); });
    if (smallCalculateBtn) smallCalculateBtn.addEventListener('click', () => { clearErrors(); calculateSmallTax(); });
    if (hightechCalculateBtn) hightechCalculateBtn.addEventListener('click', () => { clearErrors(); calculateHightechTax(); });

    // 绑定重置按钮事件
    if (generalResetBtn) generalResetBtn.addEventListener('click', () => {
        document.getElementById('generalRevenue').value = '';
        document.getElementById('generalCost').value = '';
        document.getElementById('generalAdjustAdd').value = '0';
        document.getElementById('generalAdjustSub').value = '0';
        document.getElementById('generalRndCost').value = '';
        document.getElementById('generalLoss').value = '';
        resultCard.style.display = 'none';
        clearErrors();
    });
    if (smallResetBtn) smallResetBtn.addEventListener('click', () => {
        document.getElementById('smallRevenue').value = '';
        document.getElementById('smallCost').value = '';
        document.getElementById('smallAdjustAdd').value = '0';
        document.getElementById('smallAdjustSub').value = '0';
        document.getElementById('smallRndCost').value = '';
        document.getElementById('smallLoss').value = '';
        resultCard.style.display = 'none';
        clearErrors();
    });
    if (hightechResetBtn) hightechResetBtn.addEventListener('click', () => {
        document.getElementById('hightechRevenue').value = '';
        document.getElementById('hightechCost').value = '';
        document.getElementById('hightechAdjustAdd').value = '0';
        document.getElementById('hightechAdjustSub').value = '0';
        document.getElementById('hightechRndCost').value = '';
        document.getElementById('hightechLoss').value = '';
        resultCard.style.display = 'none';
        clearErrors();
    });

    // 复制和导出功能
    if (btnCopyResult) {
        btnCopyResult.addEventListener('click', () => { window.utils?.copyNodeTextById('resultCard'); });
    }
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', () => { window.exporter?.printSection('resultCard','企业所得税计算结果'); });
    }

    // 格式化数字
    function formatNumber(num) {
        return (window.utils && window.utils.formatMoney) ? window.utils.formatMoney(num) : (Number(num||0).toFixed(2));
    }

    // 获取输入值
    function getInputValue(id) {
        const val = document.getElementById(id)?.value;
        if (val === '' || val === undefined || val === null) return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    }

    // 验证输入
    function validateInput(revenue, cost) {
        if (isNaN(revenue) || revenue < 0) {
            setErrors('请输入有效的收入总额（非负数字）。');
            return false;
        }
        if (isNaN(cost) || cost < 0) {
            setErrors('请输入有效的成本费用总额（非负数字）。');
            return false;
        }
        return true;
    }

    // 一般企业所得税计算
    function calculateGeneralTax() {
        const revenue = getInputValue('generalRevenue');
        const cost = getInputValue('generalCost');
        const adjustAdd = getInputValue('generalAdjustAdd');
        const adjustSub = getInputValue('generalAdjustSub');
        const rndCost = getInputValue('generalRndCost');
        const loss = getInputValue('generalLoss');

        if (!validateInput(revenue, cost)) return;

        // 计算应纳税所得额
        let taxableIncome = revenue - cost + adjustAdd - adjustSub;

        // 研发费用加计扣除
        let rndDeduction = 0;
        if (rndCost > 0) {
            rndDeduction = rndCost * 1.0; // 100%加计扣除
            taxableIncome -= rndDeduction;
        }

        // 弥补亏损
        let lossDeducted = 0;
        if (loss > 0 && taxableIncome > 0) {
            lossDeducted = Math.min(loss, taxableIncome);
            taxableIncome -= lossDeducted;
        }

        // 确保应纳税所得额非负
        if (taxableIncome < 0) taxableIncome = 0;

        const taxRate = 0.25;
        const taxPayable = taxableIncome * taxRate;
        const effectiveRate = revenue > 0 ? (taxPayable / revenue * 100) : 0;

        let note = `计算依据：一般企业所得税，法定税率25%（《企业所得税法》第四条）`;
        if (rndDeduction > 0) {
            note += `；研发费用加计扣除${formatNumber(rndDeduction)}元（100%加计扣除）`;
        }
        if (lossDeducted > 0) {
            note += `；弥补以前年度亏损${formatNumber(lossDeducted)}元`;
        }

        displayResults({
            taxableIncome,
            taxRate,
            taxPayable,
            effectiveRate,
            note,
            type: 'general',
            revenue,
            rndDeduction,
            lossDeducted
        });
    }

    // 小型微利企业所得税计算（分档）
    function calculateSmallTax() {
        const revenue = getInputValue('smallRevenue');
        const cost = getInputValue('smallCost');
        const adjustAdd = getInputValue('smallAdjustAdd');
        const adjustSub = getInputValue('smallAdjustSub');
        const rndCost = getInputValue('smallRndCost');
        const loss = getInputValue('smallLoss');

        if (!validateInput(revenue, cost)) return;

        // 计算应纳税所得额
        let taxableIncome = revenue - cost + adjustAdd - adjustSub;

        // 研发费用加计扣除
        let rndDeduction = 0;
        if (rndCost > 0) {
            rndDeduction = rndCost * 1.0;
            taxableIncome -= rndDeduction;
        }

        // 弥补亏损
        let lossDeducted = 0;
        if (loss > 0 && taxableIncome > 0) {
            lossDeducted = Math.min(loss, taxableIncome);
            taxableIncome -= lossDeducted;
        }

        // 确保应纳税所得额非负
        if (taxableIncome < 0) taxableIncome = 0;

        // 小微企业分档税率
        const tier1Limit = config.small_micro_policy?.tier1_limit || 1000000; // 100万
        const tier2Limit = config.small_micro_policy?.tier2_limit || 3000000; // 300万

        let note;
        let taxPayable;
        let effectiveRate;
        let displayRate;
        let breakdown = [];

        if (taxableIncome <= tier2Limit) {
            // 符合小微企业条件，分档计算
            displayRate = '分档税率';
            taxPayable = 0;

            if (taxableIncome <= tier1Limit) {
                // 全部在第一档：2.5%
                taxPayable = taxableIncome * 0.025;
                breakdown.push(`≤100万部分：${formatNumber(taxableIncome)} × 2.5% = ${formatNumber(taxPayable)}`);
            } else {
                // 分两档计算
                const tier1Tax = tier1Limit * 0.025;
                const tier2Tax = (taxableIncome - tier1Limit) * 0.05;
                taxPayable = tier1Tax + tier2Tax;

                breakdown.push(`≤100万部分：${formatNumber(tier1Limit)} × 2.5% = ${formatNumber(tier1Tax)}`);
                breakdown.push(`100万-300万部分：${formatNumber(taxableIncome - tier1Limit)} × 5% = ${formatNumber(tier2Tax)}`);
            }

            effectiveRate = revenue > 0 ? (taxPayable / revenue * 100) : 0;
            note = `计算依据：小型微利企业所得税优惠（财政部 税务总局公告2023年第6号，有效期至2027-12-31）`;
            note += `；年应纳税所得额${formatNumber(taxableIncome)}元 ≤ 300万元，符合小微企业条件`;

            displayResults({
                taxableIncome,
                taxRate: taxPayable / (taxableIncome || 1), // 实际税率
                taxPayable,
                effectiveRate,
                note,
                type: 'small',
                revenue,
                rndDeduction,
                lossDeducted,
                breakdown,
                displayRate
            });
        } else {
            // 超过300万，按一般企业25%计算
            taxPayable = taxableIncome * 0.25;
            effectiveRate = revenue > 0 ? (taxPayable / revenue * 100) : 0;
            displayRate = 0.25;

            note = `⚠️ 提示：年应纳税所得额${formatNumber(taxableIncome)}元 > 300万元，不符合小微企业条件`;
            note += `；按一般企业25%税率计算`;
            note += `；如符合条件可节税${formatNumber(taxableIncome * 0.25 - taxableIncome * 0.05)}元`;

            displayResults({
                taxableIncome,
                taxRate: 0.25,
                taxPayable,
                effectiveRate,
                note,
                type: 'general', // 超过临界点按一般企业显示
                revenue,
                rndDeduction,
                lossDeducted,
                displayRate
            });
        }
    }

    // 高新技术企业所得税计算
    function calculateHightechTax() {
        const revenue = getInputValue('hightechRevenue');
        const cost = getInputValue('hightechCost');
        const adjustAdd = getInputValue('hightechAdjustAdd');
        const adjustSub = getInputValue('hightechAdjustSub');
        const rndCost = getInputValue('hightechRndCost');
        const loss = getInputValue('hightechLoss');

        if (!validateInput(revenue, cost)) return;

        // 计算应纳税所得额
        let taxableIncome = revenue - cost + adjustAdd - adjustSub;

        // 研发费用加计扣除
        let rndDeduction = 0;
        if (rndCost > 0) {
            rndDeduction = rndCost * 1.0;
            taxableIncome -= rndDeduction;
        }

        // 弥补亏损（高新技术企业可结转10年）
        let lossDeducted = 0;
        if (loss > 0 && taxableIncome > 0) {
            lossDeducted = Math.min(loss, taxableIncome);
            taxableIncome -= lossDeducted;
        }

        // 确保应纳税所得额非负
        if (taxableIncome < 0) taxableIncome = 0;

        const taxRate = 0.15;
        const taxPayable = taxableIncome * taxRate;
        const effectiveRate = revenue > 0 ? (taxPayable / revenue * 100) : 0;

        let note = `计算依据：高新技术企业，减按15%税率征收（《企业所得税法》第二十八条）`;
        if (rndDeduction > 0) {
            note += `；研发费用加计扣除${formatNumber(rndDeduction)}元`;
        }
        if (lossDeducted > 0) {
            note += `；弥补以前年度亏损${formatNumber(lossDeducted)}元（高新技术企业可结转10年）`;
        }
        const saved = taxableIncome * (0.25 - 0.15);
        if (saved > 0 && taxableIncome > 0) {
            note += `；相比一般企业节税${formatNumber(saved)}元`;
        }

        displayResults({
            taxableIncome,
            taxRate,
            taxPayable,
            effectiveRate,
            note,
            type: 'hightech',
            revenue,
            rndDeduction,
            lossDeducted
        });
    }

    // 显示结果
    function displayResults(results) {
        document.getElementById('resultTaxableIncome').textContent = formatNumber(results.taxableIncome);

        // 税率显示
        if (results.displayRate) {
            document.getElementById('resultTaxRate').textContent = results.displayRate;
        } else {
            document.getElementById('resultTaxRate').textContent = (results.taxRate * 100).toFixed(results.taxRate < 0.1 ? 1 : 0) + '%';
        }

        document.getElementById('resultTaxPayable').textContent = formatNumber(results.taxPayable);
        document.getElementById('resultEffectiveRate').textContent = results.effectiveRate.toFixed(2) + '%';
        document.getElementById('resultNote').textContent = results.note;

        // 根据类型设置样式
        if (results.type === 'small') {
            document.getElementById('resultNote').className = 'alert alert-success mt-3 mb-0';
        } else if (results.type === 'hightech') {
            document.getElementById('resultNote').className = 'alert alert-success mt-3 mb-0';
        } else {
            document.getElementById('resultNote').className = 'alert alert-info mt-3 mb-0';
        }

        renderBreakdown(results);
        resultCard.style.display = 'block';
    }

    // 渲染计算明细
    function renderBreakdown(r) {
        const el = document.getElementById('resultBreakdown');
        if (!el) return;

        const lines = [];

        // 基础计算
        lines.push(`应纳税所得额 = 收入总额 - 成本费用 ± 纳税调整 - 加计扣除 - 弥补亏损`);

        if (r.rndDeduction > 0) {
            lines.push(`研发费用加计扣除 = ${formatNumber(r.rndDeduction)}（100%加计）`);
        }
        if (r.lossDeducted > 0) {
            lines.push(`弥补以前年度亏损 = ${formatNumber(r.lossDeducted)}`);
        }

        lines.push(`应纳税所得额 = ${formatNumber(r.taxableIncome)} 元`);

        // 分档计算明细
        if (r.breakdown && r.breakdown.length > 0) {
            lines.push('---');
            lines.push('分档计算明细：');
            r.breakdown.forEach(b => lines.push(b));
        }

        // 税额计算
        if (r.type === 'small' && r.taxableIncome <= 3000000) {
            lines.push('---');
            lines.push(`应纳税额合计 = ${formatNumber(r.taxPayable)} 元`);
            lines.push(`实际税负率 = ${r.effectiveRate.toFixed(2)}%`);
        } else {
            const ratePct = r.taxRate < 0.1 ? (r.taxRate * 100).toFixed(1) : (r.taxRate * 100).toFixed(0);
            lines.push('---');
            lines.push(`应纳税额 = 应纳税所得额 × 税率 = ${formatNumber(r.taxableIncome)} × ${ratePct}% = ${formatNumber(r.taxPayable)}`);
            lines.push(`实际税负率 = ${r.effectiveRate.toFixed(2)}%`);
        }

        el.innerHTML = lines.map(l => `<div class="line">${l}</div>`).join('');
    }
});
