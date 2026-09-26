const { chromium } = require("playwright");
const path = require("path");

function luminance(rgb) {
  // rgb: [r,g,b] 0-255
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function parseRgb(str) {
  const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
}
function contrastRatio(fg, bg) {
  const l1 = luminance(fg) + 0.05;
  const l2 = luminance(bg) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error" && !msg.text().includes("ERR_TUNNEL")) errors.push("CONSOLE ERROR: " + msg.text()); });

  await page.goto("file://" + path.resolve(__dirname, "wrapper-local.html"));
  await page.waitForTimeout(500);

  // 1) Estado inicial deve ser "system" (sem preferência salva)
  const initialAttr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  console.log("Tema inicial (sem localStorage prévio):", initialAttr);

  // 2) Clicar no botão "Escuro" e verificar atributo + localStorage
  await page.click('.theme-btn[data-theme-choice="dark"]');
  await page.waitForTimeout(300);
  const afterDark = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-theme"),
    stored: localStorage.getItem("analise-tributaria-theme"),
    activeBtn: document.querySelector(".theme-btn.active")?.dataset.themeChoice,
  }));
  console.log("Após clicar em Escuro:", JSON.stringify(afterDark));

  // 3) Checar cores computadas: bg do body e cor do texto principal
  const bodyColors = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return { bg: cs.backgroundColor, color: cs.color };
  });
  console.log("Body no modo escuro — bg:", bodyColors.bg, "| color:", bodyColors.color);
  const bodyBg = parseRgb(bodyColors.bg);
  const bodyFg = parseRgb(bodyColors.color);
  const bodyContrast = contrastRatio(bodyFg, bodyBg);
  console.log("Contraste body (texto x fundo):", bodyContrast.toFixed(2), bodyContrast >= 4.5 ? "OK (>=4.5)" : "BAIXO");

  // 4) Navegar por todas as abas no modo escuro e checar ausência de "preto sobre preto"/"branco sobre branco"
  const tabs = ["dashboard", "empresa", "simples", "fatorr", "hibrido", "presumido", "comparativo", "equilibrio", "memoria", "relatorio", "fontes"];
  for (let i = 0; i < tabs.length; i++) {
    const buttons = await page.$$(".nav-item");
    await buttons[i].click();
    await page.waitForTimeout(180);
  }
  console.log("Navegação por todas as abas no modo escuro: OK, sem travar");

  // 5) Checar contraste de elementos-chave: card, kpi-value, texto secundário, botão primário
  const checks = await page.evaluate(() => {
    const results = {};
    const sampleCard = document.querySelector(".card, .card-flat, .kpi");
    if (sampleCard) {
      const cs = getComputedStyle(sampleCard);
      results.card = { bg: cs.backgroundColor, border: cs.borderColor };
    }
    const heading = document.querySelector(".card-title, .kpi-value, .section-head h2");
    if (heading) results.heading = getComputedStyle(heading).color;
    const btnPrimary = document.querySelector(".btn-primary");
    if (btnPrimary) {
      const cs = getComputedStyle(btnPrimary);
      results.btnPrimary = { bg: cs.backgroundColor, color: cs.color };
    }
    const muted = document.querySelector(".muted, .kpi-sub, .text-sec, .field .hint");
    if (muted) results.muted = getComputedStyle(muted).color;
    return results;
  });
  console.log("Amostras de estilo computado no escuro:", JSON.stringify(checks, null, 2));

  // 6) Ir para Dashboard e checar gráfico com cores de tema escuro
  await (await page.$$(".nav-item"))[0].click();
  await page.waitForTimeout(400);
  const chartColors = await page.evaluate(() => {
    try {
      // eslint-disable-next-line no-undef
      const c = typeof CHARTS !== "undefined" ? CHARTS.dashboard : (window.CHARTS && window.CHARTS.dashboard);
      if (!c) return null;
      return {
        barColors: c.data.datasets[0].backgroundColor,
        yTickColor: c.options.scales.y.ticks.color,
        gridColor: c.options.scales.y.grid.color,
      };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log("Cores do gráfico (dashboard) no modo escuro:", JSON.stringify(chartColors));

  // 7) Alternar para Claro e verificar volta às cores originais
  await page.click('.theme-btn[data-theme-choice="light"]');
  await page.waitForTimeout(300);
  const afterLight = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-theme"),
    stored: localStorage.getItem("analise-tributaria-theme"),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  console.log("Após clicar em Claro:", JSON.stringify(afterLight));

  // 8) Alternar para Sistema
  await page.click('.theme-btn[data-theme-choice="system"]');
  await page.waitForTimeout(300);
  const afterSystem = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-theme"),
    stored: localStorage.getItem("analise-tributaria-theme"),
  }));
  console.log("Após clicar em Sistema:", JSON.stringify(afterSystem));

  // 9) Emular prefers-color-scheme: dark enquanto em "system" e checar se o body escurece
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(300);
  const systemDarkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log("Body com data-theme=system + SO=dark:", systemDarkBg);

  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(300);
  const systemLightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log("Body com data-theme=system + SO=light:", systemLightBg);

  // 10) Persistência após "reload" (nova navegação para a mesma página)
  await page.click('.theme-btn[data-theme-choice="dark"]');
  await page.waitForTimeout(200);
  await page.reload();
  await page.waitForTimeout(500);
  const afterReload = await page.evaluate(() => ({
    attr: document.documentElement.getAttribute("data-theme"),
    stored: localStorage.getItem("analise-tributaria-theme"),
    activeBtn: document.querySelector(".theme-btn.active")?.dataset.themeChoice,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  console.log("Após reload (deve persistir 'dark'):", JSON.stringify(afterReload));

  // 11) Screenshots para inspeção visual
  await page.screenshot({ path: "dark-dashboard.png", fullPage: true });
  await (await page.$$(".nav-item"))[1].click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "dark-empresa.png", fullPage: true });
  await (await page.$$(".nav-item"))[4].click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "dark-hibrido.png", fullPage: true });
  await (await page.$$(".nav-item"))[8].click();
  await page.waitForTimeout(200);
  // abrir accordion de memória de cálculo se existir
  const accHead = await page.$(".acc-head");
  if (accHead) { await accHead.click(); await page.waitForTimeout(300); }
  await page.screenshot({ path: "dark-memoria.png", fullPage: true });
  await (await page.$$(".nav-item"))[6].click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "dark-comparativo.png", fullPage: true });

  // mobile no escuro
  await page.setViewportSize({ width: 390, height: 844 });
  await (await page.$$(".nav-item"))[0].click({ force: true });
  await page.waitForTimeout(200);
  await page.click("#menuToggle");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "dark-mobile-menu.png" });
  await page.setViewportSize({ width: 1440, height: 900 });

  // 12) Voltar para Claro e tirar screenshot para comparação lado a lado
  await page.evaluate(() => window.scrollTo(0, 0));
  await (await page.$$(".nav-item"))[0].click({ force: true });
  await page.click('.theme-btn[data-theme-choice="light"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: "light-dashboard-recheck.png", fullPage: true });

  console.log("\n=== ERROS ===");
  if (errors.length === 0) console.log("Nenhum erro de console/página detectado.");
  else errors.forEach((e) => console.log(e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
