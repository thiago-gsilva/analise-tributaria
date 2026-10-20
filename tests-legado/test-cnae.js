const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error" && !msg.text().includes("ERR_TUNNEL")) errors.push("CONSOLE ERROR: " + msg.text()); });

  await page.goto("http://localhost:8791/wrapper-local.html");
  await page.waitForTimeout(300);

  // Ir para a aba Empresa
  const buttons = await page.$$(".nav-item");
  await buttons[1].click();
  await page.waitForTimeout(200);

  // Esperar carregamento assíncrono da base (fetch de data/cnaes.json)
  await page.waitForFunction(() => window.CNAE_STATUS && window.CNAE_STATUS.estado !== "carregando", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(200);

  const status = await page.evaluate(() => ({
    estado: CNAE_STATUS.estado,
    registros: CNAE_STATUS.registros,
    atualizadoEm: CNAE_STATUS.atualizadoEm,
    fonte: CNAE_STATUS.fonte,
    mensagem: CNAE_STATUS.mensagem,
    dataLoaded: !!CNAE_DATA,
    totalSubclasses: CNAE_DATA ? CNAE_DATA.subclasses.length : null,
  }));
  console.log("1) STATUS DA BASE:", JSON.stringify(status));
  console.log("   -> esperado: estado=ok, registros=1332, atualizadoEm=2026-09-25 (nenhum valor inventado)");

  // Recarrega renderContent para garantir que o card mostra o status real
  await page.evaluate(() => renderContent());
  await page.waitForTimeout(150);
  const badgeText = await page.evaluate(() => {
    const el = document.querySelector(".cnae-status .badge");
    return el ? el.textContent : null;
  });
  console.log("2) Badge de status visível na UI:", badgeText);

  // ---- Teste: busca por código completo ----
  const r1 = await page.evaluate(() => cnaeSearch("7319-0/02", 5).map((x) => x.codigo));
  console.log("3) Busca por código completo '7319-0/02':", JSON.stringify(r1), r1[0] === "7319-0/02" ? "OK" : "FALHOU");

  // ---- Teste: busca parcial por código ----
  const r2 = await page.evaluate(() => cnaeSearch("7319", 10).map((x) => x.codigo));
  console.log("4) Busca parcial por código '7319':", JSON.stringify(r2), r2.includes("7319-0/02") ? "OK (contém 7319-0/02)" : "FALHOU");

  // ---- Teste: busca por descrição — exemplo do usuário ----
  const r3 = await page.evaluate(() => cnaeSearch("promoção", 10).map((x) => ({ c: x.codigo, d: x.descricao })));
  console.log("5) Busca por descrição 'promoção':", JSON.stringify(r3.slice(0, 5)));
  console.log("   -> esperado top1 = 7319-0/02 — Promoção de vendas:", r3[0] && r3[0].c === "7319-0/02" && r3[0].d === "Promoção de vendas" ? "OK" : "FALHOU");

  // ---- Teste: busca por palavra-chave (nas atividades específicas) ----
  const r4 = await page.evaluate(() => cnaeSearch("panfletagem", 10).map((x) => x.codigo));
  console.log("6) Busca por palavra-chave 'panfletagem' (atividade específica):", JSON.stringify(r4), r4.includes("7319-0/02") ? "OK" : "FALHOU");

  // ---- Teste: CNAE inexistente ----
  const r5 = await page.evaluate(() => cnaeSearch("xkxkxwqinexistenteabc", 10));
  console.log("7) Busca por CNAE inexistente:", JSON.stringify(r5), r5.length === 0 ? "OK (lista vazia)" : "FALHOU");

  // UI: digitar termo inexistente no campo e checar mensagem amigável
  await page.fill("#fCnae", "xkxkxwqinexistenteabc");
  await page.waitForTimeout(150);
  const noResultsMsg = await page.evaluate(() => {
    const el = document.querySelector("#acList .ac-empty");
    return el ? el.textContent : null;
  });
  console.log("8) Mensagem de 'nenhum resultado' na UI:", noResultsMsg, noResultsMsg && /nenhum cnae encontrado/i.test(noResultsMsg) ? "OK" : "FALHOU");

  // ---- Teste: seleção via UI ----
  await page.fill("#fCnae", "");
  await page.waitForTimeout(100);
  await page.fill("#fCnae", "promoção");
  await page.waitForTimeout(200);
  const firstItem = await page.$(".ac-item[data-c]");
  const firstCode = firstItem ? await firstItem.getAttribute("data-c") : null;
  console.log("9) Primeiro item da lista para 'promoção':", firstCode);
  if (firstItem) await firstItem.click();
  await page.waitForTimeout(200);

  const afterSelect = await page.evaluate(() => ({
    cnae: state.empresa.cnae ? { codigo: state.empresa.cnae.codigo, descricao: state.empresa.cnae.descricao, secao: state.empresa.cnae.secao } : null,
    anexoManual: state.simples.anexoManual,
    anexoModo: state.simples.anexoModo,
    presumidoAtividade: state.presumido.atividade,
  }));
  console.log("10) Estado após seleção:", JSON.stringify(afterSelect));
  console.log("    -> CNAE selecionado corretamente:", afterSelect.cnae && afterSelect.cnae.codigo === "7319-0/02" ? "OK" : "FALHOU");
  console.log("    -> anexoManual/anexoModo/presumido.atividade NÃO alterados pela seleção de CNAE:",
    afterSelect.anexoManual === "III" && afterSelect.anexoModo === "auto" && afterSelect.presumidoAtividade === "servicos_gerais" ? "OK (desacoplado)" : "FALHOU (ainda acoplado!)");

  // Hint mostra hierarquia, não mais Anexo
  const hintText = await page.evaluate(() => {
    const el = document.querySelector(".autocomplete .hint");
    return el ? el.textContent : null;
  });
  console.log("11) Texto do hint após seleção:", hintText);
  console.log("    -> não menciona 'Enquadramento de referência' (acoplamento antigo):", hintText && !/Enquadramento de referência/i.test(hintText) ? "OK" : "FALHOU");
  console.log("    -> menciona hierarquia (Seção/Divisão/Grupo/Classe):", hintText && /Seção/.test(hintText) && /Divisão/.test(hintText) ? "OK" : "FALHOU");

  // ---- Verifica anexoKeyAtual() nunca falha por falta de CNAE (auto sempre resolve) ----
  const anexoAutoSemCnae = await page.evaluate(() => {
    const backup = state.empresa.cnae;
    state.empresa.cnae = null;
    state.simples.anexoModo = "auto";
    const k = anexoKeyAtual();
    state.empresa.cnae = backup;
    return k;
  });
  console.log("12) anexoKeyAtual() em modo auto sem CNAE selecionado:", anexoAutoSemCnae, anexoAutoSemCnae === "III_V" ? "OK (resolve via Fator R)" : "FALHOU");

  // ---- Verifica que validarEntradas() não bloqueia mais por falta de CNAE ----
  const issuesSemCnae = await page.evaluate(() => {
    state.empresa.cnae = null;
    state.simples.anexoModo = "auto";
    return validarEntradas().map((i) => i.msg);
  });
  console.log("13) Alertas com anexoModo=auto e sem CNAE:", JSON.stringify(issuesSemCnae));
  console.log("    -> nenhum alerta sobre 'identificar o enquadramento automaticamente':",
    !issuesSemCnae.some((m) => /identificar o enquadramento/i.test(m)) ? "OK" : "FALHOU");

  // ---- Screenshot para inspeção visual ----
  await page.evaluate(() => renderContent());
  await page.waitForTimeout(150);
  await page.screenshot({ path: "cnae-empresa.png", fullPage: true });
  await page.fill("#fCnae", "contabilidade");
  await page.waitForTimeout(200);
  await page.screenshot({ path: "cnae-autocomplete.png" });

  // ---- Regressão rápida: outras abas continuam navegáveis, sem travar ----
  const tabs = ["dashboard", "empresa", "simples", "fatorr", "hibrido", "presumido", "comparativo", "equilibrio", "memoria", "relatorio", "fontes"];
  for (let i = 0; i < tabs.length; i++) {
    const btns = await page.$$(".nav-item");
    await btns[i].click();
    await page.waitForTimeout(150);
  }
  console.log("14) Navegação por todas as abas após as mudanças: OK, sem travar");

  // Fontes: linha do CNAE reflete dados reais
  const fontesRow = await page.evaluate(() => {
    const f = FONTES.find((x) => x.id === "cnae");
    return f ? { nome: f.nome, fonte: f.fonte, data: f.data, status: f.status } : null;
  });
  console.log("15) Linha de Fontes do CNAE:", JSON.stringify(fontesRow));
  console.log("    -> contém contagem real (1332) e data real (25/09/2026):",
    fontesRow && /1332/.test(fontesRow.fonte) && /25\/09\/2026/.test(fontesRow.data) ? "OK" : "FALHOU");

  console.log("\n=== ERROS DE CONSOLE/PÁGINA ===");
  if (errors.length === 0) console.log("Nenhum erro detectado.");
  else errors.forEach((e) => console.log(e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
