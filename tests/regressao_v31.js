// Regressão tributária v3.1 × v3.2: roda um conjunto fixo de cenários e grava o resultado COMPLETO do motor
// (computeAll) em JSON. Uso: node tests/regressao_v31.js <raiz-do-app> <saida.json>
// Compare as duas saídas com `cmp`/diff: a diferença tem de ser exatamente zero (v3.2 é só UX/UI).
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const out = process.argv[3] || '/tmp/regressao.json';
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
(async () => {
  const t = await open({ root, port: 8801 + Math.floor(Math.random() * 100) });
  const { page } = t;
  await page.waitForFunction(() => typeof CNAE_DATA !== 'undefined' && CNAE_DATA);
  const res = await page.evaluate(() => {
    function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
    const rnd = rng(777), pick = (a) => a[Math.floor(rnd() * a.length)];
    const cn = (q) => CNAE_DATA.subclasses.find((c) => c.codigo.replace(/\D/g, '').startsWith(q)) || null;
    const base = (tipo) => { const s = estadoPadrao(); s.analise.tipo = tipo; return s; };
    const casos = [];
    const add = (nome, fn) => { const s = estadoPadrao(); fn(s); casos.push({ nome, s }); };
    // A, B, C do enunciado
    add('A existente', (s) => { s.analise.tipo = 'existente'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 40000; s.empresa.folha12m = 120000; s.empresa.proLabore = 3000; });
    add('A existente sem folha', (s) => { s.analise.tipo = 'existente'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 40000; });
    add('B nova sem folha', (s) => { s.analise.tipo = 'nova'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 20000; s.fatorR.modo = 'nenhuma'; });
    add('B nova folha prevista', (s) => { s.analise.tipo = 'nova'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 20000; s.fatorR.folhaMensalPrevista = 6000; });
    add('C avulsa 1,5mi/3m nova', (s) => { s.analise.tipo = 'avulsa'; s.empresa.cnae = cn('6201'); s.periodo.meses = 3; s.periodo.receitaModo = 'total'; s.periodo.receitaTotal = 1500000; });
    add('C avulsa existente rbt12', (s) => { s.analise.tipo = 'avulsa'; s.empresa.cnae = cn('6201'); s.periodo.meses = 3; s.periodo.receitaModo = 'total'; s.periodo.receitaTotal = 1500000; s.periodo.empresaAvulsa = 'existente'; s.periodo.rbt12Historico = 600000; });
    add('C avulsa out/2027', (s) => { s.analise.tipo = 'avulsa'; s.empresa.cnae = cn('6201'); s.periodo.meses = 3; s.periodo.mesInicio = 10; s.periodo.receitaModo = 'total'; s.periodo.receitaTotal = 1500000; });
    add('variavel', (s) => { s.analise.tipo = 'existente'; s.empresa.cnae = cn('6201'); s.periodo.receitaModo = 'variavel'; s.periodo.receitasMes = [10000, 12000, 8000, 30000, 15000, 15000, 9000, 40000, 20000, 11000, 13000, 25000]; });
    add('fatorR necessaria', (s) => { s.analise.tipo = 'existente'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 30000; s.fatorR.modo = 'necessaria'; });
    add('fatorR prolabore', (s) => { s.analise.tipo = 'existente'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 30000; s.fatorR.modo = 'prolabore'; s.fatorR.proLaboreMensal = 5000; s.fatorR.salariosMensal = 2000; });
    add('comercio', (s) => { s.analise.tipo = 'existente'; s.empresa.cnae = cn('4781'); s.empresa.faturamentoMensal = 90000; });
    add('excesso', (s) => { s.analise.tipo = 'existente'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 450000; });
    add('sem cnae', (s) => { s.analise.tipo = 'existente'; });
    add('regime atual presumido', (s) => { s.analise.tipo = 'existente'; s.analise.regimeAtual = 'presumido'; s.empresa.cnae = cn('6201'); s.empresa.faturamentoMensal = 60000; s.equilibrio.custosFixos = 12000; s.equilibrio.custosInformados = true; });
    const cods = CNAE_DATA.subclasses.filter((_, i) => i % 60 === 0).map((c) => c.codigo);
    for (let i = 0; i < 70; i++) {
      add('rand' + i, (s) => {
        const tipo = pick(['existente', 'nova', 'avulsa']); s.analise.tipo = tipo;
        s.empresa.cnae = rnd() < 0.8 ? CNAE_DATA.subclasses.find((c) => c.codigo === pick(cods)) : null;
        s.empresa.anoAnalise = pick([2026, 2027, 2028, 2029, 2030]);
        s.periodo.mesInicio = pick([1, 1, 4, 7, 10]);
        if (tipo === 'avulsa') { s.periodo.meses = pick([1, 3, 6, 12, 18]); s.periodo.receitaModo = 'total'; s.periodo.receitaTotal = Math.round(50000 + rnd() * 3000000); s.periodo.empresaAvulsa = pick(['nova', 'existente']); s.periodo.rbt12Historico = rnd() < 0.5 ? Math.round(rnd() * 3000000) : null; }
        else { s.periodo.meses = pick([12, 12, 24, 36]); s.empresa.faturamentoMensal = Math.round(Math.exp(Math.log(3000) + rnd() * Math.log(300000 / 3000))); }
        s.empresa.folha12m = rnd() < 0.4 ? 0 : Math.round(s.empresa.faturamentoMensal * 12 * rnd() * 0.4);
        s.empresa.proLabore = rnd() < 0.5 ? Math.round(rnd() * 8000) : 0;
        s.fatorR.modo = pick(['atual', 'atual', 'prolabore', 'necessaria', 'nenhuma']); s.fatorR.proLaboreMensal = Math.round(rnd() * 9000); s.fatorR.salariosMensal = Math.round(rnd() * 6000);
        s.fatorR.folhaMensalPrevista = rnd() < 0.5 ? Math.round(rnd() * 12000) : null;
        s.empresa.rbt12Modo = pick(['auto', 'manual']); s.empresa.rbt12Manual = Math.round(rnd() * 4000000);
        s.periodo.rbt12Movel = rnd() < 0.5;
        s.analise.regimeAtual = pick([null, 'simples', 'hibrido', 'presumido']);
        s.presumido.issAliq = pick([2, 3, 5]); s.presumido.majoracao = rnd() < 0.3;
        s.hibrido.creditoIbsPct = pick([0, 20, 60]); s.hibrido.creditoCbsPct = pick([0, 20]);
        s.simples.anexoModo = pick(['auto', 'auto', 'manual']); s.simples.anexoManual = pick(['I', 'II', 'III', 'IV', 'V']);
        s.equilibrio.custosFixos = Math.round(rnd() * 30000); s.equilibrio.custosInformados = rnd() < 0.5;
      });
    }
    return casos.map((c) => {
      aplicarInputs(c.s);
      const r = computeAll();
      const j = JSON.stringify(r, (k, v) => (k === 'timestamp' ? 'T' : typeof v === 'function' ? undefined : (typeof v === 'number' && !isFinite(v) ? String(v) : v)));
      const resumo = { nome: c.nome, regimes: r.regimes.map((x) => [x.id, x.total, x.cargaPct, x.elegivel]), melhor: r.melhor && r.melhor.id, economia: r.economia, confianca: r.confianca, conclusao: r.conclusao, pend: r.pendencias.map((p) => p.id) };
      return { resumo, full: j };
    });
  });
  fs.writeFileSync(out, JSON.stringify(res, null, 0));
  console.log('cenários:', res.length, '→', out, '(' + Math.round(fs.statSync(out).size / 1024) + ' KB)');
  await t.close();
})().catch((e) => { console.error(e); process.exit(1); });
