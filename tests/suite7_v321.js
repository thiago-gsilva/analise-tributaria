// V3.2.1 — consolidação: vantagem do Fator R em partes, RBT12 estimado, selo Definitivo/Preliminar,
// Fator R só quando aplicável, e acesso direto ao que precisa de confirmação.
const { open } = require('./lib');
const { ok, fill, goto, chooseCnae, abrirDet } = require('./helpers');

(async () => {
  const t = await open({ viewport: { width: 1366, height: 768 } }); const { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const reset = async () => { await page.evaluate(() => resetState()); await page.waitForTimeout(250); };
  const novaExistente = async (cnae, fat, folha) => {
    await reset(); await goto(page, 'inicio'); await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
    await chooseCnae(page, cnae); await fill(page, 'f_empresa_faturamentoMensal', fat);
    if (folha) await fill(page, 'f_empresa_folha12m', folha);
  };

  /* ===== 1. FATOR R — metodologia (motor) ===== */
  await novaExistente('6201', '40.000,00', '60.000,00');
  let F = await page.evaluate(() => { const f = computeAll().fatorRComp; return { ap: f.aplicavel, eco: f.economia, eDas: f.economiaDas, ret: f.retencoesSocio, enc: f.encargosPatronais, custo: f.custoAdicional, saldo: f.saldoEstimado, van: f.vantagemLiquida, ver: f.veredito, compensa: f.compensa, suf: f.avaliacao.suficiente, faltas: f.avaliacao.faltas.map((x) => x.id), nec: f.folhaNecMensal, rbt12: computeAll().meta.hist.rbt12 }; });
  ok('Fator R: componentes separados (economia no DAS, retenções do sócio, encargos patronais = R$ 0)', F.ap && F.eDas === F.eco && F.ret.periodo === F.custo && F.enc.periodo === 0 && Math.abs(F.saldo - (F.eco - F.ret.periodo)) < 0.005 && F.van === F.saldo, F);
  ok('Fator R: folha necessária preservada (28% × RBT12 ÷ 12 + R$ 0,01)', Math.abs(F.nec - (Math.ceil(F.rbt12 * 0.28 / 12 * 100 - 1e-9) / 100 + 0.01)) < 0.0051, [F.nec, F.rbt12]);
  ok('Fator R: com dados faltando NÃO afirma "compensa" (indicativo, não conclusivo)', F.compensa === false && F.suf === false && /^indicativo/.test(F.ver) && F.faltas.includes('encargos-folha') && F.faltas.includes('rbt12-auto') && F.faltas.includes('prolabore-atual') && F.faltas.includes('janela'), F);
  // com tudo confirmado, exceto a janela estrutural, ainda NÃO conclui (economia supõe folha necessária já nos 12 meses)
  await page.evaluate(() => { ['encargos-folha', 'rbt12-auto', 'prolabore-atual'].forEach((k) => (state.confirmados[k] = true)); });
  F = await page.evaluate(() => { const f = computeAll().fatorRComp; return { ver: f.veredito, suf: f.avaliacao.suficiente, faltas: f.avaliacao.faltas.map((x) => x.id), compensa: f.compensa }; });
  ok('Fator R: premissas confirmadas, mas a janela de 12 meses (enquadramento só depois) ainda impede afirmar "compensa"', F.compensa === false && F.suf === false && F.faltas.join() === 'janela', F);
  // folha já ≥ 28% → sem economia a avaliar
  await page.evaluate(() => { state.empresa.folha12m = 200000; state.fatorR.modo = 'atual'; });
  F = await page.evaluate(() => { const f = computeAll().fatorRComp; return { ver: f.veredito, dif: f.difMensal, compensa: f.compensa }; });
  ok('Fator R: já enquadrado → "sem economia de DAS a avaliar" (nem compensa nem não compensa)', F.ver === 'sem-economia' && F.dif === 0 && F.compensa === false, F);
  // empresa nova: sem janela estrutural; conclui quando as premissas são confirmadas
  await reset(); await goto(page, 'inicio'); await page.click('[data-tipo="nova"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201'); await fill(page, 'f_empresa_faturamentoMensal', '40.000,00');
  F = await page.evaluate(() => { const f = computeAll().fatorRComp; return { ver: f.veredito, faltas: f.avaliacao.faltas.map((x) => x.id), eco: f.economia }; });
  ok('Empresa nova: antes de confirmar, o saldo é só indicativo (faltam premissas de INSS/IRRF e Fator R no início de atividade)', /^indicativo/.test(F.ver) && F.faltas.includes('encargos-folha') && F.faltas.includes('fatorr-inicio') && !F.faltas.includes('janela'), F);
  await page.evaluate(() => { state.confirmados['encargos-folha'] = true; state.confirmados['fatorr-inicio'] = true; });
  F = await page.evaluate(() => { const f = computeAll().fatorRComp; return { ver: f.veredito, faltas: f.avaliacao.faltas.map((x) => x.id) }; });
  ok('Empresa nova sem folha prevista: mesmo confirmando, falta a folha de referência (a economia é só diferença entre cenários)', /^indicativo/.test(F.ver) && F.faltas.join() === 'folha-referencia', F);
  await page.evaluate(() => { state.fatorR.folhaMensalPrevista = 1000; });
  F = await page.evaluate(() => { const f = computeAll().fatorRComp; return { ver: f.veredito, faltas: f.avaliacao.faltas.map((x) => x.id), compensa: f.compensa, saldo: f.saldoEstimado }; });
  ok('Empresa nova com folha prevista e tudo confirmado: veredito conclusivo e coerente com economia − retenções', /^(compensa|nao-compensa)$/.test(F.ver) && (F.ver === 'compensa') === (F.saldo > 0.005) && F.compensa === (F.ver === 'compensa') && F.faltas.length === 0, F);

  /* ===== 2. Resultados — Fator R só quando aplicável ===== */
  await novaExistente('4781', '50.000,00');   // comércio varejista de vestuário → Anexo I
  await goto(page, 'resultados');
  let R = await page.evaluate(() => ({ det: !!document.getElementById('det_fatorr'), anexo: computeAll().anexoKey, txt: document.getElementById('stepRoot').innerText, aplic: computeAll().fatorRComp.aplicavel, colunasFR: [...document.querySelectorAll('#stepRoot table.monthly th')].map((e) => e.textContent) }));
  await abrirDet(page, 'simples');
  const R2 = await page.evaluate(() => [...document.querySelectorAll('#det_simples table.monthly th')].map((e) => e.textContent));
  ok('Resultados: sem Fator R quando não se aplica (Anexo I): sem retrátil, sem alerta e sem coluna na tabela mensal', R.anexo !== 'III_V' && !R.aplic && !R.det && !/Fator R/.test(R.txt) && !R2.some((h) => /Fator R|Folha 12m/.test(h)) && R2.length > 3, [R.anexo, R.det, R2]);
  await novaExistente('6201', '40.000,00', '60.000,00');
  await goto(page, 'resultados'); await abrirDet(page, 'simples');
  R = await page.evaluate(() => ({ det: !!document.getElementById('det_fatorr'), cols: [...document.querySelectorAll('#det_simples table.monthly th')].map((e) => e.textContent), alert: (document.querySelector('.alerts') || {}).innerText || '' }));
  ok('Resultados: com Anexo III/V o Fator R aparece (retrátil, coluna na tabela mensal e uma linha no quadro de atenção)', R.det && R.cols.includes('Fator R') && /Fator R:/.test(R.alert) && /Ainda não dá para afirmar se compensa/.test(R.alert) && !/Compensa\b/.test(R.alert), R);
  await abrirDet(page, 'fatorr');
  const V = await page.evaluate(() => document.getElementById('det_fatorr').innerText);
  const chk = { a: /1\. Economia no DAS/.test(V), b: /2\. Pró-labore adicional/.test(V), c: /3\. Retenções do sócio/.test(V), d: /não são custo da empresa/.test(V), e: /4\. Encargos patronais/.test(V), f: /R\$\s0,00/.test(V), g: /Saldo estimado/.test(V), h: /Indicativo favorável — ainda não conclusivo/.test(V) };
  ok('Fator R (detalhe): quatro partes + saldo, retenções como "não são custo da empresa" e selo "não conclusivo"', /1\. Economia no DAS/.test(V) && /2\. Pró-labore adicional/.test(V) && /3\. Retenções do sócio/.test(V) && /não são custo da empresa/.test(V) && /4\. Encargos patronais/.test(V) && /R\$\s0,00/.test(V) && /Saldo estimado/.test(V) && /Indicativo favorável — ainda não conclusivo/.test(V), chk);
  // confirmar direto pelo botão do detalhe
  await page.click('#det_fatorr [data-confirmar="encargos-folha"]'); await page.waitForTimeout(400);
  const conf = await page.evaluate(() => ({ c: state.confirmados['encargos-folha'], d: document.getElementById('det_fatorr') && document.getElementById('det_fatorr').open }));
  ok('Fator R (detalhe): "Está correto" confirma as premissas direto no detalhe, sem sair da tela', conf.c === true, conf);

  /* ===== 3. Selo Definitivo / Preliminar e acesso direto ===== */
  await novaExistente('6201', '40.000,00', '60.000,00');
  await goto(page, 'resultados');
  let H = await page.evaluate(() => { const h = document.querySelector('.hero'); return { txt: h.innerText, st: (h.querySelector('.st') || {}).textContent, itens: [...h.querySelectorAll('.st-line button')].map((b) => b.textContent), estado: computeAll().conclusao.estado, a: computeAll().conclusao.aConfirmar.map((x) => x.id) }; });
  ok('Selo: dados essenciais ok mas premissas por confirmar → "Preliminar" com os itens a confirmar no destaque', H.st.trim() === 'Preliminar' && H.estado === 'preliminar' && /Para tornar definitivo/.test(H.txt) && H.a.includes('rbt12-auto'), H);
  ok('Selo: o alerta "preliminar" não é repetido no quadro de pontos de atenção', await page.evaluate(() => !/preliminar/i.test((document.querySelector('.alerts') || { innerText: '' }).innerText)));
  // link direto "RBT12 estimado" → preenchimento, campo do RBT12 em foco, sem abrir ajustes avançados
  await page.click('.hero .st-line button[data-foco="campo-rbt12"]'); await page.waitForTimeout(700);
  const L = await page.evaluate(() => ({ etapa: state.active, foco: document.activeElement && (document.activeElement.closest('#campo-rbt12') ? 'campo-rbt12' : document.activeElement.id), avancado: !!(document.querySelector('details[data-adv="avancado"]') || {}).open }));
  ok('Acesso direto: o link "RBT12 estimado" leva ao campo do RBT12 na etapa de preenchimento, sem abrir os ajustes avançados', L.etapa === 'preenchimento' && L.foco === 'campo-rbt12' && !L.avancado, L);
  // confirmar todos os itens → Definitivo
  await page.evaluate(() => { computeAll().conclusao.aConfirmar.forEach((x) => (state.confirmados[x.id] = true)); });
  await goto(page, 'resultados');
  H = await page.evaluate(() => { const h = document.querySelector('.hero'); return { st: (h.querySelector('.st') || {}).textContent, linha: !!h.querySelector('.st-line'), estado: computeAll().conclusao.estado, def: computeAll().conclusao.definitiva }; });
  ok('Selo: premissas confirmadas e dados completos → "Definitivo", sem linha de pendências', H.st.trim() === 'Definitivo' && !H.linha && H.estado === 'definitivo' && H.def, H);
  // os totais NÃO mudam com a confirmação
  const tot1 = await page.evaluate(() => computeAll().regimes.map((x) => x.total));
  await page.evaluate(() => { state.confirmados = {}; });
  const tot2 = await page.evaluate(() => computeAll().regimes.map((x) => x.total));
  ok('Confirmar premissas não altera nenhum total tributário', JSON.stringify(tot1) === JSON.stringify(tot2), [tot1, tot2]);
  // dado essencial ausente → preliminar com itens e links para os campos
  await reset(); await goto(page, 'inicio'); await page.click('[data-tipo="avulsa"]'); await page.waitForTimeout(250);
  await page.evaluate(() => { state.periodo.empresaAvulsa = 'existente'; state.periodo.receitaTotal = 1500000; state.periodo.meses = 3; state.periodo.receitaModo = 'total'; }); await goto(page, 'resultados');
  const P = await page.evaluate(() => ({ st: document.querySelector('.hero .st').textContent, links: [...document.querySelectorAll('.hero .st-line button')].map((b) => b.dataset.foco || b.dataset.abrirDet) }));
  ok('Selo: dado essencial ausente (RBT12 anterior) → "Preliminar" com link direto ao campo', P.st.trim() === 'Preliminar' && P.links.includes('campo-rbt12-historico'), P);
  // links sem campo abrem as pendências
  await page.evaluate(() => { document.querySelector('.hero .st-line button[data-abrir-det]') && document.querySelector('.hero .st-line button[data-abrir-det]').click(); }); await page.waitForTimeout(400);
  ok('Acesso direto: item sem campo abre "Pendências e premissas"', await page.evaluate(() => { const d = document.getElementById('det_pendencias'); return !!d && d.open; }));

  /* ===== 4. RBT12 estimado ===== */
  await novaExistente('6201', '40.000,00', '60.000,00');
  let B = await page.evaluate(() => { const c = document.getElementById('campo-rbt12'); return { txt: c ? c.innerText : null, avancado: !!(document.querySelector('details[data-adv="avancado"]') || {}).open, vis: c ? c.getBoundingClientRect().height > 0 : false }; });
  ok('RBT12: empresa existente mostra "RBT12 estimado" com "Informar o real", sem abrir ajustes avançados', B.vis && /estimado/.test(B.txt) && /480\.000,00/.test(B.txt) && /Informar o real/.test(B.txt) && !B.avancado, B);
  await page.click('#campo-rbt12 [data-rbt12="manual"]'); await page.waitForTimeout(400);
  B = await page.evaluate(() => ({ modo: state.empresa.rbt12Modo, val: (document.querySelector('#campo-rbt12 input') || {}).value, foco: document.activeElement && document.activeElement.id, avancado: !!(document.querySelector('details[data-adv="avancado"]') || {}).open, origem: computeAll().meta.hist.origem, tot: computeAll().regimes.map((x) => +x.total.toFixed(2)) }));
  ok('RBT12: "Informar o real" abre o campo no próprio lugar, já preenchido com a estimativa e em foco (resultado não muda)', B.modo === 'manual' && /480\.000/.test(B.val) && /rbt12Manual/.test(B.foco) && !B.avancado && B.origem === 'manual', B);
  await fill(page, 'f_empresa_rbt12Manual', '900.000,00');
  const pend = await page.evaluate(() => ({ rbt: computeAll().meta.hist.rbt12, tem: computeAll().pendencias.some((p) => p.id === 'rbt12-auto') }));
  ok('RBT12: valor real informado é usado no cálculo e a pendência "RBT12 estimado" desaparece', pend.rbt === 900000 && !pend.tem, pend);
  await page.click('#campo-rbt12 [data-rbt12="auto"]'); await page.waitForTimeout(400);
  ok('RBT12: "Voltar a estimar" restaura a estimativa', await page.evaluate(() => state.empresa.rbt12Modo === 'auto' && /estimado/.test(document.getElementById('campo-rbt12').innerText)));
  // empresa nova: sem linha de RBT12 (usa proporcional)
  await reset(); await goto(page, 'inicio'); await page.click('[data-tipo="nova"]'); await page.waitForTimeout(250);
  ok('RBT12: empresa nova não mostra a linha de RBT12 estimado', await page.evaluate(() => !document.getElementById('campo-rbt12')));

  /* ===== 5. Projeção IBS/CBS ===== */
  await novaExistente('6201', '40.000,00', '60.000,00'); await goto(page, 'resultados');
  const pj = await page.evaluate(() => [...document.querySelectorAll('.regime .conf')].map((e) => e.textContent));
  ok('IBS/CBS: regimes que dependem de alíquotas de 2027+ são rotulados "projeção 2027+" (Simples puro não)', !/projeção/.test(pj[0]) && /projeção 2027\+/.test(pj[1]) && /projeção 2027\+/.test(pj[2]), pj);
  await abrirDet(page, 'ibscbs');
  ok('IBS/CBS: cronograma marca 2027+ como projeção e explica que a alíquota de referência ainda não foi fixada', await page.evaluate(() => /projeção/.test(document.getElementById('det_ibscbs').innerText) && /ainda não foram fixadas/.test(document.getElementById('det_ibscbs').innerText)));
  await abrirDet(page, 'fontes');
  const fon = await page.evaluate(() => document.getElementById('det_fontes').innerText);
  ok('Fontes: INSS, IRRF (Lei 15.270), CPP no Simples, FS12 (manual PGDAS-D) e projeção de IBS/CBS registrados', /8\.475,55/.test(fon) && /Lei 15\.270/.test(fon) && /art\. 13, VI/.test(fon) && /PGDAS-D/.test(fon) && /TCU/.test(fon) && /CGSN nº 190/.test(fon), fon.length);

  ok('Sem erros de console', errors.length === 0, errors);
  await t.close();
})();
