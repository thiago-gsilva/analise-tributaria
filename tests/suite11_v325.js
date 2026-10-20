// V3.2.5 — 6ª faixa: percentual efetivo de ICMS, ISS e IBS pela fórmula da 5ª faixa (Res. CGSN 140/2018, art. 21, IV; em 2026, art. 21, III, "b"; teto de ISS: art. 21, III, "a").
// Os valores esperados são calculados AQUI, por um oráculo escrito a partir do texto da norma e de tabelas digitadas à parte (não usa o motor, nem as tabelas do app).
const { open } = require('./lib');
const { ok } = require('./helpers');

/* =============================== ORÁCULO INDEPENDENTE =============================== */
// 5ª faixa dos Anexos: [alíquota nominal, parcela a deduzir, % ICMS/ISS (base 2026), % IBS em 2027-2028]
const D5 = { I: [0.143, 87300, 33.5, 0.17], II: [0.147, 85500, 32.0, 0.15], III: [0.21, 125640, 33.5, 0.17], IV: [0.22, 183780, 40.0, 0.24], V: [0.23, 62100, 23.5, 0.19] };
// 6ª faixa (2027-2028): [alíquota nominal, parcela a deduzir, % CBS da partilha 2027-2028]
const D6 = { I: [0.189, 378000, 34.02], II: [0.299, 720000, 25.22], III: [0.329, 648000, 19.29], IV: [0.329, 828000, 24.70], V: [0.304, 540000, 19.78] };
// 5ª faixa de 2026 sem o ISS: partes que recebem o excedente do teto (federais), em % da partilha
const FED5_2026 = { III: { IRPJ: 4, CSLL: 3.5, COFINS: 12.82, PIS: 2.78, CPP: 43.4 }, IV: { IRPJ: 18.8, CSLL: 19.2, COFINS: 18.08, PIS: 3.92 }, V: { IRPJ: 23, CSLL: 12.5, COFINS: 14.10, PIS: 3.05, CPP: 23.85 } };
// 5ª faixa de 2027-2028 sem o ISS: IRPJ, CSLL, CBS, CPP, IBS
const FED5_2728 = { III: { IRPJ: 4, CSLL: 3.5, CBS: 15.43, CPP: 43.4, IBS: 0.17 }, IV: { IRPJ: 18.8, CSLL: 19.2, CBS: 21.76, IBS: 0.24 }, V: { IRPJ: 23, CSLL: 12.5, CBS: 16.96, CPP: 23.85, IBS: 0.19 } };
const ISS_ANEXOS = ['III', 'IV', 'V'];
const RATIO = { 2029: 0.9, 2030: 0.8, 2031: 0.7, 2032: 0.6 };      // fração do ICMS/ISS que resta (o restante vira IBS)
function partes(anexo, ano) {            // % da 5ª faixa: consumo (ICMS/ISS) e IBS
  const [, , base, ibs2728] = D5[anexo];
  if (ano <= 2026) return { cons: base, ibs: 0 };
  if (ano <= 2028) return { cons: base, ibs: ibs2728 };
  if (ano >= 2033) return { cons: 0, ibs: base };
  return { cons: base * RATIO[ano], ibs: base * (1 - RATIO[ano]) };
}
function eff5(anexo, rbt12) { const [n, pd] = D5[anexo]; return (rbt12 * n - pd) / rbt12; }
// acréscimo total do art. 21, IV, em fração da receita (a soma não depende do teto de ISS)
function ivTotal(anexo, rbt12, ano) { const p = partes(anexo, ano); return eff5(anexo, rbt12) * (p.cons + p.ibs) / 100; }
// ISS efetivo após o teto de 5% (fração da receita). 2029-2032: o teto alcança ISS + IBS
function issAposTeto(anexo, rbt12, ano) {
  if (!ISS_ANEXOS.includes(anexo) || ano >= 2033) return null;
  const p = partes(anexo, ano), e = eff5(anexo, rbt12);
  if (ano >= 2029) { const comb = e * (p.cons + p.ibs) / 100; return comb > 0.05 ? 0.05 * p.cons / (p.cons + p.ibs) : e * p.cons / 100; }
  const iss = e * p.cons / 100; return Math.min(iss, 0.05);
}
function excedenteTeto(anexo, rbt12, ano) {
  if (!ISS_ANEXOS.includes(anexo) || ano >= 2033) return 0;
  const p = partes(anexo, ano), e = eff5(anexo, rbt12);
  const comb = ano >= 2029 ? e * (p.cons + p.ibs) / 100 : e * p.cons / 100;
  return Math.max(comb - 0.05, 0);
}
// Mês de 6ª faixa de 2027-2028 (Simples e Híbrido, em R$): DAS da faixa + acréscimo; Híbrido retira CBS e IBS (inclusive o que o teto redistribui) e soma CBS 8,8% + IBS 0,1% por fora
function mes6a2027(anexo, rbt12, receita) {
  const [n6, pd6, cbs6] = D6[anexo];
  const e6 = (rbt12 * n6 - pd6) / rbt12, dasBase = receita * e6, iv = receita * ivTotal(anexo, rbt12, 2027);
  const p = partes(anexo, 2027), ibsIV = receita * eff5(anexo, rbt12) * p.ibs / 100;
  let cbsRed = 0, ibsRed = 0;
  const exc = receita * excedenteTeto(anexo, rbt12, 2027);
  if (exc > 0) { const f = FED5_2728[anexo], s = Object.values(f).reduce((a, b) => a + b, 0); cbsRed = exc * f.CBS / s; ibsRed = exc * f.IBS / s; }
  const retirado = dasBase * cbs6 / 100 + ibsIV + cbsRed + ibsRed;
  const dasH = dasBase + iv - retirado, regular = receita * 0.088 + receita * 0.001;
  return { simples: dasBase + iv, hibrido: dasH + regular, dasBase, iv, retirado };
}
const r2 = (v) => Math.round(v * 100) / 100;

(async () => {
  const t = await open({ viewport: { width: 1366, height: 1000 }, port: 8897 }); const { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);

  /* ===== 1. Fórmula do art. 21, IV: Anexos I a V × 2026…2033 × RBT12 acima de R$ 3,6 mi ===== */
  const RBTS = [3600000.01, 3650000, 4000000, 4800000, 5500000, 6000000, 8000000];
  const G1 = await page.evaluate((rbts) => {
    const out = [];
    for (const anexo of ['I', 'II', 'III', 'IV', 'V']) for (const ano of [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]) for (const rbt of rbts) {
      const v = calcAcrescimoArt21IV(rbt, anexo, ano);
      out.push({ anexo, ano, rbt, total: v.total, iss: v.consumo === 'ISS' ? (v.comp.ISS || 0) : null, soma: Object.values(v.comp).reduce((a, b) => a + b, 0), teto: v.tetoAcionado, exc: v.excedente, comp: v.comp, hip: v.tetoHipotese });
    }
    return out;
  }, RBTS);
  let bad = [], maxd = 0, nTeto = 0, nSem = 0;
  for (const g of G1) {
    const esperado = ivTotal(g.anexo, g.rbt, g.ano), d = Math.abs(g.total - esperado); maxd = Math.max(maxd, d);
    if (d > 1e-12) bad.push(['total', g.anexo, g.ano, g.rbt, g.total, esperado]);
    if (Math.abs(g.soma - g.total) > 1e-12) bad.push(['composição não fecha com o total', g.anexo, g.ano, g.rbt, g.soma, g.total]);   // o teto de ISS não pode mudar o total
    const issEsp = issAposTeto(g.anexo, g.rbt, g.ano);
    if (issEsp != null) {
      if (g.ano >= 2029) { if (Math.abs(((g.comp.ISS || 0) + (g.comp.IBS || 0) - 0) - 0) < 0) bad.push(['x']); }
      if (g.ano < 2029 && Math.abs((g.comp.ISS || 0) - issEsp) > 1e-12) bad.push(['ISS após o teto', g.anexo, g.ano, g.rbt, g.comp.ISS, issEsp]);
      if (g.ano >= 2029 && Math.abs((g.comp.ISS || 0) - issEsp) > 1e-12) bad.push(['ISS após o teto (2029-2032)', g.anexo, g.ano, g.rbt, g.comp.ISS, issEsp]);
      if ((g.comp.ISS || 0) > 0.05 + 1e-12) bad.push(['ISS acima de 5%', g.anexo, g.ano, g.rbt, g.comp.ISS]);
      if (Math.abs(g.exc - excedenteTeto(g.anexo, g.rbt, g.ano)) > 1e-12) bad.push(['excedente do teto', g.anexo, g.ano, g.rbt, g.exc]);
      if (g.exc > 0) nTeto++; else nSem++;
    }
    if (g.anexo === 'I' || g.anexo === 'II') { if (g.teto) bad.push(['ICMS não tem teto de 5%', g.anexo, g.ano, g.rbt]); }
    if (g.ano === 2033 && (g.comp.ISS || g.comp.ICMS)) bad.push(['2033: ICMS/ISS extintos', g.anexo, g.rbt]);
    if (g.ano <= 2026 && g.comp.IBS) bad.push(['2026 não tem IBS', g.anexo, g.rbt]);
  }
  ok('Art. 21, IV: acréscimo = {[(RBT12 × nominal 5ª) − PD 5ª] ÷ RBT12} × (% ICMS/ISS + % IBS da 5ª faixa), Anexos I a V × 2026 a 2033 × 7 valores de RBT12 (' + G1.length + ' casos) = oráculo (máx. dif. ' + maxd.toExponential(2) + ')', bad.length === 0, bad.slice(0, 4));
  ok('Teto de ISS de 5%: composição fecha com o total em todos os casos; ISS nunca acima de 5%; ' + nTeto + ' casos acima do teto e ' + nSem + ' abaixo; ICMS (Anexos I e II) sem teto; 2033 só IBS; 2026 sem IBS', bad.length === 0 && nTeto > 0 && nSem > 0, [nTeto, nSem]);

  /* ===== 2. Redistribuição do excedente do teto: proporção da 5ª faixa sem o ISS ===== */
  const R2 = await page.evaluate(() => {
    const out = {};
    // fatores usados × fatores publicados (Anexos III e IV) × proporção derivada
    const v = calcAcrescimoArt21IV(6000000, 'V', 2026); out.V2026 = v.fatores;
    const v3 = calcAcrescimoArt21IV(6000000, 'III', 2026); out.III2026 = v3.fatores;
    const v3b = calcAcrescimoArt21IV(6000000, 'III', 2027); out.III2728 = v3b.fatores;
    const v5 = calcAcrescimoArt21IV(6000000, 'V', 2027); out.V2728 = v5.fatores; out.V2728comp = v5.comp; out.V2728exc = v5.excedente; out.V2728hip = v5.tetoHipotese;
    const dif = []; // tabela publicada × proporção da 5ª faixa sem ISS, para Anexos III e IV em todos os períodos
    for (const a of ['III', 'IV']) for (const ano of [2027, 2029, 2030, 2031, 2032]) {
      const T = ANEXOS_LC214[a], per = periodoTabelaLC214(ano), row = T.p[per][4], pub = ISS_TETO_5A_FAIXA[a].p[per].fator;
      const conj = ano >= 2029; let s = 0; T.cols.forEach((c, i) => { if (c === 'ISS' || (conj && c === 'IBS')) return; s += row[i]; });
      T.cols.forEach((c, i) => { if (c === 'ISS' || (conj && c === 'IBS')) return; dif.push([a, ano, c, row[i] / s * 100, pub[c]]); });
    }
    out.dif = dif;
    return out;
  });
  const fed = (obj) => { const s = Object.values(obj).reduce((a, b) => a + b, 0); return Object.fromEntries(Object.entries(obj).map(([k, x]) => [k, x / s * 100])); };
  const e1 = fed(FED5_2026.III), badF = [];
  for (const k of Object.keys(e1)) if (Math.abs(R2.III2026[k] - e1[k]) > 0.011) badF.push(['III 2026', k, R2.III2026[k], e1[k]]);
  // valores publicados no relato do PGDAS-D (Contábeis, jan/2018, Anexo III): IRPJ 6,02 · CSLL 5,26 · COFINS 19,28 · PIS 4,18 · CPP 65,26
  const pubFr = { IRPJ: 6.02, CSLL: 5.26, COFINS: 19.28, PIS: 4.18, CPP: 65.26 };
  for (const k of Object.keys(pubFr)) if (Math.abs(R2.III2026[k] - pubFr[k]) > 0.011) badF.push(['III 2026 × relato PGDAS-D', k, R2.III2026[k], pubFr[k]]);
  const eV = fed(FED5_2026.V); for (const k of Object.keys(eV)) if (Math.abs(R2.V2026[k] - eV[k]) > 1e-9) badF.push(['V 2026', k, R2.V2026[k], eV[k]]);
  const e2 = fed(FED5_2728.III); for (const k of Object.keys(e2)) if (Math.abs(R2.III2728[k] - e2[k]) > 0.011) badF.push(['III 2027-28', k, R2.III2728[k], e2[k]]);
  const e3 = fed(FED5_2728.V); for (const k of Object.keys(e3)) if (Math.abs(R2.V2728[k] - e3[k]) > 1e-9) badF.push(['V 2027-28', k, R2.V2728[k], e3[k]]);
  const maxPub = Math.max.apply(null, R2.dif.map((d) => Math.abs(d[3] - d[4])));
  ok('Redistribuição do excedente do teto de ISS: fatores = proporção da 5ª faixa sem o ISS (2026 e 2027-28; igual aos fatores publicados nos Anexos III e IV, dif. máx. ' + maxPub.toFixed(4) + ' p.p. em todos os períodos; igual aos percentuais do relato do PGDAS-D de 2018); Anexo V marcado como hipótese', badF.length === 0 && maxPub < 0.011 && R2.V2728hip === true, badF.slice(0, 4));
  // Exemplo numérico: Anexo V, 2027, RBT12 de R$ 6 mi, R$ 500 mil (auditoria complementar)
  const iv5 = R2.V2728comp, rec = 500000;
  ok('Exemplo da auditoria (Anexo V, 2027, RBT12 R$ 6 mi, receita R$ 500 mil): alíquota efetiva da 5ª faixa 21,965% · ISS 5,1618% limitado a 5% (excedente R$ 808,88 redistribuído) · IBS 0,0417% (+ parte do excedente) · acréscimo R$ 26.017,54',
    Math.abs(r2(rec * (iv5.ISS + iv5.IBS + iv5.IRPJ + iv5.CSLL + iv5.CBS + iv5.CPP)) - 26017.54) < 0.006 && Math.abs(iv5.ISS - 0.05) < 1e-12 && Math.abs(rec * R2.V2728exc - 808.875) < 0.006, [iv5, R2.V2728exc]);

  /* ===== 3. R$ 500 mil por mês, 3 meses, aberturas de jan a dez/2027 (empresa nova, sem folha → Anexo V no 3º mês) ===== */
  const MX = await page.evaluate(() => {
    const out = [];
    for (let mi = 1; mi <= 12; mi++) {
      resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = mi; state.periodo.meses = 3;
      state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [500000, 500000, 500000]; state.fatorR.modo = 'nenhuma';
      const r = computeAll(), S = r.simples;
      out.push({ mi, simples: S.total, hib: r.hibrido.total, pres: r.presumido.total, rows: S.meses.map((m) => [m.faixaIndex, m.anexoUsado, m.rbt12, m.das, m.dasBase, m.ivEstado]),
        comp: S.meses.map((m) => Object.values(m.partilhaValores).reduce((a, b) => a + b, 0)), estados: r.regimes.map((x) => x.estado), incompleto: r.regimes.map((x) => x.incompleto), pend: r.regimes.map((x) => x.premissaPendente),
        rec: r.recomendacao, melhor: r.melhor && r.melhor.id, ex: { integral: S.excesso.integral, retro: S.excesso.retroativo }, sb: { n: S.sublimiteAv.mesesAfetados, f6: S.sublimiteAv.mesesFaixa6, pend: S.sublimiteAv.mesesPendentes },
        ids: r.pendencias.map((p) => p.id), conc: r.conclusao.estado, motivos: r.conclusao.motivos, hmes: r.hibrido.meses.map((h) => ({ das: h.dasTotalH, ret: h.parcelaConsumoDas, tot: h.totalMensal, ibs: h.ibsLiquido, cbs: h.cbsLiquido })) });
    }
    return out;
  });
  const falhas = [];
  const esp = mes6a2027('V', 6000000, 500000);
  const espSimples = 2 * 30000 + esp.simples, espHib = 2 * (30000 - 30000 * (15.43 + 0.17) / 100 + 500000 * 0.089) + esp.hibrido;
  for (const x of MX) {
    const m = 13 - x.mi, recAno = 500000 * Math.min(3, m);
    const retroGeral = recAno > 400000 * m * 1.2 + 1e-6, subExc = recAno > 300000 * m + 0.005, subRetro = recAno > 300000 * m * 1.2 + 1e-6;
    if (x.rows[0][0] !== 1 || x.rows[1][0] !== 1 || x.rows[2][0] !== 6 || Math.abs(x.rows[2][2] - 6000000) > 1e-6) falhas.push(['faixas', x.mi, x.rows]);
    if (Math.abs(x.rows[2][4] - 107000) > 1e-6) falhas.push(['DAS da 6ª faixa (Anexo V, 30,4%)', x.mi, x.rows[2]]);
    if (x.mi <= 8) {
      // sem impedimento: acréscimo do art. 21, IV somado; comparativo completo e conclusivo
      if (Math.abs(x.simples - espSimples) > 0.006 || Math.abs(x.simples - 193017.54) > 0.006) falhas.push(['Simples jan–ago', x.mi, x.simples, espSimples]);
      if (Math.abs(x.hib - espHib) > 0.006) falhas.push(['Híbrido jan–ago', x.mi, x.hib, espHib]);
      if (x.rows[2][5] !== 'aplicado' || x.sb.n !== 0 || x.sb.pend !== 0 || x.sb.f6 !== 1) falhas.push(['3º mês aplicado, sem impedimento', x.mi, x.rows[2], x.sb]);
      if (JSON.stringify(x.estados) !== JSON.stringify(['elegivel', 'elegivel', 'elegivel']) || x.rec.estado !== 'conclusivo' || x.melhor !== 'simples') falhas.push(['jan–ago conclusivo (Simples menor custo)', x.mi, x.estados, x.rec.estado, x.melhor]);
      if (!(x.simples < x.hib && x.hib < x.pres)) falhas.push(['ranking Simples < Híbrido < Presumido', x.mi, x.simples, x.hib, x.pres]);
      if (Math.abs(x.comp[2] - x.rows[2][3]) > 1e-6) falhas.push(['composição do DAS fecha com o DAS', x.mi, x.comp[2], x.rows[2][3]]);
      if (x.conc !== 'preliminar' || !x.motivos.some((s) => /art\. 21, IV/.test(s)) || !x.ids.includes('faixa6-art21iv')) falhas.push(['preliminar: IV a confirmar no PGDAS-D', x.mi, x.conc, x.motivos, x.ids]);
    }
    if (x.mi === 9) {
      // sublimite proporcional excedido em 25% (> 20%): retroativo; ICMS/ISS/IBS fora do DAS, sem o acréscimo do inciso IV; CBS e federais continuam no DAS
      if (!(subExc && subRetro && !retroGeral)) falhas.push(['set: premissas', x.mi]);
      if (x.rows[2][5] !== 'impedido' || x.sb.n !== 3 || Math.abs(x.simples - (60000 + 107000)) > 0.006) falhas.push(['set: impedido, sem acréscimo', x.mi, x.rows, x.simples]);
      if (x.rec.estado !== 'inconclusivo' || x.rec.motivos.join() !== 'total-incompleto' || x.melhor !== null || JSON.stringify(x.estados) !== JSON.stringify(['restricao', 'restricao', 'elegivel'])) falhas.push(['set: inconclusivo por total incompleto', x.mi, x.rec, x.estados]);
    }
    if (x.mi >= 10) {
      if (!(retroGeral && x.ex.integral && x.ex.retro) || JSON.stringify(x.estados) !== JSON.stringify(['inaplicavel', 'inaplicavel', 'elegivel']) || x.rec.estado !== 'inconclusivo' || x.rec.motivos.join() !== 'exclusao-retroativa' || x.melhor !== null) falhas.push(['out–dez: exclusão retroativa', x.mi, x.estados, x.rec]);
      if (x.rows[2][5] !== 'impedido') falhas.push(['out–dez: sem acréscimo do inciso IV', x.mi, x.rows[2]]);
    }
  }
  ok('R$ 500 mil × 3 meses, aberturas jan–dez/2027: jan–ago COMPLETO e conclusivo (Simples R$ 193.017,54 < Híbrido R$ ' + r2(espHib).toLocaleString('pt-BR') + ' < Presumido; 3º mês = 107.000 + 26.017,54); set inconclusivo por impedimento de sublimite (> 20%, retroativo); out–dez inconclusivo por exclusão retroativa', falhas.length === 0, falhas.slice(0, 4));
  // Sensibilidade do Híbrido à redistribuição do teto: limites de uma redistribuição 100% para CBS/IBS × 100% para tributos que ficam no DAS
  {
    const exc = 500000 * excedenteTeto('V', 6000000, 2027);
    const mm = mes6a2027('V', 6000000, 500000);
    const semRedistribuir = mm.hibrido + (exc * (FED5_2728.V.CBS + FED5_2728.V.IBS) / Object.values(FED5_2728.V).reduce((a, b) => a + b, 0));
    ok('Sensibilidade: a redistribuição do excedente do teto de ISS (R$ ' + exc.toFixed(2) + ') só muda o Híbrido em até R$ ' + (semRedistribuir - mm.hibrido).toFixed(2) + ' no cenário (nunca o Simples); ranking inalterado', semRedistribuir - mm.hibrido < 200 && MX[0].hib < MX[0].pres, [semRedistribuir - mm.hibrido]);
  }

  /* ===== 4. Híbrido: nenhum tributo somado nem deduzido duas vezes ===== */
  const H4 = await page.evaluate(() => {
    const out = [];
    for (const anexo of ['I', 'II', 'III', 'IV', 'V']) for (const ano of [2027, 2028, 2029, 2031, 2033]) {
      resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = ano; state.periodo.mesInicio = 1; state.periodo.meses = 3;
      state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [500000, 500000, 500000]; state.simples.anexoModo = 'manual'; state.simples.anexoManual = anexo;
      const r = computeAll(), s = r.simples.meses[2], h = r.hibrido.meses[2];
      out.push({ anexo, ano, faixa: s.faixaIndex, das: s.das, dasBase: s.dasBase, iv: s.ivValor, estado: s.ivEstado, comp: Object.values(s.partilhaValores).reduce((a, b) => a + b, 0),
        dasH: h.dasTotalH, ret: h.parcelaConsumoDas, sem: h.dasSemIbsCbs, partes: Object.values(h.dasPartes).reduce((a, b) => a + b, 0), ibsB: h.ibsDebito, cbsB: h.cbsDebito, tot: h.totalMensal, ibsLiq: h.ibsLiquido, cbsLiq: h.cbsLiquido, ivDas: h.acrescimoIVnoDas,
        partilhaS: s.partilhaValores });
    }
    return out;
  });
  const bad4 = [];
  for (const x of H4) {
    if (x.faixa !== 6 || x.estado !== 'aplicado') { bad4.push(['faixa/estado', x.anexo, x.ano, x.faixa, x.estado]); continue; }
    if (Math.abs(x.das - (x.dasBase + x.iv)) > 1e-6) bad4.push(['DAS = DAS da faixa + acréscimo (uma vez)', x.anexo, x.ano]);
    if (Math.abs(x.comp - x.das) > 1e-6) bad4.push(['partilha do Simples fecha com o DAS', x.anexo, x.ano, x.comp, x.das]);
    if (Math.abs(x.dasH - x.das) > 1e-6) bad4.push(['DAS do Híbrido = DAS do Simples antes de retirar CBS/IBS', x.anexo, x.ano, x.dasH, x.das]);
    if (Math.abs(x.sem + x.ret - x.dasH) > 1e-6) bad4.push(['DAS sem CBS/IBS + retirado = DAS', x.anexo, x.ano]);
    if (Math.abs(x.partes - x.sem) > 1e-6) bad4.push(['composição que permanece no DAS = DAS sem CBS/IBS', x.anexo, x.ano, x.partes, x.sem]);
    if (Math.abs(x.tot - (x.sem + x.ibsLiq + x.cbsLiq)) > 1e-6) bad4.push(['total do Híbrido = DAS restante + IBS + CBS por fora', x.anexo, x.ano]);
    // o retirado = CBS e IBS da composição do Simples (nada além disso)
    const ret = (x.partilhaS.CBS || 0) + (x.partilhaS.IBS || 0);
    if (Math.abs(x.ret - ret) > 1e-6) bad4.push(['retirado = CBS + IBS da partilha do DAS', x.anexo, x.ano, x.ret, ret]);
    if (x.ano === 2033 && (x.partilhaS.ISS || x.partilhaS.ICMS)) bad4.push(['2033 sem ISS/ICMS no DAS', x.anexo]);
  }
  ok('Simples Híbrido na 6ª faixa (Anexos I a V × 2027, 2028, 2029, 2031, 2033): retira só CBS e IBS (incluindo as parcelas do inciso IV e da redistribuição do teto), mantém ICMS/ISS, IRPJ, CSLL, CPP e IPI no DAS; total = DAS restante + IBS/CBS por fora, sem somar nem deduzir o mesmo tributo duas vezes', bad4.length === 0, bad4.slice(0, 4));
  // Híbrido do Anexo V confrontado com o oráculo (2027)
  {
    const x = H4.find((y) => y.anexo === 'III' && y.ano === 2027), o = (() => { const e = mes6a2027('III', 6000000, 500000); return e; })();
    ok('Híbrido, 3º mês, Anexo III 2027: DAS = oráculo; total por fora = oráculo (R$ ' + r2(o.hibrido).toLocaleString('pt-BR') + ') com tolerância de R$ 0,50 (o motor redistribui o excedente do teto com os fatores publicados, arredondados a 2 casas; o oráculo, com a proporção exata)', Math.abs(x.tot - o.hibrido) < 0.5 && Math.abs(x.das - o.simples) < 0.006, [x.tot, o.hibrido, x.das, o.simples]);
  }

  /* ===== 5. Empresa existente: a receita do ano anterior não é presumida ===== */
  const EX = await page.evaluate(() => {
    const run = (cfg) => {
      resetState(); state.analise.tipo = cfg.tipo || 'existente'; state.empresa.anoAnalise = cfg.ano || 2027; state.periodo.mesInicio = cfg.mesIni || 1; state.periodo.meses = cfg.meses || 12;
      state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = cfg.rec.slice(); state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = cfg.rbt12; state.periodo.rbt12Movel = cfg.movel !== false;
      state.simples.anexoModo = 'manual'; state.simples.anexoManual = cfg.anexo || 'III'; state.fatorR.modo = 'nenhuma';
      if (cfg.tipo === 'avulsa') { state.periodo.empresaAvulsa = 'existente'; if (cfg.rbt12 != null) state.periodo.rbt12Historico = cfg.rbt12; }
      if (cfg.confirma) state.confirmados = Object.assign({}, state.confirmados, { 'sublimite-ano-anterior': true });
      const r = computeAll(), S = r.simples;
      return { est: S.meses.map((m) => m.ivEstado), fx: S.meses.map((m) => m.faixaIndex), tot: r.regimes.map((x) => r.regimes.length && x.total), estado: r.regimes.map((x) => x.estado), pend: r.regimes.map((x) => x.premissaPendente), inc: r.regimes.map((x) => x.incompleto), piso: r.regimes.map((x) => x.piso),
        rec: r.recomendacao, melhor: r.melhor && r.melhor.id, ids: r.pendencias.map((p) => p.id), pj: r.pendencias.filter((p) => p.id === 'sublimite-ano-anterior').map((p) => ({ nivel: p.nivel, conf: p.confirmavel, confirmado: p.confirmado, pergunta: p.pergunta })),
        iv: S.ivTotal, ivPend: S.ivPendente, mesesPend: S.mesesIVPendentes, conc: r.conclusao.estado, sb: { n: S.sublimiteAv.mesesAfetados, ev: S.sublimiteAv.eventos.length, hi: S.sublimiteAv.historicoIncompleto }, soma: S.total, dasSemIV: S.total - S.ivTotal };
    };
    const rec12 = (v) => Array(12).fill(v);
    return {
      a: run({ rbt12: 4080000, rec: rec12(340000), movel: false }),                       // RBT12 de R$ 4,08 mi (6ª faixa), sem informação do ano anterior
      b: run({ rbt12: 4080000, rec: rec12(340000), movel: false, confirma: true }),      // idem, com a premissa confirmada
      c: run({ rbt12: 3200000, rec: rec12(400000), movel: true }),                        // cresce para a 6ª faixa no meio do ano; RBT12 inicial ≤ sublimite
      d: run({ rbt12: 3000000, rec: rec12(250000), movel: false }),                       // RBT12 abaixo de R$ 3,6 mi: 5ª faixa, sem 6ª faixa
      e: run({ tipo: 'avulsa', rbt12: null, rec: [500000, 500000, 500000], meses: 3, mesIni: 1 }),   // avulsa existente sem RBT12 anterior
    };
  });
  ok('Existente, RBT12 de R$ 4,08 mi (6ª faixa) sem dado do ano anterior: acréscimo do art. 21, IV calculado como ESTIMATIVA nos 12 meses (pendente), pendência objetiva "receita do ano anterior", comparativo inconclusivo por premissa pendente, piso = DAS sem o acréscimo',
    EX.a.est.every((s) => s === 'pendente') && EX.a.mesesPend === 12 && EX.a.rec.estado === 'inconclusivo' && EX.a.rec.motivos.includes('premissa-pendente') && EX.a.pj.length === 1 && EX.a.pj[0].nivel === 'estimativa' && EX.a.pj[0].conf === true && /ficou até/.test(EX.a.pj[0].pergunta)
    && EX.a.pend[0] === true && EX.a.pend[1] === true && EX.a.inc[0] === false && Math.abs(EX.a.piso[0] - EX.a.dasSemIV) < 0.006 && EX.a.melhor === null && EX.a.conc === 'preliminar', EX.a);
  ok('Existente, premissa confirmada ("receita do ano anterior ficou até R$ 3,6 mi"): acréscimo aplicado, sem pendência de premissa; recomendação conclusiva; confirmar muda só a elegibilidade, não o valor calculado',
    EX.b.est.every((s) => s === 'aplicado') && EX.b.mesesPend === 0 && EX.b.pend.every((p) => !p) && EX.b.rec.estado === 'conclusivo' && Math.abs(EX.b.soma - EX.a.soma) < 0.006 && EX.b.pj.length === 1 && EX.b.pj[0].confirmado === true, [EX.b.est, EX.b.rec.estado, EX.b.soma, EX.a.soma]);
  {
    const iFx6 = EX.c.fx.findIndex((f) => f === 6), nImp = EX.c.est.filter((s) => s === 'impedido').length;
    ok('Existente, RBT12 inicial R$ 3,2 mi (≤ sublimite) que chega à 6ª faixa no meio do ano: sem pendência de ano anterior; meses de 6ª faixa SEM impedimento levam o acréscimo; o mês em que o sublimite do ano passa de 20% em diante fica "impedido" (não recebe o acréscimo)',
      iFx6 > 0 && EX.c.est.slice(0, iFx6).every((s) => s === null) && EX.c.est[iFx6] === 'aplicado' && EX.c.mesesPend === 0 && !EX.c.ids.includes('sublimite-ano-anterior') && nImp >= 1 && EX.c.est[11] === 'impedido' && EX.c.sb.ev === 1, [EX.c.est, EX.c.fx, EX.c.sb]);
  }
  ok('Existente, RBT12 de R$ 3,0 mi (5ª faixa): nenhuma mudança — sem acréscimo, sem pendência, sem impedimento', EX.d.est.every((s) => s === null) && EX.d.mesesPend === 0 && !EX.d.ids.includes('sublimite-ano-anterior') && EX.d.iv === 0, EX.d);
  ok('Avulsa existente sem RBT12 anterior informado: a receita anterior NÃO é presumida como zero — meses de 6ª faixa ficam com premissa pendente e a pendência pede a receita do ano anterior',
    EX.e.est.some((s) => s === 'pendente') ? EX.e.pj.length === 1 && EX.e.sb.hi === true : EX.e.pj.length === 0, EX.e);

  /* ===== 6. 2026 × 2027-2028 × 2029 em diante (regra de cada época) ===== */
  const P6 = await page.evaluate(() => {
    const out = {};
    for (const ano of [2026, 2027, 2029, 2031, 2033]) {
      resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = ano; state.periodo.mesInicio = 1; state.periodo.meses = 3;
      state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [500000, 500000, 500000]; state.simples.anexoModo = 'manual'; state.simples.anexoManual = 'V';
      const r = computeAll(), S = r.simples;
      out[ano] = { rows: S.meses.map((m) => [m.faixaIndex, m.ivEstado, +m.das.toFixed(2), +m.dasBase.toFixed(2), +m.ivValor.toFixed(2)]), tot: S.total, h: r.hibrido.total, partilha: S.meses.map((m) => m.partilhaValores) };
    }
    return out;
  });
  // 2026: Anexo V, abertura (regras de 2026): 1º mês já com RBT12 = receita × 12 = R$ 6 mi → os 3 meses na 6ª faixa; acréscimo de ICMS/ISS (sem IBS)
  {
    const iv26 = 500000 * ivTotal('V', 6000000, 2026), base26 = 500000 * ((6000000 * 0.305 - 540000) / 6000000);
    ok('2026 (art. 21, III, "b"): Anexo V, R$ 500 mil × 3 meses com RBT12 de R$ 6 mi — DAS por mês = 107.500 (6ª faixa a 30,5%) + ISS pela 5ª faixa (R$ ' + iv26.toFixed(2) + '), sem IBS',
      P6[2026].rows.every((r) => r[0] === 6 && r[1] === 'aplicado' && Math.abs(r[3] - base26) < 0.006 && Math.abs(r[4] - r2(iv26)) < 0.006) && !P6[2026].partilha.some((p) => p.IBS || p.CBS), P6[2026].rows);
  }
  {
    // 2027-2028: mês 3 (RBT12 de R$ 6 mi, Anexo V); 2029: ISS+IBS (teto conjunto); 2033: só IBS
    const o27 = mes6a2027('V', 6000000, 500000);
    ok('2027-2028 (art. 21, IV): 3º mês = 107.000 + R$ 26.017,54; sem impedimento', Math.abs(P6[2027].rows[2][2] - r2(o27.simples)) < 0.006 && P6[2027].rows[2][1] === 'aplicado', P6[2027].rows[2]);
    const t29 = 500000 * ivTotal('V', 6000000, 2029), t33 = 500000 * ivTotal('V', 6000000, 2033), t31 = 500000 * ivTotal('V', 6000000, 2031);
    ok('2029, 2031 e 2033: acréscimo = oráculo (2029 R$ ' + t29.toFixed(2) + ' · 2031 R$ ' + t31.toFixed(2) + ' · 2033 R$ ' + t33.toFixed(2) + ' só IBS); ISS+IBS limitados a 5% em 2029-2032 e nenhum ISS/ICMS em 2033',
      Math.abs(P6[2029].rows[2][4] - r2(t29)) < 0.006 && Math.abs(P6[2031].rows[2][4] - r2(t31)) < 0.006 && Math.abs(P6[2033].rows[2][4] - r2(t33)) < 0.006 && !P6[2033].partilha[2].ISS, [P6[2029].rows[2], P6[2031].rows[2], P6[2033].rows[2]]);
  }

  /* ===== 7. A 6ª faixa isolada não torna nenhum regime inaplicável nem impede nada ===== */
  {
    const bad7 = MX.filter((x) => x.mi <= 8).filter((x) => x.estados.includes('inaplicavel') || x.rec.motivos.length || x.sb.n > 0);
    ok('Jan–ago/2027: 6ª faixa no 3º mês NÃO gera impedimento, exclusão nem "restrição" (regimes elegíveis; nenhum mês com tributos fora do DAS)', bad7.length === 0, bad7.slice(0, 2));
  }

  /* ===== 8. Arredondamentos: o app não arredonda por tributo; o PGDAS-D arredonda cada tributo a centavos ===== */
  {
    const R8 = await page.evaluate(() => {
      resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 1; state.periodo.meses = 3;
      state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [500000, 512345.67, 487654.33]; state.fatorR.modo = 'nenhuma';
      const r = computeAll(); return r.simples.meses.map((m) => ({ das: m.das, partes: Object.values(m.partilhaValores) }));
    });
    const dif = R8.map((m) => Math.abs(m.partes.reduce((a, b) => a + Math.round(b * 100) / 100, 0) - m.das));
    ok('Arredondamentos: somando cada tributo arredondado a centavos (como no PGDAS-D) a diferença para o DAS sem arredondar é de no máximo R$ ' + Math.max.apply(null, dif).toFixed(3) + ' por mês (< R$ 0,05); o app não arredonda por tributo', Math.max.apply(null, dif) < 0.05, dif);
  }

  /* ===== 9. Confronto com relatos do PGDAS-D (fóruns; fonte não oficial) ===== */
  {
    const R9 = await page.evaluate(() => {
      const out = {};
      // (a) Contábeis, jan/2018: Anexo III, RBT12 R$ 4.000.000, receita R$ 300.000 → ISS 6% limitado a 5%; federais 16,80% + excedente; DAS ≈ R$ 68.400
      const v = calcAcrescimoArt21IV(4000000, 'III', 2026), c = calcAliquotaEfetiva(4000000, 'III', 2026);
      out.a = { eff6: c.aliqEfetiva, iss: v.comp.ISS, tot: (c.aliqEfetiva + v.total) * 300000, issSemTeto: v.ivCons };
      // (b) Contábeis, set/2019: Anexo III, RBT12 R$ 3.731.883,87, receita R$ 76.119,93 → ISS de 5% = R$ 3.806,00 "confere com o PGDAS"
      const w = calcAcrescimoArt21IV(3731883.87, 'III', 2026); out.b = { iss: w.comp.ISS * 76119.93, eff6: calcAliquotaEfetiva(3731883.87, 'III', 2026).aliqEfetiva };
      // (c) Contábeis, out/2025 (art. 24): RBT12 R$ 3.234.863,02 (5ª faixa), receita do mês R$ 543.810,27; PGDAS-D R$ 93.314,72
      const e = calcSimplesNacional({ faturamentoMensal: 543810.27, rbt12: 3234863.02, anexoKey: 'III', folha12m: 0, ano: 2026 }); out.c = { das: e.dasMensal };
      return out;
    });
    ok('Relato PGDAS-D (a): Anexo III, RBT12 R$ 4 mi, receita R$ 300 mil — alíquota federal 16,80%, ISS 5,98% limitado a 5%, DAS ≈ R$ 68.349 (relato: R$ 68.400, arredondado) — ISS fixado em 5%', Math.abs(R9.a.eff6 - 0.168) < 1e-9 && Math.abs(R9.a.iss - 0.05) < 1e-12 && Math.abs(R9.a.issSemTeto - 0.0598) < 0.0002 && Math.abs(R9.a.tot - 68400) < 100, R9.a);
    ok('Relato PGDAS-D (b): Anexo III, RBT12 R$ 3.731.883,87, receita R$ 76.119,93 — ISS de 5% = R$ ' + R9.b.iss.toFixed(2) + ' (relato: R$ 3.806,00, "confere com o PGDAS"); alíquota federal 15,64%', Math.abs(R9.b.iss - 3806) < 0.01 && Math.abs(R9.b.eff6 - 0.1564) < 0.00005, R9.b);
    ok('Relato PGDAS-D (c, art. 24 — NÃO aplicado pelo app): na 5ª faixa com receita acima do sublimite o PGDAS-D deu R$ 93.314,72 e o app dá R$ ' + R9.c.das.toFixed(2) + ' (diferença de R$ ' + (93314.72 - R9.c.das).toFixed(2) + ', ' + ((93314.72 / R9.c.das - 1) * 100).toFixed(2) + '%) — limitação registrada nas Fontes', Math.abs(93314.72 - R9.c.das) > 100 && Math.abs(93314.72 / R9.c.das - 1) < 0.005, R9.c);
  }

  /* ===== 10. Textos, pendências e Fontes ===== */
  {
    const T = await page.evaluate(() => {
      resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 1; state.periodo.meses = 3;
      state.periodo.receitaModo = 'total'; state.periodo.receitaTotal = 1500000; state.fatorR.modo = 'nenhuma';
      const r = computeAll();
      const mem = state.memoria.map((m) => m.titulo + ' ' + m.formula + ' ' + m.detalhe).join(' || ');
      const f = FONTES.map((x) => x.nome + ' ' + x.fonte + ' [' + x.status + ']').join(' || ');
      return { mem, f, press: r.pendencias.find((p) => p.id === 'faixa6-art21iv'), rs: r.ressalvas, conf: r.confianca.simples };
    });
    ok('Memória: seção "6ª faixa — art. 21, IV" com a fórmula, os números do mês, o teto de 5% e o que não está confirmado; elegibilidade diz que a 6ª faixa isolada não prova impedimento', /6ª faixa — ICMS, ISS e IBS pela fórmula da 5ª faixa/.test(T.mem) && /alíquota efetiva da 5ª faixa = /.test(T.mem) && /teto de ISS \(5%\)/.test(T.mem) && /A 6ª faixa isolada não prova impedimento/.test(T.mem) && /Não confirmado no PGDAS-D/.test(T.mem), T.mem.slice(0, 200));
    ok('Fontes: art. 21, IV (oficial) e pontos não confirmados (hipótese); art. 24 não aplicado; sem a antiga afirmação de que a 6ª faixa tira ISS/ICMS/IBS do DAS', /art\. 21, IV[^|]*\[oficial\]/.test(T.f) && /NÃO confirmados[^|]*\[hipotese\]/.test(T.f) && /art\. 24[^|]*NÃO aplicada[^|]*\[hipotese\]/.test(T.f) && !/6ª faixa[^|]*fora do DAS/.test(T.f), T.f.slice(0, 200));
    ok('Pendência e ressalva: a 6ª faixa aparece como estimativa/ressalva (valor dentro do DAS e redistribuição do teto a confirmar); selo de confiança do Simples = Estimativa', !!T.press && T.press.nivel === 'estimativa' && T.rs.some((s) => /6ª faixa pelo art\. 21, IV/.test(s)) && T.conf.nivel !== 'calculo', [T.press && T.press.nivel, T.rs, T.conf]);
  }

  console.log('errors', errors);
  ok('Sem erros de console', errors.length === 0, errors);
  await t.close();
})();
