// V3.2.4 — elegibilidade legal antes do custo: exclusão retroativa, sublimite de ICMS/ISS/IBS, separação elegível / com restrição / inaplicável / preliminar.
// Base legal: LC 123/2006, art. 3º, §§ 2º, 9º, 9º-A, 10 a 13 e art. 13-A; Res. CGSN 140/2018, art. 12 (redação da Res. CGSN 190/2026).
// Os valores esperados são calculados AQUI, a partir do texto das normas (limite proporcional R$ 400 mil × meses; sublimite R$ 300 mil × meses; margem de 20%), sem usar o motor.
const { open } = require('./lib');
const { ok, goto } = require('./helpers');
(async () => {
  const t = await open({ viewport: { width: 1366, height: 1000 }, port: 8896 }); const { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);

  /* ===== 1. Empresa nova, R$ 1,5 mi em 3 meses, abertura de jan a dez/2027 ===== */
  const MX = await page.evaluate(() => {
    const out = [];
    for (let mi = 1; mi <= 12; mi++) {
      resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = mi; state.periodo.meses = 3;
      state.periodo.receitaModo = 'total'; state.periodo.receitaTotal = 1500000; state.fatorR.modo = 'nenhuma';
      const r = computeAll(), sb = r.simples.sublimiteAv, RI = recomendacaoInfo(r);
      out.push({ mi, estados: r.regimes.map((x) => x.estado), incompleto: r.regimes.map((x) => x.incompleto), elegivel: r.regimes.map((x) => x.elegivel), tot: r.regimes.map((x) => Math.round(x.total * 100) / 100),
        rec: r.recomendacao, melhor: r.melhor && r.melhor.id, melhorRef: r.melhorReferencia && r.melhorReferencia.id, economia: r.economia, sb: { n: sb.mesesAfetados, sub: sb.porSublimite, f6: sb.porFaixa6, retro: sb.retroativo }, ex: { s: r.simples.excesso.situacao, retro: r.simples.excesso.retroativo, integral: r.simples.excesso.integral },
        ids: r.pendencias.map((p) => p.id), motivos: r.conclusao.motivos, estadoConclusao: r.conclusao.estado, RI: RI && RI.curto, ref: r.regimes[2].referenciaGeral });
    }
    return out;
  });
  const falhas = [];
  for (const x of MX) {
    const m = 13 - x.mi, rec = 500000 * Math.min(3, m);
    const geralRetro = rec > 400000 * m * 1.2 - 1e-6 || (rec > 400000 * m && (rec / (400000 * m) - 1) > 0.2 + 1e-9);   // excesso do limite proporcional acima de 20% → retroativo (art. 3º, § 10)
    const subPct = rec / (300000 * m) - 1, subRetro = subPct > 0.2 + 1e-9;                                              // sublimite proporcional acima de 20% → retroativo (Res. 140, art. 12, § 4º, I)
    let esperado;
    if (geralRetro) esperado = { estados: ['inaplicavel', 'inaplicavel', 'elegivel'], motivo: 'exclusao-retroativa' };
    else esperado = { estados: ['restricao', 'restricao', 'elegivel'], motivo: 'total-incompleto' };  // jan–set: restrição por total incompleto (3º mês na 6ª faixa; em set também sublimite retroativo)
    if (JSON.stringify(x.estados) !== JSON.stringify(esperado.estados)) falhas.push(['estados', x.mi, x.estados, esperado.estados]);
    if (x.rec.estado !== 'inconclusivo' || x.rec.motivos.join() !== esperado.motivo) falhas.push(['recomendação', x.mi, x.rec]);
    if (x.melhor !== null || x.rec.regimeId !== null || x.economia !== null) falhas.push(['recomendou algo', x.mi, x.melhor]);
    if (x.mi === 9 && !(x.sb.retro && x.sb.n === 3 && subRetro)) falhas.push(['set: sublimite retroativo', x.sb]);
    if (x.mi <= 8 && !(x.sb.n === 1 && x.sb.f6 === 1 && x.sb.sub === 0)) falhas.push(['jan–ago: só o 3º mês na 6ª faixa', x.mi, x.sb]);
    if (x.mi >= 10 && !(x.ex.retro && x.ex.integral && x.ref === true)) falhas.push(['out–dez: exclusão retroativa integral', x.mi, x.ex]);
    if (!x.ids.includes('comparativo-inconclusivo') || !x.ids.includes('sublimite')) falhas.push(['pendências', x.mi, x.ids]);
    if (x.estadoConclusao !== 'preliminar' || !x.motivos.some((s) => /comparativo inconclusivo/.test(s))) falhas.push(['conclusão', x.mi, x.motivos]);
  }
  ok('R$ 1,5 mi em 3 meses (empresa nova), abertura jan–dez/2027: nunca recomenda Simples nem Híbrido; comparativo inconclusivo em todos os 12 meses (jan–set por total incompleto; out–dez por exclusão retroativa)', falhas.length === 0 && MX.length === 12, falhas.slice(0, 4));
  const S = MX.filter((x) => x.mi === 9)[0], O = MX.filter((x) => [10, 11, 12].includes(x.mi));
  ok('Setembro/2027: limite geral R$ 1,6 mi respeitado, mas sublimite R$ 1,2 mi excedido em 25% (> 20%) → impedimento retroativo de ICMS/ISS/IBS; Simples e Híbrido "com restrição" (total incompleto), não inaplicáveis', S.estados.slice(0, 2).every((e) => e === 'restricao') && S.incompleto[0] && S.incompleto[1] && S.sb.retro && S.ex.s === 'regular', S);
  ok('Outubro, novembro e dezembro/2027: excesso de 25% do limite proporcional (R$ 1,2 mi / 800 mil / 400 mil) → exclusão retroativa: Simples e Híbrido inaplicáveis, fora da concorrência (elegivel=false); Lucro Presumido é a regra geral de referência', O.every((x) => x.estados[0] === 'inaplicavel' && x.estados[1] === 'inaplicavel' && x.elegivel[0] === false && x.elegivel[1] === false && x.elegivel[2] === true && x.melhorRef === 'presumido'), O.map((x) => x.estados));
  ok('Aberturas de out–dez: valores calculados do Simples (R$ 167.000) e do Híbrido (R$ 269.975,40) permanecem iguais à v3.2.3 — mudou só a elegibilidade e a recomendação', O.every((x) => x.tot[0] === 167000 && x.tot[1] === 269975.4), O.map((x) => x.tot));

  /* ===== 2. Lógica de decisão (função pura) com casos sintéticos ===== */
  const D = await page.evaluate(() => {
    const R = (id, total, estado, extra) => Object.assign({ id, label: id, total, estado: estado || 'elegivel', elegivel: estado !== 'inaplicavel', incompleto: false }, extra || {});
    const ex0 = { integral: false, retroativo: false, parcial: false };
    const d = (rs, ex) => { const o = decidirRecomendacao(rs, ex || ex0); return { e: o.recomendacao.estado, m: o.recomendacao.motivos, id: o.recomendacao.regimeId, melhor: o.melhor && o.melhor.id, inc: o.recomendacao.incompletos }; };
    return {
      normal: d([R('simples', 100), R('hibrido', 150), R('presumido', 120)]),
      incompletoGanha: d([R('simples', 100, 'restricao', { incompleto: true }), R('hibrido', 150, 'restricao', { incompleto: true }), R('presumido', 120)]),
      incompletoPerde: d([R('simples', 130, 'restricao', { incompleto: true }), R('hibrido', 150, 'restricao', { incompleto: true }), R('presumido', 120)]),
      restricaoSemIncompleto: d([R('simples', 100, 'restricao'), R('hibrido', 150, 'restricao'), R('presumido', 120)]),
      retro: d([R('simples', 100, 'inaplicavel'), R('hibrido', 150, 'inaplicavel'), R('presumido', 120)], { integral: true, retroativo: true, parcial: false }),
      integralNaoRetro: d([R('simples', 100, 'inaplicavel'), R('hibrido', 150, 'inaplicavel'), R('presumido', 120)], { integral: true, retroativo: false, parcial: false }),
      misto: d([R('simples', 100, 'restricao', { elegivel: false }), R('hibrido', 150, 'restricao', { elegivel: false }), R('presumido', 120)], { integral: false, retroativo: false, parcial: true }),
      nenhum: d([R('simples', 100, 'inaplicavel'), R('hibrido', 150, 'inaplicavel'), R('presumido', 120, 'inaplicavel')], { integral: true, retroativo: false, parcial: false }),
    };
  });
  ok('Decisão: todos elegíveis → conclusiva, vence o menor custo (Simples)', D.normal.e === 'conclusivo' && D.normal.melhor === 'simples', D.normal);
  ok('Decisão: regime com total incompleto MENOR que o melhor completo → inconclusiva (não pode ser chamado de mais vantajoso nem descartado)', D.incompletoGanha.e === 'inconclusivo' && D.incompletoGanha.m.join() === 'total-incompleto' && D.incompletoGanha.melhor === null && D.incompletoGanha.inc.join() === 'simples', D.incompletoGanha);
  ok('Decisão: regime com total incompleto (valor mínimo) MAIOR que o melhor completo → conclusiva (Presumido), pois mesmo o mínimo já perde', D.incompletoPerde.e === 'conclusivo' && D.incompletoPerde.melhor === 'presumido', D.incompletoPerde);
  ok('Decisão: restrição sem total incompleto (ex.: excesso com efeito futuro) continua competindo normalmente', D.restricaoSemIncompleto.e === 'conclusivo' && D.restricaoSemIncompleto.melhor === 'simples', D.restricaoSemIncompleto);
  ok('Decisão: exclusão retroativa → inconclusiva; Simples e Híbrido nunca recomendados', D.retro.e === 'inconclusivo' && D.retro.m.join() === 'exclusao-retroativa' && D.retro.melhor === null, D.retro);
  ok('Decisão: exclusão em vigor em todo o período, mas sem retroação → Simples/Híbrido inaplicáveis e o Presumido é recomendado', D.integralNaoRetro.e === 'conclusivo' && D.integralNaoRetro.melhor === 'presumido', D.integralNaoRetro);
  ok('Decisão: regime misto (Simples só até certo mês) → inconclusiva; nenhum regime aplicável → indisponível', D.misto.e === 'inconclusivo' && D.misto.m.join() === 'regime-misto' && D.nenhum.e === 'indisponivel', [D.misto, D.nenhum]);

  /* ===== 3. Sublimite fora do ano de início ===== */
  let G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'existente'; state.empresa.anoAnalise = 2027; state.empresa.faturamentoMensal = 340000; state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 340000 * 12;
    state.simples.anexoModo = 'manual'; state.simples.anexoManual = 'III'; state.periodo.rbt12Movel = false;
    const r = computeAll();
    return { sb: r.simples.sublimiteAv.mesesAfetados, f6: r.simples.sublimiteAv.porFaixa6, est: r.regimes.map((x) => x.estado), tot: r.regimes.map((x) => Math.round(x.total)), rec: r.recomendacao, ids: r.pendencias.map((p) => p.id) };
  });
  ok('Empresa existente com RBT12 de R$ 4,08 mi (6ª faixa) em 2027: 12 meses sem ISS/ICMS/IBS no DAS → Simples e Híbrido "com restrição"; Simples (R$ 694 mil) abaixo do Presumido → comparativo inconclusivo; Híbrido (acima do Presumido) não é o motivo', G.sb === 12 && G.f6 === 12 && G.est.slice(0, 2).every((e) => e === 'restricao') && G.rec.estado === 'inconclusivo' && G.rec.incompletos.join() === 'simples' && G.ids.includes('sublimite'), G);
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'existente'; state.empresa.anoAnalise = 2027; state.empresa.faturamentoMensal = 300000; state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 3600000;
    state.simples.anexoModo = 'manual'; state.simples.anexoManual = 'III'; state.periodo.rbt12Movel = false;
    const r = computeAll(); return { sb: r.simples.sublimiteAv.mesesAfetados, est: r.regimes.map((x) => x.estado), rec: r.recomendacao.estado, melhor: r.melhor && r.melhor.id, ids: r.pendencias.map((p) => p.id) };
  });
  ok('Empresa existente com RBT12 de exatamente R$ 3,6 mi (5ª faixa; limite não excedido): sem restrição, recomendação conclusiva, sem alerta de sublimite', G.sb === 0 && G.est.every((e) => e === 'elegivel') && G.rec === 'conclusivo' && G.melhor === 'simples' && !G.ids.includes('sublimite'), G);
  // Início de atividade, excesso de até 20% do sublimite (R$ 330 mil × 6 meses = R$ 1,98 mi contra R$ 1,8 mi): efeito só a partir de 2028; 2027 não é "retroativo"
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 7; state.periodo.meses = 8;
    state.periodo.receitaModo = 'variavel'; state.periodo.receitasMes = Array(8).fill(330000); state.fatorR.modo = 'nenhuma';
    const r = computeAll(), sb = r.simples.sublimiteAv, ev = sb.eventos[0];
    return { ev: ev && { acima20: ev.acima20, retro: ev.retro, pct: +(ev.pct * 100).toFixed(2), idx: ev.idx }, retro: sb.retroativo, ex: r.simples.excesso.situacao };
  });
  ok('Início de atividade em jul/2027, R$ 330 mil/mês: excesso de 10% do sublimite proporcional (R$ 1,98 mi × R$ 1,8 mi) NÃO é retroativo; impedimento só a partir de jan/2028 (índice 6 do período)', G.ev && G.ev.acima20 === false && G.ev.retro === false && G.ev.pct === 10 && G.ev.idx === 6 && G.retro === false, G);

  /* ===== 4. Casos limpos continuam conclusivos (regressão de comportamento) ===== */
  G = await page.evaluate(() => {
    resetState(); state.analise.tipo = 'existente'; state.empresa.anoAnalise = 2027; state.empresa.faturamentoMensal = 40000; state.empresa.rbt12Modo = 'manual'; state.empresa.rbt12Manual = 480000; state.empresa.folha12m = 60000;
    const r = computeAll(); return { est: r.regimes.map((x) => x.estado), rec: r.recomendacao.estado, melhor: r.melhor && r.melhor.id, cat: categoriasRegimesTexto(r) };
  });
  ok('Empresa existente comum (R$ 40 mil/mês): três regimes elegíveis, recomendação conclusiva (Simples Nacional)', G.est.every((e) => e === 'elegivel') && G.rec === 'conclusivo' && G.melhor === 'simples' && /Elegível: Simples Nacional, Simples Híbrido, Lucro Presumido · Com restrição: nenhum · Inaplicável: nenhum/.test(G.cat), G);

  /* ===== 5. Telas e relatórios ===== */
  await page.evaluate(() => { resetState(); state.analise.tipo = 'avulsa'; state.periodo.empresaAvulsa = 'nova'; state.empresa.anoAnalise = 2027; state.periodo.mesInicio = 10; state.periodo.meses = 3; state.periodo.receitaModo = 'total'; state.periodo.receitaTotal = 1500000; state.fatorR.modo = 'nenhuma'; });
  await goto(page, 'resultados');
  let U = await page.evaluate(() => ({
    hero: document.querySelector('.hero').innerText, cards: [...document.querySelectorAll('.regime')].map((c) => c.innerText.replace(/\s+/g, ' ')), best: document.querySelectorAll('.regime.best').length,
    alerts: (document.querySelector('.alerts') || { innerText: '' }).innerText,
  }));
  ok('Tela (out/2027): destaque "Comparativo inconclusivo", sem "Menor custo estimado", com a separação Elegível / Com restrição / Inaplicável', /Comparativo inconclusivo/i.test(U.hero) && !/Menor custo estimado/i.test(U.hero) && /Elegível: Lucro Presumido · Com restrição: nenhum · Inaplicável: Simples Nacional, Simples Híbrido/.test(U.hero), U.hero);
  ok('Tela (out/2027): nenhum cartão com "Menor custo"; Simples e Híbrido "Inaplicável · exclusão retroativa" com valor marcado como cálculo de referência; Presumido "Regra geral · referência"', U.best === 0 && U.cards.slice(0, 2).every((c) => /Inaplicável · exclusão retroativa/.test(c) && /Cálculo de referência · não é custo aplicável/.test(c)) && /Regra geral · referência/.test(U.cards[2]) && !U.cards.some((c) => /Menor custo/.test(c)), U.cards);
  ok('Tela (out/2027): ponto de atenção "Comparativo inconclusivo" e identificação das regras gerais desde a abertura', /Comparativo inconclusivo/.test(U.alerts), U.alerts.slice(0, 600));
  const P = await page.evaluate(() => {
    const r = computeAll(); const j = (a) => JSON.stringify(a);
    const resumo = buildResumoExecutivoSlideDefs(r).map((d) => d.body).join('\n'), compl = buildApresentacaoCompletaSlideDefs(r).map((d) => d.body).join('\n');
    const mem = buildMemoriaPages(r).map((d) => d.body).join('\n');
    const mx = montarMemoria(r).map((m) => m.titulo + ' ' + m.formula + ' ' + m.detalhe).join('\n');
    const T = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return { resumo: T(resumo), compl: T(compl), mem: T(mem), mx: T(mx) };
  });
  ok('PDF Resumo (out/2027): "Comparativo inconclusivo", "exclusão retroativa" e "regras gerais desde a abertura"; sem selo "Menor custo"', /Comparativo inconclusivo/.test(P.resumo) && /retroativ/.test(P.resumo) && /regras gerais desde a abertura/.test(P.resumo) && !/Menor custo</.test(P.resumo) && !/Menor custo\s+R\$/.test(P.resumo), P.resumo.slice(0, 500));
  ok('PDF Completa e Memória Técnica (out/2027): mesmo aviso; regimes inaplicáveis com "Referência, não aplicável" / situação "Inaplicável"', /Comparativo inconclusivo/.test(P.compl) && /Referência, não aplicável/.test(P.compl) && /Inaplicável/.test(P.mem) && /Elegibilidade legal e recomendação/.test(P.mx) && /INCONCLUSIVA/.test(P.mx), [P.compl.slice(0, 200), P.mem.slice(0, 200), P.mx.slice(0, 300)]);

  /* ===== 6. Fontes ===== */
  const F = await page.evaluate(() => FONTES.map((x) => ({ n: x.nome, f: x.fonte, s: x.status })));
  const f = (re) => F.filter((x) => re.test(x.n + ' ' + x.f));
  ok('Fontes: sublimite (art. 13-A; Res. 140, art. 12) e exclusão retroativa no início de atividade (art. 3º, §§ 10 e 12) registrados como oficiais; app declara que não calcula os tributos fora do DAS', f(/art\. 12, caput/).some((x) => x.s === 'oficial' && /não calcula/.test(x.f)) && f(/§§ 2º, 9º, 9º-A, 10 e 12/).some((x) => x.s === 'oficial') && !F.some((x) => /apenas ALERTA/.test(x.n)), f(/sublimite/i).length);
  ok('Sem erros de console', errors.length === 0, errors);
  await t.close();
})();
