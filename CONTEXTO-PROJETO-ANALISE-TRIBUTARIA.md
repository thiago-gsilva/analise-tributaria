# Contexto do projeto — Análise Tributária

> Este arquivo foi gerado para ser colado como contexto em uma conversa com uma
> IA (Claude ou outra) sempre que for necessário pedir uma nova alteração,
> correção ou funcionalidade neste sistema. Ele descreve a estrutura de
> arquivos, o objetivo do sistema e — o mais importante — todas as regras de
> negócio e premissas de cálculo já definidas, para que a IA não precise
> "adivinhar" nem reinventar nada que já foi decidido.
>
> Data de geração: 26/09/2026.
> **Versão 3 (07/10/2026): reformulação de UX e identidade visual — ver a seção 0, que prevalece sobre as seções 2, 3, 4 e 9 quando houver diferença.**
> Última atualização: 07/10/2026 (v3 — seção 0); anterior: 28/09/2026 — item 6.6 (tratamento tributário diferenciado
> de IBS/CBS: alíquotas, reduções e benefícios); seção 7 reescrita (motor de
> classificação automática CNAE → Atividade → Presunção → IBS/CBS, substituindo
> por pedido explícito do usuário a antiga regra de desacoplamento).

---

## 0. Versão 3 — reformulação de UX e identidade visual (leia primeiro)

**O motor tributário não mudou.** Tabelas, fórmulas, classes CNAE, presunções,
regras de IBS/CBS, benefícios, cronograma, memória de cálculo e fontes legais
são os mesmos da versão 2 (funções puras `calcSimplesNacional`,
`calcSimplesHibrido`, `calcLucroPresumidoTrimestral`, `calcAliquotaEfetiva`,
`classificarPorCnae`…). A v3 só acrescentou uma camada **de período** por
cima delas e trocou toda a interface. Paridade verificada contra o app v1
(`referencia-v1/`) com 400 cenários aleatórios: 0 divergências
(`tests/parity.js`).

### 0.1 Navegação: 4 etapas (antes 11 abas)
1 Nova análise · 2 Preenchimento · 3 Resultados · 4 Relatório. As antigas abas
viraram painéis recolhíveis em "Detalhamento técnico" (Resultados): Simples
Nacional, Fator R, Simples Híbrido, Lucro Presumido, IBS/CBS, Ponto de
equilíbrio, Comparar cenários, Memória de cálculo, Fontes. Nenhuma
funcionalidade foi removida. `LEGACY_TAB_MAP` traduz ids antigos (rascunhos).

### 0.2 Tipos de análise (`state.analise.tipo`) e período (`state.periodo`)
- `existente`, `nova` (regras de início de atividade) e `avulsa` (contrato /
  operação pontual, p.ex. R$ 1,5 mi em 3 meses; "empresa nova ou existente").
  Os três usam o **mesmo motor**.
- `periodo = { mesInicio, meses (1–36), receitaModo: constante | variavel |
  total, receitaTotal, receitasMes[], empresaAvulsa, rbt12Historico,
  rbt12Movel }`. **Os resultados referem-se ao período analisado; nada é
  anualizado** (avulsa nunca assume receita anual recorrente).
- Ano global da análise: `state.empresa.anoAnalise` (padrão 2027). Os anos de
  exceção de Presumido/Híbrido (`anoProjecao`) são `null` = seguir o ano
  calendário de cada mês (ajustes avançados).

### 0.3 Motor de período (`40_motor_periodo` dentro de `app.js`)
Chama as funções puras mês a mês (Simples/Híbrido) ou trimestre-calendário a
trimestre-calendário (Presumido; trimestres parciais usam limite do adicional
de IRPJ proporcional: R$ 20.000 × meses).
- **Empresa existente**: RBT12 constante (paridade com v1) salvo se
  "Atualizar mês a mês" (`periodo.rbt12Movel`) estiver ligado.
- **Empresa nova / avulsa nova**: janela móvel; mês 1 → receita × 12; meses
  2–12 → média dos meses anteriores × 12; depois soma real. Limite no ano de
  início = R$ 400.000 × meses de funcionamento *no ano-calendário de início*
  (`verificarLimiteInicioAtividade`).
- **Avulsa existente**: RBT12 histórico informado (`rbt12Historico`); sem ele o
  cálculo parte de R$ 0 e a pendência "RBT12 anterior" é marcada como
  essencial.
- `PARAMS_FOLHA` (INSS 11% até o teto, tabela de IRRF e redutor, FGTS 8%)
  vêm de fontes secundárias — são **hipóteses sinalizadas**; confirmar na
  tabela oficial do ano.

### 0.4 Fator R inteligente (`calcFatorRComparativo`)
Compara folha informada × sem folha × folha necessária (28%); políticas
`atual | prolabore | necessaria | nenhuma`. Mostra Fator R %, folha necessária,
diferença, pró-labore bruto, INSS/IRRF do **adicional** (a "folha atual" é
sempre a folha realmente digitada, independente da política de simulação),
economia, custo extra e vantagem líquida. Folha elegível = pró-labore +
salários + FGTS (bruto) — não confundir com custo da empresa, pró-labore
líquido ou encargos.

### 0.5 Fonte única da verdade
`computeAll()` → `state.result`: **cartões = tabela = gráficos = PDF**.
`verificarConsistencia()` confere isso em tempo de execução e nos testes.
Gráficos (`specComparativo`, `specComposicao`, `specTemporal`,
`specCenarios`) são compartilhados entre tela e PDF; só mudam os tokens de cor
(tela segue o tema; PDF usa `TOKENS_CLARO`).

### 0.6 Pendências inteligentes
Uma única área (`buildPendencias`/`pendenciasHTML`) com níveis atenção /
pendente / estimativa / opcional / confirmado. Nunca bloqueia e nunca inventa
valor: a informação ausente aparece com a **limitação** do resultado.

### 0.7 Simulações (sem banco de dados)
Biblioteca em `localStorage` (`analise-tributaria-sims`): salvar, duplicar,
renomear, abrir, excluir, exportar/importar `.json` (aceita pacote, simulação
isolada e rascunho legado) e comparar cenários (variações de receita,
duração, folha). Rascunho: `analise-tributaria-draft` (migra rascunhos v1).
O hook `window.claude.hot` (snapshot/ready) foi preservado.

### 0.8 Identidade visual v3
Paleta: `#EDEDED` fundo claro · `#03131C` texto claro · `#0C171B` estrutura /
sidebar / superfícies escuras · `#455157` secundário e fundo escuro ·
`#040809` só regiões de contraste (hero, tooltip) · `#FF5001` **somente
atenção** (nunca decorativo; no PDF, só avisos reais). Cores semânticas
discretas para sucesso / em andamento / erro / neutro. Tipografia: Alata
(títulos, navegação, botões, rótulos) + Inter (texto denso e tabelas),
`tabular-nums` nos números. Poucas sombras, bordas moderadas, sem
glassmorphism/gradientes/neon. Sem marca de terceiros.

### 0.9 Estrutura do código e testes
`app.js` continua sendo a **única fonte** de código (edite-o e rode
`python3 build.py`); está organizado em blocos comentados: ícones · dados e
motor legados · helpers · estado · motor de período · compute · UI (núcleo,
início, preenchimento, pendências, resultados, cenários, relatório) · gráficos ·
PDF · boot/tema/persistência. Testes novos em `tests/` (ver README);
os testes antigos (`tests-legado/`) dependem da navegação de 11 abas e só
rodam contra `referencia-v1/`.

---

## 0.1 Versão 3.1 — correções tributárias e consolidação (leia junto com a seção 0)

A v3.1 **não reconstruiu** nada e **não alterou** identidade visual, tabelas, alíquotas, presunções ou o cronograma IBS/CBS. Mudou o que estava conceitualmente errado ou ambíguo na camada de período (`40_motor_periodo`/`50_compute`), os relatórios e os testes.

**Regras novas (não reverter sem confirmar a fonte):**
1. **Fator R — fonte única da folha necessária.** `calcFatorRComparativo` exibe `folhaNecMensal/Periodo` = a folha efetivamente usada na simulação "com Fator R" (`com.folha.mensal`), na mesma base de RBT12 (RBT12/12 × 28% para empresa existente com RBT12 constante; 28% × receita do mês em janela móvel/nova). Histórico: `enquadraEm` informa quando o Fator R de 28% é atingido partindo da folha realmente informada (janela de 12 meses). Referência da economia: folha informada (se houver) → "Economia tributária potencial"; sem folha → "Diferença potencial entre cenários". A vantagem líquida é **estimativa** (`vantagemEstimada`) até o usuário confirmar a pendência `encargos-folha`. Início de atividade continua hipótese de planejamento (`fatorr-inicio`).
2. **Exclusão do Simples por excesso (`avaliarExclusaoSimples`).** Fonte: Manual da Exclusão do Simples Nacional (RFB, mar/2024, itens 4.2–4.3; LC 123 arts. 28–32; CGSN 140 arts. 81–84). Empresa em operação: receita bruta **acumulada no ano-calendário** (RBA) > R$ 4,8 mi; excesso ≤ 20% (até R$ 5,76 mi) → efeitos em 1º/jan do ano seguinte; > 20% → mês seguinte à ultrapassagem. Início de atividade: limite R$ 400 mil × meses (fração = mês); ≤ 20% → 1º/jan seguinte; > 20% → **retroativo** à abertura. Meses do ano anterior ao período são estimados pela média do RBT12 informado (`excesso.estimado`). O Simples/Híbrido **só sai do ranking nos meses em que a exclusão já vale** (`regimes[].situacao`: regular · excesso-futuro · vedado-parcial · vedado). `foraDoLimite`/`mesesForaDoLimite` passaram a significar "efeito da exclusão em vigor".
3. **Lucro Presumido — limite do adicional.** `simularPresumidoPeriodo` passa `mesesPeriodo` = 3 (trimestre completo, R$ 60.000) — só o trimestre de **início de atividade** usa `3 − (mêsInício % 3)`. Simulação mais curta que o trimestre **não reduz** o limite; o trimestre fica `parcial` ("estimativa parcial", pendência `lp-parcial`, confiança "estimativa", resultado preliminar). Não há campo novo: a pergunta é feita na pendência.
4. **Comparativos.** `economia.tipo`: `economia` (só com regime atual informado) ou `diferenca-potencial`. `r.confianca[regime].nivel`: `calculo` ("Cálculo confirmado") · `estimativa` · `hipotese`. `r.conclusao` (`avaliarConclusao`): `definitiva` só sem dado essencial pendente; senão "Resultado preliminar" na tela, no resumo executivo e nos PDFs.
5. **Relatórios (substituem o de 12 slides):** `resumo` (Resumo Executivo, 2 slides, sem tributos), `completa` (Apresentação Completa, **até 5 slides condicionais** — visão geral · composição (+evolução se a receita varia) · Simples/Híbrido · Fator R só se aplicável · Lucro Presumido) e `memoria` (Memória Técnica, PDF **separado**, A4 retrato 794×1123, paginado por medição de blocos: premissas, resultado/confiabilidade, passo a passo, tabelas mês a mês e por trimestre, Fator R, pendências, parâmetros INSS/IRRF, fontes). `modeloRelatorio()` lê `"detalhado"` (rascunhos antigos) como `completa`. Nome: `...-apresentacao-<nome>-<resumo|completa>-<ts>.pdf` / `...-memoria-tecnica-<nome>-<ts>.pdf`.
6. **Gráficos:** rótulos de categoria em várias linhas (`quebrarRotulo`) e `autoSkip:false` nos gráficos de categorias (antes o rótulo do meio podia sumir). Cartão/linha "Menor custo" no PDF **não usa `box-shadow: inset`** (o html2canvas o desenha como bloco preto).

**Parâmetros validados (status):**
| Parâmetro | Situação |
|---|---|
| Exclusão por excesso (≤20% / >20% / início de atividade) | Conferido no Manual da Exclusão da RFB (oficial). Texto do art. 3º da LC 123 não lido diretamente (Planalto exigiu permissão). |
| Limite R$ 4,8 mi · R$ 400 mil × meses (fração = mês) | Oficial (mesmo manual, item 4.3). |
| Fator R: folha FS12 por regime de caixa com encargos | Solução de Consulta COSIT 17/2021 (via NetCPA). Aplicação ao início de atividade: **hipótese**. |
| INSS 11% até o teto R$ 8.475,55 (2026) | Teto confirmado em fonte secundária citando a Portaria MPS/MF 13/2026; alíquota não conferida em texto oficial nesta rodada. |
| IRRF 2026: simplificado R$ 607,20; redução R$ 978,62 − 0,133145×renda (R$ 5.000–7.350); parcelas 22,5% (675,49) e 27,5% (908,73) | Conferidos na orientação da RFB (dez/2025) com os exemplos numéricos (R$ 4.500 → 0; R$ 6.000 → R$ 394,54) — testados. Faixas de 7,5% e 15%: só fonte secundária. Status do bloco: hipótese. |
| Adicional de IRPJ R$ 20 mil × meses do período de apuração | Lei 9.249/1995 art. 3º §1º (já registrado). |
| IBS/CBS (alíquotas-teste 2026, cronograma 2027–2033) | Não alterados; ver `FONTES`. Não revalidados nesta rodada além da coerência com `IBS_CBS_CRONOGRAMA` (testes I1–I3). |

---

## 0.1b Versão 3.2 — refinamento visual e fluidez (somente UI)

- **Escopo**: simplificar o que existe. Motor (`blocos 10–50 de app.js`), fórmulas, CNAE, relatórios (`85_pdf`), paleta e fontes ficaram idênticos à v3.1 (única alteração em blocos de motor: o alias de navegação `LEGACY_TAB_MAP.comparativo → detalhe "tabela"`). Prova: `tests/regressao_v31.js` (84 cenários, JSON completo do `computeAll`) idêntico byte a byte nas duas versões; rasters dos PDFs idênticos.
- **Três níveis**: essencial (visível) · complementar (`details.collapse` em "Mais detalhes", "Período e ano-base", "Nome no relatório") · técnico (recolhido: "Detalhamento técnico", "Ajustes avançados"). Críticos (`atencao`, `pendente`, preliminar, limitações) nunca ficam recolhidos.
- **Preenchimento** (`63_ui_preenchimento`): grupos 1 Atividade · 2 Receita e período · 3 Folha e Fator R (só Anexo III/V) + um único "Ajustes avançados" com subseções (`data-adv`). `fatorRLinhaHTML` (linha) substitui o painel completo, que continua em `fatorRInsightsHTML` dentro de Resultados › Fator R. `classificacaoHTML` agora é uma linha; a versão em lista é `classificacaoKvHTML` (usada em IBS/CBS). `MOSTRAR_SE`/`data-showif` mostram campos condicionais sem recriar o formulário (pró-labore). Avulsa: valor + duração lado a lado; início/ano-base recolhidos.
- **Campos** (`fieldHTML`): `help` (?), `opt` ("(opcional)"), `showIf`, slot `.field-err` + `mensagemCampo()`/`validarCampo()` (erros só após tocar o campo ou ao tentar "Ver resultados"), `mascaraMoeda()` (milhar automático ao digitar), zero de campos monetários exibido vazio com exemplo no placeholder.
- **Pendências** (`64_ui_pendencias`): `pendenciasHTML(r, {mini:true})` mostra *atenção* e *pendentes* abertos e agrupa estimativas/opcionais/confirmados em retráteis; lista completa em Resultados › "Pendências e premissas" (`detPendencias`, com premissas de rotina: `premissasRotina`).
- **Resultados** (`66_ui_resultados`): hero → `regimeCardsHTML` → `alertasHTML` (`ressalvasEssenciais` + linha do Fator R) → gráfico comparativo → "Mais detalhes" (composição, evolução se a receita varia, tabela, Fator R) → "Detalhamento técnico". `renderCharts()` só cria gráficos de retráteis abertos; o `toggle` chama `renderCharts()` ao abrir. Ids estáveis: `.regime[data-regime]`, `#tabComparativo`, `#chartComparativo/#chartComposicao/#chartTemporal`, `#heroTotal`, `#det_<id>`.
- **Relatório** (`68_ui_relatorio`): 3 `[data-modelo]`, `#liveRelSum`, `#btnGerarPdf`, `#btnPreviaPdf`, `#btnSalvarRel`; nome/CNPJ em `details[data-adv="relopc"]`.
- **CSS**: bloco "V3.2" ao final de `shell.html`, escopado em `#stepRoot` (não vaza para o PDF). Tokens `--field-h:40px`, `--btn-h:40px`, `--btn-h-sm:32px`.
- **Testes**: `suite6_ux.js` (44 verificações, auditoria geométrica 3 telas × claro/escuro × cenários A/B/C × etapas), `regressao_v31.js`, `ux_cenarios.js`; `helpers.abrirDet()` abre retráteis antes de checar gráficos recolhidos.

## 0.1c Versão 3.2.1 — consolidação do Fator R, RBT12 e Resultados (leia junto com 0.1b)
Nenhuma fórmula, alíquota, tabela, visual, fonte, cor ou navegação mudou. Mudanças em `app.js`/`shell.html`:
- `calcFatorRComparativo` ganhou campos aditivos: `economiaDas`, `saldoEstimado`, `veredito` (`sem-economia` folha já ≥28% · `sem-ganho` acrescentar folha não reduz o DAS · `compensa` · `nao-compensa` · `indicativo-favoravel` · `indicativo-desfavoravel`), `retencoesSocio`, `encargosPatronais`, `avaliacao{suficiente,faltas}`. `compensa` só é true com `veredito==="compensa"`; `vantagemLiquida` segue como alias. Retenções de INSS/IRRF são do sócio, não custo da empresa; CPP dos Anexos III/V já está no DAS.
- `faltas` (o que impede concluir): folha-referencia, encargos-folha, fatorr-inicio (empresa nova), rbt12-auto, janela (Fator R não atingido de imediato), prolabore-atual, rbt12Historico.
- `avaliarConclusao` ganhou `estado` ("definitivo" só se não há `aConfirmar`) e `aConfirmar`; `classificarConfianca` ganhou `projecao` (2027+). UI: selo Preliminar/Definitivo + linha "Para tornar definitivo" com `data-foco`/`data-abrir-det`; aviso "preliminar" removido de `ressalvasEssenciais`.
- RBT12: `rbt12InlineHTML` (`#campo-rbt12`, `#liveRbt12Txt`, botões `data-rbt12="manual|auto"`), só para empresa existente.
- Fator R só é exibido quando `fatorRComp.aplicavel` (Anexos III/V); `detSimples` esconde Folha12m/Fator R fora disso.
- Fontes (`FONTES`): INSS teto, IRRF/Lei 15.270, CPP no Simples (LC 123 art. 13), manual PGDAS-D (FS12), CGSN 190/191 e cronograma IBS/CBS = oficiais; 11% INSS do sócio, Fator R em início de atividade, FS12 sem CPP, alíquotas CBS/IBS 2027+ e retenção de 10% sobre dividendos (Lei 15.270 art. 6º-A, não modelada) = hipóteses.
- Testes: `tests/suite7_v321.js`; `tests/comparar_regressao.js`. Relatório completo: `RELATORIO-V3.2.1.md`.

## 0.1d Versão 3.2.2 — homologação fiscal de 2027 (leia junto com 0.1c)
O ano de análise padrão é 2027, portanto as regras de 2027 valem por padrão. Mudanças no motor (`app.js`), todas com fonte oficial registrada em `FONTES`:
- `ANO_REGRAS_2027` e `simularSimplesPeriodo`: por período de apuração (ano do mês) ≥ 2027, empresa existente usa janela `k-13..k-2` (antes `k-12..k-1`); empresa nova usa `inicio-2027-1a-faixa` (k<2: 1ª faixa e fator "r" 0,28), `inicio-2027-media` (k=2..12: média dos meses 0..k-2 × 12; folha anualizada pelo mesmo critério) e `janela-2027` (k≥13). Até dez/2026 valem as regras antigas (`inicio-1`, `inicio-media`, `janela`). `calcSimplesNacional` aceita `ano`, `fatorRFixo` e `primeiraFaixa`.
- `ALIQ_NOMINAL_6A_FAIXA_2027` (I 0,189; II 0,299; III 0,329; IV 0,329; V 0,304), aplicado a partir de 2027 (2029+ = projeção); parcelas a deduzir e partilha inalteradas.
- Textos: `fatorRInicioTexto(r)`; aviso do prazo de opção em `detHibrido`; entradas de `FONTES` (janela 2027, início de atividade, 6ª faixa, folha fiscal, INSS 11% oficial, teto/IRRF 2027 hipótese, CGSN 194).
- Não alterado de propósito: soma da CPP paga no DAS à folha (estimativa tratada como paga + circularidade), partilha com IBS/CBS da Res. 190, §7º do art. 26 (incisos não lidos), Lei 15.270 art. 6º-A.
- Testes: `tests/suite8_v322.js` (oráculo independente), `tests/regressao_2026.js`, `tests/parity.js` (ajustado: 6ª faixa 2027+ é divergência esperada em relação ao app v1). Relatório: `RELATORIO-V3.2.2.md`.

## 0.1e Versão 3.2.3 — conferência final dos Anexos e das regras de 2027 (leia junto com 0.1d)
Mudanças no motor (`app.js`), todas com fonte registrada em `FONTES`:
- `ANEXOS_LC214` (partilha oficial 2027+ com CBS e IBS; períodos `2728`, `2029`, `2030`, `2031`, `2032`, `2033`), `partilhaOficial(anexo, ano, faixaIdx, aliqEfetiva)` (aplica a nota de 5% de ISS e remove ISS/ICMS em 2033+), `periodoTabelaLC214`. `calcSimplesNacional` usa `partilhaOficial` quando ano ≥ 2027; antes disso mantém `faixa.partilha`.
- `ALIQ_NOMINAL_6A_FAIXA_2029` (I 0,19; II 0,30; III e IV 0,33; V 0,305), usada de 2029 em diante (2027–28 em `ALIQ_NOMINAL_6A_FAIXA_2027`).
- `calcFatorRLegal` (casos de zero) e folha anualizada = média da folha × 12, independente da receita (`simularSimplesPeriodo`).
- `calcSimplesHibrido`: retira do DAS só CBS e IBS da partilha do Anexo/faixa/ano; antes de 2027 (`opcao` falso) o Híbrido é o DAS integral. Novos campos: `opcao`, `dasPartes`, `parcelaIbsNoDas`, `parcelaCbsNoDas`, `dasSemIbsCbs`; `agregarHibrido` soma `dasPartesTotais`, `mesesComOpcao`, `mesesSemOpcao`.
- `verificarLimiteInicioAtividade` ganha `sublimite` (R$ 300.000 × meses, só ≥ 2027) e a pendência informativa `sublimite` em `buildPendencias` (não altera cálculo).
- Não alterado de propósito: INSS/IRRF de 2027 (hipótese), alíquotas de referência de IBS/CBS (projeção), soma da CPP no DAS à folha, efeito financeiro da exclusão do sublimite. Art. 9º da Res. 190 e incisos do § 7º do art. 26: não lidos no texto integral (registrados como tal em Fontes).
- Testes: `tests/suite9_v323.js`, `tests/regressao_v322.js` (classifica S1/S2/H1/H2 e exige 0 diferença inesperada), oráculo da `suite8` atualizado, `tests/parity.js` (o Híbrido deixa de ser comparado com o app v1 por desenho). Relatório: `RELATORIO-V3.2.3.md`.

## 0.1f Versão 3.2.4 — ajuste final de elegibilidade (leia junto com 0.1e)
Regra: elegibilidade legal antes do custo. Nenhum valor calculado mudou; só classificação e recomendação (`app.js`):
- Estado por regime (`regimes[i].estado`): `elegivel` | `restricao` | `inaplicavel`; `incompleto` (total é valor mínimo), `mesesIncompletos`; Presumido com `referenciaGeral` quando há exclusão retroativa.
- `decidirRecomendacao(regimes, ex)` (função pura, testada com casos sintéticos) devolve `recomendacao` (`estado`: conclusivo | inconclusivo | indisponivel; `motivos`: `exclusao-retroativa`, `regime-misto`, `total-incompleto`; listas elegíveis/com restrição/inaplicáveis), `melhor` (null se não conclusivo), `melhorReferencia`. Regime incompleto só perde se o seu mínimo já for maior que o melhor completo.
- `avaliarSublimite(rows, hist)` → `simples.sublimiteAv` (meses afetados, por sublimite ou por 6ª faixa, retroatividade, eventos). Excesso ≤ 20% no início de atividade não retroage (LC 123, art. 3º, §§ 12 e 13).
- Textos: `situacaoRegimeInfo`, `recomendacaoInfo`, `categoriasRegimesTexto`, `valorRegimeNota`; hero/cartões/tabela, três PDFs (aviso compacto no slide 1 do Resumo), Memória Técnica (seção "Elegibilidade legal e recomendação"), Pendências (`sublimite`, `comparativo-inconclusivo`) e Fontes.
- Não calculado de propósito: ISS/ICMS/IBS devidos fora do DAS, Lucro Real, juros, multa, recolhimento retroativo. Pendências: art. 9º da Res. 190; tratamento da 6ª faixa no início de atividade no PGDAS-D.
- Testes: `tests/suite10_v324.js` (12 aberturas de 2027 com R$ 1,5 mi em 3 meses, decisão, telas, PDFs, Fontes), `tests/regressao_v323.js` (0 diferença em valores; classifica E1–E5). Relatório: `RELATORIO-V3.2.4.md`.

## 1. O que é o sistema

**Análise Tributária** é uma ferramenta de simulação e comparação de regimes
tributários para pequenas e médias empresas, usada internamente pela
Audicon/Contabilidade Integrada. Ela roda inteiramente no navegador (sem
back-end, sem banco de dados) e permite:

1. Cadastrar os dados de uma empresa (faturamento, RBT12, folha de pagamento,
   CNAE, ano de análise).
2. Calcular o custo tributário mensal/anual em três cenários:
   - **Simples Nacional** (com detecção automática ou manual do Anexo, e regra
     do Fator R quando aplicável).
   - **Simples Híbrido** — uma simulação de como ficaria o Simples Nacional
     depois da Reforma Tributária (IBS/CBS apurados à parte do DAS, regime não
     cumulativo).
   - **Lucro Presumido** — incluindo a transição de PIS/COFINS para CBS/IBS a
     partir de 2027.
3. Comparar os três regimes lado a lado (tabela + gráfico).
4. Simular um "Ponto de Equilíbrio" sob duas óticas: a da empresa prestadora de
   serviço (quanto ela precisaria faturar no Híbrido para manter o resultado
   líquido atual) e a do cliente contratante (qual valor de contrato no
   Híbrido mantém o mesmo custo líquido de hoje, considerando os créditos de
   IBS/CBS).
5. Exibir uma "Memória de Cálculo" (todas as fórmulas usadas, passo a passo,
   com os valores já substituídos).
6. Gerar um relatório em PDF (apresentação de slides 16:9), em dois formatos:
   **Resumo Executivo** (curto, 2 páginas, para enviar ao cliente) ou
   **Detalhado** (deck técnico completo, 12 slides).

O sistema **não é uma calculadora fiscal oficial** — é uma ferramenta de
simulação para apoiar conversas com o cliente. Isso é dito explicitamente na
interface (rodapé da sidebar: "Uso interno — decisão final do contador
responsável.") e nos textos de disclaimer do próprio relatório.

---

## 2. Stack técnica e estrutura de arquivos

Aplicação **single-page**, sem framework (JavaScript puro / vanilla DOM),
usando três bibliotecas de terceiros via CDN:

- `Chart.js` 4.4.4 — gráficos.
- `jsPDF` 2.5.1 — geração do PDF final.
- `html2canvas` 1.4.1 — captura de cada slide como imagem para montar o PDF.

### Arquivos-fonte (nunca editar os gerados)

| Arquivo | Papel |
|---|---|
| `shell.html` | Esqueleto estático da página (HTML + `<style>`), **sem** `<script>` próprio. Fonte de verdade para marcação/estilo/tema (claro/escuro). |
| `app.js` | **Toda** a lógica (v3 ≈ 4.100 linhas, em blocos comentados — ver 0.9). Fonte de verdade para o código. |
| `build.py` | Combina `shell.html` + `app.js` nos três arquivos abaixo. Rodar `python3 build.py` (ou `npm run build`) **sempre** que `shell.html` ou `app.js` forem editados. |
| `data/cnaes.json` | Base classificatória de CNAEs (CONCLA/IBGE, CNAE 2.3) — 1.332 subclasses, 673 classes, 285 grupos, 87 divisões, 21 seções. Carregada via `fetch()` em tempo de execução. |

### Arquivos gerados por `build.py` (nunca editar diretamente)

| Arquivo | Papel |
|---|---|
| `index.html` | Fragmento HTML puro (sem `<html>/<head>/<body>`) — é o artefato publicado (Claude Artifact). |
| `wrapper.html` | Documento HTML completo equivalente, com os scripts de terceiros via CDN — usado para abrir localmente num navegador comum. |
| `wrapper-local.html` | Mesmo documento, mas apontando para as cópias locais em `node_modules/` — usado pelos testes automatizados (Playwright), para não depender de rede. |

### Testes automatizados (Playwright)

- `test-cnae.js`, `test-hibrido.js`, `test-pdf.js`, `test-comparativo-presumido.js`, `test-classificacao-cnae.js` — rodam contra um servidor HTTP local (`python3 -m http.server 8791`, abrindo `http://localhost:8791/wrapper-local.html`), porque dependem do `fetch()` de `data/cnaes.json` (bloqueado sob `file://`).
- `test-full.js`, `test-darkmode.js` — rodam via `file://` diretamente (há uma limitação conhecida de CORS nesse modo, que gera erros de console não-relacionados a regressão, mas nunca falhas reais de asserção).

Rotina padrão ao alterar `app.js`:
```bash
python3 build.py
python3 -m http.server 8791 &
node test-cnae.js
node test-hibrido.js
node test-pdf.js
node test-comparativo-presumido.js
node test-classificacao-cnae.js
node test-full.js
node test-darkmode.js
# depois: pkill -f "http.server 8791"
```

### Publicação

O sistema é publicado como um Claude Artifact (página HTML hospedada,
autocontida, com `data/cnaes.json` como arquivo auxiliar anexo) e também
distribuído como um projeto zipado pronto para subir no GitHub/GitHub Pages.
Como o artefato pode ser aberto **fora** do claude.ai (ex.: GitHub Pages), o
código **não pode depender exclusivamente** de capacidades exclusivas do
claude.ai (ex.: `window.claude.use("downloads")`) — sempre precisa ter um
fallback funcional em navegador puro (ex.: `Blob` + `<a download>`).

---

## 3. Identidade visual (não alterar sem pedido explícito)

> **Substituída na v3 pela seção 0.8.** O texto abaixo (azul-marinho/verde, Fraunces) descreve a v1/v2 e está mantido apenas como histórico.

- Paleta fixa "dashboard financeiro premium": azul-marinho (`--navy:
  #0F2747`) + verde (`--green: #10A36A`), com modo escuro próprio (não é uma
  inversão automática — tem sua própria paleta, ativada por escolha do usuário
  ou por `prefers-color-scheme: dark` quando em "Automático").
- Fontes: Inter (corpo) + Fraunces (display), via Google Fonts.
- Layout: sidebar fixa à esquerda com navegação por abas + área de conteúdo à
  direita; responsivo (sidebar vira off-canvas em telas estreitas).
- **Não há nenhuma marca "Audicon" visível na interface nem no PDF** — isso foi
  removido deliberadamente numa fase anterior do projeto, sem substituir por
  outro nome. Não reintroduzir nenhuma marca sem pedido explícito do usuário.

---

## 4. Estrutura de estado (`state`) e navegação

> **Na v3** `state` ganhou `analise`, `periodo`, `fatorR`, `ui`, `confirmados`, `simId` e `active ∈ {inicio, preenchimento, resultados, relatorio}`; a navegação tem 4 etapas (seção 0.1). O bloco abaixo é o formato v1/v2 (campos de `empresa`, `simples`, `presumido`, `equilibrio`, `hibrido`, `ibscbs` continuam válidos).

O objeto global `state` (em `app.js`) guarda tudo que o usuário digitou e o
resultado do último cálculo:

```js
state = {
  active: "dashboard",          // aba atualmente visível
  empresa: {
    nome, cnpj,
    cnae: null,                 // registro CNAE selecionado — ver seção 7
    faturamentoMensal: 18000,
    rbt12Modo: "auto" | "manual", rbt12Manual,
    folha12m, proLabore,
    anoAnalise: 2026,
  },
  simples: { anexoModo: "auto" | "manual", anexoManual: "III" },
  presumido: {
    atividade: "servicos_gerais", receitaTrimestre,
    pisAliq: 0.65, cofinsAliq: 3.0, issAliq: 3.0,
    majoracao: false,           // aplica majoração de 10% da presunção acima de R$1,25mi/trimestre
    anoProjecao: 2027,          // ano usado para decidir se já é substituído por CBS/IBS
  },
  equilibrio: { custosFixos, custosVariaveisPct, contratoBruto, contratoLiquido, creditoContratanteAtualPct },
  hibrido: { anoProjecao: 2033, valorContratoAnual, creditoIbsPct: 0, creditoCbsPct: 0, creditoContratanteHibridoPct: 100 },
  comparativo: { view: "detalhado" }, // usado pela tela; ver `pdfComparativoView` para o PDF, seção 9
  result: null,                 // preenchido por computeAll()
  memoria: [],                  // preenchido por computeAll()
}
```

Navegação (`NAV`), 11 abas: Dashboard · Dados da Empresa · Simples Nacional ·
Fator R · Simples Híbrido · Lucro Presumido · Comparativo · Ponto de
Equilíbrio · Memória de Cálculo · Relatório PDF · Fontes.

Tudo é recalculado a partir de `computeAll()`, que lê `state` inteiro e devolve
`state.result` — **nenhuma tela guarda seu próprio cálculo paralelo**; todas
leem `state.result` (ou chamam `computeAll()` de novo, que é determinístico e
sem efeitos colaterais além de popular `state.result`/`state.memoria`).

---

## 5. Regras de negócio — Simples Nacional

### 5.1 Faixas de RBT12

```js
FAIXAS_LIMITES = [
  { min: 0,        max: 180000  },  // 1ª faixa
  { min: 180000,   max: 360000  },  // 2ª faixa
  { min: 360000,   max: 720000  },  // 3ª faixa
  { min: 720000,   max: 1800000 },  // 4ª faixa
  { min: 1800000,  max: 3600000 },  // 5ª faixa
  { min: 3600000,  max: 4800000 },  // 6ª faixa
]
```

RBT12 acima de R$ 4.800.000,00 gera um alerta amarelo ("fora do limite de
permanência no Simples Nacional"), mas o sistema continua calculando usando a
última faixa (não trava o cálculo).

### 5.2 Anexos I a V

Tabela completa de alíquota nominal, parcela a deduzir e partilha percentual
por tributo, para cada uma das 6 faixas, dos 5 Anexos (`ANEXOS` em `app.js`,
linhas ~51-97). Os tributos que compõem a partilha variam por Anexo:

- **Anexo I** (Comércio): IRPJ, CSLL, COFINS, PIS, CPP, ICMS.
- **Anexo II** (Indústria): IRPJ, CSLL, COFINS, PIS, CPP, IPI, ICMS.
- **Anexo III** (Serviços, Fator R ≥ 28%): IRPJ, CSLL, COFINS, PIS, CPP, ISS.
- **Anexo IV** (Serviços, CPP recolhido à parte): IRPJ, CSLL, COFINS, PIS, ISS
  (sem CPP na partilha — é pago separadamente pelo prestador).
- **Anexo V** (Serviços, Fator R < 28%): IRPJ, CSLL, COFINS, PIS, CPP, ISS.

Fórmula da alíquota efetiva (igual à do Simples Nacional real):

```
aliqEfetiva = (RBT12 × aliqNominal − parcelaDeduzir) / RBT12
DAS mensal  = faturamentoMensal × aliqEfetiva
```

Cada valor de partilha é aplicado sobre o DAS mensal calculado
(`partilhaValores[tributo] = dasMensal × (partilha[tributo] / 100)`).

### 5.3 Regra do Fator R

- `anexoKey = "III_V"` é o valor usado quando o modo é **automático**
  (`state.simples.anexoModo === "auto"`). Isso significa: calcular o Fator R e
  decidir entre Anexo III e Anexo V.
- Fórmula: `fatorR = folha12m / RBT12`.
- Regra: **Fator R ≥ 28% → Anexo III** (menor carga); **Fator R < 28% → Anexo
  V** (maior carga).
- No modo **manual**, o usuário escolhe diretamente qualquer um dos 5 Anexos
  (`state.simples.anexoManual`), e o Fator R não é sequer calculado para esse
  fim.
- Há uma função auxiliar somente informativa, `calcFolhaNecessariaFatorR(rbt12)
  = rbt12 * 0.28`, usada apenas para mostrar ao usuário "quanto de folha seria
  necessário para bater 28%" — não interfere na decisão em si.

---

## 6. Regras de negócio — Lucro Presumido

### 6.1 Percentuais de presunção por atividade (`PRESUNCAO`)

| Chave | IRPJ | CSLL | Rótulo |
|---|---|---|---|
| `comercio_industria` | 8% | 12% | Comércio / indústria em geral |
| `revenda_combustiveis` | 1,6% | 12% | Revenda de combustíveis |
| `transporte_cargas` | 8% | 12% | Transporte de cargas |
| `transporte_passageiros` | 16% | 12% | Transporte de passageiros |
| `servicos_hospitalares` | 8% | 12% | Serviços hospitalares / saúde (equiparados) |
| `construcao_com_material` | 8% | 12% | Construção civil (empreitada c/ material) |
| `servicos_gerais` | 32% | 32% | Serviços profissionais / gerais |
| `servicos_ate_120k` | 16% | 32% | Serviços gerais — RBAA até R$ 120 mil/ano |
| `instituicoes_financeiras` | 16% | 12% | Instituições financeiras e equiparadas (Lei 9.249/1995, art. 15, §1º, II) — nova nesta etapa, usada automaticamente para CNAEs da Seção K |

### 6.2 Apuração trimestral de IRPJ/CSLL

```
baseIRPJ = receitaTrimestre × (irpjPct / 100)
baseCSLL = receitaTrimestre × (csllPct / 100)

irpjNormal    = baseIRPJ × 15%
adicionalBase = max(baseIRPJ − R$ 20.000 × meses do período de apuração, 0)   // 60.000 no trimestre completo; proporcional só no trimestre de início de atividade (v3.1)
irpjAdicional = adicionalBase × 10%
irpjTotal     = irpjNormal + irpjAdicional

csllTotal     = baseCSLL × 9%
```

### 6.3 Majoração de 10% acima de R$ 1,25 milhão/trimestre

Regra opcional (`state.presumido.majoracao`, checkbox — desligada por padrão):
se a receita do trimestre passar de R$ 1.250.000,00, a **parte excedente**
paga IRPJ/CSLL com os percentuais de presunção majorados em 10% (ex.: 32%
vira 35,2%). A parte até R$ 1,25 mi continua com o percentual normal. Isso é
sinalizado na base `FONTES` com **status `"hipotese"`** (não `"oficial"`) —
"regra recente, recomenda-se confirmação antes de aplicar em casos reais" —
porque se baseia em Instruções Normativas específicas (IN RFB nº 2.305/2025 e
nº 2.306/2026) que devem ser reconfirmadas antes de uso em casos reais.

### 6.4 PIS/COFINS cumulativo (regime pré-reforma / ano-teste 2026)

- Alíquotas padrão: PIS 0,65% e COFINS 3,00% (regime cumulativo do Lucro
  Presumido, `Lei 9.718/1998`) — mas são **editáveis pelo usuário** (campos
  `state.presumido.pisAliq`/`cofinsAliq`), não fixas.
- ISS também editável (`state.presumido.issAliq`, padrão 3,00%) — varia por
  município (2% a 5%), por isso é sempre um parâmetro do usuário, nunca um
  valor fixo do sistema.

### 6.5 Transição para CBS/IBS a partir de 2027

O Lucro Presumido usa o **mesmo cronograma** `IBS_CBS_CRONOGRAMA` já definido
para a aba Simples Híbrido (ver seção 8) — nenhuma alíquota nova é inventada
aqui:

- `state.presumido.anoProjecao` (padrão **2027**) decide o comportamento:
  - **Ano-teste (2026)** ou anos anteriores: PIS/COFINS/ISS continuam sendo os
    tributos efetivamente vigentes; os valores de teste de CBS/IBS seriam
    integralmente compensáveis, sem impacto financeiro líquido.
  - **A partir de 2027** (`substituidoPorCbs = ano >= 2027`): PIS e COFINS são
    **extintos** e substituídos pela CBS; o ISS continua sendo cobrado, mas
    aplicando o **fator remanescente** do ano (`issIcmsFatorRemanescente` do
    cronograma) sobre a alíquota de ISS informada pelo usuário — ex.: em 2029,
    ISS efetivo = alíquota informada × 90%.
- Fórmulas (quando `substituidoPorCbs`):
  ```
  cbs = receitaTrimestre × (crono.cbs / 100)
  ibs = receitaTrimestre × (crono.ibs / 100)
  iss = receitaTrimestre × (issAliq × fatorRemanescenteIss)
  ```
- Fórmulas (quando **não** `substituidoPorCbs`):
  ```
  pis    = receitaTrimestre × pisAliq
  cofins = receitaTrimestre × cofinsAliq
  iss    = receitaTrimestre × issAliq
  ```
- `totalTrimestre = irpjTotal + csllTotal + (pis + cofins + cbs + ibs + iss)`
  — apenas um dos pares (PIS+COFINS) **ou** (CBS+IBS) é diferente de zero, de
  acordo com o ano.
- `totalAnual = totalTrimestre × 4` (a receita informada é multiplicada por 3
  para virar "receita do trimestre": `receitaTrimestre = faturamentoMensal ×
  3`).

### 6.6 Tratamento tributário diferenciado de IBS/CBS — alíquotas, reduções e benefícios (adicionado em 28/09/2026)

IBS e CBS **não** são mais calculados como "base × alíquota de referência do
cronograma" de forma cega. Existe uma camada de **tratamento tributário**
que fica **entre** a alíquota de referência (`IBS_CBS_CRONOGRAMA`) e o valor
final de IBS/CBS, tanto no Simples Híbrido quanto no Lucro Presumido —
usada pelas duas telas ao mesmo tempo, para nunca divergir entre si.

- **`IBS_CBS_TRATAMENTOS`** (`app.js`): tabela de categorias de tratamento,
  cada uma com `reducaoPct` (percentual de redução sobre a alíquota de
  referência; `null` quando não é redutível a um percentual único),
  `tipo` (`"padrao"` | `"reducao"` | `"isencao"` | `"especifico"` |
  `"confirmar"`), `fonte` e `status` (`"oficial"`/`"hipotese"`), seguindo a
  mesma convenção de `FONTES`. Categorias atuais: `padrao` (sem redução),
  `reducao60` (Anexo II, LC 214/2025 — saúde, educação, agropecuária etc.),
  `reducao100_cesta` (Anexo I — Cesta Básica Nacional de Alimentos),
  `reducao100_outros` (outras isenções, hipótese), `reducao30_liberal`
  (sociedades profissionais, hipótese), `regime_especifico` (combustíveis,
  financeiro, planos de saúde, imóveis — sem percentual definido) e
  `outro_confirmar` (fallback quando nada se aplica automaticamente).
  **Nenhuma alíquota/percentual novo foi inventado** — os que não têm base
  legal específica e confirmada estão marcados `status: "hipotese"` e/ou
  `reducaoPct: null` (tratados como alíquota cheia até confirmação manual).
- **`aplicarTratamentoIbsCbs(cronoAno, tratamento, aliquotaEfetivaManualPct)`**
  (função pura): recebe o ano do cronograma e o tratamento selecionado e
  devolve `{ ibsRefPct, cbsRefPct, ibsEfetivoPct, cbsEfetivoPct,
  reducaoAplicadaPct, manual }`. Se `aliquotaEfetivaManualPct` for informada
  pelo usuário, ela tem prioridade e é distribuída entre IBS/CBS mantendo a
  MESMA proporção relativa da alíquota de referência (nunca inventa uma
  composição nova entre os dois tributos). Usada tanto por
  `calcSimplesHibrido()` quanto por `calcLucroPresumidoTrimestral()`.
- **`state.ibscbs`**: `{ tratamento: "padrao", aliquotaEfetivaManualPct: null,
  observacao: "" }` — **compartilhado** entre Simples Híbrido e Lucro
  Presumido (é a mesma empresa/operação nas duas telas). `"padrao"` (sem
  redução) é o valor padrão — nenhum benefício é assumido automaticamente.
  Persistido em `saveDraft`/`loadDraft`/`resetState`/`boot`/`currentSnapshot`
  como os demais campos de `state`.
- **`sugestaoTratamentoIbsCbs()`**: sugestão **meramente informativa**
  (nunca aplicada automaticamente) baseada em palavras-chave da atividade do
  Lucro Presumido (`servicos_hospitalares`) e da descrição do CNAE
  selecionado. Aparece como um alerta com botão "Aplicar sugestão" — o
  usuário decide. **Não fere a regra de desacoplamento do CNAE** (seção 7):
  é só uma sugestão, nunca uma determinação automática.
- **Componente de UI compartilhado**: `tratamentoIbsCbsCardHTML(ctx)` +
  `wireTratamentoIbsCbsCard()` — renderizado tanto na aba Simples Híbrido
  quanto na aba Lucro Presumido (área "Tratamento tributário IBS/CBS"),
  mostrando: alíquota de referência, redução/benefício aplicado, alíquota
  efetiva, base de cálculo, IBS calculado, CBS calculado, tipo de
  tratamento, fonte/regra — e permitindo trocar o tratamento, informar uma
  alíquota efetiva manual, ou registrar uma observação/premissa.
- **Reflexos**: os valores de IBS/CBS em `hibrido.ibsDebito/cbsDebito` e em
  `presumido.trimestre.ibs/cbs` já saem **líquidos da redução aplicada**
  (nada muda nos pontos que só leem esses valores — Comparativo, Dashboard,
  Ponto de Equilíbrio, PDF Detalhado). A memória de cálculo mostra a
  composição completa: base × alíquota de referência = teórico → (−)
  redução → alíquota efetiva → IBS/CBS. **O Resumo Executivo (tela e PDF)
  continua sem citar tributos específicos** — a área de tratamento
  tributário só aparece nas abas Simples Híbrido/Lucro Presumido e no
  Comparativo/PDF "Detalhado".
- Novas entradas em `FONTES` para as regras de redução/isenção (Anexo I e
  II da LC 214/2025, redução de 30% para sociedades profissionais, etc.),
  cada uma com o `status` correto.

---

## 7. Base de CNAEs e classificação tributária automática (CNAE → Atividade → Presunção → IBS/CBS)

- Fonte: `data/cnaes.json`, gerado a partir da classificação oficial
  CONCLA/IBGE (CNAE 2.3, vigente desde 2019-01-01) — 21 seções, 87 divisões,
  285 grupos, 673 classes, **1.332 subclasses**.
- Cada subclasse tem: `codigo`, `descricao`, `secao`, `divisao`, `grupo`,
  `classe`, `atividades` (lista de atividades específicas/sinônimos usados na
  busca — ex.: a subclasse "Promoção de vendas" tem "panfletagem" como uma das
  atividades, para a busca encontrar por palavra-chave).
- Busca (`cnaeSearch`) com ranking por relevância, tolerante a acentos:
  1. código completo exato
  2. código parcial (prefixo)
  3. descrição idêntica
  4. descrição começando com o termo
  5. correspondência de palavra inteira na descrição
  6. correspondência parcial na descrição
  7. atividade específica começando com o termo
  8. atividade específica contendo o termo
- Importação manual: o usuário pode importar um CSV ou JSON próprio (mesmo
  formato) para substituir a base padrão, via `importCnaeFile()`.
- Na aba **Fontes**, a linha da base de CNAEs mostra status `"oficial"` só
  quando a base carregou com sucesso; se falhar ao carregar (`erro`) ou
  estiver carregando, mostra `"hipotese"` com a mensagem de erro/carregamento.

### 7.1 Histórico: regra de desacoplamento original (revertida por pedido explícito do usuário)

Até a etapa anterior deste projeto, vigorava a regra de que a base de CNAEs
era **puramente classificatória** e nunca alterava automaticamente o Anexo do
Simples Nacional nem a atividade do Lucro Presumido — o próprio texto desta
seção dizia "não reacoplar isso a menos que o usuário peça explicitamente".

O usuário fez exatamente esse pedido explícito, na mensagem "COMPLEMENTO
OBRIGATÓRIO — CNAE → ATIVIDADE → PRESUNÇÃO → IBS/CBS": a classificação
tributária deve ser o mais automática possível a partir do CNAE informado,
eliminando o preenchimento manual sempre que a informação puder ser obtida de
forma confiável, sem nunca inventar uma classificação quando a legislação
exigir informação complementar que o CNAE, isoladamente, não fornece. A regra
de desacoplamento acima foi substituída pelo motor descrito em 7.2.

### 7.2 Motor de classificação por CNAE (`classificarPorCnae()`)

- `classificarPorCnae()` (app.js) lê `state.empresa.cnae` (a subclasse
  selecionada) e resolve, a partir da Seção/Divisão/Grupo/Classe, uma
  classificação com três componentes: `natureza` ("comercio" / "industria" /
  "servico" / "financeiro"), `presuncao` (chave de `PRESUNCAO` aplicável ao
  Lucro Presumido) e `ibscbs` (chave de `IBS_CBS_TRATAMENTOS` aplicável).
  Regras mais específicas (Divisão/Grupo/Classe — ex.: combustíveis, saúde
  Divisão 86, transporte por Grupo) têm prioridade sobre a regra genérica da
  Seção. Retorna `null` quando nenhum CNAE está selecionado.
- Cada componente (`presuncao`/`ibscbs`) resolvido carrega sua própria
  **fonte legal**, **motivo** e **nível de confiança** (`"alta"` / `"media"` /
  `"baixa"`) — nunca um valor "inventado" sem rastro. Nada aqui cria uma
  alíquota ou percentual novo: a função apenas escolhe, com justificativa
  explícita, qual entrada já existente de `PRESUNCAO`/`IBS_CBS_TRATAMENTOS` se
  aplica ao caso.
- **Quando a legislação exige uma informação que o CNAE não fornece** (ex.:
  construção civil — empreitada com ou sem material; saúde Divisão 86 —
  conceito restritivo de "serviços hospitalares" da Receita Federal; transporte
  aquaviário — cargas ou passageiros; profissão regulamentada — elegibilidade
  à redução de 30% de IBS/CBS; atividade imobiliária — venda, locação ou
  intermediação), o componente correspondente vem marcado `pendente: true` e
  **nenhum valor é assumido**: o valor efetivo permanece o mesmo que já
  estava em uso antes da seleção do CNAE, até o usuário responder a pergunta
  complementar objetiva definida em `COMPLEMENTOS_CLASSIFICACAO` (registrada
  em `state.classificacaoComplementos`, por id da pergunta).
- Um componente com confiança `"media"` ou `"baixa"` (mas não pendente) **é
  aplicado automaticamente** — a filosofia adotada é: quando existe uma única
  resposta determinável (ainda que sujeita a nuance ou verificação, como
  "produtos agropecuários em regra têm redução de 60%"), aplicar
  automaticamente e sinalizar com clareza o nível de confiança para
  validação do usuário (item 5 do pedido); só quando existem **duas ou mais
  respostas materialmente diferentes** em aberto (item 6 do pedido) é que o
  sistema bloqueia com uma pergunta complementar.
- Valores **derivados** (nunca mutam os campos brutos do state — mesmo
  padrão já usado por `anexoKeyAtual()`):
  - `atividadeKeyAtual()` — atividade efetiva do Lucro Presumido: em modo
    manual (`state.presumido.atividadeModo === "manual"`) usa
    `state.presumido.atividade`; em modo automático, usa
    `classificarPorCnae().presuncao.key` quando não pendente, e cai no valor
    bruto (`state.presumido.atividade`) quando não há CNAE ou está pendente.
  - `tratamentoIbsCbsKeyAtual()` — tratamento efetivo de IBS/CBS: mesmo
    padrão, usando `state.ibscbs.modo` e `state.ibscbs.tratamento`.
  - `anexoKeyAtual()` — estendida (não substituída): em modo manual, usa
    `state.simples.anexoManual`; em modo automático, usa Anexo I quando
    `natureza === "comercio"`, Anexo II quando `natureza === "industria"`, e
    cai na regra do Fator R (`"III_V"`) em qualquer outro caso (serviço,
    financeiro, ou sem CNAE selecionado) — **exatamente o comportamento
    anterior a esta funcionalidade**, preservado como fallback.
  - Nada disso muta `state.simples.anexoManual`, `state.simples.anexoModo`
    (fora do clique explícito do usuário) ou `state.presumido.atividade` —
    por isso `test-cnae.js` (item 10) continua passando sem alteração: a
    seleção de um CNAE, por si só, não escreve nesses campos brutos.
- **Novo em `PRESUNCAO`:** `instituicoes_financeiras` (IRPJ 16% / CSLL 12%,
  Lei 9.249/1995, art. 15, §1º, II) — usado automaticamente para CNAEs da
  Seção K (atividades financeiras, de seguros e serviços relacionados).
- **Perguntas complementares** (`COMPLEMENTOS_CLASSIFICACAO`): cada uma tem
  `pergunta`, `opcoes` (valores objetivos, nunca "sim/depende") e
  `explicacao` (por que o CNAE, isoladamente, não resolve). Existem hoje:
  `construcaoMaterial`, `servicosHospitalares`, `transporteAquaviario`,
  `profissaoRegulamentada`, `atividadeImobiliaria`.
- **Reaproveitamento (evita duplicidade — item 4 do pedido):** a classificação
  é resolvida **uma única vez** em `computeAll()` e usada por Simples
  Nacional/Fator R (via `anexoKeyAtual()`), Lucro Presumido (via
  `atividadeKeyAtual()`, incluindo a base de presunção IRPJ/CSLL), Simples
  Híbrido/IBS-CBS (via `tratamentoIbsCbsKeyAtual()`), Comparativo, Memória de
  Cálculo e Relatório em PDF — o usuário informa o CNAE uma única vez, na aba
  Dados da Empresa.
- **Transparência (item 5 do pedido):** a aba Dados da Empresa mostra um card
  "Classificação tributária identificada" (`classificacaoCardHTML()`) logo
  após o campo do CNAE, com a cadeia completa: CNAE → Atividade → Presunção
  IRPJ/CSLL → Tratamento IBS/CBS → Alíquota IBS/CBS, cada item com selo de
  confiança ("Automático — confiança alta/media/baixa" ou "Confirmação
  necessária") e a fonte/motivo por extenso. O mesmo padrão de badge
  (`confiancaBadgeHTML()`) aparece nas abas Simples Nacional, Lucro Presumido
  e no cartão compartilhado "Tratamento tributário IBS/CBS" (Simples
  Híbrido/Lucro Presumido), cada um com um seletor "Automático (classificação
  por CNAE)" vs. opções manuais explícitas — selecionar manualmente sempre
  substitui o valor automático, em qualquer aba, a qualquer momento.
- **Testes:** `test-cnae.js` (preservado sem alteração, item 10 continua
  validando que a seleção de CNAE não muta os campos brutos) e o novo
  `test-classificacao-cnae.js`, que cobre: comércio (Anexo I automático),
  indústria (Anexo II automático), instituição financeira (presunção 16/12 +
  regime específico de IBS/CBS), construção civil (pendência → confirmação →
  resolução), saúde Divisão 86 (IBS/CBS auto-aplicado com confiança média
  enquanto a presunção fica pendente do conceito restritivo de "serviços
  hospitalares"), override manual em qualquer nível, e ausência de CNAE
  (comportamento idêntico ao anterior a esta funcionalidade).

---

## 8. Simples Híbrido (simulação pós-reforma) e cronograma IBS/CBS

### 8.1 Cronograma de transição (`IBS_CBS_CRONOGRAMA`)

Fonte: EC 132/2023 + LC 214/2025. Usado tanto pelo Simples Híbrido quanto pelo
Lucro Presumido (seção 6.5):

| Ano | CBS | IBS | Fator remanescente ISS/ICMS | Observação |
|---|---|---|---|---|
| 2026 | 0,9% | 0,1% | 100% | Ano-teste — valores compensáveis, sem impacto financeiro líquido. Optantes do Simples são dispensados de destacar IBS/CBS. |
| 2027 | 8,8% | 0,1% | 100% | Extinção de PIS/COFINS e do IPI (exceto ZFM). |
| 2028 | 8,8% | 0,1% | 100% | Transição mantida. |
| 2029 | 8,8% | 1,77% | 90% | ICMS/ISS a 90% da alíquota atual. |
| 2030 | 8,8% | 3,54% | 80% | ICMS/ISS a 80%. |
| 2031 | 8,8% | 5,31% | 70% | ICMS/ISS a 70%. |
| 2032 | 8,8% | 7,08% | 60% | ICMS/ISS a 60%. |
| 2033 | 8,8% | 17,70% | 0% | Extinção total de ICMS/ISS. IBS/CBS plenamente vigente. |

`ALIQUOTA_REF_ESTIMADA = 26,5%` — teto de referência da EC 132/2023; o CGIBS
estimou preliminarmente 27,91%, valor sujeito a resolução do Senado Federal —
por isso tratado como **hipótese**, não como fato consolidado.

### 8.2 Mecânica do Simples Híbrido

A ideia: simular como ficaria o DAS do Simples Nacional se IBS e CBS já
fossem apurados **à parte** (fora do DAS), em regime não cumulativo, mantendo
o restante da partilha do Simples (IRPJ, CSLL, CPP) como está hoje.

```
tributoConsumo    = "ICMS" (Anexos I/II) ou "ISS" (Anexos III/IV/V)
parcelaIbsNoDas   = partilhaValores.ICMS + partilhaValores.ISS  (o que quer que exista)
parcelaCbsNoDas   = partilhaValores.COFINS + partilhaValores.PIS
parcelaConsumoDas = parcelaIbsNoDas + parcelaCbsNoDas
dasSemIbsCbs      = max(dasMensal − parcelaConsumoDas, 0)

ibsDebito = faturamentoMensal × (cronoAno.ibs / 100)
cbsDebito = faturamentoMensal × (cronoAno.cbs / 100)

creditoIbs = ibsDebito × (creditoIbsPct / 100)
creditoCbs = cbsDebito × (creditoCbsPct / 100)

ibsLiquido = max(ibsDebito − creditoIbs, 0)
cbsLiquido = max(cbsDebito − creditoCbs, 0)

totalMensal = dasSemIbsCbs + ibsLiquido + cbsLiquido
```

**Regra crítica sobre créditos:** `creditoIbsPct` e `creditoCbsPct`
(`state.hibrido.creditoIbsPct`/`creditoCbsPct`) são **parâmetros de simulação
ajustáveis pelo usuário**, nunca alíquotas fixas do sistema — dependem do
perfil de insumos/compras de cada empresa. **O padrão é 0% (sem crédito
assumido)**, nunca 100% — o sistema nunca deve "assumir" crédito integral por
padrão. O crédito de IBS não é compensado contra o débito de CBS (créditos
apurados separadamente, cada um contra seu próprio débito).

### 8.3 Ponto de Equilíbrio — duas perspectivas

**Prestadora** (quem presta o serviço): quanto ela precisaria faturar no
Híbrido para manter o **mesmo resultado líquido mensal** que tem hoje no
Simples Normal.

```
resultadoAtualPrestadora = faturamentoMensal − custosVariáveis − custosFixos − dasMensal(Normal)
receitaNecessariaHibrido = receita tal que, com a carga efetiva do Híbrido,
                           o resultado líquido continue igual a resultadoAtualPrestadora
                           (via calcReceitaParaResultado, fórmula geral de margem de contribuição)
```

**Contratante** (quem contrata o serviço): qual valor de contrato no Híbrido
resulta no **mesmo custo líquido** que o contratante tem hoje, considerando o
crédito de IBS/CBS que ele pode aproveitar.

```
custoLiquidoContratanteAtual = contratoAtual − (contratoAtual × creditoContratanteAtualPct / 100)
valorEquivalenteHibrido = custoLiquidoContratanteAtual
                          reajustado pelo fator (1 − (ibsPct+cbsPct)/100 × creditoContratanteHibridoPct/100)
```

Ambos são funções **puras e genéricas** (`calcReceitaParaResultado`,
`calcPontoEquilibrio`, `calcCreditoContratante`,
`calcValorContratoParaCustoLiquido`) — reaproveitáveis para qualquer cenário
de margem de contribuição/carga tributária, não hardcoded para um caso
específico.

---

## 9. Relatório em PDF — três modelos (v3.1: ver seção 0.1, item 5; o texto abaixo descreve a base histórica)

> **v3.1:** o relatório de 12 slides foi substituído por Apresentação Completa (até 5 slides) e Memória Técnica (PDF separado). `buildPptxSlideDefs` deixou de existir; valem `buildResumoExecutivoSlideDefs`, `buildApresentacaoCompletaSlideDefs` e `buildMemoriaPages`.

> **v3:** o modelo é escolhido na etapa 4 (`state.ui.relatorioModelo`, padrão `resumo`; função `modeloRelatorio()` substitui `pdfComparativoView`). Os dois construtores continuam separados e o Resumo Executivo **continua sem citar tributos** (testado). Ambos informam o **período analisado** e as premissas, leem `state.result` e usam os gráficos compartilhados. O deck foi redesenhado na identidade v3 (claro, Alata/Inter, laranja só em avisos). Nome do arquivo, timestamp completo e fallback de download (`entregarArquivo`) são os mesmos descritos abaixo.

Esta é a área que sofreu a correção mais recente do projeto — **não
reintroduzir o bug antigo** (ver seção 10).

- `state.comparativo.view` controla a exibição na tela (aba Comparativo);
  `pdfComparativoView` (variável separada, lida no toggle da aba Relatório
  PDF) controla **apenas** o formato do PDF/apresentação: `"resumo"`
  (**padrão**) ou `"detalhado"`.
- **Dois construtores de deck totalmente separados** (nunca voltar a ter um
  único deck de 12 slides com um slide trocado):
  - `buildResumoExecutivoSlideDefs(r)` → **2 slides**:
    1. "Quanto custa cada cenário" — identificação da empresa/CNPJ/ano, os 3
       regimes lado a lado (custo mensal + carga efetiva + custo anual) e um
       gráfico comparativo.
    2. "Base da simulação" — premissas (faturamento, RBT12, enquadramento
       Simples, atividade do Presumido, ano de projeção do Híbrido/Presumido,
       percentuais de crédito) + um aviso genérico dizendo que uma análise
       técnica completa está disponível mediante solicitação.
  - `buildPptxSlideDefs(r)` → **12 slides** (deck técnico completo: capa,
    dados considerados, os 3 regimes, composição/custo do Anexo, DAS+IBS+CBS
    do Híbrido, CBS+IBS+ISS/IRPJ+CSLL do Presumido, tabela comparativa
    completa com gráfico, enquadramento de Anexos, prestadora×contratante,
    impacto para o contratante, dados utilizados, bases legais).
- **Dispatcher único** — usado tanto pela lista de estrutura (preview da aba
  Relatório PDF) quanto pela montagem real (preview interativo/exportação),
  para que nunca divirjam entre si:
  ```js
  function buildActivePptxSlideDefs(r) {
    return pdfComparativoView === "detalhado" ? buildPptxSlideDefs(r) : buildResumoExecutivoSlideDefs(r);
  }
  ```
- **Regra de conteúdo, testada automaticamente:** o deck **Resumo Executivo**
  (tela e PDF) **nunca** pode citar nomes de tributos específicos (IRPJ, CSLL,
  DAS, ISS, IBS, CBS) — nem mesmo em textos explicativos/disclaimers. Só
  termos genéricos como "detalhamento tributário" são permitidos. O deck
  **Detalhado** pode e deve citar todos os tributos normalmente.
- Exportação: `exportPptxPdf()` monta cada slide como uma imagem
  (`html2canvas`) e concatena num PDF (`jsPDF`), em formato 16:9 (1280×720 pt
  por página — uma página por slide). Nome do arquivo:
  `analise-tributaria-apresentacao-<empresa>-<resumo|detalhado>-<timestamp
  completo AAAA-MM-DD-HHMMSS>.pdf` — **o timestamp precisa ser completo (com
  hora/minuto/segundo)** para nunca colidir entre exportações consecutivas na
  mesma sessão (ver seção 10, bug histórico).
- Download: tenta primeiro `window.claude.use("downloads")` (capacidade
  exclusiva de artifacts hospedados no claude.ai); se não existir (`null` —
  página aberta fora do claude.ai, ex.: GitHub Pages), cai automaticamente
  para o fallback padrão de navegador (`Blob` + elemento `<a download>` +
  `.click()`).

---

## 10. Bugs já corrigidos — não reintroduzir

1. **Dependência exclusiva de `window.claude.use("downloads")`** — quebrava a
   exportação de PDF quando a página era aberta fora do claude.ai (ex.: local,
   GitHub Pages). Corrigido com fallback de download nativo do navegador.
   Sempre manter os dois caminhos (com `try/catch` em volta da chamada à
   capacidade do claude.ai).
2. **Nome de arquivo sem timestamp completo** — todas as exportações geravam o
   mesmo nome de arquivo (só a data, sem hora), fazendo o navegador salvar
   duplicatas numeradas silenciosamente; o usuário reabria sempre o arquivo
   antigo, achando que o app "não atualizava". Corrigido incluindo o
   modo de visualização (`resumo`/`detalhado`) e hora:minuto:segundo completos
   no nome do arquivo.
3. **Resumo Executivo com as mesmas 12 páginas do Detalhado** — a versão
   inicial só trocava o conteúdo de UM slide dentro do mesmo deck de 12,
   dependendo da opção escolhida; o usuário pediu (corretamente) um documento
   realmente curto (1-2 páginas). Corrigido com os dois construtores de deck
   totalmente separados descritos na seção 9. **Este é o padrão correto e
   definitivo** — qualquer nova mudança no formato "Resumo Executivo" deve
   mexer em `buildResumoExecutivoSlideDefs()`, nunca voltar a compartilhar
   slides com `buildPptxSlideDefs()`.

---

## 11. Convenções e premissas gerais (para qualquer alteração futura)

- **Nenhum valor de alíquota/percentual deve ser "inventado"** — tudo precisa
  vir de uma fonte listada em `FONTES` (mesmo array usado pela aba Fontes da
  interface), com status `"oficial"` (base legal clara) ou `"hipotese"`
  (estimativa, projeção ou norma recente que ainda merece confirmação). Ao
  adicionar uma nova regra de cálculo, adicionar também a entrada
  correspondente em `FONTES`.
- **Nunca assumir crédito de IBS/CBS integral por padrão** — sempre 0% até o
  usuário informar o percentual real de crédito da empresa (ver seção 8.2).
- **Nunca aplicar uma alíquota única de IBS/CBS "às cegas"** — todo cálculo de
  IBS/CBS (Híbrido e Presumido) passa pela camada de tratamento tributário
  (`IBS_CBS_TRATAMENTOS`/`aplicarTratamentoIbsCbs`, seção 6.6); o padrão é
  `"padrao"` (sem redução) até o usuário selecionar/confirmar outro
  tratamento — nenhum benefício é assumido automaticamente.
- **CNAE alimenta automaticamente** (por pedido explícito do usuário — ver
  seção 7.1) o Anexo do Simples, a atividade do Presumido e o tratamento de
  IBS/CBS, sempre com fonte e nível de confiança visíveis e sempre
  substituível manualmente; e **nunca** quando a classificação depender de uma
  informação que o CNAE, isoladamente, não fornece — nesses casos o sistema
  pergunta, nunca assume (ver seção 7.2, `COMPLEMENTOS_CLASSIFICACAO`).
- **Resumo Executivo nunca cita tributos específicos** — nem na tela, nem no
  PDF, nem em disclaimers (ver seção 9).
- **Nenhuma marca "Audicon" ou de terceiros na interface/PDF.**
- **Identidade visual azul + verde é fixa** — não é um tema claro/escuro do
  sistema operacional, é uma identidade de marca deliberada (só o modo escuro
  tem paleta própria, ativada por escolha do usuário ou
  `prefers-color-scheme`).
- **`shell.html` e `app.js` são as únicas fontes de verdade** — qualquer
  edição deve ser feita neles, seguida de `python3 build.py` para regenerar
  `index.html`/`wrapper.html`/`wrapper-local.html`. Editar os arquivos gerados
  diretamente é sempre um erro que será perdido no próximo build.
- **Workflow de publicação do Artifact:** sempre `Artifact({action: "read",
  url})` antes de `Artifact({action: "publish", ...})`, para pegar a versão
  atual e comparar (diff) contra o `index.html` local antes de sobrescrever —
  evita publicar por cima de uma edição concorrente.
- **Toda alteração de lógica de cálculo deve rodar a suíte de testes completa**
  antes de ser considerada pronta (`test-cnae.js`, `test-hibrido.js`,
  `test-pdf.js`, `test-comparativo-presumido.js`, `test-full.js`,
  `test-darkmode.js`, `test-classificacao-cnae.js`) — os testes cobrem
  especificamente as regras acima (não mutação dos campos brutos pela seleção
  de CNAE, classificação automática vs. pendências de confirmação, ausência de
  tributos específicos no Resumo, contagem de slides de cada deck, transição
  IBS/CBS por ano, etc.), então uma regressão nessas regras normalmente já é
  pega automaticamente.

---

## 12. Como pedir uma alteração usando este arquivo

Ao colar este arquivo como contexto para uma IA, é só descrever a mudança
desejada normalmente (ex.: "quero adicionar uma nova atividade de presunção
para X", "o ISS deveria ter um teto de Y%", "adicione um novo ano ao
cronograma IBS/CBS"). A IA deve:

1. Localizar a estrutura de dados/função relevante usando as seções acima
   (`ANEXOS`, `PRESUNCAO`, `IBS_CBS_CRONOGRAMA`, `FONTES`, etc., todas em
   `app.js`).
2. Preservar todas as regras da seção 11.
3. Editar `app.js` (nunca os arquivos gerados), rodar `python3 build.py` e a
   suíte de testes.
4. Se a mudança afetar o que o Resumo Executivo mostra, confirmar que
   nenhum tributo específico passou a aparecer lá.
