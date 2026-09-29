const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error" && !msg.text().includes("ERR_TUNNEL")) errors.push("CONSOLE ERROR: " + msg.text()); });

  await page.goto("http://localhost:8791/wrapper-local.html");
  await page.waitForTimeout(300);

  // Preenche nome/CNPJ para os testes de capa/rodapé
  let buttons = await page.$$(".nav-item");
  await buttons[1].click(); // Dados da Empresa
  await page.waitForTimeout(200);
  await page.fill("#fNome", "Clínica Modelo Ltda.");
  await page.locator("#fNome").blur();
  await page.fill("#fCnpj", "12.345.678/0001-90");
  await page.locator("#fCnpj").blur();
  await page.waitForTimeout(150);

  // ---- Aba Relatório PDF ----
  buttons = await page.$$(".nav-item");
  await buttons[9].click(); // relatorio
  await page.waitForTimeout(250);

  const relText = await page.evaluate(() => document.body.innerText);
  console.log("1) Aba Relatório PDF menciona '16:9' e lista de slides:", /16:9/.test(relText) ? "OK" : "FALHOU");
  const hasPreviewBtn = await page.$("#btnPreviewPdf");
  const hasExportBtn = await page.$("#btnGerarPdf");
  console.log("   -> #btnPreviewPdf existe:", hasPreviewBtn ? "OK" : "FALHOU");
  console.log("   -> #btnGerarPdf existe:", hasExportBtn ? "OK" : "FALHOU");

  // Formato padrão é "Resumo Executivo": deck curto (2 páginas), não os 12
  // slides do deck técnico completo — verificado aqui antes de alternar para
  // "Detalhado", que é o formato que o restante deste arquivo testa a fundo.
  const resumoDefsCheck = await page.evaluate(() => buildResumoExecutivoSlideDefs(computeAll()).length);
  console.log("1b) Formato 'Resumo Executivo' (padrão) gera deck curto:", resumoDefsCheck, resumoDefsCheck <= 2 ? "OK" : "FALHOU");

  await page.click('[data-pdfview="detalhado"]');
  await page.waitForTimeout(200);

  const slideDefsCheck = await page.evaluate(() => {
    const defs = buildPptxSlideDefs(computeAll());
    return { total: defs.length, titles: defs.map((d) => d.title) };
  });
  console.log("2) buildPptxSlideDefs() gera slides (formato Detalhado):", JSON.stringify(slideDefsCheck));
  console.log("   -> entre 10 e 12 slides:", slideDefsCheck.total >= 10 && slideDefsCheck.total <= 12 ? "OK" : "FALHOU");

  // ---- Abrir pré-visualização ----
  await page.click("#btnPreviewPdf");
  await page.waitForTimeout(400);

  const overlayVisible = await page.evaluate(() => !!document.getElementById("pptxOverlay") && !!document.querySelector(".pptx-host.pptx-open"));
  console.log("3) Pré-visualização abre em tela cheia:", overlayVisible ? "OK" : "FALHOU");

  const slideCount = await page.evaluate(() => document.querySelectorAll(".pptx-slide").length);
  console.log("   -> número de slides no DOM:", slideCount, slideCount === slideDefsCheck.total ? "OK" : "FALHOU");

  // Verifica dimensões 16:9 de cada slide (1280x720)
  const dims = await page.evaluate(() => Array.from(document.querySelectorAll(".pptx-slide")).map((s) => ({ w: s.offsetWidth, h: s.offsetHeight })));
  const all169 = dims.every((d) => d.w === 1280 && d.h === 720);
  console.log("4) Todos os slides são 1280×720 (16:9):", all169 ? "OK" : "FALHOU (" + JSON.stringify(dims.slice(0, 3)) + ")");

  // Verifica que a capa (slide 1) mostra empresa/CNPJ/ano
  const coverText = await page.evaluate(() => document.querySelectorAll(".pptx-slide")[0].innerText);
  console.log("5) Capa contém empresa, CNPJ e ano:");
  console.log("   -> 'Clínica Modelo Ltda.':", coverText.includes("Clínica Modelo Ltda.") ? "OK" : "FALHOU");
  console.log("   -> CNPJ:", coverText.includes("12.345.678/0001-90") ? "OK" : "FALHOU");
  console.log("   -> Ano-calendário:", /Ano-calendário/.test(coverText) ? "OK" : "FALHOU");

  // Verifica rodapé em todos os slides: empresa, data, "Slide N de TOTAL"
  const footChecks = await page.evaluate(() => Array.from(document.querySelectorAll(".pptx-slide")).map((s, i) => {
    const foot = s.querySelector(".pptx-foot");
    return foot ? foot.innerText : null;
  }));
  const allFootOk = footChecks.every((f, i) => f && f.includes("Clínica Modelo") && new RegExp("Slide " + String(i + 1).padStart(2, "0") + " de " + footChecks.length).test(f));
  console.log("6) Rodapé (empresa + data + número do slide) em todos os slides:", allFootOk ? "OK" : "FALHOU (" + JSON.stringify(footChecks) + ")");

  // Verifica slide do Híbrido (destaque: DAS + IBS + CBS - créditos = total, não só o total)
  const hibridoSlideText = await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll(".pptx-slide")).find((el) => el.innerText.includes("créditos = total líquido"));
    return s ? s.innerText : null;
  });
  console.log("7) Slide do Híbrido tem destaque (não mostra só o total):");
  console.log("   -> slide encontrado:", hibridoSlideText ? "OK" : "FALHOU");
  if (hibridoSlideText) {
    // .fl usa text-transform:uppercase (CSS), então innerText reflete o texto
    // renderizado em maiúsculas — comparação case-insensitive é a correta aqui.
    const upper = hibridoSlideText.toUpperCase();
    ["DAS (SEM IBS/CBS)", "IBS", "CBS", "CRÉDITOS", "TOTAL LÍQUIDO"].forEach((label) => {
      console.log("   -> contém \"" + label + "\":", upper.includes(label) ? "OK" : "FALHOU");
    });
  }

  // Verifica no-overflow: para cada slide, nenhum elemento filho direto do body deve
  // ultrapassar a área do slide (scrollWidth/scrollHeight <= dimensões do slide + margem)
  const overflowCheck = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll(".pptx-slide").forEach((s, i) => {
      const bodyEl = s.querySelector(".pptx-body") || s;
      const overflowsX = bodyEl.scrollWidth > bodyEl.clientWidth + 2;
      const overflowsY = bodyEl.scrollHeight > bodyEl.clientHeight + 2;
      if (overflowsX || overflowsY) results.push({ i, overflowsX, overflowsY, sw: bodyEl.scrollWidth, cw: bodyEl.clientWidth, sh: bodyEl.scrollHeight, ch: bodyEl.clientHeight });
    });
    return results;
  });
  console.log("8) Nenhum slide com conteúdo cortado (overflow do corpo do slide):", overflowCheck.length === 0 ? "OK" : "FALHOU " + JSON.stringify(overflowCheck));

  // Navegação: contador, próximo, anterior, teclado
  const counter1 = await page.evaluate(() => document.getElementById("pptxCounter").textContent);
  console.log("9) Contador inicial:", counter1, counter1.startsWith("1 / ") ? "OK" : "FALHOU");
  await page.click("#pptxNext");
  await page.waitForTimeout(150);
  const counter2 = await page.evaluate(() => document.getElementById("pptxCounter").textContent);
  console.log("   -> após 'Próximo':", counter2, counter2.startsWith("2 / ") ? "OK" : "FALHOU");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  const counter3 = await page.evaluate(() => document.getElementById("pptxCounter").textContent);
  console.log("   -> após seta direita (teclado):", counter3, counter3.startsWith("3 / ") ? "OK" : "FALHOU");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(150);
  const counter4 = await page.evaluate(() => document.getElementById("pptxCounter").textContent);
  console.log("   -> após seta esquerda (teclado):", counter4, counter4.startsWith("2 / ") ? "OK" : "FALHOU");

  // Navega até o último slide (Fontes) e confere botão "Próximo" desabilitado
  const total = slideDefsCheck.total;
  for (let i = 0; i < total + 2; i++) { await page.click("#pptxNext", { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(50); }
  const lastCounter = await page.evaluate(() => document.getElementById("pptxCounter").textContent);
  const nextDisabled = await page.evaluate(() => document.getElementById("pptxNext").disabled);
  console.log("10) No último slide, contador = 'N / N' e botão Próximo desabilitado:", lastCounter === (total + " / " + total) && nextDisabled ? "OK" : "FALHOU (" + lastCounter + ")");

  // Slide de Fontes é o último (kicker "Fontes")
  const lastSlideKicker = await page.evaluate(() => document.querySelector(".pptx-slide.pptx-active .pptx-kicker").textContent);
  console.log("    -> último slide é o de 'Fontes':", lastSlideKicker, /Fontes/.test(lastSlideKicker) ? "OK" : "FALHOU");

  await page.screenshot({ path: "pdf-preview-slide-fontes.png" });

  // Volta para o slide 1 (via chamada direta, mais robusta que cliques em loop)
  await page.evaluate(() => pptxShowSlide(0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: "pdf-preview-capa.png" });

  // Vai para o slide do Híbrido (5) para conferir visual
  await page.evaluate(() => { document.getElementById("pptxNext").click(); document.getElementById("pptxNext").click(); document.getElementById("pptxNext").click(); document.getElementById("pptxNext").click(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "pdf-preview-hibrido.png" });

  // ---- Fechar pré-visualização ----
  await page.click("#pptxClose");
  await page.waitForTimeout(200);
  const overlayGone = await page.evaluate(() => !document.getElementById("pptxOverlay"));
  console.log("11) Fechar pré-visualização remove o overlay:", overlayGone ? "OK" : "FALHOU");

  // ---- Exportação real do PDF (via html2canvas + jsPDF), sem downloads.save
  //      disponível neste ambiente de teste -> cai no catch com mensagem amigável,
  //      mas o build do PDF em si (doc + páginas) é verificado chamando a função
  //      interna diretamente. ----
  const pdfBuildCheck = await page.evaluate(async () => {
    mountPptxDeck();
    const host = document.getElementById("pptxHost");
    const slides = Array.from(document.querySelectorAll(".pptx-slide"));
    const { jsPDF } = window.jspdf;
    let doc = null;
    for (let i = 0; i < slides.length; i++) {
      const canvas = await html2canvas(slides[i], { width: 1280, height: 720, scale: 1.5, backgroundColor: "#ffffff", logging: false });
      if (!doc) doc = new jsPDF({ unit: "pt", format: [1280, 720], orientation: "landscape", compress: true });
      else doc.addPage([1280, 720], "landscape");
      doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 1280, 720);
    }
    const pages = doc.internal.getNumberOfPages();
    const blob = doc.output("blob");
    pptxDestroyCharts();
    host.innerHTML = "";
    return { pages, blobSize: blob.size, pageW: doc.internal.pageSize.getWidth(), pageH: doc.internal.pageSize.getHeight() };
  });
  console.log("12) PDF gerado via html2canvas+jsPDF:", JSON.stringify(pdfBuildCheck));
  console.log("    -> número de páginas = número de slides:", pdfBuildCheck.pages === total ? "OK" : "FALHOU");
  console.log("    -> formato de página 16:9 (1280×720 pt):", pdfBuildCheck.pageW === 1280 && pdfBuildCheck.pageH === 720 ? "OK" : "FALHOU");
  console.log("    -> blob gerado com tamanho > 0:", pdfBuildCheck.blobSize > 0 ? "OK (" + (pdfBuildCheck.blobSize / 1024 / 1024).toFixed(2) + " MB)" : "FALHOU");

  // ---- Fluxo de exportação real pelo botão. Sem window.claude (fora do
  //      claude.ai) o código cai no fallback de download padrão do navegador
  //      (Blob + <a download>) — verificamos que o evento de download do
  //      Chromium realmente dispara, com um PDF de tamanho > 0. ----
  const exportT0 = Date.now();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.click("#btnGerarPdf"),
  ]);
  console.log("(exportação via botão levou " + (Date.now() - exportT0) + "ms)");
  console.log("13) Download disparado pelo botão 'Exportar PDF':", download ? "OK" : "FALHOU");
  console.log("    -> nome do arquivo termina em .pdf:", /\.pdf$/.test(download.suggestedFilename()) ? "OK (" + download.suggestedFilename() + ")" : "FALHOU");
  const dlPath = await download.path();
  const dlSize = dlPath ? require("fs").statSync(dlPath).size : 0;
  console.log("    -> arquivo baixado com tamanho > 0:", dlSize > 0 ? "OK (" + (dlSize / 1024 / 1024).toFixed(2) + " MB)" : "FALHOU");
  await page.waitForFunction(() => {
    const t = document.getElementById("pdfStatus").innerText;
    return t && !t.includes("Gerando");
  }, { timeout: 10000 }).catch(() => {});
  const statusAfterExport = await page.evaluate(() => document.getElementById("pdfStatus").innerText);
  console.log("    -> mensagem de status pós-download:", statusAfterExport);
  console.log("    -> exibe mensagem de sucesso, sem travar a UI:", /sucesso/i.test(statusAfterExport) ? "OK" : "FALHOU");
  const exportBtnEnabled = await page.evaluate(() => !document.getElementById("btnGerarPdf").disabled);
  console.log("    -> botão reabilitado após a tentativa:", exportBtnEnabled ? "OK" : "FALHOU");

  // ---- Regressão: modo noturno, CNAEs e Simples Híbrido inalterados ----
  buttons = await page.$$(".nav-item");
  await buttons[4].click(); // hibrido
  await page.waitForTimeout(250);
  const hibridoTabCheck = await page.evaluate(() => {
    const res = computeAll();
    return { dasSemIbsCbs: res.hibrido.dasSemIbsCbs, totalMensal: res.hibrido.totalMensal, dasNormal: res.simples.dasMensal };
  });
  console.log("14) Aba Simples Híbrido (interativa) continua com composição separada:", JSON.stringify(hibridoTabCheck));
  console.log("    -> Híbrido ainda difere do Simples Normal:", Math.abs(hibridoTabCheck.totalMensal - hibridoTabCheck.dasNormal) > 0.01 ? "OK" : "FALHOU");

  const themeBtn = await page.$('.theme-btn[data-theme-choice="dark"]');
  await themeBtn.click();
  await page.waitForTimeout(300);
  const themeApplied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  console.log("15) Modo escuro do sistema continua funcionando (não foi alterado):", themeApplied === "dark" ? "OK" : "FALHOU");
  await page.click('.theme-btn[data-theme-choice="light"]');
  await page.waitForTimeout(200);

  buttons = await page.$$(".nav-item");
  await buttons[1].click(); // empresa (CNAE)
  await page.waitForTimeout(200);
  await page.waitForFunction(() => window.CNAE_STATUS && window.CNAE_STATUS.estado !== "carregando", { timeout: 8000 }).catch(() => {});
  const cnaeStillOk = await page.evaluate(() => ({ estado: CNAE_STATUS.estado, registros: CNAE_STATUS.registros }));
  console.log("16) Base de CNAEs continua carregando normalmente:", JSON.stringify(cnaeStillOk), cnaeStillOk.estado === "ok" ? "OK" : "FALHOU");

  console.log("\n=== ERROS DE CONSOLE/PÁGINA ===");
  if (errors.length === 0) console.log("Nenhum erro detectado.");
  else errors.forEach((e) => console.log(e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
