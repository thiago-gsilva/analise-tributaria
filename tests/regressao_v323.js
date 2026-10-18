// V3.2.4 — regressão contra a v3.2.3: mesmos cenários nas duas versões.
// Uso: node tests/regressao_v323.js <raiz-da-v3.2.3> [saida.json]
// Regra: NENHUM valor calculado pode mudar (DAS mensal, faixa, anexo, Híbrido, Presumido, totais, economia do fator r, situação de exclusão).
// Só a ELEGIBILIDADE e a RECOMENDAÇÃO podem mudar, e cada mudança é classificada:
//   E1 recomendação passa de "regime X" para "inconclusiva" por exclusão retroativa do Simples (LC 123, art. 3º, §§ 9º-A, 10 e 12)
//   E2 idem por total incompleto (sublimite ICMS/ISS/IBS excedido ou 6ª faixa — LC 123, art. 13-A; Res. CGSN 140, art. 12)
//   E3 idem por regime misto (Simples só em parte do período)
//   E4 Simples/Híbrido inaplicável (exclusão em todo o período, sem retroação): vencedor passa a ser o Presumido, como antes
//   E5 empate de valores (ex.: receita zero) entre um regime com total incompleto e o Presumido: o valor mínimo do regime restrito não é menor que o do Presumido, logo a recomendação do Presumido é conclusiva
// Qualquer outra mudança de vencedor = INESPERADA.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const rootOld = process.argv[2] && path.resolve(process.argv[2]), rootNew = path.resolve(__dirname, '..');
if (!rootOld || !fs.existsSync(path.join(rootOld, 'wrapper-local.html'))) { console.log('regressao_v323: informe a pasta da v3.2.3 — ignorado'); process.exit(0); }
const rng = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };
const R = rng(324);
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
// aberturas de 2027 com R$ 1,5 mi em 3 meses (caso do pedido)
for (let mi = 1; mi <= 12; mi++) casos.push({ ano: 2027, tipo: 'avulsa', mesIni: mi, meses: 3, base: 500000, rec: [500000, 500000, 500000], hist: 0, folhaHist: 0, folPct: 0, movel: true, anexo: 'III', avNova: true, modo: 'nenhuma', fixo: true });
const JS = `(casos) => casos.map((c) => {
  resetState(); state.analise.tipo = c.tipo; state.empresa.anoAnalise = c.ano; state.periodo.mesInicio = c.mesIni; state.periodo.meses = c.meses;
  state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = c.rec.slice();
  if (c.tipo === 'avulsa') { state.periodo.empresaAvulsa = c.avNova ? 'nova' : 'existente'; state.periodo.rbt12Historico = c.hist; }
  state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = c.hist; state.empresa.folha12m = c.folhaHist;
  state.fatorR.modo = c.modo; state.fatorR.folhaMensalPrevista = Math.round(c.base * c.folPct);
  state.simples.anexoModo = c.anexo === 'auto' ? 'auto' : 'manual'; state.simples.anexoManual = c.anexo === 'auto' ? 'III' : c.anexo; state.periodo.rbt12Movel = c.movel;
  const r = computeAll(); const ex = r.simples.excesso;
  return { sm: r.simples.meses.map((m) => [m.ano, m.rbt12, m.faixaIndex, m.anexoUsado, m.fatorR, m.das]), hm: r.hibrido.meses.map((m) => m.totalMensal), pres: r.presumido.total, reg: r.regimes.map((x) => x.total),
    exc: [ex.situacao, ex.pctExcesso, r.simples.mesesForaDoLimite], fr: r.fatorRComp ? [r.fatorRComp.economia, r.fatorRComp.folhaNecMensal] : null,
    best: r.melhor ? r.melhor.id : null, rec: r.recomendacao ? r.recomendacao.estado : null, motivos: r.recomendacao ? r.recomendacao.motivos : [], est: r.regimes.map((x) => x.estado), integral: !!ex.integral, retro: !!ex.retroativo, parcial: !!ex.parcial };
})`;
(async () => {
  const a = await open({ root: rootOld, port: 8861, stubs: true }), b = await open({ root: rootNew, port: 8862, stubs: true });
  for (const t of [a, b]) await t.page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const A = await a.page.evaluate(`(${JS})(${JSON.stringify(casos)})`), B = await b.page.evaluate(`(${JS})(${JSON.stringify(casos)})`);
  const num = []; const cat = { E1: [], E2: [], E3: [], E4: [], E5: [] }; const unexp = []; let sameBest = 0, becameNull = 0, estadoMudou = 0, estadosEsperadosFora = 0;
  casos.forEach((c, i) => {
    const x = A[i], y = B[i];
    for (const k of ['sm', 'hm', 'pres', 'reg', 'exc', 'fr']) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) num.push([k, i, JSON.stringify(x[k]).slice(0, 120), JSON.stringify(y[k]).slice(0, 120)]);
    if (x.best === y.best) { sameBest++; return; }
    // vencedor mudou
    if (y.best === null && y.rec === 'inconclusivo') {
      becameNull++;
      const m = y.motivos;
      if (m.includes('exclusao-retroativa')) cat.E1.push(i); else if (m.includes('total-incompleto')) cat.E2.push(i); else if (m.includes('regime-misto')) cat.E3.push(i); else unexp.push(['inconclusivo sem motivo', i, y.motivos]);
    } else if (y.best === 'presumido' && y.integral && !y.retro) cat.E4.push(i);
    else if (y.best === 'presumido' && y.rec === 'conclusivo' && (x.best === 'simples' || x.best === 'hibrido') && y.est[x.best === 'simples' ? 0 : 1] === 'restricao' && y.reg[x.best === 'simples' ? 0 : 1] >= y.reg[2] - 0.005) cat.E5.push(i);
    else unexp.push(['vencedor', i, x.best, y.best, y.rec, y.motivos]);
  });
  // "inconclusivo" nunca pode ter melhor; Simples/Híbrido inaplicável nunca pode vencer
  casos.forEach((c, i) => { const y = B[i]; if (y.rec === 'inconclusivo' && y.best) unexp.push(['inconclusivo com vencedor', i]); if ((y.best === 'simples' || y.best === 'hibrido') && y.est[y.best === 'simples' ? 0 : 1] === 'inaplicavel') unexp.push(['inaplicável recomendado', i]); });
  const abert = casos.map((c, i) => c.fixo ? { mes: c.mesIni, antes: A[i].best, depois: B[i].best, rec: B[i].rec, motivos: B[i].motivos, est: B[i].est } : null).filter(Boolean);
  console.log('cenários:', casos.length, '· diferenças em VALORES calculados (devem ser 0):', num.length);
  num.slice(0, 5).forEach((u) => console.log('  !!', JSON.stringify(u)));
  console.log('vencedor igual:', sameBest, '· mudou:', casos.length - sameBest, '(→ inconclusivo:', becameNull + ')');
  for (const k of Object.keys(cat)) console.log(' ', k, cat[k].length);
  console.log('abertura R$ 1,5 mi em 3 meses (v3.2.3 → v3.2.4):'); abert.forEach((x) => console.log('  mês', x.mes, x.antes, '→', x.depois, '·', x.rec, x.motivos.join(','), x.est.join('/')));
  console.log('mudanças INESPERADAS:', unexp.length); unexp.slice(0, 8).forEach((u) => console.log('  !!', JSON.stringify(u)));
  fs.writeFileSync(process.argv[3] || '/dev/null', JSON.stringify({ cenarios: casos.length, diferencasValores: num.length, vencedorIgual: sameBest, mudou: casos.length - sameBest, categorias: Object.fromEntries(Object.keys(cat).map((k) => [k, cat[k].length])), inesperadas: unexp.length, aberturas1_5mi: abert }, null, 1));
  await a.close(); await b.close(); process.exit(num.length || unexp.length ? 1 : 0);
})();
