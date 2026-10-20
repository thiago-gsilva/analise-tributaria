// V3.2 — UX/UI: simplificação, campos didáticos, três níveis de informação, padronização e
// validação visual (1920×1080, 1366×768, mobile; claro e escuro) nos cenários A, B e C.
const { open } = require('./lib');
const { ok, fill, goto, chooseCnae } = require('./helpers');
const VIEWS = [['1920×1080', { width: 1920, height: 1080 }], ['1366×768', { width: 1366, height: 768 }], ['390×844', { width: 390, height: 844 }]];

/* Auditoria geométrica da etapa atual: rolagem horizontal da página, texto cortado, elementos fora da tela,
   campos soltos, sobreposição de campos/botões/gráficos e digitação duplicada. */
async function auditar(page) {
  return page.evaluate(() => {
    const root = document.getElementById('stepRoot');
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || !r.width || !r.height) return false; let p = e.parentElement; while (p && p !== document.body) { if (p.tagName === 'DETAILS' && !p.open && !(e.closest('summary') && e.closest('summary').parentElement === p)) return false; if (p.hidden) return false; p = p.parentElement; } return true; };
    const W = document.documentElement.clientWidth;
    const out = { rolagemH: document.documentElement.scrollWidth > W + 1, foraDaTela: [], cortado: [], soltos: [], sobrepostos: [], duplicados: [], canvases: 0 };
    const rolavel = (e) => { let p = e; while (p && p !== root) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return true; p = p.parentElement; } return false; };
    [...root.querySelectorAll('*')].filter(vis).forEach((e) => {
      const r = e.getBoundingClientRect();
      if (r.right > W + 1 && !rolavel(e) && !e.closest('.table-wrap, .formula, .months-grid, canvas')) out.foraDaTela.push(e.tagName + '.' + e.className + ' ' + Math.round(r.right));
      const cs = getComputedStyle(e);
      if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && e.children.length === 0 && e.textContent.trim()) out.cortado.push(e.tagName + '.' + e.className + ' "' + e.textContent.trim().slice(0, 40) + '"');
    });
    // texto de botões/rótulos que vaza do próprio elemento
    [...root.querySelectorAll('button, .badge, .chip, .seg button, label, summary')].filter(vis).forEach((e) => { if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') out.cortado.push('vaza ' + e.tagName + ' "' + e.textContent.trim().slice(0, 30) + '"'); });
    const campos = [...root.querySelectorAll('.field')].filter(vis);
    campos.forEach((f) => { if (!f.closest('.group, .collapse-body, .panel, .modal')) out.soltos.push(f.id || f.textContent.trim().slice(0, 30)); });
    const alvos = [...root.querySelectorAll('input:not([type=checkbox]):not([type=file]), select, .btn, .seg button')].filter(vis);
    const inter = (a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return Math.min(A.right, B.right) - Math.max(A.left, B.left) > 2 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 2; };
    for (let i = 0; i < alvos.length; i++) for (let j = i + 1; j < alvos.length; j++) if (!alvos[i].contains(alvos[j]) && !alvos[j].contains(alvos[i]) && inter(alvos[i], alvos[j])) out.sobrepostos.push((alvos[i].id || alvos[i].textContent.trim().slice(0, 18)) + ' × ' + (alvos[j].id || alvos[j].textContent.trim().slice(0, 18)));
    const cv = [...root.querySelectorAll('canvas')].filter(vis); out.canvases = cv.length;
    for (let i = 0; i < cv.length; i++) for (let j = i + 1; j < cv.length; j++) if (inter(cv[i], cv[j])) out.sobrepostos.push('gráficos ' + cv[i].id + ' × ' + cv[j].id);
    const binds = [...root.querySelectorAll('[data-bind]')].filter(vis).map((e) => e.dataset.bind); out.duplicados = binds.filter((b, i) => binds.indexOf(b) !== i);
    out.nCampos = [...root.querySelectorAll('input:not([type=file]):not([type=hidden]):not([type=checkbox]), select')].filter(vis).length;
    out.altCampos = [...new Set([...root.querySelectorAll('.field input[type=text], .field select')].filter(vis).map((e) => Math.round(e.getBoundingClientRect().height)))];
    out.h2 = getComputedStyle(root.querySelector('.section-head h2')).fontSize;
    out.palavras = root.innerText.replace(/\s+/g, ' ').trim().split(' ').length;
    return out;
  });
}

const visivel = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; let p = e.parentElement; while (p) { if (p.tagName === 'DETAILS' && !p.open && !(e.closest('summary') && e.closest('summary').parentElement === p)) return false; if (p.hidden) return false; p = p.parentElement; } return true; }).length, sel);
(async () => {
  /* ===== A) Estrutura e conteúdo por etapa (1366×768, claro) ===== */
  let t = await open({ viewport: { width: 1366, height: 768 } }); let { page, errors } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const reset = async () => { await page.evaluate(() => { resetState(); }); await page.waitForTimeout(250); };
  await reset(); await goto(page, 'inicio');
  const ini = await page.evaluate(() => ({ cards: document.querySelectorAll('#stepRoot .choice').length, paineis: document.querySelectorAll('#stepRoot .panel').length, palavras: document.getElementById('stepRoot').innerText.split(/\s+/).length, txt: document.getElementById('stepRoot').innerText }));
  ok('Nova análise: só as 3 modalidades, sem painel explicativo, texto enxuto (<110 palavras)', ini.cards === 3 && ini.paineis === 0 && ini.palavras < 110, ini);
  ok('Nova análise: sem o bloco "Como cada tipo funciona" (informação duplicada)', !/Como cada tipo funciona/.test(ini.txt));

  // ---- Cenário A: empresa existente ----
  await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250);
  let a0 = await auditar(page);
  ok('A·Preenchimento: ao abrir, só 2 campos de preenchimento obrigatório (CNAE + faturamento) e nenhum campo de período/avançado', a0.nCampos <= 3, a0);
  await chooseCnae(page, '6201');
  await fill(page, 'f_empresa_faturamentoMensal', '40.000,00');
  let a1 = await auditar(page);
  ok('A·Preenchimento: campos visíveis ≤ 4 (CNAE, faturamento, folha, pró-labore opcional)', a1.nCampos <= 4, a1);
  ok('A·Preenchimento: nenhuma informação digitada duas vezes (nenhum caminho duplicado)', a1.duplicados.length === 0, a1.duplicados);
  const prolab0 = await page.evaluate(() => { const w = document.querySelector('[data-showif="proLabore"]'); return w ? w.hidden : null; });
  ok('A·Pró-labore (opcional) só aparece quando há folha informada', prolab0 === true);
  await fill(page, 'f_empresa_folha12m', '120.000,00');
  const prolab1 = await page.evaluate(() => document.querySelector('[data-showif="proLabore"]').hidden);
  ok('A·Pró-labore (opcional) aparece depois de informar a folha', prolab1 === false);
  const semTabela = await page.evaluate(() => ({ tabelas: [...document.querySelectorAll('#stepRoot table')].filter((e) => e.offsetParent).length, fatorR: document.getElementById('liveFatorR').innerText }));
  ok('A·Fator R no preenchimento é só uma linha (sem tabela de cenários/INSS/IRRF)', semTabela.tabelas === 0 && !/INSS estimado|Vantagem líquida/i.test(semTabela.fatorR) && /Fator R/i.test(semTabela.fatorR), semTabela);
  const avDet = await page.evaluate(() => { const d = document.querySelector('details[data-adv="avancado"]'); return { aberto: d.open, filhos: d.querySelectorAll('details[data-adv]').length }; });
  avDet.visiveisFechados = await visivel(page, 'details[data-adv="avancado"] input, details[data-adv="avancado"] select');
  ok('A·Ajustes avançados recolhidos (nenhum campo avançado visível)', avDet.aberto === false && avDet.visiveisFechados === 0 && avDet.filhos >= 6, avDet);
  const pendUnico = await page.evaluate(() => ({ locais: document.querySelectorAll('#stepRoot .pend').length, resumo: !!document.querySelector('#liveAside .kv') }));
  ok('A·Pendências em um único local (uma seção) e resumo curto ao lado', pendUnico.locais === 1 && pendUnico.resumo, pendUnico);

  // máscara monetária, validação junto ao campo
  await page.fill('#f_empresa_faturamentoMensal', ''); await page.type('#f_empresa_faturamentoMensal', '1500000'); await page.waitForTimeout(400);
  let v = await page.inputValue('#f_empresa_faturamentoMensal');
  ok('Campo monetário: formata ao digitar (1500000 → 1.500.000)', v === '1.500.000', v);
  await page.fill('#f_empresa_faturamentoMensal', ''); await page.type('#f_empresa_faturamentoMensal', '40000,5'); await page.waitForTimeout(400);
  v = await page.inputValue('#f_empresa_faturamentoMensal');
  const num = await page.evaluate(() => state.empresa.faturamentoMensal);
  ok('Campo monetário: vírgula decimal preservada e valor interpretado (40.000,5 → 40000,5)', v === '40.000,5' && num === 40000.5, [v, num]);
  await page.fill('#f_empresa_faturamentoMensal', '40.000,00'); await page.press('#f_empresa_faturamentoMensal', 'Tab'); await page.waitForTimeout(300);
  await page.fill('#f_empresa_faturamentoMensal', ''); await page.press('#f_empresa_faturamentoMensal', 'Tab'); await page.waitForTimeout(400);
  const err = await page.evaluate(() => { const e = document.getElementById('err_f_empresa_faturamentoMensal'); const r = e.getBoundingClientRect(), i = document.getElementById('f_empresa_faturamentoMensal').getBoundingClientRect(); return { hidden: e.hidden, txt: e.textContent, perto: Math.abs(r.top - i.bottom) < 40 }; });
  ok('Erro junto ao campo: faturamento vazio mostra mensagem logo abaixo do campo', !err.hidden && /maior que zero/.test(err.txt) && err.perto, err);
  await page.click('.btn[data-go-res].only-wide'); await page.waitForTimeout(500);
  ok('"Ver resultados" sem receita não abre tela vazia: permanece e destaca o campo', (await page.evaluate(() => state.active)) === 'preenchimento');
  await fill(page, 'f_empresa_faturamentoMensal', '40.000,00');
  await page.click('details[data-adv="periodo"] summary'); await page.waitForTimeout(200);
  await page.fill('#f_periodo_meses', '40'); await page.press('#f_periodo_meses', 'Tab'); await page.waitForTimeout(500);
  const wm = await page.evaluate(() => { const e = document.getElementById('err_f_periodo_meses'); return { hidden: e.hidden, txt: e.textContent }; });
  ok('Aviso junto ao campo: duração acima de 36 meses informa o limite', !wm.hidden && /36/.test(wm.txt), wm);
  await page.fill('#f_periodo_meses', '12'); await page.press('#f_periodo_meses', 'Tab'); await page.waitForTimeout(400);
  await fill(page, 'f_empresa_folha12m', '900.000,00');
  const wf = await page.evaluate(() => { const e = document.getElementById('err_f_empresa_folha12m'); return { hidden: e.hidden, txt: e.textContent }; });
  ok('Aviso junto ao campo: folha acima da receita de 12 meses', !wf.hidden && /supera a receita/.test(wf.txt), wf);
  await fill(page, 'f_empresa_folha12m', '120.000,00');

  // resultados A
  await goto(page, 'resultados');
  const r1 = await page.evaluate(() => {
    const root = document.getElementById('stepRoot'); const vis = (e) => { let p = e.parentElement; while (p) { if (p.tagName === 'DETAILS' && !p.open) return false; p = p.parentElement; } return e.offsetParent !== null; };
    const det = (id) => { const d = document.getElementById('det_' + id); return d ? d.open : null; };
    const totais = state.result.regimes.map((x) => fmtBRL(x.total));
    const txt = root.innerText;
    return { canvases: [...root.querySelectorAll('canvas')].filter(vis).length, composicao: det('composicao'), tabela: det('tabela'), fatorr: det('fatorr'), ibscbs: det('ibscbs'), simples: det('simples'), memoria: det('memoria'),
      cards: root.querySelectorAll('.regime').length, hero: !!root.querySelector('.hero'), ordem: [...root.children].map((c) => c.className.split(' ')[0] || c.firstElementChild && c.firstElementChild.className.split(' ')[0]).slice(0, 5),
      repeticoes: totais.map((s) => txt.split(s).length - 1), palavras: txt.split(/\s+/).length };
  });
  ok('A·Resultados: 1 gráfico principal visível; composição, tabela, Fator R, IBS/CBS e técnicos recolhidos', r1.canvases === 1 && r1.composicao === false && r1.tabela === false && r1.fatorr === false && r1.ibscbs === false && r1.simples === false && r1.memoria === false, r1);
  ok('A·Resultados: comparativo (3 cartões) logo após o placar; cada valor aparece no máximo 2× (placar + cartão do menor)', r1.cards === 3 && r1.hero && r1.repeticoes.every((n) => n >= 1 && n <= 2) && r1.repeticoes.filter((n) => n === 2).length <= 1, r1);
  ok('A·Resultados: texto reduzido (<330 palavras visíveis vs. ~580 na v3.1)', r1.palavras < 330, r1.palavras);
  await abrirDetalheUI(page, 'composicao');
  const cc = await page.evaluate(() => ({ chart: !!CHARTS.composicao, cons: verificarConsistencia() }));
  ok('A·Composição: o gráfico nasce ao abrir o retrátil e continua consistente com o motor', cc.chart && cc.cons.ok, cc);
  await page.evaluate(() => { document.getElementById('det_composicao').open = false; }); await page.waitForTimeout(300);

  // ---- Relatório ----
  await goto(page, 'relatorio');
  const rel = await page.evaluate(() => { const root = document.getElementById('stepRoot'); return { opcoes: [...root.querySelectorAll('[data-modelo]')].map((b) => b.querySelector('h3').textContent), pressed: [...root.querySelectorAll('[data-modelo]')].filter((b) => b.getAttribute('aria-pressed') === 'true').length, gerar: !!root.querySelector('#btnGerarPdf'), previa: !!root.querySelector('#btnPreviaPdf'), camposVisiveis: [...root.querySelectorAll('input,select')].filter((e) => !e.closest('details:not([open])') && e.offsetParent).length, painelKv: root.querySelectorAll('.kv').length, palavras: root.innerText.split(/\s+/).length }; });
  ok('Relatório: 3 opções (Executivo, Completo, Memória Técnica), prévia e geração, configurações recolhidas', rel.opcoes.length === 3 && /Executivo/.test(rel.opcoes[0]) && /Completa/.test(rel.opcoes[1]) && /Mem/.test(rel.opcoes[2]) && rel.pressed === 1 && rel.gerar && rel.previa && rel.camposVisiveis === 0 && rel.painelKv === 0 && rel.palavras < 130, rel);
  await page.click('[data-modelo="memoria"]'); await page.waitForTimeout(250);
  ok('Relatório: trocar de modelo atualiza a linha de resumo', /Memória Técnica/.test(await page.textContent('#liveRelSum')));
  await page.click('[data-modelo="resumo"]'); await page.waitForTimeout(250);

  /* ===== B) Empresa nova sem folha ===== */
  await reset(); await page.click('[data-tipo="nova"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201'); await fill(page, 'f_empresa_faturamentoMensal', '20.000,00');
  await page.click('[data-seg="fatorR.modo"][data-val="nenhuma"]'); await page.waitForTimeout(250);
  const b1 = await auditar(page);
  ok('B·Empresa nova sem folha: 2 digitações + 1 clique; campos visíveis ≤ 2; sem duplicidade', b1.nCampos <= 2 && b1.duplicados.length === 0, b1);
  await goto(page, 'resultados');
  const b2 = await page.evaluate(() => ({ r: computeAll().regimes.map((x) => +x.total.toFixed(2)), txt: document.getElementById('stepRoot').innerText }));
  // V3.2.3: o Híbrido passa a retirar do DAS só as parcelas de CBS e IBS (50.104,72 = 34.650 − 5.905,275 + 21.360); V3.2.2 era 43.818,22.
  // V3.2.2: análise em 2027 (padrão) usa as regras novas de início de atividade (1ª faixa e fator "r" 0,28 nos 2 primeiros meses): Simples 34.650 (= 2 × 1.200 + 10 × 3.225)
  ok('B·Resultado 2027 (regras de início de atividade da Res. CGSN 190/2026): 34.650,00 · 50.104,72 · 46.992,00', JSON.stringify(b2.r) === JSON.stringify([34650, 50104.72, 46992]), b2.r);
  const b3 = await page.evaluate(() => { state.empresa.anoAnalise = 2026; const r = computeAll().regimes.map((x) => +x.total.toFixed(2)); state.empresa.anoAnalise = 2027; return r; });
  ok('B·Em 2026 o Simples continua igual ao da v3.1 (R$ 38.700,00; o Híbrido e o Presumido dependem do ano IBS/CBS)', b3[0] === 38700, b3);

  /* ===== C) Contrato avulso R$ 1.500.000 em 3 meses ===== */
  await reset(); await page.click('[data-tipo="avulsa"]'); await page.waitForTimeout(250);
  await chooseCnae(page, '6201'); await fill(page, 'f_periodo_receitaTotal', '1.500.000,00');
  const c1 = await auditar(page);
  const c1b = await page.evaluate(() => ({ meses: state.periodo.meses, modo: state.periodo.receitaModo, receita: state.result ? 0 : 0 }));
  ok('C·Avulso: 2 digitações (CNAE + valor); período de 3 meses já vem preenchido; sem duplicidade', c1b.meses === 3 && c1b.modo === 'total' && c1.duplicados.length === 0, [c1b, c1.duplicados]);
  ok('C·Avulso: campos visíveis ≤ 4 (CNAE, valor total, duração, folha opcional); início/ano-base recolhidos', c1.nCampos <= 4, c1.nCampos);
  await goto(page, 'resultados');
  const c2 = await page.evaluate(() => { const r = computeAll(); const a = document.querySelector('.alerts'); return { tot: r.regimes.map((x) => +x.total.toFixed(2)), alert: a ? a.innerText : '', hero: document.querySelector('.hero').innerText }; });
  // V3.2.2: 2027 → meses 1 e 2 na 1ª faixa do Anexo III (fator "r" 0,28): 2 × 30.000; mês 3 no Anexo V, 6ª faixa (30,40% − R$ 540.000 ÷ R$ 6 mi = 21,4%): 107.000 → 167.000
  ok('C·Resultado 2027 (Res. CGSN 190/2026 + art. 21, IV, v3.2.5): 193.017,54 · 295.602,94 · 335.700,00 (v3.2.4: 167.000,00 · 269.975,40 — sem o acréscimo de ICMS/ISS/IBS da 6ª faixa)', Math.abs(c2.tot[0] - 193017.5425) < 0.006 && Math.abs(c2.tot[1] - 295602.94) < 0.006 && c2.tot[2] === 335700, c2.tot);
  const c3 = await page.evaluate(() => { state.empresa.anoAnalise = 2026; const r = computeAll().regimes.map((x) => +x.total.toFixed(2)); state.empresa.anoAnalise = 2027; return r; });
  ok('C·Em 2026 o Simples = 3 × (107.500 + 25.808,88 de ISS pela fórmula da 5ª faixa, art. 21, III, "b") = R$ 399.926,63 (322.500,00 até a v3.2.4, antes do acréscimo da 6ª faixa)', Math.abs(c3[0] - 399926.625) < 0.006, c3);
  ok('C·Alertas essenciais visíveis: período sem projeção anual e Anexo V sem folha; "Preliminar" só no destaque (sem alerta repetido)', /sem projeção anual/.test(c2.alert) && /Anexo V/.test(c2.alert) && !/preliminar/i.test(c2.alert) && /Preliminar/.test(c2.hero) && /Para tornar definitivo/.test(c2.hero), [c2.alert, c2.hero]);
  await page.evaluate(() => { document.querySelector('#stepRoot').scrollIntoView(); });

  /* ===== D) Padronização entre etapas ===== */
  const padr = {};
  await reset(); await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250); await chooseCnae(page, '6201'); await fill(page, 'f_empresa_faturamentoMensal', '40.000,00');
  for (const e of ['inicio', 'preenchimento', 'resultados', 'relatorio']) {
    await goto(page, e);
    padr[e] = await page.evaluate(() => { const root = document.getElementById('stepRoot'); const cs = (e) => getComputedStyle(e); const b = [...root.querySelectorAll('.btn:not(.btn-sm)')].filter((x) => x.offsetParent).map((x) => Math.round(x.getBoundingClientRect().height)); const bs = [...root.querySelectorAll('.btn-sm')].filter((x) => x.offsetParent).map((x) => Math.round(x.getBoundingClientRect().height)); const f = [...root.querySelectorAll('.field input[type=text], .field select')].filter((x) => x.offsetParent).map((x) => Math.round(x.getBoundingClientRect().height)); const sm = [...root.querySelectorAll('details.collapse > summary')].filter((x) => x.offsetParent).map((x) => cs(x).fontSize + '/' + cs(x).paddingTop); return { h2: cs(root.querySelector('.section-head h2')).fontSize, ff: cs(root.querySelector('.section-head h2')).fontFamily.split(',')[0], btn: [...new Set(b)], btnSm: [...new Set(bs)], campo: [...new Set(f)], sum: [...new Set(sm)], gap: cs(root).gap }; });
  }
  const todos = Object.values(padr);
  const uni = (k) => [...new Set(todos.flatMap((p) => p[k]))];
  ok('Padronização: mesmo tamanho de título (h2) e fonte Alata nas 4 etapas', new Set(todos.map((p) => p.h2)).size === 1 && todos.every((p) => /Alata/.test(p.ff)), todos.map((p) => [p.h2, p.ff]));
  ok('Padronização: campos com a mesma altura (40 px) e botões 40 px / pequenos 32 px', JSON.stringify(uni('campo')) === '[40]' && JSON.stringify(uni('btn')) === '[40]' && JSON.stringify(uni('btnSm')) === '[32]', [uni('campo'), uni('btn'), uni('btnSm')]);
  ok('Padronização: retráteis com a mesma tipografia/espaçamento e mesmo espaçamento entre blocos', uni('sum').length <= 2 && new Set(todos.map((p) => p.gap)).size === 1, [uni('sum'), todos.map((p) => p.gap)]);
  ok('Sem erros de console', errors.length === 0, errors);
  await t.close();

  /* ===== E) Validação visual: 3 telas × claro/escuro × 4 etapas × 3 cenários ===== */
  for (const tema of ['light', 'dark']) for (const [nome, vp] of VIEWS) {
    t = await open({ viewport: vp, colorScheme: tema, port: 8920 + Math.floor(Math.random() * 60) }); ({ page, errors } = t);
    await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
    const ruins = [];
    const cen = { A: async () => { await page.click('[data-tipo="existente"]'); await page.waitForTimeout(200); await chooseCnae(page, '6201'); await fill(page, 'f_empresa_faturamentoMensal', '40.000,00'); await fill(page, 'f_empresa_folha12m', '120.000,00'); },
      B: async () => { await page.click('[data-tipo="nova"]'); await page.waitForTimeout(200); await chooseCnae(page, '6201'); await fill(page, 'f_empresa_faturamentoMensal', '20.000,00'); await page.click('[data-seg="fatorR.modo"][data-val="nenhuma"]'); await page.waitForTimeout(200); },
      C: async () => { await page.click('[data-tipo="avulsa"]'); await page.waitForTimeout(200); await chooseCnae(page, '6201'); await fill(page, 'f_periodo_receitaTotal', '1.500.000,00'); } };
    for (const k of Object.keys(cen)) {
      await page.evaluate(() => { resetState(); }); await page.waitForTimeout(200);
      await goto(page, 'inicio'); let au = await auditar(page); chk(ruins, k + '/inicio', au);
      await cen[k]();
      for (const e of ['preenchimento', 'resultados', 'relatorio']) { await goto(page, e); await page.waitForTimeout(350); au = await auditar(page); chk(ruins, k + '/' + e, au); }
      // retráteis abertos: também sem rolagem horizontal da página
      await goto(page, 'resultados'); await page.evaluate(() => document.querySelectorAll('#stepRoot details.collapse').forEach((d) => { d.open = true; })); await page.waitForTimeout(600);
      au = await auditar(page); chk(ruins, k + '/resultados-tudo-aberto', au, true);
      await goto(page, 'preenchimento'); await page.evaluate(() => document.querySelectorAll('#stepRoot details').forEach((d) => { d.open = true; })); await page.waitForTimeout(300);
      au = await auditar(page); chk(ruins, k + '/preench-tudo-aberto', au, true);
    }
    ok(`Visual ${nome} ${tema === 'light' ? 'claro' : 'escuro'}: sem rolagem horizontal, texto cortado, campos soltos, sobreposição ou elementos fora da tela`, ruins.length === 0, ruins.slice(0, 6));
    ok(`Visual ${nome} ${tema === 'light' ? 'claro' : 'escuro'}: sem erros de console`, errors.length === 0, errors);
    await t.close();
  }
  function chk(ruins, onde, au, tolerarCortado) {
    const p = [];
    if (au.rolagemH) p.push('rolagem horizontal');
    if (au.foraDaTela.length) p.push('fora da tela: ' + au.foraDaTela.slice(0, 2).join(' | '));
    if (au.cortado.length && !tolerarCortado) p.push('cortado: ' + au.cortado.slice(0, 2).join(' | '));
    if (au.cortado.length && tolerarCortado) p.push('cortado: ' + au.cortado.slice(0, 2).join(' | '));
    if (au.soltos.length) p.push('soltos: ' + au.soltos.join(','));
    if (au.sobrepostos.length) p.push('sobrepostos: ' + au.sobrepostos.slice(0, 2).join(' | '));
    if (p.length) ruins.push(onde + ' → ' + p.join(' ; '));
  }
})().catch((e) => { console.error(e); process.exit(1); });
async function abrirDetalheUI(page, id) { await page.click('#det_' + id + ' > summary'); await page.waitForTimeout(500); }
