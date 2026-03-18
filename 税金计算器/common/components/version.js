;(function(){
  function loadAndDisplay(configUrl, versionElId, dateElId){
    const vEl = versionElId ? document.getElementById(versionElId) : null;
    const dEl = dateElId ? document.getElementById(dateElId) : null;
    fetch(configUrl).then(r=>r.json()).then(cfg=>{
      if (vEl) vEl.textContent = cfg.version || '—';
      // 统一规则：生效日期展示为“最后生效日期”。兼容多种字段：
      // 1) effective_until；2) effective_period.to / .end；3) effective_date（单值即视为最后生效日）
      const last = cfg.effective_until 
        || (cfg.effective_period && (cfg.effective_period.to || cfg.effective_period.end)) 
        || cfg.effective_date 
        || '—';
      if (dEl) dEl.textContent = last;
    }).catch(()=>{
      if (vEl) vEl.textContent = '—';
      if (dEl) dEl.textContent = '—';
    });
  }
  window.version = { loadAndDisplay };
})();