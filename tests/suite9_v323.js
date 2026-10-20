// V3.2.3 — conferência final dos Anexos e das regras de 2027 (LC 123 Anexos I–V na redação da LC 214/2025, art. 519; Res. CGSN 140 arts. 22-A, 26 e 40-C a 40-E, Res. CGSN 190/2026).
// Todos os valores esperados vêm da tabela oficial (conferida na republicação do Senado) ou de contas à mão a partir dela.
const { open } = require('./lib');
const { ok, goto } = require('./helpers');
(async () => {
  const t = await open({ viewport: { width: 1366, height: 768 } }); const { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const R2 = (v) => +v.toFixed(2);

  /* ===== 1. Integridade das tabelas de partilha 2027+ ===== */
  let G = await page.evaluate(() => {
    const out = { somas: [], pc: [], n: 0 };
    for (const A of Object.keys(ANEXOS_LC214)) {
      const T = ANEXOS_LC214[A];
      for (const p of Object.keys(T.p)) {
        if (T.p[p].length !== 6) out.somas.push([A, p, 'faixas', T.p[p].length]);
        T.p[p].forEach((row, i) => { out.n++; const sm = +row.reduce((a, b) => a + b, 0).toFixed(4); if (Math.abs(sm - 100) > 0.0001) out.somas.push([A, p, i + 1, sm]); });
      }
      // 2027–2028: CBS + IBS = PIS + COFINS da tabela de 2026 (faixas 1 a 5)
      const iC = T.cols.indexOf('CBS'), iI = T.cols.indexOf('IBS');
      for (let i = 0; i < 5; i++) { const row = T.p['2728'][i], p26 = ANEXOS[A].faixas[i].partilha; const a = row[iC] + row[iI], b = p26.PIS + p26.COFINS; if (Math.abs(a - b) > (A === 'III' && (i === 2 || i === 3) ? 0.0101 : 0.0051)) out.pc.push([A, i + 1, a, b]); }
    }
    return out;
  });
  ok('Partilhas 2027+: 5 Anexos × 6 períodos × 6 faixas somam 100% (únicas exceções publicadas: Anexo III 2027-2028, 3ª e 4ª faixas = 100,01%)',
    G.n === 180 && JSON.stringify(G.somas) === JSON.stringify([['III', '2728', 3, 100.01], ['III', '2728', 4, 100.01]]), G);
  ok('Partilhas 2027-2028: CBS + IBS = PIS + COFINS de 2026 em todas as faixas de 1 a 5 de cada Anexo (a transição não muda o total do DAS; Anexo III, 3ª e 4ª faixas, com a diferença de 0,01 p.p. já publicada)', G.pc.length === 0, G.pc);
  G = await page.evaluate(() => ({ a: ANEXOS_LC214.III.p['2728'][0], b: ANEXOS_LC214.III.p['2033'][0], c: ANEXOS_LC214.V.p['2728'][1], d: ANEXOS_LC214.V.p['2033'][0], cols3: ANEXOS_LC214.III.cols, cols33: ANEXOS_LC214.III.cols }));
  ok('Conferência pontual (tabela oficial): Anexo III 1ª faixa 2027-2028 = IRPJ 4 · CSLL 3,5 · CBS 15,43 · CPP 43,4 · ISS 33,5 · IBS 0,17', JSON.stringify(G.a) === JSON.stringify([4, 3.5, 15.43, 43.4, 33.5, 0.17]), G.a);
  ok('Conferência pontual: Anexo III 1ª faixa 2033+ = CBS 15,6 · CPP 43,4 · ISS 0 · IBS 33,5 (ISS extinto, substituído pelo IBS)', JSON.stringify(G.b) === JSON.stringify([4, 3.5, 15.6, 43.4, 0, 33.5]), G.b);
  ok('Conferência pontual: Anexo V 2ª faixa 2027-2028 = IRPJ 23 · CSLL 15 · CBS 16,96 · CPP 27,85 · ISS 17 · IBS 0,19; 1ª faixa 2033+: CBS 17,15 · IBS 14',
    JSON.stringify(G.c) === JSON.stringify([23, 15, 16.96, 27.85, 17, 0.19]) && JSON.stringify(G.d) === JSON.stringify([25, 15, 17.15, 28.85, 14]) || JSON.stringify(G.d) === JSON.stringify([25, 15, 17.15, 28.85, 0, 14]), G);

  /* ===== 2. 6ª faixa 2029+ e nota do ISS 5% ===== */
  G = await page.evaluate(() => {
    const r = {};
    for (const A of ['I', 'II', 'III', 'IV', 'V']) r[A] = [calcAliquotaEfetiva(4000000, A, 2028).faixa.aliq, calcAliquotaEfetiva(4000000, A, 2029).faixa.aliq, calcAliquotaEfetiva(4000000, A, 2026).faixa.aliq];
    return r;
  });
  ok('6ª faixa: 2027-2028 (I 18,9 · II 29,9 · III 32,9 · IV 32,9 · V 30,4) e 2029+ (I 19 · II 30 · III 33 · IV 33 · V 30,5); 2026 inalterado',
    JSON.stringify(G) === JSON.stringify({ I: [0.189, 0.19, 0.19], II: [0.299, 0.3, 0.3], III: [0.329, 0.33, 0.33], IV: [0.329, 0.33, 0.33], V: [0.304, 0.305, 0.305] }), G);
  G = await page.evaluate(() => {
    const e = (4 === 4) ? (3000000 * 0.21 - 125640) / 3000000 : 0;   // Anexo III, 5ª faixa, RBT12 R$ 3 mi
    const ps = {};
    for (const ano of [2027, 2030, 2033]) { const p = partilhaOficial('III', ano, 4, e); ps[ano] = { soma: +Object.values(p).reduce((a, b) => a + b, 0).toFixed(6), iss: (p.ISS || 0) * e / 100, ibs: (p.IBS || 0) * e / 100 }; }
    return { e, ps };
  });
  ok('Nota de 5% de ISS (Anexo III, 5ª faixa): ISS limitado a 5% da receita em 2027-2028 e a 4% (+1% de IBS) em 2030 (o excedente vira IRPJ/CSLL/CPP/CBS/IBS) e partilha continua somando 100%',
    Math.abs(G.ps[2027].iss - 0.05) < 1e-9 && Math.abs(G.ps[2030].iss - 0.04) < 1e-9 && Object.values(G.ps).every((x) => Math.abs(x.soma - 100) < 0.011) && G.ps[2033].iss === 0, G);

  /* ===== 3. Simples Híbrido: só CBS e IBS saem do DAS ===== */
  // B) empresa nova, R$ 20 mil/mês, sem folha, 2027: meses 1–2 = Anexo III 1ª faixa (6%, CBS+IBS 15,60%); meses 3–12 = Anexo V 2ª faixa (16,125%, CBS+IBS 17,15%)
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'nova'; state.empresa.anoAnalise = 2027; state.empresa.faturamentoMensal = 20000; state.fatorR.modo = 'nenhuma';
    const r = computeAll(); const H = r.hibrido; const S = r.simples;
    return { s: S.total, h: H.total, hm: H.meses.map((x) => [x.das, x.parcelaIbsNoDas, x.parcelaCbsNoDas, x.dasSemIbsCbs, x.opcao]), tot: r.regimes.map((x) => +x.total.toFixed(2)), cbs: H.cbsPct, ibs: H.ibsPct };
  });
  const parcelas = 2 * 1200 * 0.156 + 10 * 3225 * 0.1715;             // 374,40 + 5.530,875
  const regular = 12 * 20000 * (0.088 + 0.001);                         // CBS 8,8% + IBS 0,1% (referência/projeção) = 21.360
  ok('Híbrido 2027 (empresa nova, R$ 20 mil/mês): DAS 34.650 − parcelas de CBS+IBS (R$ ' + parcelas.toFixed(3) + ') + IBS/CBS regulares R$ ' + regular + ' = R$ ' + (34650 - parcelas + regular).toFixed(3),
    G.s === 34650 && Math.abs(G.h - (34650 - parcelas + regular)) < 0.01, [G.s, G.h, 34650 - parcelas + regular]);
  ok('Híbrido: o DAS remanescente mantém ISS, CPP, IRPJ e CSLL (mês 1: 1.200 − 187,20 = 1.012,80; mês 3: 3.225 − 553,0875 = 2.671,9125)',
    Math.abs(G.hm[0][3] - 1012.8) < 0.005 && Math.abs(G.hm[2][3] - 2671.9125) < 0.005 && G.hm.every((x) => x[4] === true), G.hm.slice(0, 3));
  G = await page.evaluate(() => {
    const out = [];
    for (const ano of [2026, 2027]) {
      resetState(); state.analise.tipo = 'existente'; state.empresa.anoAnalise = ano; state.empresa.faturamentoMensal = 50000; state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 600000;
      const r = computeAll(); out.push({ ano, s: r.simples.total, h: r.hibrido.total, dasPartes: r.hibrido.dasPartesTotais, sem: r.hibrido.mesesSemOpcao, com: r.hibrido.mesesComOpcao });
    }
    return out;
  });
  ok('Híbrido 2026: a opção só existe a partir de 2027 → Híbrido = Simples (DAS integral, sem IBS/CBS regulares nem retirada de parcelas)', Math.abs(G[0].h - G[0].s) < 0.005 && G[0].sem === 12 && G[0].com === 0, G[0]);
  ok('Híbrido 2027 (empresa existente): menos que o DAS cheio no DAS e mais IBS/CBS regulares; nunca remove ISS/ICMS nem PIS/COFINS fora da transição', G[1].com === 12 && G[1].h > 0 && G[1].h !== G[1].s, G[1]);
  // Em 2028 a parcela retirada do DAS é a de CBS+IBS da tabela 2027-2028 (não a de PIS/COFINS + ISS do desenho anterior)
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'existente'; state.empresa.anoAnalise = 2028; state.periodo.mesInicio = 1; state.periodo.meses = 1; state.empresa.faturamentoMensal = 50000;
    state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 600000; state.simples.anexoModo = 'manual'; state.simples.anexoManual = 'III'; state.periodo.rbt12Movel = false;
    const r = computeAll(); const s = r.simples.meses[0], h = r.hibrido.meses[0];
    return { das: s.das, fx: s.faixaIndex, parc: h.parcelaIbsNoDas + h.parcelaCbsNoDas, rest: h.dasSemIbsCbs };
  });
  ok('Híbrido 2028, Anexo III, RBT12 600 mil (3ª faixa): parcela retirada = CBS 16,42% + IBS 0,19% = 16,61% do DAS (tabela publicada) e o restante fica no DAS',
    G.fx === 3 && Math.abs(G.parc / G.das - 0.1661) < 0.00005 && Math.abs(G.rest - (G.das - G.parc)) < 0.005, G);

  /* ===== 4. Fator r: casos de zero (Res. CGSN 140, art. 26, § 6º e § 7º) ===== */
  G = await page.evaluate(() => [calcFatorRLegal(0, 0), calcFatorRLegal(50000, 0), calcFatorRLegal(60000, 200000), calcFatorRLegal(0, 200000)]);
  ok('Fator r – casos de zero: folha 0 e receita 0 → 0 (equivale a 0,01, Anexo V); folha > 0 e receita 0 → 0,28; ambos > 0 → razão; folha 0 e receita > 0 → 0 (0,01)', JSON.stringify(G) === JSON.stringify([0, 0.28, 0.3, 0]), G);
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 1; state.periodo.meses = 6;
    state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = [0, 0, 0, 20000, 20000, 20000];
    state.fatorR.modo = 'atual'; state.fatorR.folhaMensalPrevista = 6000;
    const m = computeAll().simples.meses; return m.map((x) => [x.rbt12, x.folha12, x.fatorR, x.anexoUsado]);
  });
  ok('Empresa nova sem receita nos primeiros meses mas com folha: folha anualizada pela média da própria folha (independe da receita) e fator r 0,28 quando a receita anualizada é zero', G[3][1] > 0 && Math.abs(G[3][1] - 6000 * 12) < 0.01 && G[3][2] === 0.28 && G[3][3] === 'III', G);

  /* ===== 5. Empresa nova, R$ 1,5 mi em 3 meses — por mês de abertura ===== */
  const MX = await page.evaluate(() => {
    const out = [];
    for (const [ano, mi] of [[2026, 10], [2026, 11], [2026, 12], [2027, 1], [2027, 2], [2027, 3], [2027, 4], [2027, 5], [2027, 6], [2027, 7], [2027, 8], [2027, 9], [2027, 10], [2027, 11], [2027, 12]]) {
      resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = ano; state.periodo.mesInicio = mi; state.periodo.meses = 3;
      state.periodo.receitaModo = 'total'; state.periodo.receitaTotal = 1500000; state.fatorR.modo = 'nenhuma';
      const r = computeAll(), S = r.simples, li = S.limiteInicio, P = buildPendencias(r);
      out.push({ ano, mi, simples: S.total, das: S.meses.map((m) => m.das), li: { m: li.mesesFuncionamento, lim: li.limite, rec: li.receitaAno, exc: li.excedeu, sub: li.sublimite, subx: li.sublimiteExcedido, pct: li.sublimitePctExcesso }, ids: P.map((p) => p.id), fora: S.mesesForaDoLimite });
    }
    return out;
  });
  // Esperado, independente do motor: meses de funcionamento no ano de início = 13 − mês de abertura; receita do ano = 500 mil × min(3, meses); limite geral 400 mil × meses; sublimite 300 mil × meses (a partir de 2027)
  let okM = true; const falhas = [];
  for (const x of MX) {
    const m = 13 - x.mi, rec = 500000 * Math.min(3, m), lim = 400000 * m, sub = 300000 * m;
    const e = { m, rec, lim, exc: rec > lim, subx: x.ano >= 2027 && rec > sub };
    const g = { m: x.li.m, rec: x.li.rec, lim: x.li.lim, exc: x.li.exc, subx: x.li.subx };
    if (JSON.stringify(e) !== JSON.stringify(g)) { okM = false; falhas.push([x.ano, x.mi, e, g]); }
    if (x.ids.includes('limite-simples') !== e.exc) { okM = false; falhas.push(['pendência limite', x.ano, x.mi]); }
    // V3.2.5: a 6ª faixa isolada não é impedimento; a pendência 'sublimite' aparece quando o sublimite proporcional é efetivamente excedido (2027) — em 2026 o sublimite é avaliado nos meses de 6ª faixa
    if (x.ano >= 2027 && x.ids.includes('sublimite') !== e.subx) { okM = false; falhas.push(['pendência sublimite', x.ano, x.mi, x.ids.includes('sublimite'), e.subx]); }
  }
  ok('R$ 1,5 mi em 3 meses (empresa nova): limite de R$ 400 mil × meses e sublimite de R$ 300 mil × meses conferem para 15 meses de abertura (out/2026 a dez/2027)', okM, falhas);
  const jan = MX.find((x) => x.ano === 2027 && x.mi === 1), set = MX.find((x) => x.ano === 2027 && x.mi === 9), out = MX.find((x) => x.ano === 2027 && x.mi === 10), out26 = MX.find((x) => x.ano === 2026 && x.mi === 10);
  ok('Sem excesso do limite geral (abertura em jan/2027 até set/2027): Simples = R$ 193.017,54 (R$ 167.000 até a v3.2.4, antes do acréscimo do art. 21, IV na 6ª faixa); abertura em set/2027 ultrapassa só o sublimite (25% sobre R$ 1,2 mi)', Math.abs(jan.simples - 193017.5425) < 0.006 && set.fora === 0 && set.li.subx && !set.li.exc && Math.abs(set.li.pct - 25) < 1e-9, [jan.simples, set.li]);
  ok('Excesso acima de 20% (abertura em out, nov ou dez/2027): exclusão retroativa ao início — todos os 3 meses marcados como fora do Simples (efeito retroativo), com os dois alertas', out.fora === 3 && out.ids.includes('limite-simples') && out.ids.includes('sublimite') && MX.filter((x) => x.ano === 2027 && x.mi >= 10).every((x) => x.fora === 3), out);
  ok('Reconciliação: R$ 322.500 (regras de 2026: 3 × 107.500, RBT12 de 6 mi na 6ª faixa do Anexo V a 30,5%) × R$ 193.017,54 (regras de 2027: 2 × 30.000 na 1ª faixa + 107.000 com 30,4% + R$ 26.017,54 do art. 21, IV) = R$ 129.482,46 = 2 × (107.500 − 30.000) + (107.500 − 107.000 − 26.017,54)',
    out26.simples === 322500 && out26.das.every((d) => d === 107500) && Math.abs(jan.simples - 193017.5425) < 0.006 && jan.das[0] === 30000 && jan.das[1] === 30000 && Math.abs(jan.das[2] - 133017.5425) < 0.006 && Math.abs((322500 - jan.simples) - (2 * (107500 - 30000) + (107500 - 107000 - 26017.5425))) < 0.006, [out26.das, jan.das]);

  /* ===== 6. Parâmetros ainda não oficiais continuam como projeção ===== */
  G = await page.evaluate(() => ({ teto: PARAMS_FOLHA.inss.teto, ano: PARAMS_FOLHA.ano, cbs: IBS_CBS_CRONOGRAMA.find((x) => x.ano === 2027).cbs, ibs29: IBS_CBS_CRONOGRAMA.find((x) => x.ano === 2029).ibs,
    fontes: FONTES.filter((x) => /INSS e tabela do IRRF em 2027|Alíquotas de referência de CBS/.test(x.nome)).map((x) => x.status) }));
  ok('INSS (teto R$ 8.475,55) e IRRF de 2026 mantidos para 2027 — sem valores inventados; CBS 2027+ e IBS 2029+ seguem como projeção (hipótese)', G.teto === 8475.55 && G.ano === 2026 && G.fontes.length === 2 && G.fontes.every((s) => s === 'hipotese'), G);

  /* ===== 7. Fontes ===== */
  const F = await page.evaluate(() => FONTES.map((x) => ({ n: x.nome, f: x.fonte, s: x.status })));
  const f = (re) => F.filter((x) => re.test(x.n + ' ' + x.f));
  ok('Fontes: Anexos 2027+ com partilha de CBS e IBS (LC 214/2025, art. 519) como oficial, sem a ressalva antiga de "partilha não alterada"', f(/Anexos XVIII a XXII/).some((x) => x.s === 'oficial') && !F.some((x) => /não foi alterada no app/.test(x.n)), f(/Anexos XVIII/).length);
  ok('Fontes: Simples Híbrido (arts. 22-A e 40-C a 40-E da Res. 140) e sublimite (LC 123, art. 13-A) oficiais; vigência de 01/01/2027 registrada com o art. 9º da Res. 190', f(/22-A e 40-C/).some((x) => x.s === 'oficial') && f(/art\. 13-A/).some((x) => x.s === 'oficial') && f(/Art\. 9º da Res\. CGSN 190/).some((x) => x.s === 'oficial' && /01\/01\/2027/.test(x.n + x.f)), f(/9º da Res/).length);
  ok('Fontes: casos de zero do fator r (§ 6º e § 7º) permanecem hipótese — incisos conferidos só em reprodução secundária', f(/3º mês de atividade em diante/).length === 1 && f(/3º mês de atividade em diante/).every((x) => x.s === 'hipotese' && /secundária/.test(x.f)), f(/3º mês/).length);
  ok('Sem erros de console', errors.length === 0, errors);
  await t.close();
})();
