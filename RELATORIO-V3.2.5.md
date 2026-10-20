# Análise Tributária v3.2.5 — Correção da 6ª faixa (art. 21, IV) e homologação

Escopo: corrigir a forma como o app trata o RBT12 acima do limite da 5ª faixa (R$ 3,6 mi). A v3.2.4 permanece intacta (pasta e pacote próprios). Sem alteração de layout, identidade visual, fontes, navegação ou funcionalidades; nenhuma funcionalidade nova.

## 1. O erro da v3.2.4
A v3.2.4 tratava a 6ª faixa como se o ICMS/ISS/IBS saísse do DAS (valor "mínimo", regime "com restrição", comparativo inconclusivo). Isso estava errado: com RBT12 acima do limite da 5ª faixa **e sem impedimento**, o contribuinte continua no Simples e esses tributos **permanecem recolhidos no DAS**, pela fórmula do art. 21, IV (em 2026, art. 21, III, "b") da Res. CGSN 140/2018. Só o **sublimite efetivamente excedido** ou uma **exclusão** tiram esses tributos do DAS.

## 2. Fórmula implementada
Para RBT12 acima do limite da 5ª faixa (Res. CGSN 140/2018, art. 21, IV, na redação da Res. CGSN 190/2026; 2026: art. 21, III, "b"):

1. DAS da 6ª faixa normal: `alíquota efetiva 6ª = (RBT12 × nominal 6ª − PD 6ª) ÷ RBT12`, partilha da 6ª faixa (federais + CBS).
2. Acréscimo: `alíquota 5ª = (RBT12 × nominal 5ª − PD 5ª) ÷ RBT12`, multiplicada pelo percentual de **ICMS/ISS** da partilha da 5ª faixa (2026) e, em 2027–2028, também pelo percentual de **IBS**; de 2029 a 2033, por ICMS/ISS + IBS conforme a tabela do período (2029 a 2032: 90/80/70/60% do ICMS/ISS; 2033: só IBS).
3. Teto de ISS (art. 21, III, "a"): ISS efetivo ≤ 5%; o excedente é redistribuído proporcionalmente aos demais tributos da 5ª faixa (federais e, em 2027–2028, CBS e IBS). Muda a **composição** do DAS, não o total. De 2029 a 2032 o teto alcança ISS + IBS em conjunto; em 2033 não há ISS.
4. Total do mês = DAS da 6ª faixa + acréscimo. Simples Híbrido: o DAS inteiro é recomposto e só CBS e IBS (inclusive as parcelas do acréscimo e da redistribuição) saem do DAS; CBS 8,8% e IBS 0,1% vão por fora. Nada é somado nem deduzido duas vezes.

Não se presume que RBT12 > R$ 4,8 mi seja "6ª faixa ordinária": o limite geral e as regras de empresa nova (R$ 400 mil × meses, exclusão retroativa) continuam avaliados como antes.

## 3. Elegibilidade (o que mudou)
| Situação | Tratamento na v3.2.5 |
|---|---|
| 6ª faixa sem impedimento | Regime **elegível**; acréscimo do art. 21, IV somado ao DAS; nada "fora do DAS" |
| Sublimite efetivamente excedido (> R$ 3,6 mi no ano; empresa nova: R$ 300 mil × meses) | ICMS/ISS/IBS pelas regras gerais, **fora** do DAS e sem o acréscimo; regime "com restrição" (total incompleto) |
| Exclusão do Simples (limite geral) | Inaplicável; retroativa em início de atividade com excesso > 20% (preservada) |
| Empresa existente em 6ª faixa, receita do ano anterior desconhecida | Acréscimo calculado como **estimativa**; pendência objetiva ("a receita do ano anterior ficou até R$ 3,6 mi?"); comparativo inconclusivo por **premissa pendente**, com o piso (DAS sem o acréscimo). Não se presume ausência de receita anterior |
| Cálculo incompleto por falta de informação | Continua inconclusivo |

2026: a avaliação do sublimite, antes feita apenas de 2027 em diante, passa a valer nos meses de 6ª faixa de 2026.

## 4. Valores: antes × depois (R$ 500 mil por mês, 3 meses, abertura em 2027, sem folha)
| Abertura | v3.2.4 Simples | v3.2.5 Simples | v3.2.4 Híbrido | v3.2.5 Híbrido | Presumido | Resultado |
|---|---|---|---|---|---|---|
| jan–ago/2027 | 167.000,00 | **193.017,54** | 269.975,40 | **295.602,94** | 331.700–335.700 | era inconclusivo → **conclusivo: Simples** (preliminar) |
| set/2027 | 167.000,00 | 167.000,00 | 269.975,40 | 269.975,40 | 333.700 | inconclusivo (sublimite > 20%, retroativo; total incompleto) |
| out–dez/2027 | 167.000,00 | 167.000,00 | 269.975,40 | 269.975,40 | 331.700–335.700 | inconclusivo (exclusão retroativa) |

3º mês (Anexo V, RBT12 proporcional de R$ 6 mi): 107.000,00 (6ª faixa a 30,4%) + **26.017,54** (acréscimo) = 133.017,54.
Verificação independente do acréscimo: alíquota efetiva da 5ª faixa (Anexo V) = (6.000.000 × 23% − 62.100) ÷ 6.000.000 = 21,965%; × (23,5% ICMS/ISS + 0,19% IBS) = 5,2035% × R$ 500.000 = **R$ 26.017,54**. ISS bruto 5,1618% → limitado a 5% (excedente de R$ 808,88 redistribuído). Com Anexo III manual, o 3º mês dá 142.328,25.

**Correção de estimativa anterior:** a auditoria complementar falava em "122 cenários" que se tornariam conclusivos. Esse número desconsiderava a receita do ano anterior das empresas existentes: elas passam a **premissa pendente**, não a conclusivas. Na regressão abaixo, 89 cenários passaram a conclusivos e 91 ficaram inconclusivos por premissa pendente.

## 5. Testes
- `tests/suite11_v325.js` (nova, oráculo independente digitado a partir do texto da norma): fórmula do art. 21, IV para Anexos I a V × 2026–2033 × 7 RBT12 (280 casos, diferença máxima 1,4e-17); teto de ISS (140 casos acima e 7 abaixo; ICMS sem teto; 2033 só IBS; 2026 sem IBS); redistribuição = proporção da 5ª faixa sem ISS (coincide com os fatores publicados nos Anexos III e IV, ≤ 0,005 p.p.); 12 aberturas de 2027; Híbrido sem duplicidade (Anexos I a V × 2027, 2028, 2029, 2031, 2033); empresa existente (pendente/confirmada/abaixo de R$ 3,6 mi/avulsa sem RBT12); regras de 2026, 2027–28 e 2029+; arredondamento a centavos por tributo (< R$ 0,05/mês); relatos do PGDAS-D (fóruns — fonte **não oficial**): ISS de 5% confere ao centavo no caso da Contábeis/2019 (R$ 3.806,00) e a alíquota federal de 16,80% no caso de 2018.
- Expectativas alteradas de propósito (consequência da correção): suites 8 (oráculo compara o DAS da faixa), 9 (3 expectativas) e 10 (aberturas de 2027 e caso de RBT12 R$ 4,08 mi).
- `tests/regressao_v324.js`: 1.362 cenários / 13.463 meses contra a v3.2.4 — **0 mudanças inesperadas**. Em todo mês, DAS novo = DAS antigo + acréscimo; faixa, anexo, RBT12, fator r, Presumido e exclusão não mudam; Híbrido idêntico nos 11.468 meses sem acréscimo. 1.995 meses com acréscimo (1.359 pendentes); 2.832 meses de 6ª faixa impedidos por sublimite (sem acréscimo); maior acréscimo mensal R$ 158.321,80. Recomendações: 1.182 iguais; 89 inconclusivas → conclusivas (C1); 91 inconclusivas por outro motivo → premissa pendente (P1); nenhum vencedor mudou por custo (V1 = 0). Economia do Fator R mudou em 41 cenários (é diferença de DAS entre cenários e passa a incluir o acréscimo).
- Resultados da suíte completa e dos PDFs: ver seção 7.

## 6. Limitações em aberto (resultado permanece "preliminar")
Nenhum cenário é declarado fiscalmente homologado enquanto estes pontos não forem confirmados:
1. **Valor do acréscimo dentro do DAS** pelo PGDAS-D: sem simulação oficial; confere com relatos de fórum (não oficiais).
2. **Redistribuição do excedente do teto de ISS** em 6ª faixa: proporção da 5ª faixa sem ISS (confere com os fatores publicados dos Anexos III e IV e com o relato do PGDAS-D de 2018); no Anexo V é hipótese. Efeito: só composição; no Híbrido no máximo ~R$ 181 no cenário-base.
3. **Res. CGSN 190, art. 22 § 5º, II**; arts. 9º e 26 § 7º: texto integral não lido.
4. **Art. 24, I, "b", 2** (parcela da receita acima do sublimite usa RBT12 de R$ 3,6 mi): não aplicado. Um relato do PGDAS-D mostra ~R$ 238 (0,25%) de diferença.
5. **Sublimite em 2026** (R$ 1,8 mi em alguns Estados) e avaliação de 2026 limitada aos meses de 6ª faixa; impedimento por receita do ano anterior considerado só para meses de 6ª faixa.
6. ICMS/ISS/IBS devidos fora do DAS (sublimite excedido), Lucro Real, juros, multa e recolhimento retroativo: não calculados.
7. Teto de ISS de 5% na 5ª faixa do Anexo V (preexistente) e partilhas de 2029–2033: verificadas só estruturalmente.

## 7. Resultados da suíte completa
`node tests/run-all.js`: **362 PASS, 0 FAIL** em 14 suítes (suite0, suite, suite2 PDF, suite3, suite4_motor, suite5_charts, suite6_ux, suite7, suite8, suite9, suite10, **suite11_v325**, **suite12_pdf_v325**, paridade com a v1: 400 casos, 0 divergências inesperadas; 21 divergências esperadas, todas de 6ª faixa), com Chart.js, jsPDF e html2canvas reais. Regressão contra a v3.2.4: 0 mudanças inesperadas.

**PDFs** (suite12, bibliotecas reais, abertura jan/2027 com R$ 500 mil × 3 e empresa existente com RBT12 de R$ 4,08 mi): Resumo (2 páginas 16:9), Completa (5 e 4 páginas) e Memória Técnica (11 páginas A4) gerados; valores idênticos ao resultado; Memória com a seção da 6ª faixa; páginas conferidas nas imagens, sem texto cortado.
Achado e correção: na v3.2.4 o slide 1 da Apresentação Completa cortava o rodapé nos cenários inconclusivos (aviso de comparativo inconclusivo + aviso de resultado preliminar repetindo o mesmo motivo; 126–145 px de estouro). Passou a usar o aviso compacto (como no Resumo) e o resultado preliminar não repete o motivo já exibido; estouro 6 px, sem corte. Os textos novos da v3.2.5 (motivos de 6ª faixa e premissa pendente) foram encurtados pelo mesmo motivo. Pré-existente e não alterado: o slide 3 da Completa em cenários com impedimento por sublimite (30–99 px de estouro medido, também presente na v3.2.4).
