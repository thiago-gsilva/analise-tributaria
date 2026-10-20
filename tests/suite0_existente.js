const { open } = require('./lib');
const { ok, fill, goto, chooseCnae, abrirDet } = require('./helpers');
(async () => {
  const t = await open(); const { page, errors } = t;
  // ===== A. Empresa existente, receita constante 18.000, CNAE de serviços =====
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  const got = await chooseCnae(page, '6201');
  ok('A: CNAE autocomplete retorna opção', got);
  console.log('cnae:', await page.evaluate(() => state.empresa.cnae && state.empresa.cnae.codigo));
  await fill(page, 'f_empresa_faturamentoMensal', '18.000,00');
  await fill(page, 'f_empresa_folha12m', '60.000,00');
  const a = await page.evaluate(() => { const r = computeAll(); return { rec: r.meta.receitaTotal, n: r.meta.nMeses, tot: r.regimes.map((x) => [x.id, +x.total.toFixed(2), +x.cargaPct.toFixed(3)]), anexo: r.anexoKey, fr: r.simples.fatorR }; });
  console.log(JSON.stringify(a));
  ok('A: receita = 216.000 em 12 meses', a.rec === 216000 && a.n === 12);
  await goto(page, 'resultados');
  await abrirDet(page, 'composicao'); // V3.2: a composição fica recolhida até ser aberta
  ok('A: cartões renderizados', (await page.$$('.regime[data-regime]')).length === 3);
  const cons = await page.evaluate(() => verificarConsistencia());
  ok('A: consistência cartões=tabela=gráficos', cons.ok, cons);
  const ch = await page.evaluate(() => Object.keys(CHARTS));
  ok('A: gráficos comparativo e composição criados', ch.includes('comparativo') && ch.includes('composicao'), ch);
  await page.screenshot({ path: '/tmp/a_result.png', fullPage: true });
  console.log('errors', errors);
  await t.close();
})();
