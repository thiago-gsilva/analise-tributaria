const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push("CONSOLE ERROR: " + msg.text()); });

  await page.goto("file://" + path.resolve(__dirname, "wrapper-local.html"));
  await page.waitForTimeout(500);

  console.log("Chart disponível:", await page.evaluate(() => typeof Chart !== "undefined"));
  console.log("jsPDF disponível:", await page.evaluate(() => typeof window.jspdf !== "undefined"));

  // Dashboard já deve ter renderizado gráfico
  await page.waitForTimeout(300);
  const dashChart = await page.evaluate(() => !!window.CHARTS && !!window.CHARTS.dashboard).catch(() => "N/A (CHARTS não exposto globalmente, ok)");
  console.log("Canvas dashboard existe:", await page.$eval("#chartDashboard", (c) => c.tagName).catch(() => "AUSENTE"));

  // Navegar para todas as abas e conferir ausência de erros
  const tabs = ["dashboard", "empresa", "simples", "fatorr", "hibrido", "presumido", "comparativo", "equilibrio", "memoria", "relatorio", "fontes"];
  for (let i = 0; i < tabs.length; i++) {
    const buttons = await page.$$(".nav-item");
    await buttons[i].click();
    await page.waitForTimeout(200);
  }

  // Testar cenários de cálculo via preenchimento de campos
  // 1) Ir para Dados da Empresa, mudar faturamento para 0 -> deve mostrar alerta vermelho
  await (await page.$$(".nav-item"))[1].click();
  await page.waitForTimeout(150);
  await page.fill("#fFat", "0");
  await page.locator("#fFat").blur();
  await page.waitForTimeout(150);
  const hasRedAlert = await page.$$eval(".alert-red", (els) => els.length > 0);
  console.log("Cenário faturamento=0 gera alerta vermelho:", hasRedAlert);

  await page.fill("#fFat", "18000");
  await page.locator("#fFat").blur();
  await page.waitForTimeout(150);

  // 2) Testar RBT12 manual
  await page.click('[data-rbt12mode="manual"]');
  await page.waitForTimeout(150);
  await page.fill("#fRbt12", "500000");
  await page.locator("#fRbt12").blur();
  await page.waitForTimeout(150);
  const rbt12Value = await page.$eval("#fRbt12", (i) => i.value);
  console.log("RBT12 manual — valor no campo após blur:", rbt12Value);

  // 3) Clicar em Calcular análise e checar banner
  await page.click("#btnCalcular");
  await page.waitForTimeout(200);
  const bannerVisible = await page.$eval(".result-banner", (el) => !!el).catch(() => false);
  console.log("Banner de resultado exibido após Calcular Análise:", bannerVisible);

  // 4) Testar Fator R (ir para aba)
  await (await page.$$(".nav-item"))[3].click();
  await page.waitForTimeout(150);
  await page.fill("#frFolha", "300000");
  await page.locator("#frFolha").blur();
  await page.waitForTimeout(150);
  const fatorRText = await page.$eval(".alert-blue", (el) => el.textContent).catch(() => "N/A");
  console.log("Texto Fator R:", fatorRText && fatorRText.slice(0, 90));

  // 5) Testar Lucro Presumido com majoração
  await (await page.$$(".nav-item"))[5].click();
  await page.waitForTimeout(150);
  await page.fill("#lpReceita", "1500000");
  await page.locator("#lpReceita").blur();
  await page.waitForTimeout(150);
  await page.check("#lpMaj");
  await page.waitForTimeout(200);
  const majText = await page.$eval("#content", (c) => c.textContent.includes("Majoração aplicada"));
  console.log("Majoração 2026 exibida corretamente:", majText);

  // 6) Testar Comparativo (gráfico deve renderizar)
  await (await page.$$(".nav-item"))[6].click();
  await page.waitForTimeout(400);
  const cmpCanvas = await page.$eval("#chartComparativo", (c) => c.tagName).catch(() => "AUSENTE");
  console.log("Canvas comparativo existe:", cmpCanvas);

  // 7) Testar Ponto de Equilíbrio
  await (await page.$$(".nav-item"))[7].click();
  await page.waitForTimeout(150);
  await page.fill("#peFixos", "6000");
  await page.locator("#peFixos").blur();
  await page.waitForTimeout(150);
  const peShown = await page.$eval("#content", (c) => c.textContent.includes("Receita de equilíbrio"));
  console.log("Ponto de equilíbrio exibido:", peShown);

  // 8) Testar geração do PDF em slides (via downloads capability ausente -> deve
  //    cair no catch e mostrar alerta amarelo, SEM travar). Cobertura completa
  //    do fluxo de apresentação/slides está em test-pdf.js; aqui é só regressão.
  await (await page.$$(".nav-item"))[9].click();
  await page.waitForTimeout(150);
  await page.click("#btnGerarPdf");
  await page.waitForFunction(() => {
    const t = document.getElementById("pdfStatus").innerText;
    return t && !t.includes("Gerando");
  }, { timeout: 30000 }).catch(() => {});
  const pdfStatus = await page.$eval("#pdfStatus", (el) => el.textContent).catch(() => "N/A");
  console.log("Status após gerar PDF (sem capability 'downloads' disponível neste teste):", pdfStatus);

  // 9) Testar geração pura do PDF em slides (html2canvas + jsPDF), chamando o
  //    deck diretamente (sem downloads.save)
  const pdfInfo = await page.evaluate(async () => {
    try {
      mountPptxDeck();
      const slides = Array.from(document.querySelectorAll(".pptx-slide"));
      const { jsPDF } = window.jspdf;
      let doc = null;
      for (let i = 0; i < slides.length; i++) {
        const canvas = await html2canvas(slides[i], { width: 1280, height: 720, scale: 1, backgroundColor: "#ffffff", logging: false });
        if (!doc) doc = new jsPDF({ unit: "pt", format: [1280, 720], orientation: "landscape" });
        else doc.addPage([1280, 720], "landscape");
        doc.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, 1280, 720);
      }
      const blob = doc.output("blob");
      pptxDestroyCharts();
      document.getElementById("pptxHost").innerHTML = "";
      return { ok: true, size: blob.size, type: blob.type, pages: doc.internal.getNumberOfPages() };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  console.log("Geração do PDF (slides) via html2canvas+jsPDF:", JSON.stringify(pdfInfo));

  // 10) Responsividade mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const sidebarHiddenMobile = await page.$eval(".sidebar", (el) => getComputedStyle(el).position === "fixed");
  console.log("Sidebar em modo mobile (fixed/off-canvas):", sidebarHiddenMobile);
  await page.click("#menuToggle");
  await page.waitForTimeout(250);
  const sidebarOpenClass = await page.$eval(".sidebar", (el) => el.classList.contains("open"));
  console.log("Sidebar abre ao clicar no menu mobile:", sidebarOpenClass);
  await page.screenshot({ path: "screenshot-mobile-menu.png" });
  const mobileNav = await page.$$(".nav-item");
  await mobileNav[0].click();
  await page.waitForTimeout(200);
  const sidebarClosedAfterNav = await page.$eval(".sidebar", (el) => !el.classList.contains("open"));
  console.log("Sidebar fecha automaticamente após navegar (mobile):", sidebarClosedAfterNav);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await (await page.$$(".nav-item"))[0].click({ force: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "screenshot-dashboard-final.png", fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await (await page.$$(".nav-item"))[2].click({ force: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshot-simples-final.png", fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await (await page.$$(".nav-item"))[4].click({ force: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "screenshot-hibrido-final.png", fullPage: true });

  console.log("\n=== ERROS ===");
  if (errors.length === 0) console.log("Nenhum erro de console/página detectado em toda a navegação.");
  else errors.forEach((e) => console.log(e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
