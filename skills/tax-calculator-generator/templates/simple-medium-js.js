/**
 * {税种名称}计算器 - 计算逻辑
 * 版本：{版本号}
 * 生成日期：{生成日期}
 */
document.addEventListener('DOMContentLoaded', function() {
    // ==================== 配置数据 ====================
    let config = {
        version: '{版本号}',
        effective_date: '{生效日期}',
        tax_items: []  // 将从配置文件加载
    };

    // ==================== 工具函数 ====================
    function parseAmount(input) {
        const v = String(input ?? '').trim();
        if (v === '') return NaN;
        const num = Number(v);
        return Number.isFinite(num) ? num : NaN;
    }

    function toFixed2(n) {
        return (Math.round(n * 100) / 100).toFixed(2);
    }

    function formatMoney(n) {
        const x = Number(n || 0);
        return toFixed2(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function getInputValue(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        const val = el.value;
        if (val === '' || val === undefined || val === null) return 0;
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    }

    function showError(msg) {
        const errorsEl = document.getElementById('errors');
        if (errorsEl) errorsEl.textContent = msg || '';
    }

    function clearError() { showError(''); }

    // ==================== 1. 加载配置文件 ====================
    fetch('./{tax_type}.config.json')
        .then(r => r.json())
        .then(cfg => {
            config = { ...config, ...cfg };
            updateVersionDisplay();
        })
        .catch(() => {
            console.warn('配置文件加载失败，使用默认配置');
            // 使用默认配置继续运行
        });

    function updateVersionDisplay() {
        const versionEl = document.getElementById('configVersion');
        const dateEl = document.getElementById('effectiveDate');
        if (versionEl) versionEl.textContent = config.version || '--';
        if (dateEl) dateEl.textContent = config.effective_date || '--';
    }

    // ==================== 2. 绑定计算按钮事件 ====================
    const calculateBtn = document.getElementById('calculateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resultCard = document.getElementById('resultCard');

    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculate);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }

    // ==================== 3. 实现计算逻辑 ====================
    function calculate() {
        clearError();

        // 3.1 获取输入值并验证
        const {填写具体输入字段} = getInputValue('{输入字段ID}');

        if (isNaN({验证字段}) || {验证字段} < 0) {
            showError('请输入有效的{字段名称}（非负数字）。');
            return;
        }

        // 3.2 执行计算
        try {
            const result = performCalculation({输入参数});

            // 3.3 渲染结果
            renderResult(result);

        } catch (e) {
            showError('计算过程中发生错误：' + e.message);
        }
    }

    function performCalculation({参数列表}) {
        // {税种}计算逻辑
        // {具体计算公式}

        const taxAmount = {计算结果};
        const effectiveRate = {税基} > 0 ? (taxAmount / {税基} * 100) : 0;

        return {
            {返回结果对象}
            taxAmount,
            effectiveRate,
            note: '{计算依据说明}'
        };
    }

    // ==================== 4. 渲染结果 ====================
    function renderResult(result) {
        document.getElementById('result{字段名}').textContent = formatMoney(result.{字段名});
        document.getElementById('resultTaxAmount').textContent = formatMoney(result.taxAmount);
        document.getElementById('resultEffectiveRate').textContent = result.effectiveRate.toFixed(2) + '%';
        document.getElementById('resultNote').textContent = result.note;

        // 显示结果卡片
        if (resultCard) resultCard.style.display = 'block';

        // 渲染计算明细
        renderBreakdown(result);
    }

    function renderBreakdown(result) {
        const el = document.getElementById('resultBreakdown');
        if (!el) return;

        const lines = [];
        lines.push('<div class="line">{税种}计算明细</div>');
        lines.push('<div class="line">---</div>');
        lines.push(`<div class="line">{计算公式说明}</div>`);
        lines.push(`<div class="line">应纳税额 = ${formatMoney(result.taxAmount)} 元</div>`);
        lines.push(`<div class="line">实际税负率 = ${result.effectiveRate.toFixed(2)}%</div>`);

        el.innerHTML = lines.map(l => `<div class="line">${l}</div>`).join('');
    }

    // ==================== 5. 重置与导出 ====================
    function resetForm() {
        document.querySelectorAll('input[type="number"]').forEach(el => {
            el.value = el.defaultValue || '';
        });
        if (resultCard) resultCard.style.display = 'none';
        clearError();
    }

    // 复制结果功能
    const copyBtn = document.getElementById('copyResultBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = document.getElementById('resultCard').innerText;
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.textContent = '已复制';
                setTimeout(() => copyBtn.textContent = '复制结果', 2000);
            });
        });
    }
});
