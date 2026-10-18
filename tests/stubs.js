// Stubs mínimos das bibliotecas (indisponíveis offline): registram configurações para conferência.
exports.chartStub = `
window.__charts = [];
window.Chart = class Chart {
  constructor(canvas, cfg){ this.canvas = canvas; this.config = cfg; this.data = cfg.data; this.destroyed=false; window.__charts.push(this);
    const ctx = canvas.getContext && canvas.getContext('2d'); if (ctx){ canvas.width = canvas.width||300; canvas.height=canvas.height||150; ctx.fillStyle='#888'; ctx.fillRect(0,0,canvas.width,canvas.height);} }
  destroy(){ this.destroyed = true; const i = window.__charts.indexOf(this); if(i>=0) window.__charts.splice(i,1); }
  update(){}
  resize(){}
  static register(){}
};
window.Chart.defaults = { font:{}, plugins:{legend:{labels:{}}, tooltip:{}}, scale:{}, elements:{bar:{},line:{}}, animation:{}, color:'', borderColor:'' };
`;
exports.jspdfStub = `
window.jspdf = { jsPDF: class { constructor(o){ this.pages=1; this.imgs=[]; this.opts=o; window.__pdfDocs = window.__pdfDocs||[]; window.__pdfDocs.push(this);} addPage(){ this.pages++; return this;} addImage(d,f,x,y,w,h){ this.imgs.push({f,w,h,len:d.length}); return this;} output(t){ return new Blob([new Uint8Array(2000+this.imgs.length*100)],{type:'application/pdf'}); } } };
`;
exports.h2cStub = `
window.html2canvas = async function(el, o){ const c=document.createElement('canvas'); c.width=o.width*(o.scale||1); c.height=o.height*(o.scale||1); const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); window.__h2c = (window.__h2c||[]); window.__h2c.push({text: el.innerText}); return c; };
`;
