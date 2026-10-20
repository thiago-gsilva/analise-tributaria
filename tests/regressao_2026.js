// V3.2.2 — regressão: nos cenários cujo período inteiro está em 2026 (regras anteriores a 2027), o motor deve dar EXATAMENTE os mesmos números da v3.2.1.
// Uso: node tests/regressao_2026.js <raiz-da-v3.2.1> [raiz-atual]   (sem argumentos ou pasta inexistente: avisa e sai com 0)
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const rootOld = process.argv[2] && path.resolve(process.argv[2]), rootNew = path.resolve(process.argv[3] || path.join(__dirname, '..'));
if (!rootOld || !fs.existsSync(path.join(rootOld, 'wrapper-local.html'))) { console.log('regressao_2026: informe a pasta da v3.2.1 (node tests/regressao_2026.js <v3.2.1>) — ignorado'); process.exit(0); }
const rng = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };
const R = rng(2026);
const casos = [];
for (let i = 0; i < 500; i++) {
  const tipo = ['existente', 'nova', 'avulsa'][i % 3], mesIni = 1 + Math.floor(R() * 12), meses = 1 + Math.floor(R() * (13 - mesIni));  // termina em dez/2026
  const base = Math.round(4000 + R() * 380000), variavel = R() < 0.5;
  casos.push({ tipo, mesIni, meses, base, rec: Array.from({ length: meses }, () => variavel ? Math.round(base * (0.4 + R() * 1.4)) : base), hist: Math.round(base * 12 * (0.3 + R() * 1.5)), folhaHist: R() < 0.4 ? 0 : Math.round(base * 12 * R() * 0.4),
    folPct: R() < 0.3 ? 0 : R() * 0.4, movel: R() < 0.6, anexo: ['auto', 'auto', 'I', 'II', 'III', 'IV', 'V'][Math.floor(R() * 7)], avNova: R() < 0.4, modo: ['atual', 'nenhuma', 'necessaria'][Math.floor(R() * 3)] });
}
// Segunda população: empresa existente em 2027, receita constante e histórico igual (estado estacionário, RBT12 ≤ R$ 3,6 mi): a nova janela (antecedente ao mês anterior)
// e as demais regras de 2027 não mudam nada; os números têm de ser idênticos aos da v3.2.1.
for (let i = 0; i < 200; i++) {
  const base = Math.round(4000 + R() * 295000), fp = R() < 0.4 ? 0 : R() * 0.4, fm = Math.round(base * fp);
  casos.push({ ano: 2027, tipo: 'existente', mesIni: 1 + Math.floor(R() * 12), meses: 12, base, rec: Array(12).fill(base), hist: base * 12, folhaHist: fm * 12, folPct: base > 0 ? fm / base : 0, movel: R() < 0.7,
    anexo: ['auto', 'auto', 'I', 'II', 'III', 'IV', 'V'][Math.floor(R() * 7)], avNova: false, modo: 'atual' });
}
const JS = `(casos) => casos.map((c) => {
  resetState(); state.analise.tipo = c.tipo; state.empresa.anoAnalise = c.ano || 2026; state.periodo.mesInicio = c.mesIni; state.periodo.meses = c.meses;
  state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = c.rec.slice();
  if (c.tipo === 'avulsa') { state.periodo.empresaAvulsa = c.avNova ? 'nova' : 'existente'; state.periodo.rbt12Historico = c.hist; }
  state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = c.hist; state.empresa.folha12m = c.folhaHist;
  state.fatorR.modo = c.modo; state.fatorR.folhaMensalPrevista = Math.round(c.base * c.folPct);
  state.simples.anexoModo = c.anexo === 'auto' ? 'auto' : 'manual'; state.simples.anexoManual = c.anexo === 'auto' ? 'III' : c.anexo; state.periodo.rbt12Movel = c.movel;
  const r = computeAll();
  return JSON.stringify({ reg: r.regimes.map((x) => [x.total, x.cargaEfetivaPct]), simples: r.simples.meses.map((m) => [m.rbt12, m.folha12, m.fatorR, m.anexoUsado, m.faixaIndex, m.aliqNominal, m.aliqEfetiva, m.das]), hib: r.hibrido.meses.map((m) => m.totalMensal), pres: r.presumido.total,
    fr: r.fatorRComp ? [r.fatorRComp.economia, r.fatorRComp.folhaNecMensal, r.fatorRComp.difMensal, r.fatorRComp.enquadraEm && r.fatorRComp.enquadraEm.idx] : null, exc: [r.simples.excesso.situacao, r.simples.excesso.pctExcesso] });
})`;
(async () => {
  const a = await open({ root: rootOld, port: 8841, stubs: true }), b = await open({ root: rootNew, port: 8842, stubs: true });
  for (const t of [a, b]) await t.page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const A = await a.page.evaluate(`(${JS})(${JSON.stringify(casos)})`), B = await b.page.evaluate(`(${JS})(${JSON.stringify(casos)})`);
  let bad = 0; A.forEach((x, i) => { if (x !== B[i]) { bad++; if (bad <= 5) console.log('DIFF', i, JSON.stringify(casos[i]).slice(0, 200)); } });
  console.log('cenários sem regra nova aplicável (500 inteiramente em 2026 + 200 de 2027 em estado estacionário): ' + casos.length + ' · diferenças (regimes, Simples mês a mês, Híbrido, Presumido, Fator R, exclusão): ' + bad);
  await a.close(); await b.close(); process.exit(bad ? 1 : 0);
})();
