;(function(){
  const toFixed2 = function(n){
    const x = Number(n || 0);
    return (Math.round(x * 100) / 100).toFixed(2);
  };

  const formatMoney = function(n){
    const x = Number(n || 0);
    return toFixed2(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseAmount = function(input){
    const v = String(input ?? '').trim();
    if (v === '') return NaN;
    const num = Number(v);
    return Number.isFinite(num) ? num : NaN;
  };

  const copyText = async function(text){
    try{
      if (navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(String(text || ''));
        return true;
      }
    }catch(e){/* ignore */}
    const ta = document.createElement('textarea');
    ta.value = String(text || '');
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    return true;
  };

  const copyNodeTextById = async function(id){
    const el = document.getElementById(id);
    if (!el) return false;
    const txt = el.innerText || el.textContent || '';
    return copyText(txt);
  };

  window.utils = { toFixed2, formatMoney, parseAmount, copyText, copyNodeTextById };
})();