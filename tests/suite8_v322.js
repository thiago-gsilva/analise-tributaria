// V3.2.2 — homologação fiscal: regras de 2027 (Res. CGSN 190/2026; LC 123 art. 18 § 1º, § 1º-A, § 5º-K, redação da LC 214/2025),
// com um cálculo independente (oráculo) escrito a partir do texto das normas, e verificações de fontes/avisos.
const { open } = require('./lib');
const { ok, goto } = require('./helpers');

// Oráculo: DAS mensal do Simples a partir de receitas, folhas e histórico, sem usar simularSimplesPeriodo.
const ORACULO = `(cfg) => {
  const T = ANEXOS, LIM = [180000, 360000, 720000, 1800000, 3600000, 4800000];
  const N6_2027 = { I: 0.189, II: 0.299, III: 0.329, IV: 0.329, V: 0.304 }, N6_2029 = { I: 0.19, II: 0.30, III: 0.33, IV: 0.33, V: 0.305 }; // V3.2.3: 2029+ (LC 214/2025, Anexos XVIII–XXII)
  const out = [];
  const sum = (a, i, j) => { let t = 0; for (let x = i; x < j; x++) t += a[x]; return t; };
  for (let k = 0; k < cfg.rec.length; k++) {
    const mi = cfg.mesIni - 1 + k, ano = cfg.ano + Math.floor(mi / 12), r27 = ano >= 2027;
    let rbt, fs, forca1 = false, fr = null;
    if (cfg.nova) {
      if (!r27) {
        if (k === 0) { rbt = cfg.rec[0] * 12; fs = cfg.fol[0] * 12; }
        else if (k < 12) { const sr = sum(cfg.rec, 0, k), sf = sum(cfg.fol, 0, k); rbt = sr / k * 12; fs = sf / k * 12; }
        else { rbt = sum(cfg.rec, k - 12, k); fs = sum(cfg.fol, k - 12, k); }
      } else if (k < 2) { forca1 = true; fr = 0.28; rbt = 1; fs = 0.28; }
      else if (k < 13) { const n = k - 1, sr = sum(cfg.rec, 0, n), sf = sum(cfg.fol, 0, n); rbt = sr / n * 12; fs = sf / n * 12; }
      else { rbt = sum(cfg.rec, k - 13, k - 1); fs = sum(cfg.fol, k - 13, k - 1); }
    } else {
      const lag = r27 ? 1 : 0; rbt = 0; fs = 0;
      for (let j = k - 12 - lag; j < k - lag; j++) { rbt += j < 0 ? cfg.histRbt12 / 12 : cfg.rec[j]; fs += j < 0 ? cfg.histFolha12 / 12 : cfg.fol[j]; }
    }
    if (fr == null) fr = rbt > 0 ? fs / rbt : (fs > 0 ? 0.28 : 0); // art. 26, § 7º (V3.2.3): folha > 0 com receita zero → 0,28
    const anexo = cfg.anexo === 'III_V' ? (fr >= 0.28 ? 'III' : 'V') : cfg.anexo;
    let idx = 0; if (!forca1) { idx = LIM.findIndex((l) => rbt <= l); if (idx < 0) idx = 5; if (rbt <= 0) idx = 0; }
    const f = T[anexo].faixas[idx];
    let nom = f.aliq; if (r27 && idx === 5) nom = (ano >= 2029 ? N6_2029 : N6_2027)[anexo];
    const ef = (forca1 || rbt <= 0) ? nom : Math.max((rbt * nom - f.ded) / rbt, 0);
    out.push({ ano, anexo, idx: idx + 1, ef, das: cfg.rec[k] * ef });
  }
  return out;
}`;

(async () => {
  const t = await open({ viewport: { width: 1366, height: 768 } }); const { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const reset = async () => { await page.evaluate(() => resetState()); await page.waitForTimeout(150); };
  const rnd = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; };

  /* ===== 1. Casos de referência calculados à mão ===== */
  // G1 — empresa existente, histórico de R$ 10 mil/mês (RBT12 120.000), jan/2027 com receita de R$ 100 mil/mês: a janela de 2027 exclui o mês anterior
  let G = await page.evaluate(() => {
    resetState();
    state.analise.tipo = 'existente'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 1; state.periodo.meses = 4;
    state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 120000; state.empresa.faturamentoMensal = 100000; state.periodo.rbt12Movel = true;
    const a = computeAll().simples.meses.map((m) => Math.round(m.rbt12));
    state.empresa.anoAnalise = 2026;
    const b = computeAll().simples.meses.map((m) => Math.round(m.rbt12));
    return { a, b };
  });
  ok('Janela 2027: RBT12 de jan–abr/2027 = 120.000 · 120.000 · 210.000 · 300.000 (o mês anterior fica de fora)', JSON.stringify(G.a) === JSON.stringify([120000, 120000, 210000, 300000]), G.a);
  ok('Janela 2026: RBT12 de jan–abr/2026 = 120.000 · 210.000 · 300.000 · 390.000 (regra anterior preservada)', JSON.stringify(G.b) === JSON.stringify([120000, 210000, 300000, 390000]), G.b);

  // G2 — 6ª faixa em 2027: Anexo I, RBT12 R$ 4.000.000 constante → (4.000.000 × 18,9% − 378.000) ÷ 4.000.000 = 9,45% (2026: 19% → 9,55%)
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'existente'; state.periodo.mesInicio = 1; state.periodo.meses = 1;
    state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 4000000; state.empresa.faturamentoMensal = 333333.33;
    state.simples.anexoModo = 'manual'; state.simples.anexoManual = 'I'; state.periodo.rbt12Movel = false; state.empresa.anoAnalise = 2027;
    const a = computeAll().simples.meses[0]; state.empresa.anoAnalise = 2026; const b = computeAll().simples.meses[0];
    return { a: [a.faixaIndex, a.aliqNominal, +(a.aliqEfetiva * 100).toFixed(4)], b: [b.faixaIndex, b.aliqNominal, +(b.aliqEfetiva * 100).toFixed(4)] };
  });
  ok('6ª faixa do Anexo I: 2027 = 18,90% nominal → 9,45% efetiva · 2026 = 19% → 9,55%', JSON.stringify(G.a) === JSON.stringify([6, 0.189, 9.45]) && JSON.stringify(G.b) === JSON.stringify([6, 0.19, 9.55]), G);
  G = await page.evaluate(() => { const T = { I: [0.04, 0.073, 0.095, 0.107, 0.143, 0.19], II: [0.045, 0.078, 0.1, 0.112, 0.147, 0.3], III: [0.06, 0.112, 0.135, 0.16, 0.21, 0.33], IV: [0.045, 0.09, 0.102, 0.14, 0.22, 0.33], V: [0.155, 0.18, 0.195, 0.205, 0.23, 0.305] }; return Object.keys(T).map((k) => [k, ANEXOS[k].faixas.map((f) => f.aliq).join() === T[k].join()]); });
  ok('Tabelas-base dos Anexos (até a 5ª faixa e 6ª de 2026) preservadas', G.every((x) => x[1]), G);

  // G3 — empresa nova (2027): 1º e 2º mês = 1ª faixa e fator "r" 0,28; mês 3 usa só o mês 1 (antecedente ao mês anterior); mês 14 volta à janela normal
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 1; state.periodo.meses = 15;
    state.empresa.faturamentoMensal = 20000; state.fatorR.modo = 'nenhuma';
    const r = computeAll(); const m = r.simples.meses;
    return { regras: m.map((x) => x.regraRbt12), an: m.map((x) => x.anexoUsado), fr: [m[0].fatorR, m[1].fatorR], rbt: [m[2].rbt12, m[3].rbt12, m[12].rbt12, m[13].rbt12, m[14].rbt12], das: m.map((x) => +x.das.toFixed(2)), aliq1: [m[0].aliqEfetiva, m[1].aliqEfetiva] };
  });
  ok('Empresa nova 2027: meses 1–2 na 1ª faixa com fator "r" 0,28 (Anexo III mesmo sem folha) e mês 3 em diante no Anexo V', G.regras[0] === 'inicio-2027-1a-faixa' && G.regras[1] === 'inicio-2027-1a-faixa' && G.an[0] === 'III' && G.an[1] === 'III' && G.an[2] === 'V' && G.fr[0] === 0.28 && G.aliq1[0] === 0.06 && G.aliq1[1] === 0.06, G);
  ok('Empresa nova 2027: RBT12 = média dos meses antecedentes ao mês anterior × 12 do 3º ao 13º mês; janela de 12 meses antecedentes ao mês anterior a partir do 14º', G.rbt.every((v) => Math.abs(v - 240000) < 0.001) && G.regras[2] === 'inicio-2027-media' && G.regras[12] === 'inicio-2027-media' && G.regras[13] === 'janela-2027', G);
  ok('Empresa nova 2027: DAS mensal = 2 × 1.200 (1ª faixa, 6%) + 13 × 3.225 (Anexo V, 2ª faixa: 16,125% de R$ 20.000)', G.das[0] === 1200 && G.das[1] === 1200 && G.das.slice(2).every((d) => d === 3225), G.das);

  // G4 — empresa nova que começa em dez/2026: dez/2026 pela regra antiga; jan/2027 (2º mês de atividade) já na 1ª faixa com fator "r" 0,28
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'nova'; state.empresa.anoAnalise = 2026; state.periodo.mesInicio = 12; state.periodo.meses = 4;
    state.empresa.faturamentoMensal = 20000; state.fatorR.modo = 'nenhuma';
    return computeAll().simples.meses.map((x) => [x.rotulo, x.regraRbt12, x.anexoUsado, x.faixaIndex]);
  });
  ok('Virada de ano: dez/2026 segue a regra de 2026 (RBT12 = receita × 12); de jan/2027 valem as regras de 2027', G[0][1] === 'inicio-1' && G[1][1] === 'inicio-2027-1a-faixa' && G[2][1] === 'inicio-2027-media' && G[3][1] === 'inicio-2027-media', G);

  /* ===== 2. Oráculo independente × motor (cenários aleatórios) ===== */
  const R = rnd(20271);
  const casos = [];
  for (let i = 0; i < 360; i++) {
    const tipo = ['existente', 'nova', 'avulsa'][i % 3];
    const meses = 1 + Math.floor(R() * 24), mesIni = 1 + Math.floor(R() * 12), ano = [2026, 2027, 2027, 2028][Math.floor(R() * 4)];
    const base = Math.round(5000 + R() * 380000), var_ = R() < 0.5;
    const rec = Array.from({ length: meses }, () => var_ ? Math.round(base * (0.4 + R() * 1.4)) : base);
    const folPct = R() < 0.35 ? 0 : R() * 0.45, hist = Math.round(base * 12 * (0.3 + R() * 1.5));
    casos.push({ tipo, meses, mesIni, ano, rec, base, avNova: R() < 0.4, folPct, hist, folhaHist: Math.round(hist * (R() < 0.4 ? 0 : R() * 0.4)), anexo: ['III_V', 'III_V', 'I', 'II', 'IV'][Math.floor(R() * 5)] });
  }
  const ret = await page.evaluate(async ({ casos, oraculo }) => {
    const orc = eval(oraculo); let bad = 0, n = 0, maxd = 0, exemplos = [];
    for (const c of casos) {
      resetState(); state.analise.tipo = c.tipo; state.empresa.anoAnalise = c.ano; state.periodo.mesInicio = c.mesIni; state.periodo.meses = c.meses;
      state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = c.rec.slice();
      if (c.tipo === 'avulsa') { state.periodo.empresaAvulsa = c.avNova ? 'nova' : 'existente'; state.periodo.rbt12Historico = c.hist; }
      state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = c.hist; state.empresa.folha12m = c.folhaHist;
      state.fatorR.modo = 'atual'; state.fatorR.folhaMensalPrevista = Math.round(c.base * c.folPct);
      state.simples.anexoModo = c.anexo === 'III_V' ? 'auto' : 'manual'; state.simples.anexoManual = c.anexo === 'III_V' ? 'III' : c.anexo;
      state.periodo.rbt12Movel = true;
      let r; try { r = computeAll(); } catch (e) { exemplos.push('erro ' + e.message); bad++; continue; }
      const m = r.meta; const rec = m.receitas;
      const fol = r.fatorRComp && r.fatorRComp.atual ? null : null;
      const sm = r.simples.meses;
      const folha = sm.map((x) => x.folha);
      const o = orc({ nova: m.nova, rec, fol: folha, histRbt12: m.hist.rbt12, histFolha12: m.hist.folha12, anexo: r.anexoKey, ano: c.ano, mesIni: c.mesIni });
      sm.forEach((x, k) => { n++; const d = Math.abs((x.dasBase != null ? x.dasBase : x.das) - o[k].das); maxd = Math.max(maxd, d); if (d > 0.005 || x.anexoUsado !== o[k].anexo || x.faixaIndex !== o[k].idx) { bad++; if (exemplos.length < 4) exemplos.push([c.tipo, c.ano, c.mesIni, k, x.das, o[k].das, x.anexoUsado, o[k].anexo, x.faixaIndex, o[k].idx]); } });
    }
    return { bad, n, maxd, exemplos };
  }, { casos, oraculo: ORACULO });
  ok('Oráculo independente × motor (DAS da faixa, sem o acréscimo do art. 21, IV, que a suite11 confere): ' + ret.n + ' meses de 360 cenários (existente/nova/avulsa, 2026–2028, com e sem folha, 1 a 24 meses) sem diferença (máx. R$ ' + ret.maxd.toFixed(6) + ')', ret.bad === 0 && ret.n > 3000, ret);

  /* ===== 3. Início de atividade: folha necessária ainda leva ao Anexo III a partir do 3º mês ===== */
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 1; state.periodo.meses = 8;
    state.empresa.faturamentoMensal = 40000; state.fatorR.modo = 'necessaria';
    const r = computeAll(); return { com: r.fatorRComp.com.ag.meses.map((x) => x.anexoUsado), sem: r.fatorRComp.sem.ag.meses.map((x) => x.anexoUsado) };
  });
  ok('Fator R (empresa nova 2027): com a folha necessária todos os meses ficam no Anexo III; sem folha só os 2 primeiros', G.com.every((a) => a === 'III') && G.sem[0] === 'III' && G.sem[1] === 'III' && G.sem.slice(2).every((a) => a === 'V'), G);

  /* ===== 4. Fontes, avisos e textos ===== */
  const F = await page.evaluate(() => ({
    fontes: FONTES.map((f) => ({ n: f.nome, f: f.fonte, s: f.status })),
    inss: PARAMS_FOLHA.inss,
  }));
  const f = (re) => F.fontes.filter((x) => re.test(x.n + ' ' + x.f));
  ok('Fontes: prazo do regime regular de IBS/CBS atualizado (30/10/2026, Res. CGSN 194/2026) e sem a frase de que a janela de setembro "já passou"', f(/30\/10\/2026/).some((x) => /194/.test(x.f)) && !F.fontes.some((x) => /já passou/.test(x.n + x.f)), f(/janelas de opção/));
  ok('Fontes: INSS de 11% do sócio com base normativa (IN RFB 2.110/2022, art. 37, II, "a") e status oficial', f(/INSS de 11%/).some((x) => /2\.110\/2022/.test(x.f) && x.s === 'oficial'), f(/INSS de 11%/));
  ok('Fontes: janela de 2027 (LC 214/2025), início de atividade (Res. 190) e 6ª faixa 2027–2028 registradas como oficiais', f(/antecedentes ao mês anterior/i).some((x) => x.s === 'oficial' && /214\/2025/.test(x.f)) && f(/fator r nos 2 primeiros meses/i).some((x) => x.s === 'oficial') && f(/6ª faixa/i).some((x) => x.s === 'oficial'), F.fontes.length);
  ok('Fontes: composição da folha fiscal (CPP no DAS e FGTS efetivos) oficial; soma da CPP estimada NÃO aplicada (hipótese); teto/IRRF de 2027 como hipótese', f(/Folha fiscal do Fator R/).some((x) => x.s === 'oficial') && f(/sem somar a CPP/).some((x) => x.s === 'hipotese') && f(/em 2027: o app usa os valores de 2026/).some((x) => x.s === 'hipotese'), 0);
  ok('Fontes: Fator R do 3º mês de atividade (§ 7º) permanece hipótese', f(/3º mês de atividade em diante/).every((x) => x.s === 'hipotese') && f(/3º mês de atividade em diante/).length === 1, 0);
  await page.evaluate(() => { resetState(); state.analise.tipo = 'existente'; state.empresa.faturamentoMensal = 50000; });
  await goto(page, 'resultados');
  const txt = await page.evaluate(() => { document.querySelectorAll('#stepRoot details').forEach((d) => (d.open = true)); return document.getElementById('stepRoot').innerText; });
  ok('Resultados (Simples Híbrido): aviso do prazo de opção com 30/10/2026, cancelamento e janela de março/2027', /30\/10\/2026/.test(txt) && /março\/2027|mar\/2027/i.test(txt) && /03\/11 a 20\/12\/2026/.test(txt), 0);
  ok('Sem erros de console', errors.length === 0, errors);
  await t.close();
})();
