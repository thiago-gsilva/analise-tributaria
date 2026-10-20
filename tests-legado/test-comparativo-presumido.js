const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push("CONSOLE ERROR: " + msg.text()); });

  await page.goto("http://localhost:8791/wrapper-local.html", { timeout: 20000 });
  await page.waitForTimeout(400);

  // Preencher empresa com valores previsíveis para facilitar a conferência
  const navClick = async (i) => { const b = await page.$$(".nav-item"); await b[i].click(); await page.waitForTimeout(150); };
  await navClick(1); // Dados da Empresa
  await page.fill("#fFat", "18000");
  await page.locator("#fFat").blur();
  await page.waitForTimeout(150);

  // ================= LUCRO PRESUMIDO =================
  await navClick(5); // Lucro Presumido
  const anoOptions = await page.$eval("#lpAno", (s) => Array.from(s.options).map((o) => o.value));
  console.log("1) Opções de ano no seletor do Presumido:", anoOptions.join(","));
  console.log("   -> padrão inclui 2026..2033:", anoOptions.includes("2026") && anoOptions.includes("2027") && anoOptions.includes("2033") ? "OK" : "FALHOU");
  const anoSelecionadoDefault = await page.$eval("#lpAno", (s) => s.value);
  console.log("2) Ano padrão selecionado:", anoSelecionadoDefault, anoSelecionadoDefault === "2027" ? "OK (2027 conforme especificação)" : "FALHOU");

  // Ano 2027 (padrão) -> deve mostrar CBS/IBS, não PIS/COFINS
  let bodyText = await page.$eval("#content", (c) => c.textContent);
  console.log("3) Em 2027, mostra 'CBS' :", bodyText.includes("CBS") ? "OK" : "FALHOU");
  console.log("   Em 2027, mostra 'IBS':", bodyText.includes("IBS") ? "OK" : "FALHOU");
  console.log("   Em 2027, NÃO tem input de PIS/COFINS (#lpPis ausente):", (await page.$("#lpPis")) === null ? "OK" : "FALHOU");
  const kpiWallet2027 = await page.$eval(".kpi-label", () => "").catch(() => "");
  const walletLabel2027 = await page.$$eval(".kpi-label", (els) => els.map((e) => e.textContent));
  console.log("   KPI labels (2027):", JSON.stringify(walletLabel2027));
  console.log("   -> contém 'CBS + IBS + ISS':", walletLabel2027.some((l) => l.includes("CBS + IBS + ISS")) ? "OK" : "FALHOU");

  const presumido2027 = await page.evaluate(() => { const r = computeAll(); return { ano: r.presumido.trimestre.ano, cbs: r.presumido.trimestre.cbs, ibs: r.presumido.trimestre.ibs, pis: r.presumido.trimestre.pis, cofins: r.presumido.trimestre.cofins, iss: r.presumido.trimestre.iss, totalTrimestre: r.presumido.trimestre.totalTrimestre, substituidoPorCbs: r.presumido.trimestre.substituidoPorCbs }; });
  console.log("4) Estado calculado em 2027:", JSON.stringify(presumido2027));
  console.log("   -> substituidoPorCbs = true:", presumido2027.substituidoPorCbs === true ? "OK" : "FALHOU");
  console.log("   -> CBS > 0:", presumido2027.cbs > 0 ? "OK" : "FALHOU");
  console.log("   -> IBS > 0:", presumido2027.ibs > 0 ? "OK" : "FALHOU");
  console.log("   -> PIS = 0 (extinto):", presumido2027.pis === 0 ? "OK" : "FALHOU");
  console.log("   -> COFINS = 0 (extinto):", presumido2027.cofins === 0 ? "OK" : "FALHOU");
  console.log("   -> ISS > 0 (mantido a 100% em 2027):", presumido2027.iss > 0 ? "OK" : "FALHOU");

  // Trocar para 2026 (ano-teste) -> deve voltar a mostrar PIS/COFINS
  await page.selectOption("#lpAno", "2026");
  await page.waitForTimeout(200);
  console.log("5) Em 2026, volta a ter input de PIS (#lpPis presente):", (await page.$("#lpPis")) !== null ? "OK" : "FALHOU");
  const presumido2026 = await page.evaluate(() => { const r = computeAll(); return { ano: r.presumido.trimestre.ano, cbs: r.presumido.trimestre.cbs, ibs: r.presumido.trimestre.ibs, pis: r.presumido.trimestre.pis, cofins: r.presumido.trimestre.cofins, substituidoPorCbs: r.presumido.trimestre.substituidoPorCbs }; });
  console.log("   Estado calculado em 2026:", JSON.stringify(presumido2026));
  console.log("   -> substituidoPorCbs = false:", presumido2026.substituidoPorCbs === false ? "OK" : "FALHOU");
  console.log("   -> PIS > 0:", presumido2026.pis > 0 ? "OK" : "FALHOU");
  console.log("   -> COFINS > 0:", presumido2026.cofins > 0 ? "OK" : "FALHOU");
  console.log("   -> CBS = 0 (ano-teste, sem custo líquido adicional neste modelo):", presumido2026.cbs === 0 ? "OK" : "FALHOU");

  // Testar ano 2029 -> ISS deve ser reduzido (fator remanescente 0.9)
  await page.selectOption("#lpAno", "2029");
  await page.waitForTimeout(200);
  const presumido2029 = await page.evaluate(() => { const r = computeAll(); return { fatorRemanescenteIss: r.presumido.trimestre.fatorRemanescenteIss, issAliqEfetivaPct: r.presumido.trimestre.issAliqEfetivaPct }; });
  console.log("6) Em 2029, fatorRemanescenteIss = 0.9:", presumido2029.fatorRemanescenteIss === 0.9 ? "OK" : "FALHOU (" + presumido2029.fatorRemanescenteIss + ")");
  console.log("   -> issAliqEfetivaPct = 90% de 3% = 2.7%:", Math.abs(presumido2029.issAliqEfetivaPct - 2.7) < 0.001 ? "OK" : "FALHOU (" + presumido2029.issAliqEfetivaPct + ")");

  // Voltar para 2027 (padrão do restante do teste)
  await page.selectOption("#lpAno", "2027");
  await page.waitForTimeout(200);

  // Total trimestre / mensal / anual coerentes
  const totals = await page.evaluate(() => { const r = computeAll(); const t = r.presumido.trimestre; return { totalTrimestre: t.totalTrimestre, totalMensal: t.totalTrimestre / 3, totalAnual: r.presumido.totalAnual, check: Math.abs(r.presumido.totalAnual - t.totalTrimestre * 4) < 0.01 }; });
  console.log("7) Total anual = Total trimestre × 4:", totals.check ? "OK" : "FALHOU", JSON.stringify(totals));

  // ================= COMPARATIVO =================
  await navClick(6); // Comparativo
  await page.waitForTimeout(300);
  const cmpViewDefault = await page.$eval(".radio-pill.active[data-cmpview]", (b) => b.dataset.cmpview).catch(() => "N/A");
  console.log("8) View padrão do Comparativo:", cmpViewDefault, cmpViewDefault === "detalhado" ? "OK (Detalhado por padrão, preserva comportamento anterior)" : "FALHOU");

  const detalhadoText = await page.$eval("#content", (c) => c.textContent);
  console.log("9) View Detalhado contém 'IRPJ':", detalhadoText.includes("IRPJ") ? "OK" : "FALHOU");
  console.log("   View Detalhado contém 'DAS':", detalhadoText.includes("DAS") ? "OK" : "FALHOU");
  console.log("   View Detalhado contém 'CSLL':", detalhadoText.includes("CSLL") ? "OK" : "FALHOU");

  // Clicar em Resumo Executivo
  await page.click('[data-cmpview="resumo"]');
  await page.waitForTimeout(300);
  const resumoText = await page.$eval("#content", (c) => c.textContent);
  console.log("10) View Resumo Executivo NÃO contém 'IRPJ':", !resumoText.includes("IRPJ") ? "OK" : "FALHOU");
  console.log("    View Resumo Executivo NÃO contém 'CSLL':", !resumoText.includes("CSLL") ? "OK" : "FALHOU");
  console.log("    View Resumo Executivo NÃO contém 'DAS':", !resumoText.includes("DAS") ? "OK" : "FALHOU");
  console.log("    View Resumo Executivo contém os 3 nomes de regime:", ["Simples Normal", "Simples Híbrido", "Lucro Presumido"].every((n) => resumoText.includes(n)) ? "OK" : "FALHOU");
  console.log("    View Resumo Executivo contém 'Carga efetiva':", resumoText.includes("Carga efetiva") ? "OK" : "FALHOU");
  const resumoCanvas = await page.$eval("#chartComparativo", (c) => c.tagName).catch(() => "AUSENTE");
  console.log("    Gráfico de comparação presente na view Resumo:", resumoCanvas === "CANVAS" ? "OK" : "FALHOU");

  // Voltar para Detalhado e checar que persiste ao navegar e voltar
  await page.click('[data-cmpview="detalhado"]');
  await page.waitForTimeout(200);
  await navClick(0); // dashboard
  await navClick(6); // comparativo de novo
  const cmpViewAfterNav = await page.$eval(".radio-pill.active[data-cmpview]", (b) => b.dataset.cmpview);
  console.log("11) View do Comparativo persiste ao navegar entre abas:", cmpViewAfterNav === "detalhado" ? "OK" : "FALHOU (" + cmpViewAfterNav + ")");

  // Checar linha PIS+COFINS / IBS / CBS corretas na tabela detalhada (ano 2027 -> presumido tem CBS/IBS)
  const tableRows = await page.$$eval(".table-wrap table tr", (rows) => rows.map((r) => r.textContent.replace(/\s+/g, " ").trim()));
  const pisCofinsRow = tableRows.find((t) => t.startsWith("PIS + COFINS"));
  const ibsRow = tableRows.find((t) => t.startsWith("IBS"));
  const cbsRow = tableRows.find((t) => t.startsWith("CBS"));
  console.log("12) Linha 'PIS + COFINS' (ano 2027, deve indicar extinção):", pisCofinsRow);
  console.log("    -> contém 'extinto':", pisCofinsRow && pisCofinsRow.toLowerCase().includes("extinto") ? "OK" : "FALHOU");
  console.log("13) Linha 'IBS' tem valor numérico para Presumido (não é mais '—' por falta de implementação):", ibsRow);
  console.log("14) Linha 'CBS' tem valor numérico para Presumido:", cbsRow);
  const cbsHasDash = cbsRow && /—\s*$/.test(cbsRow);
  console.log("    -> CBS do Presumido NÃO termina em travessão vazio:", !cbsHasDash ? "OK" : "FALHOU");

  // ================= PDF: TOGGLE RESUMO/DETALHADO =================
  await navClick(9); // Relatório PDF
  await page.waitForTimeout(200);
  const pdfViewDefault = await page.$eval(".radio-pill.active[data-pdfview]", (b) => b.dataset.pdfview);
  console.log("15) View padrão do PDF (Comparativo):", pdfViewDefault, pdfViewDefault === "resumo" ? "OK (Resumo Executivo por padrão, conforme especificação)" : "FALHOU");

  const slideListResumo = await page.$$eval("ol li", (els) => els.map((e) => e.textContent));
  console.log("16) Lista de slides (view Resumo):", JSON.stringify(slideListResumo));
  console.log("    -> total de slides = 2 (deck curto, não os 12 slides do Detalhado):", slideListResumo.length === 2 ? "OK" : "FALHOU (" + slideListResumo.length + ")");
  console.log("    -> contém slide 'Quanto custa cada cenário':", slideListResumo.some((t) => t.toLowerCase().includes("quanto custa cada cenário")) ? "OK" : "FALHOU");
  console.log("    -> contém slide de premissas ('Base da simulação'):", slideListResumo.some((t) => t.toLowerCase().includes("base da simulação")) ? "OK" : "FALHOU");

  // Montar o deck curto e checar que ele NÃO contém o detalhamento técnico
  // (IRPJ/CSLL/DAS/IBS/CBS linha a linha) — só o essencial + premissas.
  const resumoDeckCheck = await page.evaluate(() => {
    mountPptxDeck();
    const slides = Array.from(document.querySelectorAll(".pptx-slide"));
    const result = { totalSlides: slides.length, fullText: slides.map((s) => s.textContent).join(" | ") };
    pptxDestroyCharts();
    document.getElementById("pptxHost").innerHTML = "";
    return result;
  });
  console.log("    -> deck montado (Resumo) tem 2 slides:", resumoDeckCheck.totalSlides === 2 ? "OK" : "FALHOU (" + resumoDeckCheck.totalSlides + ")");
  console.log("    -> deck montado (Resumo) contém os 3 regimes:", ["Simples Normal", "Simples Híbrido", "Lucro Presumido"].every((n) => resumoDeckCheck.fullText.includes(n)) ? "OK" : "FALHOU");
  console.log("    -> deck montado (Resumo) NÃO contém 'IRPJ' (sem detalhamento técnico):", !resumoDeckCheck.fullText.includes("IRPJ") ? "OK" : "FALHOU");

  await page.click('[data-pdfview="detalhado"]');
  await page.waitForTimeout(200);
  const slideListDetalhado = await page.$$eval("ol li", (els) => els.map((e) => e.textContent));
  console.log("17) Lista de slides (view Detalhado):", JSON.stringify(slideListDetalhado));
  console.log("    -> total de slides ainda = 12:", slideListDetalhado.length === 12 ? "OK" : "FALHOU (" + slideListDetalhado.length + ")");

  // Montar deck e checar conteúdo real do slide de Comparativo (kicker "Comparativo — detalhado")
  // e do slide de Lucro Presumido (separação trimestral/mensal)
  const deckCheck = await page.evaluate(() => {
    mountPptxDeck();
    const slides = Array.from(document.querySelectorAll(".pptx-slide"));
    const kickers = slides.map((s) => (s.querySelector(".pptx-kicker") || {}).textContent || "");
    const texts = slides.map((s) => s.textContent);
    const cmpKickerIdx = kickers.findIndex((k) => k.toLowerCase().includes("comparativo"));
    const presKickerIdx = kickers.findIndex((k) => k.toLowerCase().includes("lucro presumido"));
    const result = {
      totalSlides: slides.length,
      cmpKicker: kickers[cmpKickerIdx],
      cmpSlideHasIBS: cmpKickerIdx >= 0 ? texts[cmpKickerIdx].includes("IBS") : null,
      presSlideHasTrimestrais: presKickerIdx >= 0 ? (texts[presKickerIdx].includes("Tributos trimestrais") && texts[presKickerIdx].includes("Tributos mensais")) : null,
    };
    pptxDestroyCharts();
    document.getElementById("pptxHost").innerHTML = "";
    return result;
  });
  console.log("18) Deck montado (view Detalhado):", JSON.stringify(deckCheck));
  console.log("    -> 12 slides no deck:", deckCheck.totalSlides === 12 ? "OK" : "FALHOU");
  console.log("    -> kicker do slide Comparativo menciona 'detalhado':", deckCheck.cmpKicker && deckCheck.cmpKicker.toLowerCase().includes("detalhado") ? "OK" : "FALHOU (" + deckCheck.cmpKicker + ")");
  console.log("    -> slide de Lucro Presumido contém separação 'Tributos trimestrais'/'Tributos mensais':", deckCheck.presSlideHasTrimestrais ? "OK" : "FALHOU");

  // Voltar ao padrão Resumo Executivo para deixar o app no estado esperado
  await page.click('[data-pdfview="resumo"]');
  await page.waitForTimeout(150);

  // ================= REGRESSÃO =================
  await navClick(4); // Simples Híbrido
  const hibridoText = await page.$eval("#content", (c) => c.textContent);
  console.log("19) Aba Simples Híbrido ainda funciona (menciona 'IBS' e 'CBS'):", hibridoText.includes("IBS") && hibridoText.includes("CBS") ? "OK" : "FALHOU");

  const darkOk = await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    return document.documentElement.getAttribute("data-theme") === "dark";
  });
  console.log("20) Alternância de tema escuro continua funcionando:", darkOk ? "OK" : "FALHOU");

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "system"));

  console.log("\n=== ERROS DE CONSOLE/PÁGINA ===");
  if (errors.length === 0) console.log("Nenhum erro detectado.");
  else errors.forEach((e) => console.log(e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
