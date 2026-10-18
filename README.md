# Análise Tributária — v3.2.4

Simulador e comparador de regimes tributários — Simples Nacional (com Fator R), Simples Híbrido (IBS/CBS) e Lucro Presumido — com relatório em PDF (apresentação 16:9). A v3 reformula a experiência de uso e a identidade visual; **o motor tributário foi preservado** (ver `CONTEXTO-PROJETO-ANALISE-TRIBUTARIA.md`, seção 0).

## O que mudou na v3.2.4 (ajuste final de elegibilidade)
Sem mudança visual, de navegação ou de funcionalidades; **nenhum valor calculado mudou**. A elegibilidade legal passa a vir antes da comparação de custos:
- Cada regime é **elegível**, **com restrição** (total incompleto: ICMS/ISS/IBS fora do DAS), **inaplicável** (exclusão do Simples em vigor em todo o período) e, no conjunto, o resultado pode ser **preliminar**.
- Exclusão retroativa (empresa nova que excede em mais de 20% o limite proporcional, LC 123, art. 3º, §§ 10 e 12): Simples e Híbrido não são recomendados nem apresentados como custo aplicável; o comparativo fica **inconclusivo** e explica o motivo (regras gerais desde a abertura; Lucro Real, juros, multa e recolhimento retroativo não calculados).
- Sublimite de ICMS/ISS/IBS excedido (ou 6ª faixa): deixa de ser só alerta; o total do Simples/Híbrido é marcado como valor mínimo e a recomendação só é conclusiva se esse mínimo já perder.
- Testes: `node tests/run-all.js` (inclui `suite10_v324.js`); regressão `node tests/regressao_v323.js <pasta-v3.2.3>` (1.112 cenários, 0 diferença em valores, 0 mudança inesperada). Veja `RELATORIO-V3.2.4.md`.

## O que mudou na v3.2.3 (conferência final dos Anexos e das regras de 2027)
Sem mudança visual, de fontes, cores, navegação ou relatórios; só números e textos com fundamento oficial:
- **Anexos I a V de 2027 em diante**: partilha oficial com CBS e IBS por Anexo, faixa e período (LC 123 na redação da LC 214/2025, art. 519); 6ª faixa de 2029+ (I 19% · II 30% · III e IV 33% · V 30,5%); nota de 5% de ISS nas 5ªs faixas dos Anexos III e IV.
- **Simples Híbrido**: retira do DAS só as parcelas de CBS e IBS (Res. CGSN 140, arts. 22-A e 40-C a 40-E); o Híbrido de 2026 é igual ao Simples (a opção só existe a partir de 2027).
- **Fator r**: casos de receita/folha zero e anualização da folha pela média da própria folha (art. 26, §§ 4º, 6º e 7º). Aviso informativo de sublimite de ICMS/ISS/IBS (não altera cálculos).
- Pendências assumidas: art. 9º da Res. 190 (vigência) e incisos do § 7º do art. 26 não lidos no texto integral; INSS/IRRF de 2027 e alíquotas de referência de IBS/CBS continuam como hipótese/projeção.
- Testes: `node tests/run-all.js` (inclui `suite9_v323.js`); regressão `node tests/regressao_v322.js <pasta-v3.2.2>` (1.100 cenários, 0 diferença inesperada). Veja `RELATORIO-V3.2.3.md`.

## O que mudou na v3.2.2 (homologação fiscal — só correções comprovadas)
Sem mudança visual, de fontes, cores, navegação ou relatórios. Conferência em fontes oficiais (Res. CGSN 190 e 194/2026, LC 123 com a redação da LC 214/2025, IN RFB 2.110/2022, manual do PGDAS-D) e correção do motor apenas onde a divergência foi comprovada:
- **RBT12 e FS12 em 2027**: janela dos 12 meses antecedentes ao mês anterior (LC 123, art. 18, §§ 1º, 1º-A e 5º-K); 2026 permanece como antes.
- **Empresa nova em 2027**: 1º e 2º mês na 1ª faixa dos Anexos I a V e fator "r" = 0,28; do 3º ao 13º mês, média dos meses antecedentes ao mês anterior × 12; 14º mês em diante, janela normal (Res. 190, art. 22 §§ 2º e 4º; art. 26 §§ 4º e 6º).
- **Anexos 2027–2028**: alíquota nominal da 6ª faixa 0,10 p.p. menor (I 18,90%; II 29,90%; III e IV 32,90%; V 30,40%).
- **Prazo do regime regular de IBS/CBS** (Res. CGSN 194/2026): até 30/10/2026 para jan–jun/2027; fontes e aviso atualizados. **INSS de 11%** do sócio: base normativa confirmada (IN RFB 2.110/2022). **Composição da folha**: CPP no DAS e FGTS efetivos fazem parte da folha fiscal; o app não soma a CPP estimada (hipótese conservadora, documentada).
- Testes: `node tests/run-all.js` (inclui `suite8_v322.js`, com cálculo independente); regressão `node tests/regressao_2026.js <pasta-v3.2.1>` (700 cenários sem regra nova: diferença zero). Veja `RELATORIO-V3.2.2.md`.

## O que mudou na v3.2.1 (consolidação — sem novas telas, sem novos cartões)
Fórmulas tributárias, identidade visual, fontes, cores e navegação **não foram alteradas** (84 cenários × v3.2: 0 diferenças inesperadas; 400 casos de paridade: 0 divergências).
- **Fator R — vantagem líquida revisada**: separa economia no DAS · pró-labore · retenções do sócio (INSS 11% até o teto e IRRF) · encargos patronais aplicáveis (CPP já está no DAS dos Anexos III/V). As retenções **não** são tratadas como custo adicional da empresa. O veredito só diz "compensa" quando as premissas essenciais estão confirmadas; antes disso é "indicativo". A folha necessária (28%) não mudou.
- **RBT12 estimado**: em empresa existente, uma linha discreta sob a receita mostra "RBT12 estimado" com "Informar o real" (campo no próprio lugar), sem abrir ajustes avançados.
- **Resultados**: Fator R só aparece quando se aplica; selo **Preliminar/Definitivo** no destaque com "Para tornar definitivo: …" e links diretos para o campo/pendência; o aviso de "preliminar" deixou de ser repetido nos pontos de atenção.
- **Revisão tributária**: INSS (teto R$ 8.475,55), IRRF 2026 (Lei 15.270/2025) e CPP no Simples confirmados em fonte oficial; IBS/CBS de 2027+ permanecem **projeção** (rótulo "projeção 2027+"); hipóteses restantes registradas em Fontes. Veja `RELATORIO-V3.2.1.md`.
- Testes: `node tests/run-all.js` (inclui `suite7_v321.js`); regressão v3.2 × v3.2.1: `node tests/regressao_v31.js <raiz> <saida.json>` nas duas versões e `node tests/comparar_regressao.js <v32.json> <v321.json>`.

## O que mudou na v3.2 (refinamento visual e fluidez — só interface)
Motor tributário, fórmulas, classificação por CNAE, estrutura das simulações, paleta, fontes (Alata/Inter) e os três modelos de relatório **não foram alterados** (resultados idênticos aos da v3.1 em 84 cenários; PDFs idênticos pixel a pixel).
- **Três níveis de informação**: *essencial* sempre visível · *complementar* sob demanda (retráteis "Mais detalhes") · *técnico* recolhido ("Detalhamento técnico", "Ajustes avançados"). Pendências críticas e condições que limitam o resultado ficam sempre visíveis.
- **Nova análise**: só as 3 modalidades, uma linha de descrição e uma ação; importar/abrir simulação em uma linha discreta.
- **Preenchimento**: só o indispensável primeiro (CNAE → receita → folha), campos agrupados, período/ano-base recolhidos (em avulsas, valor e duração lado a lado), pró-labore só aparece quando há folha, Fator R em uma linha (tabelas de cenário, INSS/IRRF e vantagem líquida ficam em Resultados › Fator R), classificação automática em uma linha, ajustes avançados em um único retrátil, pendências em um único local.
- **Campos didáticos**: rótulos curtos, exemplos úteis, máscara monetária ao digitar (1500000 → 1.500.000), erros/avisos logo abaixo do campo, ajuda contextual discreta (?), "Ver resultados" sem receita aponta o campo em vez de abrir tela vazia.
- **Resultados**: placar (menor custo estimado + diferença potencial) → 3 cartões comparativos sem repetição de valores → pontos de atenção → **um** gráfico principal; composição, evolução mês a mês, tabela comparativa, Fator R, Simples, Híbrido, Presumido, IBS/CBS, equilíbrio, cenários, pendências/premissas, memória e fontes ficam recolhidos (os gráficos recolhidos nascem ao abrir).
- **Relatório**: três opções (Executivo, Completo, Memória Técnica), uma linha de resumo, Gerar PDF / Pré-visualizar; nome da empresa/CNPJ sob demanda.
- **Padronização**: campos 40 px, botões 40/32 px, mesmo título (h2), grupos com divisor discreto, retráteis em lista, tabelas e gráficos com a mesma moldura.
- Testes: `node tests/run-all.js` (inclui `suite6_ux.js`); regressão tributária v3.1 × v3.2: `node tests/regressao_v31.js <raiz> <saida.json>` nas duas versões e `cmp` (diferença zero). `tests/ux_cenarios.js` mede campos/palavras por etapa nos cenários A, B e C.
- Veja `RELATORIO-V3.2.md` e `docs/v3.2-comparacao/` (antes × depois).

## O que mudou na v3.1 (correções e consolidação)
- **Fator R**: a folha necessária exibida é exatamente a folha usada na simulação; considera histórico (informa quando o 28% é atingido), início de atividade e distingue "economia" de "diferença potencial"; vantagem líquida sempre como estimativa até confirmar premissas.
- **Simples Nacional**: exclusão por excesso graduada (≤20% → ano seguinte; >20% → mês seguinte; início de atividade >20% → retroativa); o regime só sai do ranking nos meses em que a exclusão vale.
- **Lucro Presumido**: limite do adicional de IRPJ segue o período de apuração (R$ 60 mil no trimestre); simulação mais curta vira **estimativa parcial**.
- **Comparativos**: "economia" só com regime atual informado; selos Cálculo confirmado / Estimativa / Hipótese por regime; "resultado preliminar" quando falta dado essencial.
- **Relatórios**: Resumo Executivo (2 slides) · Apresentação Completa (até 5, condicional) · Memória Técnica (PDF A4 separado).
- **Gráficos** validados com Chart.js real (rótulos que sumiam, tema, responsividade, PDF) e correção do cartão preto no PDF (sombra interna × html2canvas).
- **Parâmetros** conferidos em fontes oficiais quando possível; ver `CONTEXTO…`, seção 0.1.
- Testes: `node tests/run-all.js` (inclui `suite4_motor.js` e `suite5_charts.js`; usa as bibliotecas reais quando `node_modules/` existe).

## O que mudou na v3
- **4 etapas** no lugar de 11 abas: Nova análise → Preenchimento → Resultados → Relatório. Recursos técnicos ficam em painéis recolhíveis ("Detalhamento técnico" e "Ajustes avançados"). Nada foi removido.
- **Três tipos de análise** com o mesmo motor: empresa existente, empresa nova (regras de início de atividade) e simulação avulsa (ex.: R$ 1,5 mi em 3 meses; receita fixa, variável mês a mês ou valor total). Os resultados valem para o **período analisado** — nada é anualizado.
- **Preenchimento inteligente**: o CNAE define Anexo do Simples, Fator R, presunção e tratamento IBS/CBS; ano global da análise; sem campos repetidos; parâmetros técnicos recolhidos.
- **Fator R inteligente**: folha atual × folha necessária (28%) × pró-labore simulado, com INSS/IRRF do adicional, economia, custo extra e vantagem líquida.
- **Pendências inteligentes**: uma só área (atenção · pendente · estimativa · opcional · confirmado). Não bloqueia a análise e não inventa valores.
- **Gráficos revistos** (comparativo de regimes, composição dos tributos, evolução mensal para receita variável, comparação de cenários) e **consistência garantida**: cartões = tabela = gráficos = PDF (uma única fonte: `state.result`).
- **Simulações sem banco de dados**: salvar, duplicar, renomear, abrir, excluir, exportar/importar `.json`, comparar cenários.
- **Nova identidade visual** (paleta `#EDEDED / #03131C / #0C171B / #455157 / #040809`, laranja `#FF5001` só para atenção; Alata + Inter; claro/escuro/automático).
- **Relatório** (v3): Resumo Executivo e Detalhado de 12 slides — na v3.1 o Detalhado foi substituído pela Apresentação Completa e pela Memória Técnica.

## Estrutura
- `shell.html` — esqueleto + CSS (tokens da identidade, temas). **Fonte de verdade** de marcação/estilo.
- `app.js` — toda a lógica, em blocos comentados. **Fonte de verdade** do código.
- `build.py` — gera `index.html` (fragmento publicável), `wrapper.html` (CDN) e `wrapper-local.html` (libs locais). Rode `python3 build.py` após editar `shell.html`/`app.js`. Nunca edite os gerados.
- `data/cnaes.json` — base CNAE (CONCLA/IBGE), carregada por `fetch()`.
- `tests/` — testes Playwright novos (v3). `tests-legado/` — testes da v1/v2 (dependem das 11 abas; rodam só contra `referencia-v1/`).
- `referencia-v1/` — a versão original, intacta, como referência (também usada no teste de paridade).

## Rodando
```bash
npm install            # chart.js, jspdf, html2canvas, playwright
python3 build.py
python3 -m http.server 8791   # abra http://localhost:8791/wrapper-local.html
node tests/run-all.js         # suítes + paridade com a v1
```
Sem `node_modules/` das três bibliotecas, `tests/lib.js` usa stubs (valida fluxo, números e consistência, mas **não** o desenho real dos gráficos nem a rasterização do PDF). Com `npm install`, os testes usam as bibliotecas reais.

## Limitações conhecidas
Ver o fim do `CONTEXTO-PROJETO-ANALISE-TRIBUTARIA.md` (seção 0) e a mensagem de entrega: o percentual de 11% de INSS do sócio e a aplicação do Fator R no início de atividade seguem como hipótese (ver RELATORIO-V3.2.1.md); a proporcionalização do Fator R em início de atividade é hipótese de planejamento; Alata exige acesso ao Google Fonts (há fallback).
