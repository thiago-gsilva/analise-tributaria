const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error" && !msg.text().includes("ERR_TUNNEL")) errors.push("CONSOLE ERROR: " + msg.text()); });

  await page.goto("http://localhost:8791/wrapper-local.html");
  await page.waitForTimeout(300);

  // ---- Estado de teste (item 10): faturamento 18.000 / RBT12 216.000 — já é o padrão do app ----
  const estadoBase = await page.evaluate(() => ({ fat: state.empresa.faturamentoMensal, rbt12: rbt12Atual(), anoProjecao: state.hibrido.anoProjecao }));
  console.log("1) Estado base (deve ser o padrão do teste):", JSON.stringify(estadoBase));
  console.log("   -> faturamento=18000 e RBT12=216000:", estadoBase.fat === 18000 && estadoBase.rbt12 === 216000 ? "OK" : "FALHOU");

  // ---- Aba Simples Híbrido ----
  let buttons = await page.$$(".nav-item");
  await buttons[4].click(); // hibrido
  await page.waitForTimeout(250);

  const r1 = await page.evaluate(() => {
    const res = computeAll();
    return {
      dasNormal: res.simples.dasMensal,
      h: res.hibrido,
    };
  });
  console.log("2) computeAll().hibrido:", JSON.stringify(r1.h));
  console.log("   -> DAS Híbrido (sem IBS/CBS) é DIFERENTE do DAS Normal:", r1.h.dasSemIbsCbs !== r1.dasNormal ? "OK" : "FALHOU (idêntico ao Normal!)");
  console.log("   -> ibsDebito > 0 e cbsDebito > 0:", r1.h.ibsDebito > 0 && r1.h.cbsDebito > 0 ? "OK" : "FALHOU");
  console.log("   -> totalMensal = dasSemIbsCbs + ibsLiquido + cbsLiquido:",
    Math.abs(r1.h.totalMensal - (r1.h.dasSemIbsCbs + r1.h.ibsLiquido + r1.h.cbsLiquido)) < 0.01 ? "OK" : "FALHOU");
  console.log("   -> ibsLiquido = ibsDebito - creditoIbs:", Math.abs(r1.h.ibsLiquido - (r1.h.ibsDebito - r1.h.creditoIbs)) < 0.01 ? "OK" : "FALHOU");
  console.log("   -> cbsLiquido = cbsDebito - creditoCbs:", Math.abs(r1.h.cbsLiquido - (r1.h.cbsDebito - r1.h.creditoCbs)) < 0.01 ? "OK" : "FALHOU");
  console.log("   -> total Híbrido é DIFERENTE do total Simples Normal (não aparece mais idêntico):", Math.abs(r1.h.totalMensal - r1.dasNormal) > 0.01 ? "OK" : "FALHOU");

  // Card visual: DAS / IBS / CBS / Crédito IBS / Crédito CBS / TOTAL LÍQUIDO
  const compText = await page.evaluate(() => document.body.innerText);
  console.log("3) Card de composição mostra os 6 rótulos exigidos:");
  ["DAS sem IBS/CBS", "IBS (débito)", "CBS (débito)", "Crédito IBS", "Crédito CBS", "TOTAL LÍQUIDO"].forEach((label) => {
    console.log("   -> contém \"" + label + "\":", compText.includes(label) ? "OK" : "FALHOU");
  });

  // "Ver composição" — accordion expand/collapse
  const accBefore = await page.evaluate(() => document.querySelector("#hibComposicaoAcc").classList.contains("open"));
  await page.click("#hibComposicaoAcc .acc-head");
  await page.waitForTimeout(250);
  const accAfter = await page.evaluate(() => document.querySelector("#hibComposicaoAcc").classList.contains("open"));
  console.log("4) 'Ver composição' expande a memória (accordion abre):", !accBefore && accAfter ? "OK" : "FALHOU");
  const accFormulas = await page.evaluate(() => document.querySelectorAll("#hibComposicaoAcc .formula").length);
  console.log("   -> memória expandida contém fórmulas:", accFormulas >= 3 ? "OK (" + accFormulas + " fórmulas)" : "FALHOU");

  // Ajuste de crédito IBS/CBS via UI
  await page.fill("#hibCredIbs", "50");
  await page.locator("#hibCredIbs").blur();
  await page.waitForTimeout(200);
  const afterCredIbs = await page.evaluate(() => ({ pct: state.hibrido.creditoIbsPct, h: computeAll().hibrido }));
  console.log("5) Ajuste de crédito IBS para 50% via UI:", afterCredIbs.pct === 50 ? "OK (state atualizado)" : "FALHOU");
  console.log("   -> creditoIbs = 50% do ibsDebito:", Math.abs(afterCredIbs.h.creditoIbs - afterCredIbs.h.ibsDebito * 0.5) < 0.01 ? "OK" : "FALHOU");
  await page.fill("#hibCredIbs", "0"); // volta ao padrão para não afetar os próximos testes
  await page.locator("#hibCredIbs").blur();
  await page.waitForTimeout(150);

  // CONTRATANTE — item 7
  const contratanteText = await page.evaluate(() => document.body.innerText);
  console.log("6) Seção CONTRATANTE mostra os campos exigidos:");
  ["Valor da contratação", "Crédito IBS potencial", "Crédito CBS potencial", "Crédito total", "Custo líquido estimado"].forEach((label) => {
    console.log("   -> contém \"" + label + "\":", contratanteText.includes(label) ? "OK" : "FALHOU");
  });
  console.log("   -> alerta de 'não crédito integral' presente:", /crédito integral/i.test(contratanteText) ? "OK" : "FALHOU");

  await page.screenshot({ path: "hibrido-composicao.png", fullPage: true });

  // ---- Aba Comparativo ----
  buttons = await page.$$(".nav-item");
  await buttons[6].click(); // comparativo
  await page.waitForTimeout(400);

  const cmpText = await page.evaluate(() => document.body.innerText);
  console.log("7) Tabela do Comparativo contém as linhas exigidas:");
  ["DAS", "IRPJ", "CSLL", "ISS", "IBS", "CBS", "Crédito IBS", "Crédito CBS", "Total mensal", "Total anual", "Carga efetiva"].forEach((label) => {
    console.log("   -> contém \"" + label + "\":", cmpText.includes(label) ? "OK" : "FALHOU");
  });
  console.log("   -> anotação '(no DAS)' aparece (IBS/CBS inclusos no DAS do Normal):", /\(no DAS\)/.test(cmpText) ? "OK" : "FALHOU");

  const chartsPresent = await page.evaluate(() => ({
    cmp: !!document.getElementById("chartComparativo"),
    comp: !!document.getElementById("chartHibridoComposicao"),
    cmpHasData: typeof CHARTS !== "undefined" && !!CHARTS.comparativo,
    compHasData: typeof CHARTS !== "undefined" && !!CHARTS.hibridoComposicao,
  }));
  console.log("8) Dois gráficos presentes no Comparativo:", JSON.stringify(chartsPresent));
  console.log("   -> ambos os canvases renderizados com Chart.js:", chartsPresent.cmpHasData && chartsPresent.compHasData ? "OK" : "FALHOU");

  const chartData = await page.evaluate(() => ({
    labels: CHARTS.comparativo.data.datasets[0].data,
    compLabels: CHARTS.hibridoComposicao.data.labels,
    compData: CHARTS.hibridoComposicao.data.datasets[0].data,
  }));
  console.log("   -> gráfico de 3 cenários: Normal !== Híbrido:", chartData.labels[0] !== chartData.labels[1] ? "OK" : "FALHOU");
  console.log("   -> gráfico de composição do Híbrido:", JSON.stringify(chartData.compLabels), JSON.stringify(chartData.compData));

  await page.screenshot({ path: "comparativo-tabela.png", fullPage: true });

  // ---- Aba Ponto de Equilíbrio ----
  buttons = await page.$$(".nav-item");
  await buttons[7].click(); // equilibrio
  await page.waitForTimeout(300);

  const eqText = await page.evaluate(() => document.body.innerText);
  console.log("9) Ponto de Equilíbrio mostra PRESTADORA e CONTRATANTE separados:");
  console.log("   -> contém 'PRESTADORA':", /PRESTADORA/.test(eqText) ? "OK" : "FALHOU");
  console.log("   -> contém 'CONTRATANTE':", /CONTRATANTE/.test(eqText) ? "OK" : "FALHOU");
  ["Valor atual do contrato", "Resultado atual", "Valor necessário no Híbrido"].forEach((label) => {
    console.log("   -> PRESTADORA contém \"" + label + "\":", eqText.includes(label) ? "OK" : "FALHOU");
  });
  ["Crédito atual", "Custo líquido atual", "Valor de contrato equivalente no Híbrido"].forEach((label) => {
    console.log("   -> CONTRATANTE contém \"" + label + "\":", eqText.includes(label) ? "OK" : "FALHOU");
  });

  const peVals = await page.evaluate(() => {
    const r = computeAll();
    return { pp: r.pePrestadora, pc: r.peContratante };
  });
  console.log("10) Valores calculados:", JSON.stringify(peVals));
  console.log("    -> pePrestadora.valido:", peVals.pp.valido ? "OK" : "FALHOU (sem solução)");
  console.log("    -> peContratante.valorEquivalenteHibrido numérico:", typeof peVals.pc.valorEquivalenteHibrido === "number" ? "OK" : "FALHOU");

  // Ajuste do crédito atual do contratante via UI
  await page.fill("#peCredAtual", "20");
  await page.locator("#peCredAtual").blur();
  await page.waitForTimeout(200);
  const afterPeCred = await page.evaluate(() => state.equilibrio.creditoContratanteAtualPct);
  console.log("11) Ajuste do crédito atual (contratante) para 20% via UI:", afterPeCred === 20 ? "OK" : "FALHOU");
  await page.fill("#peCredAtual", "0");
  await page.locator("#peCredAtual").blur();
  await page.waitForTimeout(150);

  await page.screenshot({ path: "equilibrio-prestadora-contratante.png", fullPage: true });

  // ---- Regressão: Dashboard não mostra mais Híbrido idêntico ao Normal ----
  buttons = await page.$$(".nav-item");
  await buttons[0].click();
  await page.waitForTimeout(300);
  const dashVals = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".regime-card"));
    return cards.map((c) => ({ nome: c.querySelector("h3").textContent, valor: c.querySelector(".val").textContent }));
  });
  console.log("12) Dashboard — cards de regime:", JSON.stringify(dashVals));
  console.log("    -> Normal e Híbrido têm valores DIFERENTES:", dashVals[0].valor !== dashVals[1].valor ? "OK" : "FALHOU");

  // ---- Regressão: PDF, cálculos e Fator R inalterados (spot-check) ----
  const spotCheck = await page.evaluate(() => {
    const r = computeAll();
    return { anexo: r.simples.anexoUsado, dasMensal: r.simples.dasMensal, fatorR: r.simples.fatorR, irpjPresumido: r.presumido.trimestre.irpjTotal };
  });
  console.log("13) Spot-check Simples/Fator R/Presumido (não deve ter mudado a mecânica):", JSON.stringify(spotCheck));

  console.log("\n=== ERROS DE CONSOLE/PÁGINA ===");
  if (errors.length === 0) console.log("Nenhum erro detectado.");
  else errors.forEach((e) => console.log(e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
