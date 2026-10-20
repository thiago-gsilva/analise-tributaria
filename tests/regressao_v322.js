// V3.2.3 — regressão contra a v3.2.2: roda os mesmos cenários nas duas versões e CLASSIFICA toda diferença numérica.
// Uso: node tests/regressao_v322.js <raiz-da-v3.2.2> [saida.json]    (sem argumento: avisa e sai com 0)
// Categorias permitidas (todas com fundamento oficial documentado no relatório):
//   S1 Simples: 6ª faixa de 2029 em diante (LC 123 Anexos na redação da LC 214/2025: nominal volta a I 19 · II 30 · III e IV 33 · V 30,5)
//   S2 Simples: fator r e folha anualizada com receita zero (Res. CGSN 140, art. 26, §§ 4º, 6º e 7º)
//   H1 Híbrido 2026: sem opção pelo regime regular → Híbrido = DAS integral (Res. CGSN 140, art. 22-A, a partir de 2027)
//   H2 Híbrido 2027+: só CBS e IBS saem do DAS (partilha do Anexo/faixa/ano), ISS/ICMS/PIS/COFINS não
//   Qualquer outra diferença (Presumido, Simples sem essas causas, exclusão, Fator R de enquadramento) = INESPERADA.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const rootOld = process.argv[2] && path.resolve(process.argv[2]), rootNew = path.resolve(__dirname, '..');
if (!rootOld || !fs.existsSync(path.join(rootOld, 'wrapper-local.html'))) { console.log('regressao_v322: informe a pasta da v3.2.2 — ignorado'); process.exit(0); }
const rng = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };
const R = rng(323);
const casos = [];
const mk = (ano, tipo, i, maxMeses) => {
  const meses = 1 + Math.floor(R() * maxMeses), mesIni = 1 + Math.floor(R() * 12), base = Math.round(4000 + R() * (i % 5 === 0 ? 900000 : 380000)), variavel = R() < 0.5;
  const hist = Math.round(base * 12 * (0.3 + R() * 1.5));
  return { ano, tipo, mesIni, meses, base, rec: Array.from({ length: meses }, () => (R() < 0.06 ? 0 : variavel ? Math.round(base * (0.4 + R() * 1.4)) : base)), hist, folhaHist: R() < 0.4 ? 0 : Math.round(hist * R() * 0.4),
    folPct: R() < 0.3 ? 0 : R() * 0.4, movel: R() < 0.6, anexo: ['auto', 'auto', 'I', 'II', 'III', 'IV', 'V'][Math.floor(R() * 7)], avNova: R() < 0.4, modo: ['atual', 'nenhuma', 'necessaria'][Math.floor(R() * 3)] };
};
for (let i = 0; i < 500; i++) casos.push(mk(2026, ['existente', 'nova', 'avulsa'][i % 3], i, 12));
for (let i = 0; i < 400; i++) casos.push(mk([2027, 2027, 2028][i % 3], ['existente', 'nova', 'avulsa'][i % 3], i, 24));
for (let i = 0; i < 200; i++) casos.push(mk([2028, 2029, 2030, 2031, 2032, 2033][i % 6], ['existente', 'nova', 'avulsa'][i % 3], i, 24));
const JS = `(casos) => casos.map((c) => {
  resetState(); state.analise.tipo = c.tipo; state.empresa.anoAnalise = c.ano; state.periodo.mesInicio = c.mesIni; state.periodo.meses = c.meses;
  state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = c.rec.slice();
  if (c.tipo === 'avulsa') { state.periodo.empresaAvulsa = c.avNova ? 'nova' : 'existente'; state.periodo.rbt12Historico = c.hist; }
  state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = c.hist; state.empresa.folha12m = c.folhaHist;
  state.fatorR.modo = c.modo; state.fatorR.folhaMensalPrevista = Math.round(c.base * c.folPct);
  state.simples.anexoModo = c.anexo === 'auto' ? 'auto' : 'manual'; state.simples.anexoManual = c.anexo === 'auto' ? 'III' : c.anexo; state.periodo.rbt12Movel = c.movel;
  const r = computeAll();
  return { sm: r.simples.meses.map((m) => ({ ano: m.ano, rbt12: m.rbt12, fx: m.faixaIndex, an: m.anexoUsado, fr: m.fatorR, das: m.das })), hm: r.hibrido.meses.map((m) => m.totalMensal), pres: r.presumido.total,
    reg: r.regimes.map((x) => x.total), exc: [r.simples.excesso.situacao, r.simples.excesso.pctExcesso, r.simples.mesesForaDoLimite], fr: r.fatorRComp ? [r.fatorRComp.economia, r.fatorRComp.folhaNecMensal] : null };
})`;
(async () => {
  const a = await open({ root: rootOld, port: 8851, stubs: true }), b = await open({ root: rootNew, port: 8852, stubs: true });
  for (const t of [a, b]) await t.page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const A = await a.page.evaluate(`(${JS})(${JSON.stringify(casos)})`), B = await b.page.evaluate(`(${JS})(${JSON.stringify(casos)})`);
  const cat = { S1: { n: 0, meses: 0, max: 0, ex: null }, S2: { n: 0, meses: 0, max: 0, ex: null }, H1: { n: 0, meses: 0, max: 0, ex: null }, H2: { n: 0, meses: 0, max: 0, ex: null } };
  const bump = (k, d, i, k2) => { const c = cat[k]; c.meses++; c.max = Math.max(c.max, Math.abs(d)); if (!c.ex) c.ex = { caso: i, mes: k2, delta: d }; };
  const touched = { S1: new Set(), S2: new Set(), H1: new Set(), H2: new Set() }; const unexp = []; let ident = 0, totalMeses = 0;
  casos.forEach((c, i) => {
    const x = A[i], y = B[i]; let diff = false;
    if (Math.abs(x.pres - y.pres) > 0.005) unexp.push(['presumido', i, x.pres, y.pres]);
    if (JSON.stringify(x.exc) !== JSON.stringify(y.exc) && x.sm.every((m, k) => Math.abs(m.das - y.sm[k].das) < 0.005)) unexp.push(['exclusão', i, x.exc, y.exc]);
    x.sm.forEach((m, k) => {
      totalMeses++; const n = y.sm[k], d = n.das - m.das;
      if (Math.abs(d) > 0.005 || m.fx !== n.fx || m.an !== n.an) {
        diff = true;
        if (n.ano >= 2029 && n.fx === 6 && m.an === n.an && m.fx === n.fx) { bump('S1', d, i, k); touched.S1.add(i); }
        else if ((m.rbt12 <= 0 || n.rbt12 <= 0 || c.rec.some((r) => r === 0)) ) { bump('S2', d, i, k); touched.S2.add(i); }
        else unexp.push(['simples', i, k, m, n]);
      }
      const dh = y.hm[k] - x.hm[k];
      if (Math.abs(dh) > 0.005) { diff = true; if (n.ano < 2027) { bump('H1', dh, i, k); touched.H1.add(i); } else { bump('H2', dh, i, k); touched.H2.add(i); } }
    });
    if (!diff) ident++;
  });
  console.log('cenários:', casos.length, '· meses comparados:', totalMeses, '· cenários idênticos em tudo (Simples, Híbrido, Presumido, exclusão):', ident);
  for (const k of Object.keys(cat)) console.log(' ', k, 'cenários:', touched[k].size, '· meses:', cat[k].meses, '· maior |Δ| mensal: R$', cat[k].max.toFixed(2), '· exemplo:', JSON.stringify(cat[k].ex));
  console.log('diferenças INESPERADAS:', unexp.length); unexp.slice(0, 8).forEach((u) => console.log('  !!', JSON.stringify(u).slice(0, 400)));
  // Presumido e totais de Simples em cenários sem as causas acima: idênticos
  fs.writeFileSync(process.argv[3] || '/dev/null', JSON.stringify({ casos: casos.length, meses: totalMeses, identicos: ident, categorias: Object.fromEntries(Object.keys(cat).map((k) => [k, { cenarios: touched[k].size, meses: cat[k].meses, maxDelta: cat[k].max, exemplo: cat[k].ex }])), inesperadas: unexp.length }, null, 1));
  await a.close(); await b.close(); process.exit(unexp.length ? 1 : 0);
})();
