const { open } = require('./lib');
const { ok, fill, goto, chooseCnae } = require('./helpers');
const fs = require('fs');
(async () => {
  const t = await open(); const { page, errors } = t;
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await fill(page, 'f_empresa_faturamentoMensal', '30.000,00');
  await fill(page, 'f_empresa_folha12m', '100.800,00');
  await page.evaluate(() => { state.analise.nome = 'Base'; });
  // salvar via botão do cabeçalho
  await page.click('#btnSalvarSim'); await page.waitForTimeout(300);
  ok('H: salvar simulação pela etapa 2', (await page.evaluate(() => listarSimulacoes().length)) === 1);
  // biblioteca (modal)
  await page.click('#navLib'); await page.waitForTimeout(250);
  ok('H: modal da biblioteca abre', !!(await page.$('#modalBib .lib-item')));
  await page.click('#modalBib [data-a="dup"]'); await page.waitForTimeout(250);
  ok('H: duplicar pela biblioteca', (await page.evaluate(() => listarSimulacoes().length)) === 2);
  // exportar todas
  const dl = page.waitForEvent('download', { timeout: 8000 });
  await page.click('#mbExpAll');
  const d = await dl; const p = '/tmp/export.json'; await d.saveAs(p);
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  console.log('arquivo exportado:', d.suggestedFilename(), Object.keys(pkg));
  ok('H: exportação gera arquivo .json com timestamp', /^analise-tributaria-simulacoes-\d{4}-\d{2}-\d{2}-\d{6}\.json$/.test(d.suggestedFilename()));
  // esvaziar e importar
  await page.evaluate(() => { gravarSimulacoes([]); renderBiblioteca(); });
  await page.setInputFiles('#mbFile', p); await page.waitForTimeout(500);
  const n = await page.evaluate(() => listarSimulacoes().length);
  ok('H: importação restaura as simulações', n === 2, n);
  // importar rascunho legado como arquivo (formato antigo)
  fs.writeFileSync('/tmp/legacy.json', JSON.stringify({ empresa: { nome: 'Legado Arquivo', faturamentoMensal: 18000, rbt12Modo: 'auto', rbt12Manual: 216000, folha12m: 0, proLabore: 0, anoAnalise: 2026, cnpj: '', cnae: null }, simples: { anexoModo: 'auto', anexoManual: 'III' }, active: 'dashboard' }));
  await page.setInputFiles('#mbFile', '/tmp/legacy.json'); await page.waitForTimeout(500);
  ok('H: importa arquivo de rascunho legado', (await page.evaluate(() => listarSimulacoes().length)) === 3);
  // abrir e renomear
  await page.evaluate(() => { const s = listarSimulacoes().find((x) => x.nome === 'Legado Arquivo' || /Legado/.test(x.nome)); abrirSimulacao(s.id); });
  await page.waitForTimeout(300);
  ok('H: abrir simulação carrega os dados', (await page.evaluate(() => state.empresa.faturamentoMensal)) === 18000);
  await page.evaluate(() => fecharModal());

  // comparar cenários
  await page.evaluate(() => { const s = listarSimulacoes().find((x) => x.nome === 'Base'); abrirSimulacao(s.id); fecharModal(); });
  await page.waitForTimeout(300);
  await goto(page, 'resultados');
  await page.click('#navCmp'); await page.waitForTimeout(400);
  await page.fill('#vRec', '20'); await page.fill('#vMeses', '6'); await page.selectOption('#vFator', 'necessaria');
  await page.click('#btnCriarVar'); await page.waitForTimeout(400);
  const cmp = await page.evaluate(() => {
    const sel = state.ui.cenariosSel; const lista = listarSimulacoes();
    const sim = lista.find((s) => s.id === sel[sel.length - 1]);
    const direto = comEntradas(sim.inputs, () => { const r = computeAll(); return { rec: r.meta.receitaTotal, n: r.meta.nMeses, t: r.regimes.map((x) => +x.total.toFixed(2)) }; });
    const tab = [...document.querySelectorAll('#tabCenarios tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' '));
    return { direto, tab, cols: document.querySelectorAll('#tabCenarios thead th').length, chart: !!CHARTS.cenarios, ds: CHARTS.cenarios && CHARTS.cenarios.data.datasets.map((d) => d.data) };
  });
  console.log(JSON.stringify(cmp.direto), cmp.cols, cmp.tab.slice(0, 3));
  ok('I: variação (receita +20%, 6 meses, folha necessária) calculada', cmp.direto.n === 6 && Math.abs(cmp.direto.rec - 30000 * 1.2 * 6) < 0.01, cmp.direto);
  ok('I: tabela de cenários tem análise atual + variação', cmp.cols >= 3);
  ok('I: gráfico de cenários criado', cmp.chart);
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
  const tabTxt = cmp.tab.join(' ').replace(/ /g, ' ');
  ok('I: valores da variação na tabela = cálculo direto', cmp.direto.t.every((v) => tabTxt.includes(fmt(v))), { esperado: cmp.direto.t.map(fmt), tab: cmp.tab });
  // Tema
  for (const [choice, expectDark] of [['dark', true], ['light', false], ['system', false]]) {
    await page.click(`.theme-btn[data-theme-choice="${choice}"]`); await page.waitForTimeout(250);
    const info = await page.evaluate(() => ({ attr: document.documentElement.getAttribute('data-theme'), dark: isDarkActive(), bg: getComputedStyle(document.body).backgroundColor, stored: localStorage.getItem('analise-tributaria-theme'), side: getComputedStyle(document.querySelector('#sidebar')).backgroundColor }));
    console.log(choice, JSON.stringify(info));
    ok('J: tema ' + choice + ' aplicado e persistido', info.attr === choice && info.dark === expectDark && info.stored === choice, info);
  }
  await page.click('.theme-btn[data-theme-choice="dark"]'); await page.waitForTimeout(250);
  const dk = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, side: getComputedStyle(document.querySelector('#sidebar')).backgroundColor }));
  ok('J: escuro — fundo #455157 e sidebar #0C171B', dk.bg === 'rgb(69, 81, 87)' && dk.side === 'rgb(12, 23, 27)', dk);
  await page.click('.theme-btn[data-theme-choice="light"]'); await page.waitForTimeout(250);
  const lt = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, color: getComputedStyle(document.body).color, side: getComputedStyle(document.querySelector('#sidebar')).backgroundColor }));
  ok('J: claro — fundo #EDEDED, texto #03131C, sidebar #0C171B', lt.bg === 'rgb(237, 237, 237)' && lt.color === 'rgb(3, 19, 28)' && lt.side === 'rgb(12, 23, 27)', lt);
  // Trimestre parcial no LP: início em fev, 5 meses
  await page.evaluate(() => { state.periodo.mesInicio = 2; state.periodo.meses = 5; });
  const q = await page.evaluate(() => { const r = computeAll(); return r.presumido.trimestres.map((x) => [x.rotulo, x.mesesCount, x.receita]); });
  console.log('LP parcial', JSON.stringify(q));
  ok('K: LP agrupa por trimestre-calendário (fev–mar | abr–jun)', q.length === 2 && q[0][1] === 2 && q[1][1] === 3, q);
  console.log('errors', errors); ok('sem erros de console/página', errors.length === 0, errors);
  await t.close();
})();
