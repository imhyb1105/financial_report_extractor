    // 增值税计算器功能实现（含差额明细表与兼营行内进项）

document.addEventListener('DOMContentLoaded', function() {
    // 统一性：版本展示与错误区
    const errorsEl = document.getElementById('errors');
    const vatVersionEl = document.getElementById('vatVersion');
    const vatEffectiveDateEl = document.getElementById('vatEffectiveDate');
    const vatVersionTopEl = document.getElementById('vatVersionTop');
    const vatEffectiveDateTopEl = document.getElementById('vatEffectiveDateTop');
    const btnCopyVATResult = document.getElementById('btnCopyVATResult');
    const btnExportVATPDF = document.getElementById('btnExportVATPDF');

    function setErrors(msg) {
        if (errorsEl) errorsEl.textContent = msg || '';
    }
    function clearErrors() { setErrors(''); }

    // 读取增值税配置（版本与生效日期）
    fetch('./vat.config.json').then(r => r.json()).then(cfg => {
        const v = cfg.version || '—';
        const d = cfg.effective_until 
          || (cfg.effective_period && (cfg.effective_period.to || cfg.effective_period.end)) 
          || cfg.effective_date 
          || '—';
        if (vatVersionEl) vatVersionEl.textContent = v;
        if (vatEffectiveDateEl) vatEffectiveDateEl.textContent = d;
        if (vatVersionTopEl) vatVersionTopEl.textContent = v;
        if (vatEffectiveDateTopEl) vatEffectiveDateTopEl.textContent = d;
    }).catch(() => {
        if (vatVersionEl) vatVersionEl.textContent = '—';
        if (vatEffectiveDateEl) vatEffectiveDateEl.textContent = '—';
        if (vatVersionTopEl) vatVersionTopEl.textContent = '—';
        if (vatEffectiveDateTopEl) vatEffectiveDateTopEl.textContent = '—';
    });
    // 获取DOM元素
    const generalCalculateBtn = document.getElementById('generalCalculateBtn');
    const smallCalculateBtn = document.getElementById('smallCalculateBtn');
    const resultCard = document.getElementById('resultCard');

    // 税目选择与税率自动匹配（一般纳税人）
    const generalTaxItem = document.getElementById('generalTaxItem');
    const generalTaxRateSelect = document.getElementById('generalTaxRate');
    const TAX_ITEM_RATE_MAP = {
        goods: 0.13,
        manufacturing: 0.13,
        electricity: 0.13,
        agriculture: 0.09,
        transport: 0.09,
        road_transport: 0.09,
        construction: 0.09,
        real_estate_lease: 0.09,
        services: 0.06,
        rd_service: 0.06,
        it_service: 0.06,
        financial_service: 0.06,
        life_service: 0.06,
        export_zero: 0.00
    };
    const TAX_ITEM_LABEL_MAP = {
        goods: '通用货物/加工修理修配劳务',
        manufacturing: '制造业产品',
        agriculture: '农产品销售',
        electricity: '电力/燃气/水供应',
        transport: '交通运输/建筑/不动产租赁',
        road_transport: '道路运输',
        construction: '建筑服务',
        real_estate_lease: '不动产租赁',
        services: '通用现代服务',
        rd_service: '研发和技术服务',
        it_service: '信息技术服务',
        financial_service: '金融服务',
        life_service: '生活服务',
        export_zero: '出口/零税率'
    };

    //  差额征税面板引用及明细表 
    const diffEnabled = document.getElementById('diffEnabled');
    const diffAmountInput = document.getElementById('diffAmount');
    const diffIncludedRadios = [
        document.getElementById('diffIncluded1'),
        document.getElementById('diffIncluded2')
    ];
    const diffItemsContainer = document.getElementById('diffItemsContainer');
    const diffAddRowBtn = document.getElementById('diffAddRowBtn');
    const diffTotalText = document.getElementById('diffTotalText');
    const diffDetails = document.getElementById('diffDetails');
    const diffDetailsBody = document.getElementById('diffDetailsBody');

    let diffRowCounter = 0;
    function createDiffRow() {
        diffRowCounter += 1;
        const id = diffRowCounter;
        const row = document.createElement('div');
        row.className = 'row g-2 align-items-end diff-row';
        row.dataset.rowId = String(id);
        row.innerHTML = `
            <div class="col-md-4">
                <label class="form-label">项目名称</label>
                <input type="text" class="form-control diff-item-name" placeholder="可选">
            </div>
            <div class="col-md-3">
                <label class="form-label">金额（元）</label>
                <input type="number" class="form-control diff-item-amount" min="0" step="0.01" placeholder="请输入">
            </div>
            <div class="col-md-3">
                <label class="form-label">是否含税</label>
                <div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="diffItemIncluded_${id}" id="diffItemIncluded_${id}_1" value="1" checked>
                        <label class="form-check-label" for="diffItemIncluded_${id}_1">含税</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="diffItemIncluded_${id}" id="diffItemIncluded_${id}_0" value="0">
                        <label class="form-check-label" for="diffItemIncluded_${id}_0">不含税</label>
                    </div>
                </div>
            </div>
            <div class="col-md-2 text-end">
                <button type="button" class="btn btn-outline-danger btn-sm diff-remove">删除</button>
            </div>
        `;
        diffItemsContainer.appendChild(row);
    }

    function getDiffItems(taxRate) {
        const rows = Array.from(document.querySelectorAll('.diff-row'));
        const items = [];
        rows.forEach((row) => {
            const id = row.dataset.rowId;
            const name = row.querySelector('.diff-item-name')?.value || '';
            const amountStr = row.querySelector('.diff-item-amount')?.value || '';
            if (!amountStr || amountStr.trim() === '') return; // 空行忽略
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount < 0) return; // 非法行忽略
            const includedRadio = row.querySelector(`input[name="diffItemIncluded_${id}"]:checked`);
            const isIncluded = includedRadio ? includedRadio.value === '1' : true;
            const deductWithoutTax = isIncluded ? (amount / (1 + (taxRate || 0))) : amount;
            items.push({ name, amount, isIncluded, deductWithoutTax });
        });
        return items;
    }

    function updateDiffDetailsDisplay(currentRate) {
        if (!diffDetailsBody || !diffDetails) return;
        const rate = currentRate || parseFloat(generalTaxRateSelect?.value || '0');
        const items = getDiffItems(rate);
        diffDetailsBody.innerHTML = '';
        if (items.length === 0) {
            diffDetails.style.display = 'none';
            return;
        }
        items.forEach(it => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${it.name || '扣除项'}</td>
                <td>${formatNumber(isFinite(it.amount) ? it.amount : 0)}</td>
                <td>${it.isIncluded ? '含税' : '不含税'}</td>
                <td>${formatNumber(it.deductWithoutTax)}</td>
                <td>${(rate * 100).toFixed(0)}%</td>
            `;
            diffDetailsBody.appendChild(tr);
        });
        diffDetails.style.display = 'block';
    }

    function updateDiffTotalDisplay(currentRate) {
        if (!diffTotalText) return;
        const items = getDiffItems(currentRate || parseFloat(generalTaxRateSelect?.value || '0'));
        const singleStr = diffAmountInput?.value || '';
        let singleDeduct = 0;
        if (singleStr && singleStr.trim() !== '') {
            const val = parseFloat(singleStr);
            if (!isNaN(val) && val >= 0) {
                const included = diffIncludedRadios[0] && diffIncludedRadios[0].checked;
                singleDeduct = included ? (val / (1 + (currentRate || 0))) : val;
            }
        }
        const sum = items.reduce((s, it) => s + it.deductWithoutTax, 0) + singleDeduct;
        diffTotalText.textContent = `当前扣除不含税合计（含快速录入）：${formatNumber(sum)} 元`;
    }

    if (diffAddRowBtn && diffItemsContainer) {
        // 初始化一行
        createDiffRow();
        diffAddRowBtn.addEventListener('click', () => { createDiffRow(); updateDiffDetailsDisplay(parseFloat(generalTaxRateSelect?.value || '0')); });
        diffItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.classList.contains('diff-remove')) {
                const row = target.closest('.diff-row');
                if (row) {
                    row.remove();
                    const rate = parseFloat(generalTaxRateSelect?.value || '0');
                    updateDiffTotalDisplay(rate);
                    updateDiffDetailsDisplay(rate);
                }
            }
        });
        diffItemsContainer.addEventListener('input', () => {
            const rate = parseFloat(generalTaxRateSelect?.value || '0');
            updateDiffTotalDisplay(rate);
            updateDiffDetailsDisplay(rate);
        });
    }

    // 设置税目联动税率，并在变更时更新差额显示与明细表
    if (generalTaxItem && generalTaxRateSelect) {
        const setRateFromItem = () => {
            const rate = TAX_ITEM_RATE_MAP[generalTaxItem.value];
            if (rate !== undefined) {
                generalTaxRateSelect.value = rate.toString();
                updateDiffTotalDisplay(rate);
                updateDiffDetailsDisplay(rate);
            }
        };
        generalTaxItem.addEventListener('change', setRateFromItem);
        generalTaxRateSelect.addEventListener('change', () => {
            const rate = parseFloat(generalTaxRateSelect.value);
            updateDiffTotalDisplay(rate);
            updateDiffDetailsDisplay(rate);
        });
        setRateFromItem();
    }

    // 兼营/多税率合并计算工具（含行内进项税额）
    const mixedItemsContainer = document.getElementById('mixedItemsContainer');
    const mixedAddRowBtn = document.getElementById('mixedAddRowBtn');
    const mixedModeSeparate = document.getElementById('mixedModeSeparate');
    const mixedModeHighest = document.getElementById('mixedModeHighest');
    const mixedInputTax = document.getElementById('mixedInputTax');
    const mixedCalculateBtn = document.getElementById('mixedCalculateBtn');
    const mixedDetails = document.getElementById('mixedDetails');
    const mixedDetailsBody = document.getElementById('mixedDetailsBody');

    let mixedRowCounter = 0;
    function createMixedRow() {
        mixedRowCounter += 1;
        const id = mixedRowCounter;
        const row = document.createElement('div');
        row.className = 'row g-2 align-items-end mixed-row';
        row.dataset.rowId = String(id);
        row.innerHTML = `
            <div class="col-md-3">
                <label class="form-label">税目</label>
                <select class="form-select mixed-tax-item">
                    <optgroup label="货物/加工修理修配劳务（13%）">
                        <option value="goods" selected>通用货物/加工修理修配劳务（13%）</option>
                        <option value="manufacturing">制造业产品（13%）</option>
                        <option value="electricity">电力/燃气/水供应（13%）</option>
                    </optgroup>
                    <optgroup label="交通运输/建筑/不动产租赁（9%）">
                        <option value="road_transport">道路运输（9%）</option>
                        <option value="construction">建筑服务（9%）</option>
                        <option value="real_estate_lease">不动产租赁（9%）</option>
                        <option value="agriculture">农产品销售（9%）</option>
                    </optgroup>
                    <optgroup label="现代服务（6%）">
                        <option value="rd_service">研发和技术服务（6%）</option>
                        <option value="it_service">信息技术服务（6%）</option>
                        <option value="financial_service">金融服务（6%）</option>
                        <option value="life_service">生活服务（6%）</option>
                        <option value="services">通用现代服务（6%）</option>
                    </optgroup>
                    <optgroup label="出口/零税率（0%）">
                        <option value="export_zero">出口/零税率（0%）</option>
                    </optgroup>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">销售额（元）</label>
                <input type="number" class="form-control mixed-sales" min="0" step="0.01" placeholder="请输入">
            </div>
            <div class="col-md-2">
                <label class="form-label">是否含税</label>
                <div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="mixedIncluded_${id}" id="mixedIncluded_${id}_1" value="1" checked>
                        <label class="form-check-label" for="mixedIncluded_${id}_1">含税</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="mixedIncluded_${id}" id="mixedIncluded_${id}_0" value="0">
                        <label class="form-check-label" for="mixedIncluded_${id}_0">不含税</label>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <label class="form-label">行内进项税额（元）</label>
                <input type="number" class="form-control mixed-input-tax" min="0" step="0.01" placeholder="可选：每行抵扣">
            </div>
            <div class="col-md-2 text-end">
                <button type="button" class="btn btn-outline-danger btn-sm mixed-remove">删除</button>
            </div>
        `;
        mixedItemsContainer.appendChild(row);
    }

    if (mixedAddRowBtn && mixedItemsContainer) {
        // 初始化两行
        createMixedRow();
        createMixedRow();
        mixedAddRowBtn.addEventListener('click', () => createMixedRow());
        mixedItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.classList.contains('mixed-remove')) {
                const row = target.closest('.mixed-row');
                if (row) row.remove();
            }
        });
    }

    function getMixedItems() {
        const rows = Array.from(document.querySelectorAll('.mixed-row'));
        const items = [];
        rows.forEach((row) => {
            const item = row.querySelector('.mixed-tax-item')?.value;
            const salesStr = row.querySelector('.mixed-sales')?.value;
            const sales = parseFloat(salesStr || 'NaN');
            const id = row.dataset.rowId;
            const includedRadio = row.querySelector(`input[name="mixedIncluded_${id}"]:checked`);
            const isIncluded = includedRadio ? includedRadio.value === '1' : true;
            const inputTaxStr = row.querySelector('.mixed-input-tax')?.value || '';
            const inputTaxRow = inputTaxStr.trim() ? parseFloat(inputTaxStr) : 0;
            if (!item || isNaN(sales) || sales < 0 || isNaN(inputTaxRow) || inputTaxRow < 0) return;
            const rate = TAX_ITEM_RATE_MAP[item];
            items.push({ item, sales, rate, isIncluded, inputTaxRow });
        });
        return items;
    }

    // 绑定计算按钮事件
    if (generalCalculateBtn) generalCalculateBtn.addEventListener('click', () => { clearErrors(); calculateGeneralTax(); });
    if (smallCalculateBtn) smallCalculateBtn.addEventListener('click', () => { clearErrors(); calculateSmallTax(); });
    if (mixedCalculateBtn) mixedCalculateBtn.addEventListener('click', () => { clearErrors(); calculateMixedSales(); });

    if (btnCopyVATResult) {
        btnCopyVATResult.addEventListener('click', () => { window.utils?.copyNodeTextById('resultCard'); });
    }
    if (btnExportVATPDF) {
        btnExportVATPDF.addEventListener('click', () => { window.exporter?.printSection('resultCard','增值税计算结果'); });
    }

    // 一般纳税人增值税计算（支持差额征税面板自动代入）
    function calculateGeneralTax() {
        const sales = parseFloat(document.getElementById('generalSales').value);
        const isTaxIncluded = document.querySelector('input[name="generalTaxIncluded"]:checked').value === "1";
        const taxRate = parseFloat(document.getElementById('generalTaxRate').value);
        const inputTax = parseFloat(document.getElementById('generalInputTax').value);
        const taxItem = generalTaxItem ? generalTaxItem.value : undefined;

        if (isNaN(sales) || sales < 0 || isNaN(inputTax) || inputTax < 0) {
            setErrors('请输入有效的销售额和进项税额（非负数字）。');
            return;
        }

        let salesWithoutTax = isTaxIncluded ? sales / (1 + (taxRate || 0)) : sales;

        // 差额征税集成：明细+快速录入合并扣除
        let noteExtra = '';
        if (diffEnabled && diffEnabled.checked) {
            const diffItems = getDiffItems(taxRate);
            const diffItemsDeduct = diffItems.reduce((sum, it) => sum + it.deductWithoutTax, 0);

            const diffAmountStr = diffAmountInput ? diffAmountInput.value : '';
            let singleDeduct = 0;
            let singleIncluded = true;
            let singleHas = false;
            if (diffAmountStr && diffAmountStr.trim() !== '') {
                const diffAmount = parseFloat(diffAmountStr);
                if (isNaN(diffAmount) || diffAmount < 0) {
                    setErrors('请输入有效的扣除项目金额（非负数字）。');
                    return;
                }
                singleHas = true;
                singleIncluded = diffIncludedRadios[0] && diffIncludedRadios[0].checked;
                singleDeduct = singleIncluded ? (diffAmount / (1 + (taxRate || 0))) : diffAmount;
            }

            const totalDeduct = diffItemsDeduct + singleDeduct;
            let netBase = salesWithoutTax - totalDeduct;
            let overTip = '';
            if (netBase < 0) {
                overTip = '；提示：扣除金额超过销售额，计税基础按0处理。';
                netBase = 0;
            }
            salesWithoutTax = netBase;
            updateDiffTotalDisplay(taxRate);
            updateDiffDetailsDisplay(taxRate);

            noteExtra = `；差额征税：明细${diffItems.length}条，不含税合计${formatNumber(diffItemsDeduct)}${singleHas ? `；另加快速扣除${formatNumber(parseFloat(diffAmountStr))}（${singleIncluded ? '含税' : '不含税'}，按税率${taxRate * 100}%换算）` : ''}${overTip}`;
        }

        const outputTax = salesWithoutTax * (taxRate || 0);
        const taxPayable = outputTax - inputTax;

        let noteOverride;
        if (diffEnabled && diffEnabled.checked) {
            noteOverride = `计算依据：一般纳税人增值税（差额征税），适用税率${taxRate * 100}%` + (taxItem ? `；税目：${TAX_ITEM_LABEL_MAP[taxItem]}` : '') + noteExtra;
        }

        displayResults({
            salesWithoutTax,
            outputTax,
            inputTax,
            taxPayable,
            isGeneral: true,
            taxRate,
            taxItem,
            noteOverride
        });
    }

    // 兼营/多税率合并计算（分别核算/从高适用税率，含行内进项）
    function calculateMixedSales() {
        const items = getMixedItems();
        if (!items || items.length === 0) {
            setErrors('请至少填写一行有效的兼营/多税率项目（有效税目与金额）。');
            return;
        }
        const inputTaxVal = parseFloat(mixedInputTax?.value || '0');
        if (isNaN(inputTaxVal) || inputTaxVal < 0) {
            setErrors('请输入有效的合并进项税额（非负数字）。');
            return;
        }

        const bases = items.map(it => it.isIncluded ? (it.sales / (1 + (it.rate || 0))) : it.sales);
        const highestRate = Math.max(...items.map(it => it.rate || 0));

        let salesWithoutTax = 0;
        let outputTax = 0;
        let note;

        let usedRates = [];
        let perItemOutput = [];
        let perItemNet = [];
        const perItemInput = items.map(it => it.inputTaxRow || 0);
        const inputTaxPerItemsTotal = perItemInput.reduce((a, b) => a + b, 0);

        if (mixedModeHighest && mixedModeHighest.checked) {
            salesWithoutTax = bases.reduce((a, b) => a + b, 0);
            outputTax = salesWithoutTax * highestRate;
            usedRates = items.map(() => highestRate);
            perItemOutput = bases.map(b => b * highestRate);
            perItemNet = perItemOutput.map((o, idx) => o - perItemInput[idx]);
            note = `计算依据：兼营不能分别核算；从高适用税率${(highestRate * 100).toFixed(0)}%；合并不含税销售额${formatNumber(salesWithoutTax)}；行内进项税额合计${formatNumber(inputTaxPerItemsTotal)}；工具合并进项税额${formatNumber(inputTaxVal)}。`;
        } else {
            salesWithoutTax = bases.reduce((a, b) => a + b, 0);
            perItemOutput = items.map((it, idx) => bases[idx] * (it.rate || 0));
            usedRates = items.map(it => it.rate || 0);
            outputTax = perItemOutput.reduce((a, b) => a + b, 0);
            perItemNet = perItemOutput.map((o, idx) => o - perItemInput[idx]);
            note = `计算依据：兼营分别核算；合并不含税销售额${formatNumber(salesWithoutTax)}；行内进项税额合计${formatNumber(inputTaxPerItemsTotal)}；工具合并进项税额${formatNumber(inputTaxVal)}。`;
        }

        const taxPayable = outputTax - (inputTaxVal + inputTaxPerItemsTotal);

        // 渲染明细表
        if (mixedDetailsBody && mixedDetails) {
            mixedDetailsBody.innerHTML = '';
            items.forEach((it, idx) => {
                const tr = document.createElement('tr');
                const label = TAX_ITEM_LABEL_MAP[it.item] || it.item;
                tr.innerHTML = `
                    <td>${label}</td>
                    <td>${formatNumber(bases[idx])}</td>
                    <td>${(usedRates[idx] * 100).toFixed(0)}%</td>
                    <td>${formatNumber(perItemOutput[idx])}</td>
                    <td>${formatNumber(perItemInput[idx])}</td>
                    <td>${formatNumber(perItemNet[idx])}</td>
                `;
                mixedDetailsBody.appendChild(tr);
            });
            mixedDetails.style.display = 'block';
        }

        displayResults({
            salesWithoutTax,
            outputTax,
            inputTax: inputTaxVal + inputTaxPerItemsTotal,
            taxPayable,
            isGeneral: true,
            taxRate: 0,
            taxItem: undefined,
            noteOverride: note + '；提示：如需回到单税目计算，请使用上方一般纳税人表单。'
        });
    }

    // 小规模纳税人
    function calculateSmallTax() {
        const sales = parseFloat(document.getElementById('smallSales').value);
        const isTaxIncluded = document.querySelector('input[name="smallTaxIncluded"]:checked').value === "1";
        const taxRate = parseFloat(document.getElementById('smallTaxRate').value);
        const taxItem = document.getElementById('smallTaxItem') ? document.getElementById('smallTaxItem').value : undefined;
        const quarterTotalEl = document.getElementById('smallQuarterTotal');
        const quarterTotal = quarterTotalEl && quarterTotalEl.value !== '' ? parseFloat(quarterTotalEl.value) : undefined;
        const waiveExemption = !!document.getElementById('smallWaiveExemption')?.checked;

        if (isNaN(sales) || sales < 0) {
            setErrors('请输入有效的销售额（非负数字）。');
            return;
        }

        const salesWithoutTaxForCheck = isTaxIncluded ? (sales / (1 + (taxRate || 0))) : sales;
        const eligibleByMonth = salesWithoutTaxForCheck <= 100000;
        const eligibleByQuarter = (typeof quarterTotal === 'number' && quarterTotal >= 0 && quarterTotal <= 300000);

        if (!waiveExemption && (eligibleByMonth || eligibleByQuarter)) {
            const trigger = eligibleByQuarter ? 'quarter' : 'month';
            displayExemptionResults(sales, isTaxIncluded, taxRate, taxItem, trigger);
            return;
        }

        let salesWithoutTax = isTaxIncluded ? (sales / (1 + (taxRate || 0))) : sales;
        const taxPayable = salesWithoutTax * taxRate;

        displayResults({
            salesWithoutTax,
            outputTax: taxPayable,
            inputTax: 0,
            taxPayable,
            isGeneral: false,
            taxRate,
            taxItem
        });
    }

    function displayExemptionResults(sales, isTaxIncluded, taxRate, taxItem, trigger) {
        let salesWithoutTax = isTaxIncluded ? (sales / (1 + (taxRate || 0))) : sales;
        document.getElementById('resultSalesWithoutTax').textContent = formatNumber(salesWithoutTax);
        document.getElementById('resultOutputTax').textContent = '0.00';
        document.getElementById('resultInputTaxItem').style.display = 'none';
        document.getElementById('resultTaxPayable').textContent = '0.00';
        const taxItemLabel = taxItem ? TAX_ITEM_LABEL_MAP[taxItem] : undefined;
        const extra = taxItemLabel ? `；税目：${taxItemLabel}（说明，不影响征收率）` : '';
        const basisTrigger = trigger === 'quarter'
            ? '本次判定依据：季度累计不含税销售额≤30万元（免征）'
            : '本次判定依据：月不含税销售额≤10万元（免征）';
        const rateNote = taxRate === 0.01 ? '；阶段性优惠有效期至2027-12-31' : '';
        document.getElementById('resultNote').textContent = `${basisTrigger}；规则说明：以不含税销售额口径，符合“月≤10万元”或“季度累计≤30万元”任一条件免征增值税；如需开具增值税专用发票等，可选择放弃免税并计税${rateNote}` + extra;
        document.getElementById('resultNote').className = 'alert alert-success mt-3';
        renderBreakdown({ isGeneral: false, salesWithoutTax, outputTax: 0, inputTax: 0, taxPayable: 0, taxRate, taxItem, exemption: true, trigger });
        resultCard.style.display = 'block';
    }

    function displayResults(results) {
        document.getElementById('resultSalesWithoutTax').textContent = formatNumber(results.salesWithoutTax);
        document.getElementById('resultOutputTax').textContent = formatNumber(results.outputTax);

        const taxItemLabel = results.taxItem ? TAX_ITEM_LABEL_MAP[results.taxItem] : undefined;

        if (results.isGeneral) {
            document.getElementById('resultInputTaxItem').style.display = 'block';
            document.getElementById('resultInputTax').textContent = formatNumber(results.inputTax);
            let note;
            if (results.noteOverride) {
                note = results.noteOverride;
            } else if ((results.taxItem === 'export_zero') || (results.taxRate === 0)) {
                note = '计算依据：一般纳税人零税率（出口/跨境服务）；销项税额为0；进项税额抵扣与退税需按政策规定。';
            } else {
                note = `计算依据：一般纳税人增值税计算，适用税率${results.taxRate * 100}%`;
            }
            if (!results.noteOverride && taxItemLabel) note += `；税目：${taxItemLabel}`;
            if (!results.noteOverride && results.taxItem === 'agriculture') {
                note += '；提示：农产品进项抵扣率以政策规定为准';
            }
            if (results.taxPayable < 0) {
                note += '；提示：当期形成留抵税额；留抵税额按规定结转下期，符合增量留抵退税政策条件的可申请退还';
            }
            document.getElementById('resultNote').textContent = note;
        } else {
            document.getElementById('resultInputTaxItem').style.display = 'none';
            let note = `计算依据：小规模纳税人增值税计算，征收率${(results.taxRate * 100).toFixed(0)}%`;
            if (taxItemLabel) note += `；税目：${taxItemLabel}（说明，不影响征收率）`;
            if (results.taxRate === 0.01) note += '；阶段性优惠有效期至2027-12-31';
            document.getElementById('resultNote').textContent = note;
        }

        document.getElementById('resultTaxPayable').textContent = formatNumber(results.taxPayable);
        document.getElementById('resultNote').className = 'alert alert-info mt-3';
        renderBreakdown(results);
        resultCard.style.display = 'block';
    }

    function formatNumber(num) {
        // 统一：使用公共工具（千分位 + 两位小数，四舍五入）
        return (window.utils && window.utils.formatMoney) ? window.utils.formatMoney(num) : (Number(num||0).toFixed(2));
    }

    function renderBreakdown(r) {
        const el = document.getElementById('resultBreakdown');
        if (!el) return;
        const ratePct = (r.taxRate * 100).toFixed(r.taxRate === 0 ? 0 : (r.taxRate < 0.1 ? 0 : 0));
        const lines = [];
        if (r.exemption) {
            const basis = r.trigger === 'quarter' ? '季度累计不含税销售额≤30万元' : '月不含税销售额≤10万元';
            lines.push(`免税判定：${basis}`);
            lines.push(`销项税额 = 0.00；应纳税额 = 0.00`);
        } else if (r.isGeneral) {
            lines.push(`销项税额 = 不含税销售额 × 税率 = ${formatNumber(r.salesWithoutTax)} × ${ratePct}% = ${formatNumber(r.outputTax)}`);
            lines.push(`应纳税额 = 销项税额 − 进项税额 = ${formatNumber(r.outputTax)} − ${formatNumber(r.inputTax)} = ${formatNumber(r.taxPayable)}`);
        } else {
            lines.push(`应纳税额 = 不含税销售额 × 征收率 = ${formatNumber(r.salesWithoutTax)} × ${ratePct}% = ${formatNumber(r.taxPayable)}`);
        }
        el.innerHTML = lines.map(l => `<div class="line">${l}</div>`).join('');
    }
});
