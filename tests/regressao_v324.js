// V3.2.5 — regressão contra a v3.2.4: mesmos cenários nas duas versões.
// Uso: node tests/regressao_v324.js <raiz-da-v3.2.4> [saida.json]
// Regra: só pode mudar o que decorre do art. 21, IV (6ª faixa) e da avaliação de sublimite/premissa do ano anterior.
//  Valores: em cada mês, DAS novo = DAS antigo + acréscimo (ivValor); faixa, anexo, RBT12, fator r, Presumido, fator R e limite geral NÃO mudam;
//           meses sem acréscimo têm Simples e Híbrido idênticos.
//  Recomendação (cada mudança é classificada):
//   V1 vencedor passa de Simples/Híbrido para outro regime porque o acréscimo da 6ª faixa aumentou o custo
//   C1 antes inconclusivo (6ª faixa tratada como impedimento) → agora conclusivo (todos os componentes calculados)
//   P1 antes com vencedor → agora inconclusivo por premissa pendente (receita do ano anterior de empresa existente)
//   S1 antes com vencedor/inconclusivo → agora inconclusivo por sublimite/exclusão (avaliação de 2026 ou do ano de início) – motivo total-incompleto/exclusao-retroativa/regime-misto
//   N1 antes inconclusivo → agora inconclusivo com outro motivo (nenhuma mudança de vencedor)
// Qualquer outra mudança = INESPERADA.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const rootOld = process.argv[2] && path.resolve(process.argv[2]), rootNew = path.resolve(__dirname, '..');
if (!rootOld || !fs.existsSync(path.join(rootOld, 'wrapper-local.html'))) { console.log('regressao_v324: informe a pasta da v3.2.4 — ignorado'); process.exit(0); }
const rng = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };
const R = rng(325);
const casos = [];
const mk = (ano, tipo, i, maxMeses) => {
  const meses = 1 + Math.floor(R() * maxMeses), mesIni = 1 + Math.floor(R() * 12), base = Math.round(4000 + R() * (i % 4 === 0 ? 1200000 : 380000)), variavel = R() < 0.5;
  const hist = Math.round(base * 12 * (0.3 + R() * 1.5));
  return { ano, tipo, mesIni, meses, base, rec: Array.from({ length: meses }, () => (R() < 0.06 ? 0 : variavel ? Math.round(base * (0.4 + R() * 1.4)) : base)), hist, folhaHist: R() < 0.4 ? 0 : Math.round(hist * R() * 0.4),
    folPct: R() < 0.3 ? 0 : R() * 0.4, movel: R() < 0.6, anexo: ['auto', 'auto', 'I', 'II', 'III', 'IV', 'V'][Math.floor(R() * 7)], avNova: R() < 0.4, modo: ['atual', 'nenhuma', 'necessaria'][Math.floor(R() * 3)] };
};
for (let i = 0; i < 500; i++) casos.push(mk(2026, ['existente', 'nova', 'avulsa'][i % 3], i, 12));
for (let i = 0; i < 450; i++) casos.push(mk([2027, 2027, 2028][i % 3], ['existente', 'nova', 'avulsa'][i % 3], i, 24));
for (let i = 0; i < 300; i++) casos.push(mk([2028, 2029, 2030, 2031, 2032, 2033][i % 6], ['existente', 'nova', 'avulsa'][i % 3], i, 24));
// aberturas de 2027 e 2026 com R$ 500 mil × 3 meses (caso do pedido), Anexo III, V e automático
for (const anexo of ['auto', 'III', 'V']) for (const ano of [2026, 2027]) for (let mi = 1; mi <= 12; mi++) casos.push({ ano, tipo: 'avulsa', mesIni: mi, meses: 3, base: 500000, rec: [500000, 500000, 500000], hist: 0, folhaHist: 0, folPct: 0, movel: true, anexo, avNova: true, modo: 'nenhuma', fixo: true });
// empresas existentes com RBT12 na 6ª faixa (R$ 3,7 a 4,7 mi), receita constante, histórico informado
for (let k = 0; k < 40; k++) { const rb = 3700000 + k * 25000; casos.push({ ano: [2026, 2027, 2028][k % 3], tipo: 'existente', mesIni: 1, meses: 12, base: Math.round(rb / 12), rec: Array(12).fill(Math.round(rb / 12)), hist: rb, folhaHist: 0, folPct: 0, movel: false, anexo: ['III', 'IV', 'V', 'I', 'II'][k % 5], avNova: false, modo: 'nenhuma', sexta: true }); }
const JS = `(casos) => casos.map((c) => {
  resetState(); state.analise.tipo = c.tipo; state.empresa.anoAnalise = c.ano; state.periodo.mesInicio = c.mesIni; state.periodo.meses = c.meses;
  state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = c.rec.slice();
  if (c.tipo === 'avulsa') { state.periodo.empresaAvulsa = c.avNova ? 'nova' : 'existente'; state.periodo.rbt12Historico = c.hist; }
  state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = c.hist; state.empresa.folha12m = c.folhaHist;
  state.fatorR.modo = c.modo; state.fatorR.folhaMensalPrevista = Math.round(c.base * c.folPct);
  state.simples.anexoModo = c.anexo === 'auto' ? 'auto' : 'manual'; state.simples.anexoManual = c.anexo === 'auto' ? 'III' : c.anexo; state.periodo.rbt12Movel = c.movel;
  const r = computeAll(); const ex = r.simples.excesso;
  return { sm: r.simples.meses.map((m) => [m.ano, m.rbt12, m.faixaIndex, m.anexoUsado, m.fatorR]), das: r.simples.meses.map((m) => m.das), dasBase: r.simples.meses.map((m) => (m.dasBase != null ? m.dasBase : m.das)),
    iv: r.simples.meses.map((m) => [m.ivEstado || null, m.ivValor || 0]), hm: r.hibrido.meses.map((m) => m.totalMensal), pres: r.presumido.total, reg: r.regimes.map((x) => x.total),
    exc: [ex.situacao, ex.pctExcesso], fr: r.fatorRComp ? [r.fatorRComp.economia, r.fatorRComp.folhaNecMensal] : null,
    best: r.melhor ? r.melhor.id : null, rec: r.recomendacao ? r.recomendacao.estado : null, motivos: r.recomendacao ? r.recomendacao.motivos : [], est: r.regimes.map((x) => x.estado), retro: !!ex.retroativo, integral: !!ex.integral };
})`;
(async () => {
  const a = await open({ root: rootOld, port: 8863, stubs: true }), b = await open({ root: rootNew, port: 8864, stubs: true });
  for (const t of [a, b]) await t.page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const A = await a.page.evaluate(`(${JS})(${JSON.stringify(casos)})`), B = await b.page.evaluate(`(${JS})(${JSON.stringify(casos)})`);
  const unexp = [], cat = { V1: [], C1: [], P1: [], S1: [], N1: [] };
  let frMud = 0, mesesTot = 0, mesesIV = 0, mesesIVpend = 0, mesesImp = 0, cenIV = 0, maiorIV = 0, somaIV = 0, hibMud = 0, hibIgual = 0, sameBest = 0;
  casos.forEach((c, i) => {
    const x = A[i], y = B[i];
    // 1. campos que não podem mudar
    for (const k of ['sm', 'pres', 'exc']) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) unexp.push(['campo mudou', k, i]);
    // Fator R: a folha necessária não muda; a economia no DAS (diferença entre cenários de Simples) só muda quando há mês de 6ª faixa
    if (JSON.stringify(x.fr && x.fr[1]) !== JSON.stringify(y.fr && y.fr[1])) unexp.push(['folha necessária mudou', i]);
    if (JSON.stringify(x.fr && x.fr[0]) !== JSON.stringify(y.fr && y.fr[0])) { if (y.sm.some((q) => q[2] === 6) || y.fr === null) frMud++; else unexp.push(['economia do fator r mudou sem 6ª faixa', i]); }
    if (x.reg[2] !== y.reg[2]) unexp.push(['Presumido mudou', i]);
    // 2. valores mês a mês: DAS novo = DAS antigo + acréscimo; base idêntica
    let temIV = false;
    y.das.forEach((d, k) => {
      mesesTot++;
      if (Math.abs(y.dasBase[k] - x.das[k]) > 0.005) unexp.push(['DAS da faixa mudou', i, k, x.das[k], y.dasBase[k]]);
      const [est, v] = y.iv[k];
      if (Math.abs(d - (x.das[k] + v)) > 0.005) unexp.push(['DAS novo ≠ antigo + acréscimo', i, k, x.das[k], d, v]);
      if (est === 'aplicado' || est === 'pendente') { temIV = true; mesesIV++; if (est === 'pendente') mesesIVpend++; if (v <= 0 && y.dasBase[k] > 0.005) unexp.push(['acréscimo não positivo', i, k, y.dasBase[k], y.sm[k], est]); if (y.sm[k][2] !== 6) unexp.push(['acréscimo fora da 6ª faixa', i, k]); maiorIV = Math.max(maiorIV, v); somaIV += v; }
      else { if (v !== 0) unexp.push(['acréscimo sem estado', i, k]); if (est === 'impedido') mesesImp++; if (Math.abs(y.hm[k] - x.hm[k]) > 0.005) unexp.push(['Híbrido mudou em mês sem acréscimo', i, k, x.hm[k], y.hm[k]]); else hibIgual++; }
    });
    if (temIV) { cenIV++; if (y.hm.some((v, k) => Math.abs(v - x.hm[k]) > 0.005)) hibMud++; }
    // 3. recomendação
    if (x.best === y.best && x.rec === y.rec && JSON.stringify(x.motivos) === JSON.stringify(y.motivos)) { sameBest++; return; }
    if (x.best === y.best && x.best === null && x.rec === 'inconclusivo' && y.rec === 'inconclusivo') { (y.motivos.includes('premissa-pendente') ? cat.P1 : cat.N1).push(i); return; }
    if (y.rec === 'inconclusivo' && y.best) unexp.push(['inconclusivo com vencedor', i]);
    if ((y.best === 'simples' || y.best === 'hibrido') && y.est[y.best === 'simples' ? 0 : 1] === 'inaplicavel') unexp.push(['inaplicável recomendado', i]);
    if (x.rec === 'inconclusivo' && y.rec === 'conclusivo') { cat.C1.push(i); if (!temIV && !y.iv.some((q) => q[0])) unexp.push(['C1 sem relação com a 6ª faixa', i]); }
    else if (y.rec === 'inconclusivo' && y.motivos.includes('premissa-pendente')) cat.P1.push(i);
    else if (y.rec === 'inconclusivo' && (y.motivos.includes('total-incompleto') || y.motivos.includes('exclusao-retroativa') || y.motivos.includes('regime-misto'))) cat.S1.push(i);
    else if (x.rec === 'conclusivo' && y.rec === 'conclusivo' && x.best !== y.best && temIV && (x.best === 'simples' || x.best === 'hibrido')) cat.V1.push(i);
    else unexp.push(['recomendação', i, x.best, x.rec, x.motivos, y.best, y.rec, y.motivos]);
  });
  const abert = casos.map((c, i) => c.fixo ? { ano: c.ano, anexo: c.anexo, mes: c.mesIni, simplesAntes: Math.round(A[i].reg[0] * 100) / 100, simplesDepois: Math.round(B[i].reg[0] * 100) / 100, hibAntes: Math.round(A[i].reg[1] * 100) / 100, hibDepois: Math.round(B[i].reg[1] * 100) / 100, pres: Math.round(B[i].reg[2] * 100) / 100, antes: A[i].best + '/' + A[i].rec, depois: B[i].best + '/' + B[i].rec, motivos: B[i].motivos.join(',') } : null).filter(Boolean);
  console.log('cenários:', casos.length, '· meses simulados:', mesesTot, '· meses com acréscimo do art. 21, IV:', mesesIV, '(pendentes:', mesesIVpend + ') · meses 6ª faixa impedidos (sem acréscimo):', mesesImp);
  console.log('cenários com acréscimo:', cenIV, '· maior acréscimo mensal R$', maiorIV.toFixed(2), '· Híbrido idêntico nos meses sem acréscimo:', hibIgual);
  console.log('cenários com economia do Fator R alterada (consequência do acréscimo, só com 6ª faixa):', frMud);
  console.log('recomendação (vencedor, estado e motivos) igual:', sameBest, '· mudou:', casos.length - sameBest);
  for (const k of Object.keys(cat)) console.log(' ', k, cat[k].length);
  console.log('aberturas R$ 500 mil × 3 meses, Anexo III (v3.2.4 → v3.2.5):'); abert.filter((x) => x.anexo === 'III' && x.ano === 2027).forEach((x) => console.log('  mês', x.mes, 'Simples', x.simplesAntes, '→', x.simplesDepois, '· Híbrido', x.hibAntes, '→', x.hibDepois, '·', x.antes, '→', x.depois, x.motivos));
  console.log('mudanças INESPERADAS:', unexp.length); unexp.slice(0, 10).forEach((u) => console.log('  !!', JSON.stringify(u)));
  fs.writeFileSync(process.argv[3] || '/dev/null', JSON.stringify({ cenarios: casos.length, mesesSimulados: mesesTot, mesesComAcrescimo: mesesIV, mesesPendentes: mesesIVpend, mesesImpedidos: mesesImp, cenariosComAcrescimo: cenIV, maiorAcrescimoMensal: maiorIV, recomendacaoIgual: sameBest, mudou: casos.length - sameBest, categorias: Object.fromEntries(Object.keys(cat).map((k) => [k, cat[k].length])), inesperadas: unexp.length, aberturas: abert }, null, 1));
  await a.close(); await b.close(); process.exit(unexp.length ? 1 : 0);
})();
