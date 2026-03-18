/* 附加税费计算器 - 计算逻辑与UI绑定 */
(function () {
  const els = {
    form: document.getElementById('surcharge-form'),
    vatPaid: document.getElementById('vatPaid'),
    excisePaid: document.getElementById('excisePaid'),
    location: document.getElementById('location'),
    isImport: document.getElementById('isImport'),
    errors: document.getElementById('errors'),
    base: document.getElementById('base'),
    cityMaintenanceTax: document.getElementById('cityMaintenanceTax'),
    educationSurcharge: document.getElementById('educationSurcharge'),
    localEducationSurcharge: document.getElementById('localEducationSurcharge'),
    total: document.getElementById('total'),
    importNote: document.getElementById('importNote'),
    rateVersion: document.getElementById('rateVersion'),
    effectiveDate: document.getElementById('effectiveDate'),
    btnCopyResult: document.getElementById('btnCopyResult'),
    btnExportPDF: document.getElementById('btnExportPDF'),
    calcBreakdown: document.getElementById('calcBreakdown'),
    policyNote: document.getElementById('policyNote'),
  };

  let rates = {
    version: '默认',
    effective_date: '未知',
    city_maintenance_tax: { city: 0.07, county_town: 0.05, other: 0.01 },
    education_surcharge: 0.03,
    local_education_surcharge: 0.02,
  };

  // 读取税率配置
  fetch('./rates.config.json')
    .then((r) => r.json())
    .then((json) => {
      rates = json;
    if (els.rateVersion) { els.rateVersion.textContent = rates.version || '—'; }
    // 统一规则：展示“最后生效日期”
    const lastEffectiveDate = rates.effective_until 
      || (rates.effective_period && (rates.effective_period.to || rates.effective_period.end)) 
      || rates.effective_date 
      || '—';
    if (els.effectiveDate) { els.effectiveDate.textContent = lastEffectiveDate; }
    })
    .catch(() => {
    if (els.rateVersion) { els.rateVersion.textContent = rates.version; }
    const lastEffectiveDate2 = rates.effective_until 
      || (rates.effective_period && (rates.effective_period.to || rates.effective_period.end)) 
      || rates.effective_date 
      || '—';
    if (els.effectiveDate) { els.effectiveDate.textContent = lastEffectiveDate2; }
    });

  const { formatMoney, parseAmount } = window.utils || { formatMoney: (n)=>String(n), parseAmount: (v)=>Number(v) };

  function validate(vat, excise) {
    const errors = [];
    if (isNaN(vat)) errors.push('请填写当期实际缴纳增值税。');
    if (!isNaN(vat) && vat < 0) errors.push('当期实际缴纳增值税不可为负数。');
    if (isNaN(excise)) errors.push('消费税金额不合法，请填写数字。');
    if (!isNaN(excise) && excise < 0) errors.push('当期实际缴纳消费税不可为负数。');
    return errors;
  }

  function computeSurcharges(vatPaid, excisePaid, locationKey) {
    const base = vatPaid + excisePaid;
    const cityRate = rates.city_maintenance_tax[locationKey];
    const eduRate = rates.education_surcharge;
    const localEduRate = rates.local_education_surcharge;
    const cityTax = base * cityRate;
    const eduTax = base * eduRate;
    const localEduTax = base * localEduRate;
    const total = cityTax + eduTax + localEduTax;
    return {
      vatPaid, excisePaid, base, cityRate, eduRate, localEduRate, cityTax, eduTax, localEduTax, total,
    };
  }

  function render(result) {
    els.base.textContent = isNaN(result.base) ? '—' : formatMoney(result.base);
    els.cityMaintenanceTax.textContent = formatMoney(result.cityTax);
    els.educationSurcharge.textContent = formatMoney(result.eduTax);
    els.localEducationSurcharge.textContent = formatMoney(result.localEduTax);
    els.total.textContent = formatMoney(result.total);
    renderBreakdown(result);
    renderPolicyNote(result);
  }

  function renderImportNote(isImport) {
    if (isImport) {
      els.importNote.textContent = '进口环节不征收城市维护建设税；教育费附加与地方教育附加计征依据与城建税一致（不含进口环节两税）。';
    } else {
      els.importNote.textContent = '';
    }
  }

  els.form.addEventListener('submit', function (e) {
    e.preventDefault();
    els.errors.textContent = '';

    const vat = parseAmount(els.vatPaid.value);
    const excise = parseAmount(els.excisePaid.value || '0');
    const locationKey = els.location.value;
    const importFlag = !!els.isImport.checked;

    const errs = validate(vat, excise);
    if (errs.length > 0) {
      els.errors.textContent = errs.join(' ');
      return;
    }

    // 进口环节：按现行法规不计征城建税、教育费附加与地方教育附加
    if (importFlag) {
      render({ base: 0, cityTax: 0, eduTax: 0, localEduTax: 0, total: 0 });
      renderImportNote(importFlag);
      return;
    }

    // 当税基为0时直接输出0并提示（境内环节）
    if ((vat || 0) + (excise || 0) === 0) {
      render({ base: 0, cityTax: 0, eduTax: 0, localEduTax: 0, total: 0 });
      renderImportNote(importFlag);
      return;
    }

    const result = computeSurcharges(vat, excise, locationKey);
    render(result);
    renderImportNote(importFlag);
  });

  function renderBreakdown(r){
    if (!els.calcBreakdown) return;
    const locLabelMap = { city: '城市（市区）', county_town: '县城与建制镇', other: '其他地区' };
    const lines = [
      `税基 = 增值税 + 消费税 = ${formatMoney(r.vatPaid)} + ${formatMoney(r.excisePaid)} = ${formatMoney(r.base)}`,
      `城建税 = 税基 × 档位税率 = ${formatMoney(r.base)} × ${(r.cityRate*100).toFixed(0)}% = ${formatMoney(r.cityTax)}`,
      `教育费附加 = 税基 × ${(r.eduRate*100).toFixed(0)}% = ${formatMoney(r.eduTax)}`,
      `地方教育附加 = 税基 × ${(r.localEduRate*100).toFixed(0)}% = ${formatMoney(r.localEduTax)}`,
      `合计附加税费 = 上述三项之和 = ${formatMoney(r.total)}`
    ];
    els.calcBreakdown.innerHTML = lines.map(l=>`<div class="line">${l}</div>`).join('');
  }

  function renderPolicyNote(r){
    if (!els.policyNote) return;
    const locLabelMap = { city: '城市（市区）', county_town: '县城与建制镇', other: '其他地区' };
    const locText = locLabelMap[els.location.value] || '—';
    els.policyNote.textContent = `计算依据：城市维护建设税法、教育费附加及地方教育附加相关规定；税基为“实际缴纳的增值税与消费税”，进口环节不计征。当前档位：${locText}`;
  }

  if (els.btnCopyResult){
    els.btnCopyResult.addEventListener('click', ()=>{ window.utils?.copyNodeTextById('result'); });
  }
  if (els.btnExportPDF){
    els.btnExportPDF.addEventListener('click', ()=>{ window.exporter?.printSection('result','附加税费计算结果'); });
  }
})();