// Experiência real (v3.2): preenche A) empresa existente, B) empresa nova sem folha, C) avulsa R$ 1,5 mi/3 meses
// pela interface, como um usuário, e mede: campos visíveis, campos preenchidos, rolagem, textos/elementos por tela.
// Uso: node tests/ux_cenarios.js <raiz> <pasta-de-saida> [--shots]
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const { chooseCnae } = require('./helpers');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const outDir = process.argv[3] || '/tmp/ux'; fs.mkdirSync(outDir, { recursive: true });
const shots = process.argv.includes('--shots');
const VIEWS = { desktop: { width: 1920, height: 1080 }, notebook: { width: 1366, height: 768 }, mobile: { width: 390, height: 844 } };
async function medir(page) {
  return page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; if (!r.width || !r.height) return false; let p = e.parentElement; while (p) { if (p.tagName === 'DETAILS' && !p.open && !(e.closest('summary') && e.closest('summary').parentElement === p)) return false; p = p.parentElement; } return true; };
    const root = document.getElementById('stepRoot');
    const campos = [...root.querySelectorAll('input:not([type=file]):not([type=hidden]), select, textarea')].filter(vis);
    const botoes = [...root.querySelectorAll('button, .btn, summary')].filter(vis);
    const cards = [...root.querySelectorAll('.panel, .choice, .regime, .hero, .note, .stat, .card')].filter(vis);
    const badges = [...root.querySelectorAll('.badge')].filter(vis);
    const texto = root.innerText.replace(/\s+/g, ' ').trim();
    const charts = [...root.querySelectorAll('canvas')].filter(vis).length;
    return { campos: campos.length, botoes: botoes.length, cards: cards.length, badges: badges.length, charts, palavras: texto.split(' ').length, alturaPagina: document.documentElement.scrollHeight, rolagemH: document.documentElement.scrollWidth > innerWidth + 1, details: [...root.querySelectorAll('details')].length };
  });
}
async function snap(page, nome, view, tema) { if (!shots) return; await page.screenshot({ path: path.join(outDir, `${nome}_${view}_${tema}.png`), fullPage: true }); }
const money = async (page, id, v) => { await page.fill('#' + id, v); await page.press('#' + id, 'Tab'); await page.waitForTimeout(150); };
(async () => {
  const resumo = {};
  for (const tema of ['light', 'dark']) for (const view of Object.keys(VIEWS)) {
    if (!shots && (tema === 'dark' || view !== 'notebook')) continue;
    const t = await open({ root, port: 8901 + Math.floor(Math.random() * 90), viewport: VIEWS[view], colorScheme: tema });
    const { page, errors } = t; const R = {};
    await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
    const reset = async () => { await page.evaluate(() => { resetState(); }); await page.waitForTimeout(200); };
    const cen = {
      A_existente: async () => { await page.click('[data-tipo="existente"]'); await page.waitForTimeout(250); R.digitado = 0; await chooseCnae(page, '6201'); R.digitado++; await medirTela('preench_vazio'); await money(page, 'f_empresa_faturamentoMensal', '40.000,00'); R.digitado++; await money(page, 'f_empresa_folha12m', '120.000,00'); R.digitado++; },
      B_nova_sem_folha: async () => { await page.click('[data-tipo="nova"]'); await page.waitForTimeout(250); R.digitado = 0; await chooseCnae(page, '6201'); R.digitado++; await money(page, 'f_empresa_faturamentoMensal', '20.000,00'); R.digitado++; const b = await page.$('[data-seg="fatorR.modo"][data-val="nenhuma"]'); if (b) { await b.click(); await page.waitForTimeout(200); R.digitado++; } },
      C_avulsa_1_5mi: async () => { await page.click('[data-tipo="avulsa"]'); await page.waitForTimeout(250); R.digitado = 0; await chooseCnae(page, '6201'); R.digitado++; await money(page, 'f_periodo_receitaTotal', '1.500.000,00'); R.digitado++; },
    };
    async function medirTela(k) { R[k] = await medir(page); }
    for (const k of Object.keys(cen)) {
      await reset(); for (const key of Object.keys(R)) delete R[key];
      await page.evaluate(() => setActive('inicio')); await page.waitForTimeout(250);
      await medirTela('inicio'); await snap(page, k + '_1inicio', view, tema);
      await cen[k]();
      await medirTela('preench'); await snap(page, k + '_2preench', view, tema);
      await page.evaluate(() => setActive('resultados')); await page.waitForTimeout(900);
      await medirTela('result'); await snap(page, k + '_3result', view, tema);
      await page.evaluate(() => setActive('relatorio')); await page.waitForTimeout(500);
      await medirTela('relat'); await snap(page, k + '_4relat', view, tema);
      resumo[`${k}|${view}|${tema}`] = JSON.parse(JSON.stringify(R));
      resumo[`${k}|${view}|${tema}`].erros = errors.slice();
    }
    await t.close();
  }
  fs.writeFileSync(path.join(outDir, 'medidas.json'), JSON.stringify(resumo, null, 1));
  for (const [k, v] of Object.entries(resumo)) if (k.includes('notebook|light')) console.log(k, JSON.stringify({ digitado: v.digitado, inicio: v.inicio, preench: v.preench, result: v.result, relat: v.relat }));
})().catch((e) => { console.error(e); process.exit(1); });
