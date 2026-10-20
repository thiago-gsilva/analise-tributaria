// Suíte 5 — Gráficos com Chart.js REAL: carregamento, valores = motor, legendas, atualização,
// troca de tema, responsividade e gráficos do PDF. Salva capturas em OUT_DIR.
const fs = require('fs'), os = require('os'), path = require('path');
const { open } = require('./lib');
const { ok, fill, goto, chooseCnae, abrirDet } = require('./helpers');
const OUT = process.env.OUT_DIR || path.join(os.tmpdir(), 'at-charts');
fs.mkdirSync(OUT, { recursive: true });
const eq = (a, b) => Math.abs(a - b) < 0.005;
(async () => {
  const t = await open(); const { page, errors } = t;
  const real = await page.evaluate(() => ({ v: typeof Chart !== 'undefined' && Chart.version, stub: typeof Chart !== 'undefined' && !!Chart.__stub }));
  ok('Chart.js real carregado (4.4.4)', real.v === '4.4.4' && !real.stub, real);
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await fill(page, 'f_empresa_faturamentoMensal', '30.000,00');
  await fill(page, 'f_empresa_folha12m', '100.800,00');
  await goto(page, 'resultados'); await page.waitForTimeout(300);
  await abrirDet(page, 'composicao'); // V3.2: composição recolhida por padrão

  const dump = () => page.evaluate(() => {
    const r = state.result;
    const info = {};
    Object.keys(CHARTS).forEach((k) => { const c = CHARTS[k]; info[k] = { type: c.config.type, labels: c.data.labels, sets: c.data.datasets.map((d) => ({ label: d.label, data: d.data, bg: d.backgroundColor })), w: c.width, h: c.height, legend: c.options.plugins.legend.display !== false, legendItems: (c.legend && c.legend.legendItems || []).map((i) => i.text), tick: c.options.scales.x.ticks.color, grid: c.options.scales.y.grid.color, id: c.id };
      const cv = c.canvas, ctx = cv.getContext('2d'); const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; info[k].pixels = n; info[k].box = cv.parentElement.clientWidth; });
    return { info, tot: r.regimes.map((x) => x.total), comp: r.composicao, cons: verificarConsistencia(), temporal: r.temporal };
  });
  let d = await dump();
  ok('Gráficos criados: comparativo e composição', !!d.info.comparativo && !!d.info.composicao, Object.keys(d.info));
  ok('Comparativo: valores = motor (3 regimes)', d.tot.every((v, i) => eq(d.info.comparativo.sets[0].data[i], v)), d.info.comparativo.sets[0].data);
  ok('Composição: soma de cada regime = total do motor e séries = composição do motor', d.tot.every((v, i) => eq(d.info.composicao.sets.reduce((a, s) => a + s.data[i], 0), v)) && d.info.composicao.sets.every((s) => { const i = d.comp.cats.indexOf(s.label); return eq(s.data[0], d.comp.simples[i]) && eq(s.data[1], d.comp.hibrido[i]) && eq(s.data[2], d.comp.presumido[i]); }), null);
  ok('verificarConsistencia: cartões = tabela = gráficos', d.cons.ok, d.cons);
  ok('Canvas efetivamente desenhado (pixels não transparentes)', Object.keys(d.info).every((k) => d.info[k].pixels > 2000), Object.keys(d.info).map((k) => [k, d.info[k].pixels]));
  ok('Legenda da composição: lista exatamente as categorias com valor', JSON.stringify(d.info.composicao.legendItems) === JSON.stringify(d.info.composicao.sets.map((s) => s.label)), d.info.composicao.legendItems);
  ok('Comparativo sem legenda redundante (rótulos no eixo e valores nas barras)', d.info.comparativo.legend === false);
  // nenhum rótulo de categoria pode ser omitido pelo auto-ocultar do eixo (3 regimes visíveis)
  const lab = await page.evaluate(() => ['comparativo', 'composicao'].map((k) => { const c = CHARTS[k]; c.update(); return { k, n: c.data.labels.length, vis: c.scales.x.ticks.length, auto: c.options.scales.x.ticks.autoSkip }; }));
  // rótulos de categoria não podem se sobrepor: largura de cada rótulo medida ≤ largura da faixa da categoria
  const sob = await page.evaluate(() => ['comparativo', 'composicao'].map((k) => { const c = CHARTS[k]; const ctx = c.ctx; ctx.save(); ctx.font = '12px Inter, sans-serif'; const faixa = c.chartArea.width / c.data.labels.length; const maxW = Math.max.apply(null, c.data.labels.map((l) => Math.max.apply(null, [].concat(l).map((x) => ctx.measureText(x).width)))); ctx.restore(); return { k, faixa: Math.round(faixa), maxW: Math.round(maxW) }; }));
  ok('Rótulos do eixo X não se sobrepõem (largura do texto < faixa da categoria)', sob.every((x) => x.maxW < x.faixa - 4), sob);
  ok('Rótulos do eixo X: todos os 3 regimes visíveis (sem auto-ocultar)', lab.every((l) => l.n === 3 && l.vis === 3 && l.auto === false), lab);
  await page.screenshot({ path: path.join(OUT, 'resultados-claro.png'), fullPage: true });

  // ---- atualização após alteração de dados ----
  await goto(page, 'preenchimento');
  await fill(page, 'f_empresa_faturamentoMensal', '45.000,00');
  await goto(page, 'resultados'); await page.waitForTimeout(300);
  const d2 = await dump();
  ok('Atualização: após alterar a receita os gráficos mostram os novos valores (sem dados antigos)', d2.tot.every((v, i) => eq(d2.info.comparativo.sets[0].data[i], v)) && !eq(d2.tot[0], d.tot[0]) && d2.cons.ok, { antes: d.tot, depois: d2.tot });

  // ---- troca de tema ----
  const idAntes = d2.info.comparativo.id;
  await page.click('.theme-btn[data-theme-choice="dark"]'); await page.waitForTimeout(500);
  const dk = await dump();
  ok('Tema escuro: gráficos recriados com as cores do tema (texto claro nos eixos)', dk.info.comparativo.id !== idAntes && dk.info.comparativo.tick !== d2.info.comparativo.tick && /^#?e|rgb\(2[0-9]{2}/i.test(dk.info.comparativo.tick.replace(/\s/g, '')), { claro: d2.info.comparativo.tick, escuro: dk.info.comparativo.tick });
  ok('Tema escuro: valores permanecem idênticos ao motor', dk.tot.every((v, i) => eq(dk.info.comparativo.sets[0].data[i], v)) && dk.cons.ok);
  ok('Tema escuro: canvas desenhado', Object.keys(dk.info).every((k) => dk.info[k].pixels > 2000));
  await page.screenshot({ path: path.join(OUT, 'resultados-escuro.png'), fullPage: true });
  await page.click('.theme-btn[data-theme-choice="light"]'); await page.waitForTimeout(500);
  const dl = await dump();
  ok('Voltar ao tema claro: cores restauradas e valores iguais', dl.info.comparativo.tick === d2.info.comparativo.tick && dl.cons.ok, dl.info.comparativo.tick);

  // ---- responsividade ----
  for (const vp of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 1024, height: 768 }, { width: 800, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp); await page.waitForTimeout(500);
    const rs = await page.evaluate(() => ({ cvs: Object.keys(CHARTS).map((k) => { const c = CHARTS[k]; return { k, cw: Math.round(c.canvas.clientWidth), box: c.canvas.parentElement.clientWidth, ch: Math.round(c.canvas.clientHeight) }; }), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`Responsivo ${vp.width}×${vp.height}: gráficos cabem no contêiner e a página não rola na horizontal`, rs.cvs.every((c) => c.cw <= c.box + 1 && c.cw > 100 && c.ch > 120) && rs.sw <= rs.cw + 1, rs);
    const sob2 = await page.evaluate(() => ['comparativo', 'composicao'].map((k) => { const c = CHARTS[k]; const ctx = c.ctx; ctx.save(); ctx.font = '12px Inter, sans-serif'; const faixa = c.chartArea.width / c.data.labels.length; const maxW = Math.max.apply(null, c.data.labels.map((l) => Math.max.apply(null, [].concat(l).map((x) => ctx.measureText(x).width)))); ctx.restore(); return { k, faixa: Math.round(faixa), maxW: Math.round(maxW) }; }));
    ok(`Responsivo ${vp.width}: rótulos de categoria sem sobreposição`, sob2.every((x) => x.maxW < x.faixa - 2), sob2);
    if (vp.width === 1366 || vp.width === 390) await page.screenshot({ path: path.join(OUT, 'resultados-' + vp.width + '.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- visão temporal (receita variável) ----
  await page.evaluate(() => { state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [10000, 50000, 20000, 90000, 30000, 60000, 15000, 80000, 25000, 70000, 40000, 100000]; saveDraft(); renderContent(); });
  await page.waitForTimeout(400);
  await abrirDet(page, 'temporal'); // V3.2: evolução recolhida por padrão
  const dt = await dump();
  ok('Temporal (receita variável): gráfico criado e séries = motor mês a mês', !!dt.info.temporal && dt.info.temporal.sets[0].data.every((v, i) => eq(v, dt.temporal.receita[i])) && dt.info.temporal.sets[1].data.every((v, i) => eq(v, dt.temporal.simples[i])) && dt.info.temporal.sets[2].data.every((v, i) => eq(v, dt.temporal.hibrido[i])) && dt.info.temporal.sets[3].data.every((v, i) => eq(v, dt.temporal.presumido[i])), null);
  ok('Temporal: totais mensais somam o custo de cada regime; consistência OK', dt.cons.ok, dt.cons);
  ok('Temporal: legenda com 4 séries', dt.info.temporal.legendItems.length === 4, dt.info.temporal.legendItems);
  await page.screenshot({ path: path.join(OUT, 'resultados-temporal.png'), fullPage: true });

  // ---- gráficos do PDF = mesmos valores ----
  const pdf = await page.evaluate(async () => {
    state.ui.relatorioModelo = 'completa'; await aguardarFontes(); mountPptxDeck(); await new Promise((r) => setTimeout(r, 200));
    const r = state.result;
    const out = pptxChartInstances.map((c) => ({ type: c.config.type, labels: c.data.labels, data: c.data.datasets.map((d) => d.data), tick: c.options.scales.x.ticks.color, dpr: c.options.devicePixelRatio }));
    const px = pptxChartInstances.map((c) => { const d = c.canvas.getContext('2d').getImageData(0, 0, c.canvas.width, c.canvas.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    const tot = r.regimes.map((x) => x.total);
    pptxDestroyCharts(); document.querySelector('#pptxHost').innerHTML = '';
    return { out, px, tot };
  });
  ok('PDF: gráfico comparativo do slide com os mesmos valores do motor', pdf.out[0].data[0].every((v, i) => eq(v, pdf.tot[i])), pdf.out[0]);
  ok('PDF: composição soma = total de cada regime', pdf.tot.every((v, i) => eq(pdf.out[1].data.reduce((a, s) => a + s[i], 0), v)));
  ok('PDF: gráficos usam a paleta clara (texto #03131C) e resolução 2×', pdf.out.every((o) => o.tick === '#03131C' && o.dpr === 2), pdf.out.map((o) => [o.tick, o.dpr]));
  ok('PDF: canvas dos slides desenhados', pdf.px.every((n) => n > 2000), pdf.px);
  console.log('errors', JSON.stringify(errors));
  ok('sem erros de console/página', errors.length === 0, errors);
  console.log('capturas em ' + OUT);
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
