// Verificação do COMPLEMENTO "CNAE → Atividade → Presunção → IBS/CBS"
// (fase 2): classificação automática por CNAE, pendências que exigem
// confirmação complementar e substituição manual em cada nível. Roda contra
// o servidor local (precisa de fetch() para data/cnaes.json).
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error" && !/ERR_TUNNEL|favicon/.test(msg.text())) errors.push("CONSOLE ERROR: " + msg.text()); });

  await page.goto("http://localhost:8791/wrapper-local.html");
  await page.waitForFunction(() => window.CNAE_STATUS && window.CNAE_STATUS.estado !== "carregando", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);

  async function setCnaeByCodigo(codigo) {
    return page.evaluate((codigo) => {
      const found = CNAE_DATA.subclasses.find((c) => c.codigo === codigo);
      if (!found) throw new Error("CNAE não encontrado: " + codigo);
      state.empresa.cnae = found;
      state.classificacaoComplementos = {};
      state.presumido.atividadeModo = "auto";
      state.ibscbs.modo = "auto";
      const r = computeAll();
      return {
        cnae: found.codigo,
        natureza: r.classificacao ? r.classificacao.natureza : null,
        anexoKey: r.anexoKey,
        atividadeKey: r.atividadeKey,
        presuncaoPendente: r.classificacao ? (r.classificacao.presuncao && r.classificacao.presuncao.pendente) : null,
        ibscbsPendente: r.classificacao ? (r.classificacao.ibscbs && r.classificacao.ibscbs.pendente) : null,
        tratamentoIbsCbsKey: tratamentoIbsCbsKeyAtual(),
        pendencias: r.classificacao ? r.classificacao.pendencias.map((p) => p.id) : [],
      };
    }, codigo);
  }

  // ---- Cenário 1: Comércio (Seção G) — Anexo I automático, presunção 8/12,
  // sem redução de IBS/CBS identificada automaticamente ----
  const gCnae = await page.evaluate(() => CNAE_DATA.subclasses.find((c) => c.secao === "G" && !/combust/i.test(c.descricao)).codigo);
  const r1 = await setCnaeByCodigo(gCnae);
  console.log("1) Comércio (" + gCnae + "):", JSON.stringify(r1));
  console.log("   -> natureza=comercio:", r1.natureza === "comercio" ? "OK" : "FALHOU");
  console.log("   -> Anexo I automático:", r1.anexoKey === "I" ? "OK" : "FALHOU");
  console.log("   -> atividade=comercio_industria:", r1.atividadeKey === "comercio_industria" ? "OK" : "FALHOU");
  console.log("   -> tratamento IBS/CBS=padrao (sem benefício inventado):", r1.tratamentoIbsCbsKey === "padrao" ? "OK" : "FALHOU");

  // ---- Cenário 2: Indústria (Seção C) — Anexo II automático ----
  const r2 = await setCnaeByCodigo("1011-2/01");
  console.log("2) Indústria (1011-2/01):", JSON.stringify(r2));
  console.log("   -> natureza=industria:", r2.natureza === "industria" ? "OK" : "FALHOU");
  console.log("   -> Anexo II automático:", r2.anexoKey === "II" ? "OK" : "FALHOU");
  console.log("   -> atividade=comercio_industria:", r2.atividadeKey === "comercio_industria" ? "OK" : "FALHOU");

  // ---- Cenário 3: Instituição financeira (Seção K) — presunção 16/12,
  // regime específico de IBS/CBS, ambos com confiança alta ----
  const r3 = await setCnaeByCodigo("6421-2/00");
  console.log("3) Instituição financeira (6421-2/00):", JSON.stringify(r3));
  console.log("   -> natureza=financeiro:", r3.natureza === "financeiro" ? "OK" : "FALHOU");
  console.log("   -> Anexo permanece III_V (não presumido para financeiras):", r3.anexoKey === "III_V" ? "OK" : "FALHOU");
  console.log("   -> atividade=instituicoes_financeiras:", r3.atividadeKey === "instituicoes_financeiras" ? "OK" : "FALHOU");
  console.log("   -> tratamento IBS/CBS=regime_especifico:", r3.tratamentoIbsCbsKey === "regime_especifico" ? "OK" : "FALHOU");

  // ---- Cenário 4: Construção civil (Seção F) — PENDENTE até responder se
  // há fornecimento de material; valor mantido é o anteriormente em uso ----
  const r4 = await setCnaeByCodigo("4120-4/00");
  console.log("4) Construção civil, sem confirmação ainda (4120-4/00):", JSON.stringify(r4));
  console.log("   -> presunção pendente de confirmação:", r4.presuncaoPendente === true ? "OK" : "FALHOU");
  console.log("   -> atividade mantida = valor anterior (servicos_gerais, padrão de fábrica):", r4.atividadeKey === "servicos_gerais" ? "OK" : "FALHOU");
  console.log("   -> pendência é 'construcaoMaterial':", r4.pendencias.includes("construcaoMaterial") ? "OK" : "FALHOU");

  // Responde a pergunta complementar: "com material" -> presunção 8/12
  const r4b = await page.evaluate(() => {
    state.classificacaoComplementos.construcaoMaterial = "com_material";
    const r = computeAll();
    return { atividadeKey: r.atividadeKey, pendente: r.classificacao.presuncao.pendente };
  });
  console.log("   -> após confirmar 'com material': atividade=construcao_com_material:", r4b.atividadeKey === "construcao_com_material" && !r4b.pendente ? "OK" : "FALHOU (" + JSON.stringify(r4b) + ")");

  // ---- Cenário 5: Saúde Divisão 86 — presunção PENDENTE (conceito
  // restritivo), mas IBS/CBS já sugere reducao60 automaticamente ----
  const r5 = await setCnaeByCodigo("8610-1/01");
  console.log("5) Saúde/hospitalar, sem confirmação (8610-1/01):", JSON.stringify(r5));
  console.log("   -> presunção pendente (conceito restritivo):", r5.presuncaoPendente === true ? "OK" : "FALHOU");
  console.log("   -> IBS/CBS já aplicado automaticamente (reducao60, não pendente):", (!r5.ibscbsPendente && r5.tratamentoIbsCbsKey === "reducao60") ? "OK" : "FALHOU");
  const r5b = await page.evaluate(() => {
    state.classificacaoComplementos.servicosHospitalares = "nao_consultorio";
    const r = computeAll();
    return { atividadeKey: r.atividadeKey };
  });
  console.log("   -> após confirmar 'não é hospitalar restritivo': atividade=servicos_gerais:", r5b.atividadeKey === "servicos_gerais" ? "OK" : "FALHOU");

  // ---- Cenário 6: Override manual — usuário substitui a classificação
  // automática em qualquer nível, sem que a seleção de CNAE a sobrescreva ----
  const r6 = await page.evaluate(() => {
    state.presumido.atividadeModo = "manual";
    state.presumido.atividade = "transporte_passageiros";
    state.ibscbs.modo = "manual";
    state.ibscbs.tratamento = "reducao100_cesta";
    const r = computeAll();
    return { atividadeKey: r.atividadeKey, tratamentoIbsCbsKey: tratamentoIbsCbsKeyAtual() };
  });
  console.log("6) Override manual (atividade e tratamento IBS/CBS):", JSON.stringify(r6));
  console.log("   -> atividade manual respeitada:", r6.atividadeKey === "transporte_passageiros" ? "OK" : "FALHOU");
  console.log("   -> tratamento manual respeitado:", r6.tratamentoIbsCbsKey === "reducao100_cesta" ? "OK" : "FALHOU");

  // ---- Cenário 7: Sem CNAE selecionado — comportamento idêntico ao
  // anterior a esta funcionalidade (nenhuma classificação, sem erro) ----
  const r7 = await page.evaluate(() => {
    state.empresa.cnae = null;
    state.presumido.atividadeModo = "auto";
    state.ibscbs.modo = "auto";
    const r = computeAll();
    return { anexoKey: r.anexoKey, atividadeKey: r.atividadeKey, tratamentoIbsCbsKey: tratamentoIbsCbsKeyAtual(), classificacao: r.classificacao };
  });
  console.log("7) Sem CNAE selecionado:", JSON.stringify(r7));
  console.log("   -> anexoKey=III_V (Fator R, comportamento anterior):", r7.anexoKey === "III_V" ? "OK" : "FALHOU");
  console.log("   -> classificacao=null:", r7.classificacao === null ? "OK" : "FALHOU");
  console.log("   -> atividadeKey = mantém o último valor bruto em uso (transporte_passageiros, definido manualmente no cenário 6 — nunca resetado por falta de CNAE):", r7.atividadeKey === "transporte_passageiros" ? "OK" : "FALHOU");

  console.log("\n=== ERROS DE CONSOLE/PÁGINA ===");
  if (errors.length === 0) console.log("Nenhum erro detectado.");
  else errors.forEach((e) => console.log(e));

  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})();
