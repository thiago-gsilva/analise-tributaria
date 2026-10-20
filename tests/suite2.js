// Suíte 2 — Relatórios em PDF (V3.1), com as bibliotecas REAIS (Chart.js, html2canvas, jsPDF).
// Gera os três PDFs, confere páginas/tamanho com pdfinfo, valores e textos pelo DOM dos slides,
// transborda­mento de conteúdo e rasteriza as páginas (pdftoppm) em OUT_DIR para inspeção visual.
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { open } = require('./lib');
const { ok, fill, goto, chooseCnae } = require('./helpers');
const OUT = process.env.OUT_DIR || path.join(os.tmpdir(), 'at-pdf');
fs.mkdirSync(OUT, { recursive: true });
const FORBIDDEN = /\b(IRPJ|CSLL|DAS|ISS|IBS|CBS|PIS|COFINS|CPP|ICMS|IPI|Audicon|Nexo)\b/;
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
const norm = (s) => s.replace(/ /g, ' ');
const pdfinfo = (f) => { const o = execFileSync('pdfinfo', [f]).toString(); const pg = +o.match(/Pages:\s+(\d+)/)[1]; const m = o.match(/Page size:\s+([\d.]+) x ([\d.]+)/); return { pages: pg, w: +m[1], h: +m[2] }; };

async function textosDoDeck(page) {
  return page.evaluate(async () => {
    await aguardarFontes(); const m = mountPptxDeck();
    await new Promise((r) => setTimeout(r, 150));
    const slides = [...document.querySelectorAll('#pptxHost .pptx-slide')];
    const out = { n: slides.length, texts: slides.map((s) => s.innerText), overflow: slides.map((s) => { const b = s.querySelector('.pptx-body'); return b ? b.scrollHeight - b.clientHeight : 0; }), canvases: slides.map((s) => s.querySelectorAll('canvas').length), charts: pptxChartInstances.length, inset: [...document.querySelectorAll('#pptxHost *')].filter((e) => /inset/.test(getComputedStyle(e).boxShadow)).length };
    pptxDestroyCharts(); document.querySelector('#pptxHost').innerHTML = '';
    return out;
  });
}
async function gerar(page, modelo, tag) {
  await goto(page, 'relatorio');
  await page.click(`[data-modelo="${modelo}"]`); await page.waitForTimeout(250);
  const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
  await page.click('#btnGerarPdf');
  await page.waitForFunction((m) => window.__ultimoPdf && window.__ultimoPdf.modelo === m, modelo, { timeout: 60000 }).catch(() => {});
  const d = await dl; let file = null;
  if (d) { file = path.join(OUT, tag + '-' + modelo + '.pdf'); await d.saveAs(file); }
  const pdf = await page.evaluate(() => window.__ultimoPdf);
  return { d, file, pdf, fname: d && d.suggestedFilename() };
}
function raster(file, tag) { try { execFileSync('pdftoppm', ['-r', '60', '-png', file, path.join(OUT, tag)]); } catch (e) {} }

(async () => {
  const t = await open(); const { page, errors } = t;
  // ---------- cenário A: serviços (CNAE 6201), folha 28% → Fator R aplicável ----------
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await fill(page, 'f_empresa_faturamentoMensal', '30.000,00');
  await fill(page, 'f_empresa_folha12m', '100.800,00');
  await page.evaluate(() => { state.analise.nome = 'Consultoria Exemplo Ltda'; saveDraft(); });
  const r = await page.evaluate(() => { const r = computeAll(); return { tot: r.regimes.map((x) => ({ id: x.id, t: x.total })), fr: r.fatorRComp.aplicavel, nome: r.meta.periodo }; });
  ok('A: cenário de serviços com Fator R aplicável', r.fr === true);

  // 3 modelos na tela
  await goto(page, 'relatorio');
  const modelos = await page.$$eval('[data-modelo]', (b) => b.map((x) => x.dataset.modelo));
  ok('Relatório: três modelos (resumo, completa, memória)', JSON.stringify(modelos) === JSON.stringify(['resumo', 'completa', 'memoria']), modelos);

  // ---- Resumo Executivo ----
  let g = await gerar(page, 'resumo', 'A');
  let inf = g.file ? pdfinfo(g.file) : null; if (g.file) raster(g.file, 'A-resumo');
  let dk = await textosDoDeck(page);
  ok('resumo: 2 slides / 2 páginas 16:9 no PDF', g.pdf && g.pdf.paginas === 2 && inf && inf.pages === 2 && Math.abs(inf.w / inf.h - 16 / 9) < 0.01, { pdf: g.pdf, inf });
  ok('resumo: nome do arquivo com timestamp', /^analise-tributaria-apresentacao-consultoria-exemplo-ltda-resumo-\d{4}-\d{2}-\d{2}-\d{6}\.pdf$/.test(g.fname || ''), g.fname);
  let all = norm(dk.texts.join('\n'));
  ok('resumo: custo de cada regime idêntico ao resultado', r.tot.every((x) => all.includes(brl(x.t))), r.tot.filter((x) => !all.includes(brl(x.t))));
  ok('resumo: informa o período analisado', /jan\/2027 a dez\/2027/.test(all));
  ok('resumo: não cita tributos específicos nem marcas', !FORBIDDEN.test(all), all.match(FORBIDDEN));
  ok('resumo: gráfico Chart.js real desenhado no slide 1', dk.canvases[0] === 1 && dk.charts === 1, dk);
  ok('PDF: nenhum elemento com sombra interna (html2canvas a pinta como bloco preto)', dk.inset === 0, dk.inset);
  ok('resumo: sem transbordo de conteúdo', dk.overflow.every((v) => v <= 1), dk.overflow);
  ok('resumo: identifica base do resultado (cálculo/estimativa/hipótese)', /(Cálculo confirmado|Estimativa|Hipótese)/.test(all));

  // ---- Apresentação Completa ----
  g = await gerar(page, 'completa', 'A');
  inf = g.file ? pdfinfo(g.file) : null; if (g.file) raster(g.file, 'A-completa');
  dk = await textosDoDeck(page); all = norm(dk.texts.join('\n'));
  ok('completa: no máximo 5 slides; com Fator R aplicável = 5', dk.n === 5 && g.pdf.paginas === 5 && inf.pages === 5 && Math.abs(inf.w / inf.h - 16 / 9) < 0.01, { n: dk.n, inf });
  ok('completa: nome do arquivo (completa)', /-completa-\d{4}-\d{2}-\d{2}-\d{6}\.pdf$/.test(g.fname || ''), g.fname);
  ok('completa: custo de cada regime idêntico ao resultado', r.tot.every((x) => all.includes(brl(x.t))));
  ok('completa: cita tributos e Fator R', /IRPJ/.test(all) && /CSLL/.test(all) && /IBS/.test(all) && /Fator R/.test(all));
  ok('completa: sem transbordo de conteúdo', dk.overflow.every((v) => v <= 1), dk.overflow);
  ok('completa: gráficos reais (comparativo + composição)', dk.charts >= 2, dk.charts);

  // ---- Memória Técnica ----
  g = await gerar(page, 'memoria', 'A');
  inf = g.file ? pdfinfo(g.file) : null; if (g.file) raster(g.file, 'A-memoria');
  dk = await textosDoDeck(page); all = norm(dk.texts.join('\n'));
  ok('memória: PDF separado, A4 retrato, várias páginas', g.pdf && g.pdf.modelo === 'memoria' && inf && inf.pages === g.pdf.paginas && inf.pages >= 3 && inf.h > inf.w && Math.abs(inf.w / inf.h - 794 / 1123) < 0.01, { pdf: g.pdf, inf });
  ok('memória: nome do arquivo próprio', /^analise-tributaria-memoria-tecnica-consultoria-exemplo-ltda-\d{4}-\d{2}-\d{2}-\d{6}\.pdf$/.test(g.fname || ''), g.fname);
  ok('memória: contém premissas, memória passo a passo, trimestres, fundamentos legais', /Premissas e dados de entrada/.test(all) && /Memória de cálculo passo a passo/.test(all) && /Lucro Presumido por trimestre/.test(all) && /Fundamentos legais e fontes/.test(all), null);
  ok('memória: custo de cada regime idêntico ao resultado', r.tot.every((x) => all.includes(brl(x.t))));
  ok('memória: nenhum elemento com sombra interna', dk.inset === 0, dk.inset);
  ok('memória: sem transbordo de conteúdo', dk.overflow.every((v) => v <= 1), dk.overflow);

  // ---- Apresentação Completa condicional: comércio (sem Fator R) e receita variável ----
  await goto(page, 'preenchimento');
  await chooseCnae(page, '4711');
  await page.waitForTimeout(300);
  const com = await page.evaluate(() => { const r = computeAll(); return { fr: r.fatorRComp.aplicavel, anexo: r.anexoKey }; });
  g = await gerar(page, 'completa', 'B'); if (g.file) raster(g.file, 'B-completa');
  dk = await textosDoDeck(page); all = norm(dk.texts.join('\n'));
  ok('completa: comércio (sem Fator R) → 4 slides, sem slide de Fator R', com.fr === false && dk.n === 4 && !/Com e sem enquadramento/.test(all), { com, n: dk.n });
  await page.evaluate(() => { state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [10000, 50000, 20000, 90000, 30000, 60000, 15000, 80000, 25000, 70000, 40000, 100000]; saveDraft(); });
  dk = await textosDoDeck(page);
  ok('completa: receita variável → slide de composição inclui evolução mês a mês (3 gráficos)', dk.charts >= 3 && /Receita e custo mês a mês/.test(dk.texts.join(' ')), dk.charts);
  ok('completa: sem transbordo com receita variável', dk.overflow.every((v) => v <= 1), dk.overflow);

  // ---- Prévia ----
  await goto(page, 'relatorio');
  await page.click('[data-modelo="resumo"]'); await page.waitForTimeout(200);
  await page.click('#btnPreviaPdf'); await page.waitForTimeout(800);
  const prev = await page.evaluate(() => ({ n: document.querySelectorAll('#pptxHost .pptx-slide').length, counter: document.querySelector('#pptxCounter').textContent }));
  ok('prévia: abre com contador correto', prev.n === 2 && prev.counter === '1 / 2', prev);
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok('prévia fecha com Esc', (await page.$('#pptxOverlay')) === null);
  console.log('errors', JSON.stringify(errors));
  ok('sem erros de console/página', errors.length === 0, errors);
  console.log('PDFs e PNGs em ' + OUT);
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
