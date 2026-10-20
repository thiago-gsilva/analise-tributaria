const { open } = require('./lib');
const { ok, fill, goto, chooseCnae, abrirDet } = require('./helpers');
const fs = require('fs');
const FORBIDDEN = /\b(IRPJ|CSLL|DAS|ISS|IBS|CBS|PIS|COFINS|CPP|ICMS|IPI)\b/;
async function seg(page, path, val) { await page.click(`[data-seg="${path}"][data-val="${val}"]`); await page.waitForTimeout(250); }
async function R(page, fn) { return page.evaluate(fn); }
const sum = (a) => a.reduce((x, y) => x + y, 0);

(async () => {
  const t = await open(); const { page, errors } = t;
  const reset = async () => { await page.evaluate(() => { resetState(); }); await page.waitForTimeout(200); };

  // ---------- B. Empresa nova ----------
  await reset();
  await page.click('[data-tipo="nova"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await fill(page, 'f_empresa_faturamentoMensal', '20.000,00');
  let b = await R(page, () => { const r = computeAll(); return { nova: r.meta.nova, rbt12: r.simples.rbt12Inicial, rbt12f: r.simples.rbt12Final, rows: r.simples.meses.slice(0, 3).map((m) => +m.rbt12.toFixed(2)), tot: r.regimes.map((x) => +x.total.toFixed(2)), lim: r.simples.limiteInicio, pend: r.pendencias.map((p) => p.id) }; });
  console.log('B', JSON.stringify(b));
  ok('B: empresa nova usa regra de início (RBT12 mês1 = receita×12)', b.nova && Math.abs(b.rows[0] - 240000) < 0.01, b.rows);
  ok('B: pendência de RBT12 proporcional listada', b.pend.includes('rbt12-inicio'));
  ok('B: limite de início de atividade respeitado (240k/12m < 400k×12)', b.lim.aplica && !b.lim.excedeu);
  await goto(page, 'resultados');
  ok('B: consistência', (await R(page, () => verificarConsistencia())).ok);

  // ---------- C. Avulsa 1,5 mi em 3 meses (empresa nova) ----------
  await reset();
  await page.click('[data-tipo="avulsa"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await fill(page, 'f_periodo_receitaTotal', '1.500.000,00');
  let c = await R(page, () => { const r = computeAll(); return { n: r.meta.nMeses, rec: r.meta.receitaTotal, pontual: r.meta.pontual, nova: r.meta.nova, receitas: r.meta.receitas, tot: r.regimes.map((x) => [x.id, +x.total.toFixed(2), +x.cargaPct.toFixed(3), x.elegivel]), lim: r.simples.limiteInicio, per: r.meta.periodo, pend: r.pendencias.filter((p) => p.nivel === 'atencao').map((p) => p.id), lp: r.presumido.trimestres.map((q) => [q.rotulo, q.mesesCount, q.receita, +q.total.toFixed(2)]) }; });
  console.log('C', JSON.stringify(c));
  ok('C: 3 meses, R$ 1,5 mi, pontual', c.n === 3 && c.rec === 1500000 && c.pontual);
  ok('C: não anualiza (receita distribuída 500k/mês)', c.receitas.every((v) => v === 500000));
  ok('C: Lucro Presumido em um único trimestre-calendário jan-mar', c.lp.length === 1 && c.lp[0][1] === 3 && c.lp[0][2] === 1500000, c.lp);
  ok('C: início em jan → 12 meses de funcionamento no ano, limite 4,8 mi, 1,5 mi não excede', !c.lim.excedeu && c.lim.mesesFuncionamento === 12, c.lim);
  await page.evaluate(() => { document.querySelector('details[data-adv="periodo"]').open = true; }); await page.selectOption('#f_periodo_mesInicio', '10'); await page.waitForTimeout(250);
  const c1 = await R(page, () => { const r = computeAll(); return { lim: r.simples.limiteInicio, per: r.meta.periodo, pend: r.pendencias.filter((p) => p.nivel === 'atencao').map((p) => p.id), fora: r.simples.foraDoLimite, ex: { s: r.simples.excesso.situacao, retro: r.simples.excesso.retroativo, pct: r.simples.excesso.pctExcesso }, el: r.regimes.map((x) => [x.id, x.elegivel]) }; });
  console.log('C1', JSON.stringify(c1));
  ok('C: nova começando em out/2027 (3 meses de funcionamento no ano) → limite 400k×3=1,2 mi excedido em 25% (>20%): exclusão retroativa, alerta', c1.lim.mesesFuncionamento === 3 && c1.lim.excedeu && c1.pend.includes('limite-simples') && c1.fora && c1.ex.s === 'excesso-acima20' && c1.ex.retro, c1);
  await page.selectOption('#f_periodo_mesInicio', '1'); await page.waitForTimeout(250);
  // cenário avulsa com empresa existente e RBT12 histórico informado
  await seg(page, 'periodo.empresaAvulsa', 'existente');
  await fill(page, 'f_periodo_rbt12Historico', '600.000,00').catch(async () => { console.log('campo rbt12 historico id?', await page.$$eval('[id*=rbt12]', (n) => n.map((x) => x.id))); });
  let c2 = await R(page, () => { const r = computeAll(); return { nova: r.meta.nova, hist: r.meta.hist, rbt12: r.simples.meses.map((m) => +m.rbt12.toFixed(2)), tot: r.regimes.map((x) => [x.id, +x.total.toFixed(2)]), forai: r.simples.mesesForaDoLimite }; });
  console.log('C2', JSON.stringify(c2));
  ok('C2: avulsa existente com RBT12 histórico 600k → janela móvel', !c2.nova && c2.hist.rbt12 === 600000 && c2.rbt12[0] > 600000 - 1, c2);
  await goto(page, 'resultados');
  ok('C2: consistência', (await R(page, () => verificarConsistencia())).ok);
  const sub = await page.textContent('.section-head .sub');
  ok('C2: resultados citam o período e dizem que não há projeção anual', /mar\/2027/.test(sub) && /sem projeção anual/.test(sub), sub);

  // ---------- D. Receita variável mês a mês ----------
  await reset();
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await seg(page, 'periodo.receitaModo', 'variavel');
  const ids = await page.$$eval('#content input[data-bind^="periodo.receitasMes"]', (n) => n.map((x) => x.id));
  ok('D: 12 campos mensais', ids.length === 12, ids.length);
  const vals = [10000, 12000, 8000, 30000, 15000, 15000, 9000, 40000, 20000, 11000, 13000, 25000];
  for (let i = 0; i < ids.length; i++) await fill(page, ids[i], String(vals[i]).replace(/(\d)(?=(\d{3})+$)/, '$1.') + ',00');
  const d = await R(page, () => { const r = computeAll(); return { rec: r.meta.receitaTotal, receitas: r.meta.receitas, tot: r.regimes.map((x) => +x.total.toFixed(2)), tmp: r.temporal.simples.length }; });
  ok('D: receita total = soma dos meses', d.rec === sum(vals), d);
  await goto(page, 'resultados');
  await abrirDet(page, 'temporal'); // V3.2: evolução mês a mês fica recolhida até ser aberta
  ok('D: gráfico temporal presente', await R(page, () => !!CHARTS.temporal));
  ok('D: consistência (inclui gráfico temporal)', (await R(page, () => verificarConsistencia())).ok);

  // ---------- E. Fator R com e sem folha ----------
  await reset();
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await fill(page, 'f_empresa_faturamentoMensal', '30.000,00');
  const e0 = await R(page, () => { const r = computeAll(); return { fr: r.simples.fatorR, anexo: r.simples.anexoUsado, das: r.simples.total, nec: r.fatorRComp.folhaNecMensal, econ: r.fatorRComp.economia, pend: r.pendencias.map((p) => p.id) }; });
  console.log('E0', JSON.stringify(e0));
  ok('E: sem folha → Fator R 0 e Anexo V, pendência de folha', e0.fr === 0 && e0.anexo === 'V' && e0.pend.includes('folha'), e0);
  ok('E: folha necessária = 28% × 30.000 = 8.400/mês', Math.abs(e0.nec - 8400) < 0.01, e0.nec);
  await fill(page, 'f_empresa_folha12m', '100.800,00');
  const e1 = await R(page, () => { const r = computeAll(); return { fr: r.simples.fatorR, anexo: r.simples.anexoUsado, dif: r.fatorRComp.difMensal, pend: r.pendencias.map((p) => p.id), ja: r.fatorRComp.jaEnquadrado }; });
  ok('E: folha 100.800/360.000 = 28% → Anexo III, sem pendência de folha', Math.abs(e1.fr - 0.28) < 1e-9 && e1.anexo === 'III' && !e1.pend.includes('folha') && e1.ja, e1);
  await fill(page, 'f_empresa_folha12m', '0,00');
  await seg(page, 'fatorR.modo', 'necessaria');
  const e2 = await R(page, () => { const r = computeAll(); const F = r.fatorRComp; return { pol: r.meta.politicaFolha, fr: r.simples.fatorR, anexo: r.simples.anexoUsado, econ: F.economia, adic: F.custoAdicional, van: F.vantagemLiquida, inss: F.inssInc, irrf: F.irrfInc, pl: F.proLaboreTotalMensal }; });
  console.log('E2', JSON.stringify(e2));
  ok('E: política "folha necessária" → Anexo III, economia > 0, vantagem = economia − encargos', e2.anexo === 'III' && e2.econ > 0 && Math.abs(e2.van - (e2.econ - e2.adic)) < 0.01, e2);
  ok('E: INSS = 11% do pró-labore 8.400 = 924,00', Math.abs(e2.inss - 924) < 0.01, e2.inss);
  await seg(page, 'fatorR.modo', 'prolabore');
  await fill(page, 'f_fatorR_proLaboreMensal', '5.000,00');
  const e3 = await R(page, () => { const r = computeAll(); return { pol: r.meta.politicaFolha, fr: r.simples.fatorR, anexo: r.simples.anexoUsado }; });
  console.log('E3', JSON.stringify(e3));
  ok('E: simular pró-labore 5.000 → Fator R 16,67% (Anexo V)', e3.pol === 'prolabore' && Math.abs(e3.fr - 5000 / 30000) < 1e-6 && e3.anexo === 'V', e3);
  await goto(page, 'resultados');
  const fr = await page.textContent('#content');
  ok('E: tela de resultados mostra bloco Fator R', /Fator R/.test(fr));

  // ---------- F. CNAE: classificação ----------
  await reset();
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  const cls = {};
  for (const q of ['4711', '1011', '6201', '8630']) {
    await page.evaluate(() => { state.empresa.cnae = null; state.classificacaoComplementos = {}; });
    await page.fill('#fCnae', q); await page.waitForTimeout(250);
    const o = await page.$('#acList [role="option"], #acList li, #acList button, #acList .ac-item');
    if (!o) { cls[q] = 'sem opção'; continue; }
    await o.click(); await page.waitForTimeout(200);
    cls[q] = await R(page, () => { const r = computeAll(); return { cnae: state.empresa.cnae.codigo, anexo: r.anexoKey, ativ: r.atividadeKey, ibs: r.tratamentoIbsCbs.label, conf: r.classificacao && r.classificacao.presuncao && r.classificacao.presuncao.confianca }; });
  }
  console.log('F', JSON.stringify(cls));
  ok('F: comércio (4711) → Anexo I', cls['4711'] && cls['4711'].anexo === 'I', cls['4711']);
  ok('F: indústria (1011) → Anexo II', cls['1011'] && cls['1011'].anexo === 'II', cls['1011']);
  ok('F: serviço de TI (6201) → Fator R (III/V)', cls['6201'] && cls['6201'].anexo === 'III_V', cls['6201']);

  // ---------- G. Persistência / biblioteca ----------
  await reset();
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201');
  await fill(page, 'f_empresa_faturamentoMensal', '25.000,00');
  await fill(page, 'f_analise_nome', 'Empresa Teste Ltda').catch(async () => { await page.evaluate(() => { state.analise.nome = 'Empresa Teste Ltda'; }); });
  const antes = await R(page, () => computeAll().regimes.map((x) => +x.total.toFixed(2)));
  await page.reload(); await page.waitForTimeout(500);
  const depois = await R(page, () => ({ tipo: state.analise.tipo, active: state.active, nome: state.analise.nome, tot: computeAll().regimes.map((x) => +x.total.toFixed(2)) }));
  ok('G: rascunho restaurado após recarregar', depois.tipo === 'existente' && JSON.stringify(depois.tot) === JSON.stringify(antes), { antes, depois });
  const lib = await R(page, () => { salvarSimulacaoAtual('Sim A'); duplicarSimulacaoAtual(); return listarSimulacoes().map((s) => s.nome); });
  ok('G: salvar + duplicar simulação', lib.length === 2, lib);
  const exp = await R(page, () => { const l = listarSimulacoes(); return JSON.stringify({ tipo: 'analise-tributaria-simulacoes', v: STATE_VERSION, simulacoes: l }).length; });
  await R(page, () => { localStorage.setItem('analise-tributaria-sims', '[]'); });
  const n0 = await R(page, () => listarSimulacoes().length);
  ok('G: biblioteca esvaziada', n0 === 0);
  // legacy draft (antes da v2): migração
  await page.evaluate(() => { localStorage.setItem('analise-tributaria-draft', JSON.stringify({ empresa: { nome: 'Legado', cnpj: '', cnae: null, faturamentoMensal: 18000, rbt12Modo: 'auto', rbt12Manual: 216000, folha12m: 0, proLabore: 0, anoAnalise: 2026 }, simples: { anexoModo: 'auto', anexoManual: 'III' }, presumido: { atividade: 'servicos_gerais', atividadeModo: 'auto', receitaTrimestre: 54000, pisAliq: 0.65, cofinsAliq: 3, issAliq: 3, majoracao: false, anoProjecao: 2027 }, equilibrio: { custosFixos: 6000, custosVariaveisPct: 10, contratoBruto: 10000, contratoLiquido: 8500, creditoContratanteAtualPct: 0 }, hibrido: { anoProjecao: 2033, valorContratoAnual: 216000, creditoIbsPct: 0, creditoCbsPct: 0, creditoContratanteHibridoPct: 100 }, ibscbs: { tratamento: 'padrao', modo: 'auto', aliquotaEfetivaManualPct: null, observacao: '' }, classificacaoComplementos: {}, active: 'dashboard', calculated: true })); });
  await page.reload(); await page.waitForTimeout(500);
  const leg = await R(page, () => ({ tipo: state.analise.tipo, active: state.active, n: computeAll().meta.nMeses, rec: computeAll().meta.receitaTotal }));
  ok('G: rascunho legado migrado (existente, 12 meses, aba antiga → etapa)', leg.tipo === 'existente' && leg.active === 'resultados' && leg.n === 12 && leg.rec === 216000, leg);

  console.log('errors', errors);
  ok('sem erros de console/página', errors.length === 0, errors);
  await t.close();
  const failed = 0;
})();
