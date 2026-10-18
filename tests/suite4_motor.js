// Suíte 4 — Correções tributárias da V3.1: Fator R, empresa nova, limites/exclusão do Simples,
// IRPJ trimestral, comparativos, conclusões, IBS/CBS e parâmetros de INSS/IRRF.
const { open } = require('./lib');
const { ok } = require('./helpers');
(async () => {
  const t = await open(); const { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA && CNAE_DATA.subclasses, null, { timeout: 15000 });
  // monta um cenário completo a partir de um objeto parcial e devolve um resumo do resultado
  const cen = (o) => page.evaluate((o) => {
    const b = estadoPadrao();
    const snap = {
      analise: Object.assign(b.analise, { tipo: o.tipo || 'existente', regimeAtual: o.regimeAtual || null, nome: 'Teste' }),
      periodo: Object.assign(b.periodo, o.periodo || {}),
      empresa: Object.assign(b.empresa, { anoAnalise: 2027 }, o.empresa || {}),
      fatorR: Object.assign(b.fatorR, o.fatorR || {}),
      presumido: Object.assign(b.presumido, o.presumido || {}),
      ibscbs: b.ibscbs, hibrido: Object.assign(b.hibrido, o.hibrido || {}), simples: b.simples, equilibrio: b.equilibrio, classificacaoComplementos: {}, confirmados: o.confirmados || {}, comparativo: b.comparativo,
    };
    const code = o.cnae === undefined ? '6201' : o.cnae;
    snap.empresa.cnae = code ? CNAE_DATA.subclasses.find((c) => c.codigo.indexOf(code) === 0) : null;
    aplicarInputs(snap);
    const r = computeAll();
    const F = r.fatorRComp, ex = r.simples.excesso;
    return {
      n: r.meta.nMeses, nova: r.meta.nova, hist: r.meta.hist, periodo: r.meta.periodo, anexoKey: r.anexoKey,
      reg: r.regimes.map((x) => ({ id: x.id, t: x.total, el: x.elegivel, sit: x.situacao, vedados: x.mesesVedados, validoAte: x.validoAte, estado: x.estado, inc: x.incompleto })), rec: r.recomendacao,
      melhor: r.melhor && r.melhor.id, economia: r.economia, conclusao: r.conclusao, confianca: r.confianca,
      ex: { s: ex.situacao, pct: ex.pctExcesso, tipo: ex.tipoEfeito, vedados: ex.mesesVedados, integral: ex.integral, parcial: ex.parcial, futuro: ex.futuro, estimado: ex.estimado, efeito: ex.efeitoRotulo },
      lp: { parcial: r.presumido.parcial, tr: r.presumido.trimestres.map((q) => ({ r: q.rotulo, c: q.mesesCount, ap: q.mesesApuracao, lim: q.limiteAdicional, adic: q.t.irpjAdicional, parcial: q.parcial, base: q.t.baseIRPJ, total: q.total })), cbs: r.presumido.cbs, algumCbs: r.presumido.algumSubstituidoPorCbs },
      F: F.aplicavel ? { necMensal: F.folhaNecMensal, necPeriodo: F.folhaNecPeriodo, comMensal: F.com.folha.mensal, comMeses: F.com.ag.meses.map((m) => ({ f12: m.folha12, rbt: m.rbt12, fr: m.fatorR, anexo: m.anexoUsado })), atualMensal: F.folhaAtualMensal, dif: F.difMensal, ref: F.referencia, rotulo: F.economiaRotulo, economia: F.economia, vant: F.vantagemLiquida, vantEst: F.vantagemEstimada, enq: F.enquadraEm, ja: F.jaEnquadrado, inss: F.inssInc, irrf: F.irrfInc, pl: F.proLaboreTotalMensal, compensa: F.compensa } : null,
      pend: r.pendencias.map((p) => p.id), pendNivel: r.pendencias.map((p) => [p.id, p.nivel]), ress: r.ressalvas,
      hibCbsRef: r.hibrido.cbsRefPct, hibAnos: r.hibrido.anos, hibTotal: r.hibrido.total, hibDasSem: r.hibrido.dasSemIbsCbs,
    };
  }, o);
  const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;

  /* ============ FATOR R ============ */
  // F1 — folha necessária EXIBIDA = folha USADA na simulação (RBT12 manual diferente de receita × 12)
  let c = await cen({ empresa: { faturamentoMensal: 300000, rbt12Modo: 'manual', rbt12Manual: 6000000, folha12m: 0 } });
  ok('F1: folha necessária exibida = 28% × RBT12/12 (140.000), não 28% × receita (84.000)', near(c.F.necMensal, 140000.01), c.F.necMensal);
  ok('F1: folha exibida = folha usada na simulação "com Fator R" em todos os meses', c.F.comMensal.every((v) => near(v, c.F.necMensal, 0.001)) && near(c.F.necPeriodo, c.F.necMensal * c.n, 0.01), c.F.comMensal.slice(0, 2));
  ok('F1: com a folha necessária o Fator R simulado é ≥ 28% (Anexo III) em todos os meses', c.F.comMeses.every((m) => m.fr >= 0.28 - 1e-9 && m.anexo === 'III'), c.F.comMeses[0]);
  // F1b — receita variável / janela móvel
  c = await cen({ periodo: { receitaModo: 'variavel', receitasMes: [10000, 50000, 20000, 90000, 30000, 60000, 15000, 80000, 25000, 70000, 40000, 100000], rbt12Movel: true }, empresa: { rbt12Modo: 'manual', rbt12Manual: 0, folha12m: 0 } });
  ok('F1b: variável — necessária exibida (média) = média da folha usada', near(c.F.necMensal, c.F.comMensal.reduce((a, b) => a + b, 0) / 12, 0.001), c.F.necMensal);
  // F2 — histórico: com folha anterior zero e janela móvel, o enquadramento NÃO é imediato (histórico pesa)
  c = await cen({ periodo: { rbt12Movel: true }, empresa: { faturamentoMensal: 100000, rbt12Modo: 'manual', rbt12Manual: 1200000, folha12m: 0 } });
  ok('F2: com histórico de folha zero, o Fator R de 28% não é imediato (janela de 12 meses)', c.F.enq.imediato === false && (c.F.enq.idx === null || c.F.enq.idx > 0) && c.F.enq.fatorInicial < 0.28, c.F.enq);
  ok('F2: partindo da folha histórica (0%) o 1º mês da trajetória real é Fator R 0% (cenário "com Fator R" é o alvo: folha já no nível necessário)', c.F.enq.fatorInicial === 0 && c.F.comMeses[0].fr >= 0.28 - 1e-9, { enq: c.F.enq, com0: c.F.comMeses[0] });
  // F2b — com folha histórica já a 28%, o enquadramento é imediato e dif = 0
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 } });
  ok('F2b: folha informada = 28% → já enquadrado, diferença 0, sem pró-labore adicional', c.F.ja && c.F.dif === 0 && c.F.inss === 0 && c.F.irrf === 0, c.F);
  // F3 — sem folha informada: referência = cenário sem folha → "diferença potencial", não "economia"
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 0 } });
  ok('F3: sem folha → referência "sem-folha" e rótulo "Diferença potencial entre cenários"', c.F.ref === 'sem-folha' && c.F.rotulo === 'Diferença potencial entre cenários', c.F);
  ok('F3: necessária 28% × 30.000 = 8.400/mês; pró-labore estimado = 8.400', near(c.F.necMensal, 8400.01) && near(c.F.pl, 8400.01), c.F);
  ok('F3: vantagem líquida marcada como ESTIMATIVA (premissas não confirmadas)', c.F.vantEst === true);
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 40000 } });
  ok('F3b: com folha informada abaixo de 28% → referência "folha-informada" e rótulo "Economia tributária potencial"', c.F.ref === 'folha-informada' && c.F.rotulo === 'Economia tributária potencial' && c.F.dif > 0, c.F);
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 0 }, confirmados: { 'encargos-folha': true } });
  ok('F3c: confirmadas as premissas de encargos, a vantagem deixa de ser "estimada"', c.F.vantEst === false);
  // F4 — empresa nova: regras de início de atividade
  c = await cen({ tipo: 'nova', empresa: { faturamentoMensal: 30000 } });
  ok('F4: nova — folha necessária = 28% da receita proporcional; Fator R ≥ 28% desde o 1º mês', near(c.F.necMensal, 8400.01) && c.F.comMeses[0].fr >= 0.28 - 1e-9 && c.F.comMeses[0].rbt >= 359999, c.F.comMeses[0]);
  ok('F4: nova — Fator R de início de atividade marcado como HIPÓTESE', c.confianca.simples.nivel === 'hipotese' && c.pend.includes('fatorr-inicio'), c.confianca.simples);
  ok('F4: nova — RBT12 proporcional no 1º mês (receita × 12)', c.hist.nova && c.hist.rbt12 === 0);

  /* ============ SIMPLES — limites e exclusão ============ */
  // S1 — RBA do ano 6,0 mi (25% acima), cruza 20% em dez/2027; período de 12 meses: efeito vem DEPOIS
  c = await cen({ empresa: { faturamentoMensal: 500000, rbt12Modo: 'manual', rbt12Manual: 6000000, folha12m: 1680000 } });
  ok('S1: excesso >20% só no último mês → efeito após o período; Simples CONTINUA elegível', c.ex.s === 'excesso-acima20' && c.ex.futuro && c.ex.vedados === 0 && c.reg.find((x) => x.id === 'simples').el === true, c.ex);
  ok('S1: atenção "limite-simples" presente e regime marcado "excesso-futuro"', c.pendNivel.some((p) => p[0] === 'limite-simples' && p[1] === 'atencao') && c.reg[0].sit === 'excesso-futuro', c.reg[0]);
  ok('S1: conclusão preliminar? não — Simples segue válido no período', c.conclusao.motivos.every((m) => !/Simples/.test(m)), c.conclusao);
  // S1b — período de 18 meses: >20% já produz efeito DENTRO do período (mês seguinte à ultrapassagem)
  c = await cen({ periodo: { meses: 18 }, empresa: { faturamentoMensal: 500000, rbt12Modo: 'manual', rbt12Manual: 6000000, folha12m: 1680000 } });
  ok('S1b: >20% dentro do período → meses vedados a partir do mês seguinte à ultrapassagem (jan/2028)', c.ex.s === 'excesso-acima20' && c.ex.tipo === 'mes-seguinte' && c.ex.parcial && c.ex.efeito === 'jan/2028' && c.ex.vedados === 6, c.ex);
  // V3.2.4: regime misto (Simples só até dez/2027) → Simples/Híbrido "com restrição", fora do ranking, e o comparativo é inconclusivo (custo misto não calculado)
  ok('S1b: Simples/Híbrido saem do ranking (parcial, "com restrição"); sem recomendação (comparativo inconclusivo: regime misto)', c.reg[0].el === false && c.reg[0].sit === 'vedado-parcial' && c.reg[0].estado === 'restricao' && c.reg[0].validoAte === 'dez/2027' && c.melhor === null && c.rec.estado === 'inconclusivo' && c.rec.motivos.includes('regime-misto'), [c.reg, c.rec]);
  ok('S1b: conclusão marcada preliminar por causa do excesso', !c.conclusao.definitiva && c.conclusao.motivos.some((m) => /Simples/.test(m)), c.conclusao);
  // S2 — excesso ≤ 20%: efeitos em 1º de janeiro do ano seguinte
  c = await cen({ empresa: { faturamentoMensal: 410000, rbt12Modo: 'manual', rbt12Manual: 4920000, folha12m: 1377600 } });
  ok('S2: excesso de 2,5% (≤20%) em 12 meses → efeito só em jan/2028, depois do período; Simples elegível', c.ex.s === 'excesso-ate20' && c.ex.tipo === 'ano-seguinte' && c.ex.vedados === 0 && c.reg[0].el === true && Math.abs(c.ex.pct - 2.5) < 0.01, c.ex);
  c = await cen({ periodo: { meses: 18 }, empresa: { faturamentoMensal: 410000, rbt12Modo: 'manual', rbt12Manual: 4920000, folha12m: 1377600 } });
  ok('S2b: excesso ≤20% com 18 meses → vedados só os 6 meses de 2028 (1º de janeiro do ano seguinte)', c.ex.s === 'excesso-ate20' && c.ex.vedados === 6 && c.ex.efeito === 'jan/2028', c.ex);
  // S3 — empresa nova, início de atividade (out/2027), R$ 1,5 mi em 3 meses → limite 400k×3 = 1,2 mi, +25% → retroativo
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'nova', receitaModo: 'total', receitaTotal: 1500000, meses: 3, mesInicio: 10 } });
  ok('S3: nova, 1,5 mi em out–dez: excesso de 25% (>20%) → exclusão RETROATIVA à abertura (todo o período)', c.ex.s === 'excesso-acima20' && c.ex.tipo === 'retroativo' && c.ex.integral && c.ex.vedados === 3 && Math.abs(c.ex.pct - 25) < 0.01, c.ex);
  // V3.2.4: exclusão retroativa → Simples/Híbrido inaplicáveis; regras gerais desde a abertura; comparativo inconclusivo (efeitos não calculados), sem recomendar regime
  ok('S3: Simples/Híbrido inaplicáveis (exclusão retroativa); comparativo inconclusivo e nenhum regime recomendado', c.reg[0].sit === 'vedado' && c.reg[0].estado === 'inaplicavel' && c.reg[1].estado === 'inaplicavel' && c.reg[1].el === false && c.melhor === null && c.rec.estado === 'inconclusivo' && c.rec.motivos.includes('exclusao-retroativa') && c.rec.inaplicaveis.length === 2 && c.rec.elegiveis.length === 1, [c.reg, c.rec]);
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'nova', receitaModo: 'total', receitaTotal: 1300000, meses: 3, mesInicio: 10 } });
  ok('S3b: nova, 1,3 mi (8,3% acima de 1,2 mi) → efeito só em 1º de janeiro seguinte; Simples elegível no período', c.ex.s === 'excesso-ate20' && c.ex.tipo === 'ano-seguinte' && c.ex.vedados === 0 && c.reg[0].el, c.ex);
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'nova', receitaModo: 'total', receitaTotal: 1500000, meses: 3, mesInicio: 1 } });
  ok('S3c: nova começando em jan (limite 4,8 mi) com 1,5 mi → sem excesso', c.ex.s === 'regular' && c.reg[0].el, c.ex);
  // S4 — avulsa de empresa EXISTENTE: não anualiza e usa a receita acumulada do ano (RBA)
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'existente', receitaModo: 'total', receitaTotal: 1500000, meses: 3, mesInicio: 1, rbt12Historico: 3000000 } });
  ok('S4: avulsa existente 1,5 mi em jan–mar com RBT12 anterior 3,0 mi → sem excesso (RBA do ano = 1,5 mi)', c.ex.s === 'regular' && c.reg[0].el && !c.nova, c.ex);
  ok('S4: avulsa existente — usa o RBT12 informado como histórico (não anualiza a operação)', c.hist.rbt12 === 3000000 && c.hist.origem === 'manual');
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'existente', receitaModo: 'total', receitaTotal: 1500000, meses: 3, mesInicio: 10, rbt12Historico: 4800000 } });
  ok('S4b: avulsa existente out–dez, RBT12 anterior 4,8 mi → RBA do ano estimada 5,1 mi (6,25% >4,8 mi): efeito em 2028, após o período', c.ex.s === 'excesso-ate20' && c.ex.estimado && c.ex.vedados === 0, c.ex);
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'existente', receitaModo: 'total', receitaTotal: 1500000, meses: 3, mesInicio: 1, rbt12Historico: null } });
  ok('S4c: avulsa existente SEM histórico → pendência essencial e resultado preliminar (não conclusivo)', c.pend.includes('rbt12Historico') && !c.conclusao.definitiva && c.conclusao.motivos.some((m) => /RBT12/.test(m)), c.conclusao);
  // S5 — caso normal
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 } });
  ok('S5: caso normal → situação regular, Simples elegível e menor custo', c.ex.s === 'regular' && c.reg.every((x) => x.sit === 'regular') && c.melhor === 'simples');

  /* ============ LUCRO PRESUMIDO — IRPJ trimestral ============ */
  // L1 — existente, simulação de 2 meses dentro do trimestre: o limite do adicional NÃO encolhe
  c = await cen({ periodo: { meses: 2, mesInicio: 2, receitaModo: 'constante' }, empresa: { faturamentoMensal: 250000, rbt12Modo: 'manual', rbt12Manual: 3000000, folha12m: 840000 } });
  ok('L1: existente, fev–mar (2 de 3 meses): limite do adicional continua R$ 60.000', c.lp.tr.length === 1 && c.lp.tr[0].lim === 60000 && c.lp.tr[0].ap === 3 && c.lp.tr[0].c === 2, c.lp.tr);
  ok('L1: adicional = (500k × 32% − 60k) × 10% = 10.000 (e não 12.000 com limite proporcional)', near(c.lp.tr[0].adic, 10000, 0.005), c.lp.tr[0]);
  ok('L1: trimestre incompleto → "estimativa parcial" (pendência e confiança)', c.lp.parcial && c.pend.includes('lp-parcial') && c.confianca.presumido.nivel === 'estimativa' && c.confianca.presumido.motivos.some((m) => /parcial/.test(m)), c.confianca.presumido);
  ok('L1: resultado marcado preliminar por trimestre incompleto', !c.conclusao.definitiva && c.conclusao.motivos.some((m) => /trimestre incompleto/.test(m)), c.conclusao);
  ok('L1: ressalva cita estimativa parcial', c.ress.some((x) => /estimativa parcial/i.test(x)), c.ress);
  // L2 — empresa NOVA começando em fev: o trimestre de início tem apuração de 2 meses (limite 40.000), sem parcial
  c = await cen({ tipo: 'nova', periodo: { meses: 2, mesInicio: 2 }, empresa: { faturamentoMensal: 250000 } });
  ok('L2: nova, início em fev, 2 meses: limite proporcional R$ 40.000 (período de apuração = 2 meses)', c.lp.tr[0].lim === 40000 && c.lp.tr[0].ap === 2 && !c.lp.tr[0].parcial, c.lp.tr[0]);
  ok('L2: adicional = (160k − 40k) × 10% = 12.000', near(c.lp.tr[0].adic, 12000, 0.005), c.lp.tr[0]);
  // L3 — nova começando em jan, só 1 mês simulado: apuração de 3 meses, 1 coberto → parcial, limite 60.000
  c = await cen({ tipo: 'nova', periodo: { meses: 1, mesInicio: 1 }, empresa: { faturamentoMensal: 250000 } });
  ok('L3: nova, jan, 1 mês: limite R$ 60.000 e estimativa parcial', c.lp.tr[0].lim === 60000 && c.lp.tr[0].parcial, c.lp.tr[0]);
  // L4 — 12 meses a partir de jan: trimestres completos
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 } });
  ok('L4: 12 meses a partir de jan: 4 trimestres completos, limite 60.000, sem parcial', c.lp.tr.length === 4 && c.lp.tr.every((q) => q.lim === 60000 && !q.parcial) && !c.lp.parcial);
  // L5 — avulsa existente 1,5 mi em 3 meses jan–mar: trimestre completo
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'existente', receitaModo: 'total', receitaTotal: 1500000, meses: 3, mesInicio: 1, rbt12Historico: 600000 } });
  ok('L5: avulsa existente 1,5 mi jan–mar → 1 trimestre completo, limite 60.000, adicional = (480k − 60k) × 10% = 42.000', c.lp.tr.length === 1 && !c.lp.parcial && near(c.lp.tr[0].adic, 42000, 0.005), c.lp.tr[0]);
  // L6 — avulsa de 3 meses fevereiro–abril cruza dois trimestres → ambos parciais
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'existente', receitaModo: 'total', receitaTotal: 900000, meses: 3, mesInicio: 2, rbt12Historico: 600000 } });
  ok('L6: avulsa fev–abr → T1 (2 de 3) e T2 (1 de 3), ambos estimativa parcial, limite 60.000 em cada', c.lp.tr.length === 2 && c.lp.tr.every((q) => q.parcial && q.lim === 60000), c.lp.tr);

  /* ============ COMPARATIVOS ============ */
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 } });
  ok('C1: sem regime atual → "Diferença potencial entre cenários" (não "economia")', c.economia.tipo === 'diferenca-potencial' && c.economia.rotulo === 'Diferença potencial entre cenários' && c.economia.referenciaEscolhida === false, c.economia);
  c = await cen({ regimeAtual: 'presumido', empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 } });
  ok('C2: com regime atual informado → "Economia estimada" contra esse regime', c.economia.tipo === 'economia' && c.economia.rotulo === 'Economia estimada' && c.economia.baseId === 'presumido', c.economia);
  // hero na tela
  await page.evaluate(() => { setActive('resultados'); });
  await page.waitForTimeout(400);
  const heroSem = await page.evaluate(() => document.querySelector('.hero').innerText);
  ok('C2: tela mostra "Economia estimada vs Lucro Presumido"', /Economia estimada vs Lucro Presumido/.test(heroSem), heroSem);
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 } });
  await page.evaluate(() => { renderContent(); }); await page.waitForTimeout(300);
  const heroDif = await page.evaluate(() => document.querySelector('.hero').innerText);
  ok('C1: tela mostra "Diferença potencial entre cenários" e não "Economia estimada"', /Diferença potencial entre cenários/.test(heroDif) && !/Economia estimada/.test(heroDif), heroDif);
  // conclusões
  c = await cen({ tipo: 'avulsa', periodo: { empresaAvulsa: 'existente', receitaModo: 'total', receitaTotal: 1500000, meses: 3, mesInicio: 1, rbt12Historico: null } });
  await page.evaluate(() => { renderContent(); }); await page.waitForTimeout(300);
  const heroPre = await page.evaluate(() => document.querySelector('.hero').innerText + ' ' + (document.querySelector('.alerts') ? document.querySelector('.alerts').innerText : ''));
  ok('C3: dado essencial ausente → destaque mostra o selo "Preliminar" e o que falta para torná-lo definitivo (v3.2.1: sem repetir no quadro de atenção)', /Preliminar/.test(heroPre) && /Para tornar definitivo/.test(heroPre) && /RBT12 anterior/.test(heroPre), heroPre);
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 }, confirmados: { 'lp-aliquotas': true } });
  ok('C4: dados completos → conclusão definitiva e Simples "Cálculo confirmado"', c.conclusao.definitiva && c.confianca.simples.nivel === 'calculo' && c.confianca.presumido.nivel === 'calculo', { c: c.conclusao, f: c.confianca });
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800 }, presumido: { majoracao: true } });
  ok('C5: majoração da presunção marca o Presumido como HIPÓTESE', c.confianca.presumido.nivel === 'hipotese');
  c = await cen({ empresa: { faturamentoMensal: 30000 } });
  ok('C6: RBT12 estimado marca o Simples como ESTIMATIVA', c.hist.origem === 'auto' && c.confianca.simples.nivel === 'estimativa');

  /* ============ IBS/CBS ============ */
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800, anoAnalise: 2026 } });
  ok('I1: 2026 (ano-teste) → Lucro Presumido sem CBS/IBS desembolsável; CBS = 0', c.lp.cbs === 0 && !c.lp.algumCbs, c.lp);
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800, anoAnalise: 2027 } });
  const crono = await page.evaluate(() => IBS_CBS_CRONOGRAMA.find((x) => x.ano === 2027));
  ok('I2: 2027 → CBS substitui PIS/COFINS no Presumido e a alíquota de referência do Híbrido segue o cronograma', c.lp.algumCbs && c.lp.cbs > 0 && c.hibCbsRef === crono.cbs, { cbsRef: c.hibCbsRef, crono: crono.cbs });
  c = await cen({ empresa: { faturamentoMensal: 30000, rbt12Modo: 'manual', rbt12Manual: 360000, folha12m: 100800, anoAnalise: 2033 } });
  const crono33 = await page.evaluate(() => IBS_CBS_CRONOGRAMA.find((x) => x.ano === 2033));
  ok('I3: 2033 → cronograma de 2033 aplicado (alíquota de referência e ISS remanescente do cronograma)', c.hibCbsRef === crono33.cbs && c.hibAnos.join() === '2033', { c: c.hibCbsRef, crono33 });

  /* ============ PARÂMETROS INSS / IRRF (fontes oficiais) ============ */
  const p = await page.evaluate(() => ({
    i4500: calcIrrfMensal(4500, 0), i6000: calcIrrfMensal(6000, 0), i5000: calcIrrfMensal(5000, 0), i7350: calcIrrfMensal(7350, 0), i8000: calcIrrfMensal(8000, 0),
    inss10k: calcInssProlabore(10000), inss3k: calcInssProlabore(3000), teto: PARAMS_FOLHA.inss.teto, simplificado: PARAMS_FOLHA.irrf.descontoSimplificado,
    tab6000base: (5392.80 * 0.275 - 908.73), red6000: 978.62 - 0.133145 * 6000,
  }));
  ok('P1: IRRF — exemplo oficial RFB: renda 4.500 → imposto zerado pela redução', p.i4500 === 0, p.i4500);
  ok('P1: IRRF — exemplo oficial RFB: renda 6.000 → tabela 574,29 − redução 179,75 = 394,54', near(p.tab6000base, 574.29, 0.01) && near(p.red6000, 179.75, 0.01) && near(p.i6000, 394.54, 0.01), p);
  ok('P1: IRRF — isenção até 5.000 (redução limitada ao imposto) e sem redução acima de 7.350', p.i5000 === 0 && p.i7350 > 0 && p.i8000 > p.i7350, p);
  ok('P2: INSS — 11% até o teto de R$ 8.475,55 (Portaria MPS/MF 13/2026)', p.teto === 8475.55 && near(p.inss10k, 932.31, 0.01) && near(p.inss3k, 330, 0.001), p);
  ok('P3: desconto simplificado mensal R$ 607,20 (25% da faixa isenta de R$ 2.428,80)', p.simplificado === 607.2 && near(2428.80 * 0.25, 607.2, 0.001));

  console.log('errors', JSON.stringify(errors));
  ok('sem erros de console/página', errors.length === 0, errors);
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
