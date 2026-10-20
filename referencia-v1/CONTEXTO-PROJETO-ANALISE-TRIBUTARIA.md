# Contexto do projeto — Análise Tributária

> Este arquivo foi gerado para ser colado como contexto em uma conversa com uma
> IA (Claude ou outra) sempre que for necessário pedir uma nova alteração,
> correção ou funcionalidade neste sistema. Ele descreve a estrutura de
> arquivos, o objetivo do sistema e — o mais importante — todas as regras de
> negócio e premissas de cálculo já definidas, para que a IA não precise
> "adivinhar" nem reinventar nada que já foi decidido.
>
> Data de geração: 26/09/2026.
> Última atualização: 28/09/2026 — item 6.6 (tratamento tributário diferenciado
> de IBS/CBS: alíquotas, reduções e benefícios); seção 7 reescrita (motor de
> classificação automática CNAE → Atividade → Presunção → IBS/CBS, substituindo
> por pedido explícito do usuário a antiga regra de desacoplamento).

---

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
| `app.js` | **Toda** a lógica: dados tributários, motor de cálculo, estado, renderização de cada aba, gráficos, geração do PDF. Fonte de verdade para o código. ~2.460 linhas. |
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
adicionalBase = max(baseIRPJ − R$ 60.000, 0)     // limite por TRIMESTRE
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

## 9. Relatório em PDF — dois formatos, decks separados (regra crítica)

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
