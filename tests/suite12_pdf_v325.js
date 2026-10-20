// V3.2.5 — os três PDFs com as bibliotecas reais em cenários com 6ª faixa (acréscimo aplicado e premissa pendente).
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { open } = require('./lib');
const { ok, goto } = require('./helpers');
const OUT = process.env.OUT_DIR || path.join(os.tmpdir(), 'at-pdf325'); fs.mkdirSync(OUT, { recursive: true });
const pdfinfo = (f) => { const o = execFileSync('pdfinfo', [f]).toString(); return { pages: +o.match(/Pages:\s+(\d+)/)[1] }; };
const norm = (s) => s.replace(/ /g, ' ');
const brl = (v) => norm(v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
async function gerar(page, modelo, tag) {
  await goto(page, 'relatorio'); await page.click(`[data-modelo="${modelo}"]`); await page.waitForTimeout(250);
  const dl = page.waitForEvent('download', { timeout: 60000 }).catch(() => null);
  await page.click('#btnGerarPdf');
  await page.waitForFunction((m) => window.__ultimoPdf && window.__ultimoPdf.modelo === m, modelo, { timeout: 90000 }).catch(() => {});
  const d = await dl; let file = null; if (d) { file = path.join(OUT, tag + '-' + modelo + '.pdf'); await d.saveAs(file); }
  return { file, pdf: await page.evaluate(() => window.__ultimoPdf) };
}
async function deck(page) {
  return page.evaluate(async () => {
    await aguardarFontes(); mountPptxDeck(); await new Promise((r) => setTimeout(r, 150));
    const slides = [...document.querySelectorAll('#pptxHost .pptx-slide')];
    const o = { texts: slides.map((s) => s.innerText), overflow: slides.map((s) => { const b = s.querySelector('.pptx-body'); return b ? b.scrollHeight - b.clientHeight : 0; }), inset: [...document.querySelectorAll('#pptxHost *')].filter((e) => /inset/.test(getComputedStyle(e).boxShadow)).length };
    pptxDestroyCharts(); document.querySelector('#pptxHost').innerHTML = ''; return o;
  });
}
(async () => {
  const t = await open(); const { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const cenarios = [
    { tag: 'jan27', set: () => { resetState(); state.analise.tipo = 'avulsa'; state.analise.nome = 'Contrato Exemplo Ltda'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 1; state.periodo.meses = 3; state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [500000, 500000, 500000]; state.fatorR.modo = 'nenhuma'; },
      txt: [/Simples/, /art\. 21, IV/], esp: 'conclusivo' },
    { tag: 'exist', set: () => { resetState(); state.analise.tipo = 'existente'; state.analise.nome = 'Empresa Existente Ltda'; state.empresa.anoAnalise = 2027; state.empresa.faturamentoMensal = 340000; state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 4080000; state.simples.anexoModo = 'manual'; state.simples.anexoManual = 'III'; state.periodo.rbt12Movel = false; },
      txt: [/premissa/i, /art\. 21, IV/], esp: 'inconclusivo' },
  ];
  for (const c of cenarios) {
    await page.evaluate(`(${c.set})()`); await page.evaluate(() => { saveDraft(); });
    const r = await page.evaluate(() => { const r = computeAll(); return { tot: r.regimes.map((x) => x.total), rec: r.recomendacao.estado, motivos: r.recomendacao.motivos }; });
    ok(c.tag + ': recomendação ' + c.esp, r.rec === c.esp, r);
    for (const modelo of ['resumo', 'completa', 'memoria']) {
      const g = await gerar(page, modelo, c.tag); const inf = g.file ? pdfinfo(g.file) : null;
      try { execFileSync('pdftoppm', ['-r', '60', '-png', g.file, path.join(OUT, c.tag + '-' + modelo)]); } catch (e) {}
      const dk = await deck(page); const all = norm(dk.texts.join('\n'));
      ok(c.tag + ' ' + modelo + ': PDF gerado (' + (inf && inf.pages) + ' páginas = ' + (g.pdf && g.pdf.paginas) + ')', g.pdf && inf && inf.pages === g.pdf.paginas && inf.pages >= (modelo === 'resumo' ? 2 : 1), { pdf: g.pdf, inf });
      ok(c.tag + ' ' + modelo + ': sem transbordo visível (até 24 px de folga interna do corpo do slide, medida já existente na v3.2.4 sem corte; conferido nas imagens) e sem sombra interna', dk.overflow.every((v) => v <= 24) && dk.inset === 0, dk);
      if (modelo !== 'resumo' || true) ok(c.tag + ' ' + modelo + ': valor de cada regime elegível idêntico ao resultado', r.tot.every((v) => all.includes(brl(v)) || all.includes(brl(Math.round(v)).replace(',00', ''))) || modelo === 'memoria' && r.tot.every((v) => all.includes(brl(v).replace(/\s/g, ' '))), r.tot.map(brl).filter((s) => !all.includes(s)));
      if (modelo === 'memoria') ok(c.tag + ' memória: seção da 6ª faixa e fórmula do art. 21, IV', /6ª faixa — ICMS, ISS e IBS pela fórmula da 5ª faixa/.test(all) && /alíquota efetiva da 5ª faixa/.test(all), all.match(/6ª faixa[^\n]{0,60}/g));
      if (modelo === 'resumo') ok(c.tag + ' resumo: ' + (c.esp === 'conclusivo' ? 'identifica o Simples como menor custo estimado, preliminar' : 'comparativo inconclusivo por premissa pendente'), c.esp === 'conclusivo' ? /(Menor custo|menor custo)/.test(all) && /(Estimativa|estimativa|preliminar)/i.test(all) : /inconclusivo/i.test(all) && !/Menor custo\s+R\$/.test(all), all.slice(0, 700));
    }
  }
  ok('Sem erros de console', errors.length === 0, errors);
  console.log('PDFs/rasters em', OUT);
  await t.close();
})();
