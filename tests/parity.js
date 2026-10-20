const path = require('path');
const { chromium, serve, aplicarStubs, ROOT } = require('./lib');
const { open } = require('./lib');
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
// Compara o motor da v3 com o app original (referencia-v1/) em 400 cenários aleatórios de empresa existente / 12 meses.
(async () => {
  const srv = await serve(8794, path.join(ROOT, 'referencia-v1'));
  const b = await chromium.launch(); const lp = await b.newPage();
  await aplicarStubs(lp);
  await lp.route(/fonts\./, (r) => r.abort());
  await lp.goto('http://localhost:8794/wrapper-local.html'); await lp.waitForTimeout(600);
  const t = await open({ port: 8795, stubs: true }); const np = t.page;
  await np.click('[data-tipo="existente"]'); await np.waitForTimeout(200);
  const rnd = rng(12345);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const trat = await lp.evaluate(() => Object.keys(IBS_CBS_TRATAMENTOS));
  const cnaeCodes = await lp.evaluate(() => CNAE_DATA.subclasses.filter((_, i) => i % 40 === 0).map((c) => c.codigo));
  const cases = [];
  for (let i = 0; i < 400; i++) {
    const fat = Math.round(Math.exp(Math.log(2000) + rnd() * Math.log(400000 / 2000)));
    const auto = rnd() < 0.6;
    cases.push({
      fat, rbt12Modo: auto ? 'auto' : 'manual', rbt12Manual: Math.round(fat * 12 * (0.4 + rnd() * 1.4)), folha12m: rnd() < 0.3 ? 0 : Math.round(fat * 12 * rnd() * 0.5),
      anexoModo: pick(['auto', 'manual', 'manual']), anexoManual: pick(['I', 'II', 'III', 'IV', 'V', 'III_V']),
      atividadeModo: pick(['auto', 'manual']), atividade: null, ano: pick([2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]),
      iss: pick([2, 3, 5]), majoracao: rnd() < 0.2, credIbs: pick([0, 0, 20, 60]), credCbs: pick([0, 0, 20, 60]),
      ibsModo: pick(['auto', 'manual']), ibsTrat: pick(trat), ibsManual: rnd() < 0.15 ? 5 : null,
      cnae: rnd() < 0.5 ? pick(cnaeCodes) : null,
    });
  }
  const apply = `(cases) => cases.map((c) => {
    state.empresa.faturamentoMensal = c.fat; state.empresa.rbt12Modo = c.rbt12Modo; state.empresa.rbt12Manual = c.rbt12Manual; state.empresa.folha12m = c.folha12m;
    state.empresa.anoAnalise = c.ano; state.presumido.anoProjecao = c.ano; state.hibrido.anoProjecao = c.ano;
    state.simples.anexoModo = c.anexoModo; state.simples.anexoManual = c.anexoManual === 'III_V' ? 'III' : c.anexoManual;
    state.presumido.atividadeModo = c.atividadeModo; state.presumido.atividade = 'servicos_gerais';
    state.presumido.issAliq = c.iss; state.presumido.majoracao = c.majoracao;
    state.hibrido.creditoIbsPct = c.credIbs; state.hibrido.creditoCbsPct = c.credCbs;
    state.ibscbs.modo = c.ibsModo; state.ibscbs.tratamento = c.ibsTrat; state.ibscbs.aliquotaEfetivaManualPct = c.ibsManual;
    state.classificacaoComplementos = {};
    state.empresa.cnae = c.cnae ? CNAE_DATA.subclasses.find((x) => x.codigo === c.cnae) : null;
    const r = computeAll();
    return { s: r.simples.dasAnual != null ? r.simples.dasAnual : r.simples.total, h: r.hibrido.totalAnual != null ? r.hibrido.totalAnual : r.hibrido.total, p: r.presumido.totalAnual != null ? r.presumido.totalAnual : r.presumido.total, anexo: r.simples.anexoUsado, ativ: r.atividadeKey };
  })`;
  // novo app: aguarda base CNAE e aplica
  await np.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const L = await lp.evaluate(`(${apply})(${JSON.stringify(cases)})`);
  const N = await np.evaluate(`(${apply})(${JSON.stringify(cases)})`);
  let bad = 0, maxd = 0, expected = 0, hibDiv = 0;
  // V3.2.3: o Híbrido do app original (v1) retira PIS/COFINS e ISS do DAS e usa IBS/CBS em 2026; a Res. CGSN 140, art. 22-A (Res. 190/2026) retira só CBS e IBS e a opção
  // existe a partir de 2027. Esse total diverge POR DESENHO (verificado na suite9_v323.js); a paridade com a v1 vale para o Simples e o Presumido.
  L.forEach((l, i) => {
    // novo: estado de teste "existente 12 meses constante" → comparar totais do período (12 meses)
    const n = N[i];
    const ds = Math.abs(l.s - n.s), dh = Math.abs(l.h - n.h), dp = Math.abs(l.p - n.p);
    // V3.2.2: o app de referência (v1) não conhece os Anexos de 2027–2028 (Res. CGSN 190/2026): na 6ª faixa (RBT12 > R$ 3,6 mi) a alíquota nominal é
    // 0,10 p.p. menor. Esses casos devem divergir somente por essa diferença (Simples e Híbrido ≤ 0,1% da receita anual, Presumido idêntico).
    if (dh > 0.05) hibDiv++;
    const c = cases[i], rb = c.rbt12Modo === 'auto' ? c.fat * 12 : c.rbt12Manual;
    const esperada = rb > 3600000 && ds > 0.05;   // v3.2.5: 6ª faixa de qualquer ano recebe o acréscimo de ICMS/ISS/IBS (art. 21, IV); o app v1 não o conhece
    if (esperada) {
      const lim = 0.08 * 12 * c.fat + 0.05; expected++;   // acréscimo máximo ≈ 7,3% da receita (Anexo IV, 5ª faixa) menos 0,1 p.p. na 6ª faixa de 2027–28
      if (!(n.s - l.s >= -(0.001 * 12 * c.fat + 0.05) && ds <= lim && dp <= 0.05) || l.anexo !== n.anexo || l.ativ !== n.ativ) { bad++; console.log('DIFF inesperada (6ª faixa)', i, JSON.stringify(c), JSON.stringify(l), JSON.stringify(n)); }
      return;
    }
    const d = Math.max(ds, dp); maxd = Math.max(maxd, d);
    if (d > 0.05 || l.anexo !== n.anexo || l.ativ !== n.ativ) { bad++; if (bad <= 8) console.log('DIFF', i, JSON.stringify(cases[i]), JSON.stringify(l), JSON.stringify(n)); }
  });
  console.log(`casos: ${cases.length} · divergências: ${bad} · maior diferença absoluta (casos sem 6ª faixa): R$ ${maxd.toFixed(4)} · divergências esperadas só pela 6ª faixa (acréscimo do art. 21, IV): ${expected} · Híbrido divergente por desenho (art. 22-A): ${hibDiv} (comparação do Híbrido não faz parte da paridade)`);
  await b.close(); srv.close(); await t.close(); if (bad) process.exitCode = 1;
})();
