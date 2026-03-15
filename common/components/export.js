;(function(){
  function printSection(sectionId, title){
    const el = document.getElementById(sectionId);
    if (!el) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title||'导出'}</title>`+
      `<link rel="stylesheet" href="../common/styles.css">`+
      `</head><body><div class="container"><div class="card print-only">${el.outerHTML}</div></div>`+
      `</body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>{ try{ win.print(); } catch(e){} }, 250);
  }
  window.exporter = { printSection };
})();