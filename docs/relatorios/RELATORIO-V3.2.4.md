# Análise Tributária v3.2.4 — Ajuste final de elegibilidade

Escopo: o sistema não pode apontar como mais vantajoso um regime que deixou de ser legalmente aplicável ao cenário. A v3.2.3 permanece intacta (pasta e pacote próprios). **Nenhum valor calculado mudou** (Simples, Híbrido, Presumido, exclusão e fator r idênticos à v3.2.3 em 1.112 cenários). Mudaram só a **elegibilidade**, a **recomendação** e os textos que as descrevem. Sem alteração de layout, identidade visual ou funcionalidades não relacionadas.

## 1. O problema encontrado na v3.2.3
- Na exclusão retroativa, o Simples já saía da disputa, mas o **Lucro Presumido era chamado de "menor custo"**. Isso passava a ideia de recomendação conclusiva, sem calcular multa, juros, Lucro Real nem o recolhimento retroativo.
- O Simples só tinha dois estados (aplicável ou excluído). Não existia "com restrição" nem "inconclusivo".
- O sublimite de ICMS/ISS/IBS era só um alerta; o total do Simples/Híbrido continuava como se estivesse completo.

## 2. Como funciona agora
Elegibilidade legal vem **antes** da comparação de custos. Cada regime recebe um estado:

| Estado | Quando | Entra na disputa? |
|---|---|---|
| **Elegível** | Sem impedimento | Sim |
| **Com restrição** | Excesso com efeito futuro ou parcial, ou ICMS/ISS/IBS fora do DAS (sublimite excedido ou 6ª faixa), com **total incompleto** (valor mínimo) | Sim, mas só como valor mínimo |
| **Inaplicável** | Exclusão do Simples em vigor em todo o período (inclusive retroativa) | Não |
| **Resultado preliminar** | Qualquer pendência de dado ou premissa (já existia) | — |

A recomendação tem três estados:
- **Conclusiva**: aponta o menor custo entre regimes com cálculo completo. Um regime com total incompleto só pode perder se o seu **valor mínimo** já for maior que o melhor completo.
- **Inconclusiva**: há exclusão retroativa (regras gerais desde a abertura, efeitos não calculados), regime misto no período, ou regime com total incompleto cujo mínimo fica abaixo do melhor completo. Nesse caso **nenhum regime é recomendado**, a diferença/economia não é mostrada e o motivo é explicado.
- **Indisponível**: nenhum regime aplicável.

Na exclusão retroativa, o Simples e o Híbrido continuam exibidos só como "Cálculo de referência · não é custo aplicável"; o Presumido aparece como "Regra geral · referência". O app **não calcula** Lucro Real, multa, juros de mora nem o recolhimento retroativo, e diz isso na tela, nos três PDFs, na Memória Técnica e em Pendências.

## 3. Base legal conferida
Texto da LC 123/2006 conferido no Planalto; Res. CGSN 140/2018 (com as alterações da Res. 190/2026) conforme registrado em Fontes.

| Regra | Dispositivo |
|---|---|
| Excesso do limite no ano: exclusão a partir do mês seguinte | LC 123, art. 3º, § 9º |
| Excesso ≤ 20%: efeitos no ano seguinte | art. 3º, § 9º-A |
| Início de atividade: excesso do limite proporcional (R$ 400 mil × meses; fração = mês inteiro) → exclusão **retroativa ao início** | art. 3º, §§ 2º e 10 |
| Excesso ≤ 20% no início de atividade: não retroage; efeitos no ano seguinte | art. 3º, § 12 |
| Sublimite de ICMS/ISS: R$ 3,6 mi (R$ 300 mil × meses no início de atividade); excesso ≤ 20% não retroage | art. 13-A e art. 3º, §§ 11 e 13; Res. CGSN 140, art. 12 |
| IBS nos mesmos limites; CBS e tributos federais permanecem no DAS | Res. CGSN 140, art. 12 (redação da Res. 190/2026); LC 214/2025 |
| Impedido recolhe ICMS/ISS/IBS pelas regras gerais, com acréscimos | Res. CGSN 140, art. 12, § 7º |

Observação: a página do Planalto da LC 123 não traz texto sobre IBS no art. 13-A. A parte de IBS vem da Res. 140/190 e da LC 214. Essa parte segue com a fonte já registrada em Fontes.

## 4. Teste pedido: empresa nova, R$ 1.500.000 em 3 meses, abertura jan–dez/2027
Receita distribuída em partes iguais (R$ 500 mil/mês). Valores esperados calculados de forma independente a partir do texto das normas (`tests/suite10_v324.js`).

| Abertura | Meses em 2027 | Limite proporcional | Sublimite proporcional | Simples · Híbrido | Lucro Presumido | Recomendação |
|---|---|---|---|---|---|---|
| Jan–Ago | 12 a 5 | Respeitado (R$ 400 mil × 5 a 12 meses ≥ R$ 2 mi) | Respeitado; só o 3º mês tem RBT12 proporcional > R$ 3,6 mi (6ª faixa) | **Com restrição** · total incompleto | Elegível | **Inconclusiva** |
| **Set** | 4 | Respeitado (R$ 1,6 mi) | R$ 1,2 mi; excesso de 25% → ICMS/ISS/IBS **retroativos** à abertura | **Com restrição** · total incompleto | Elegível | **Inconclusiva** |
| **Out** | 3 | R$ 1,2 mi; excesso de 25% | — | **Inaplicável** · exclusão retroativa | Regra geral · referência (R$ 335.700) | **Inconclusiva** |
| **Nov** | 2 | R$ 800 mil; receita de 2027 R$ 1,0 mi (25%) | — | **Inaplicável** · exclusão retroativa | Regra geral · referência | **Inconclusiva** |
| **Dez** | 1 | R$ 400 mil; receita de 2027 R$ 500 mil (25%) | — | **Inaplicável** · exclusão retroativa | Regra geral · referência | **Inconclusiva** |

Em nenhuma abertura o sistema recomenda Simples ou Híbrido. Em out–dez, a tela e os PDFs dizem que a empresa deve ser tributada pelas regras gerais desde a abertura. Valores calculados (Simples R$ 167.000; Híbrido R$ 269.975,40) iguais aos da v3.2.3.

Duas observações sobre o resultado:
- **Jan–ago ficam inconclusivos por um único mês.** O 3º mês, com RBT12 proporcional de R$ 6 mi, cai na 6ª faixa, onde a partilha oficial do DAS não inclui ISS/ICMS/IBS. É consequência direta das tabelas oficiais. Como o app não calcula esses tributos fora do DAS, não afirma qual regime é mais barato. **Não confirmei** como o PGDAS-D trata a faixa em meses de início de atividade; ver pendência 2.
- Em nov/dez, só a receita dentro de 2027 entra no limite proporcional daquele ano; os meses de 2028 usam o limite de 2028.

## 5. Sublimites (item 2 do pedido)
O efeito deixou de ser só alerta. Quando ICMS/ISS/IBS saem do DAS (sublimite excedido ou 6ª faixa):
- o Simples e o Híbrido ficam **com restrição**, com total marcado como **valor mínimo (incompleto)**;
- a recomendação só é conclusiva se esse mínimo já perder para o melhor regime completo; senão, **inconclusiva**;
- a pendência "sublimite" diz quantos meses são afetados, se o efeito é retroativo e que o app não calcula os tributos devidos fora do DAS;
- excesso de até 20% do sublimite no início de atividade **não retroage** (efeitos só no ano seguinte; art. 3º, § 13) e não torna o total incompleto no ano analisado. Testado: abertura em jul/2027 com R$ 330 mil/mês.

## 6. Validação
| Verificação | Resultado |
|---|---|
| `node tests/run-all.js` | **Todas as suítes passam** (312 verificações), incluindo a nova `suite10_v324.js` (22 verificações: 12 aberturas, função de decisão com casos sintéticos, empresa existente, sublimite ≤ 20%, telas, PDFs, Fontes) |
| Regressão × v3.2.3 (`tests/regressao_v323.js`, 1.112 cenários incl. as 12 aberturas) | **0 diferença em valores calculados; 0 mudança inesperada de recomendação** |
| Mudanças de vencedor (339 de 1.112) | 338 viram "inconclusiva" (E1 exclusão retroativa: 36 · E2 total incompleto: 224 · E3 regime misto: 78); 1 empate de valores com receita zero → Presumido (E5). Resultado em `tests/regressao_v323_resultado.json` |
| PDFs reais (jsPDF/html2canvas) | 3 modelos × cenários A, B, C e aberturas set, out, nov, dez/2027: gerados sem erro (resumo 2 p., completa 5 p., memória 11 p. nos cenários A–C e 12 p. nas aberturas), sem transbordo. Conferidos por OCR e por imagem: "Comparativo inconclusivo", categorias elegível/com restrição/inaplicável, sem selo "Menor custo" nos casos inconclusivos |
| Cenários de referência A e B | Recomendação conclusiva e valores iguais à v3.2.3 (Simples R$ 83.700 e R$ 34.650). O cenário C (avulso, R$ 1,5 mi, jan–mar/2027) passa a inconclusivo, com os mesmos valores (R$ 167.000 · 269.975,40 · 335.700) |

Ajustes de apresentação feitos ao conferir os PDFs: aviso compacto no slide 1 do Resumo (o texto completo estava cortado no rodapé), rótulo do gráfico encurtado, linha "Situação" na tabela de composição, rótulo "Recomendação" no lugar de "Menor custo" quando inconclusivo, e concordância de "informação pendente que pode alterar". Sem mudança de layout.

## 7. Pendências e limites
1. **Art. 9º da Res. 190** (vigência em 01/01/2027): continua registrado como indicado, mas a cláusula não foi localizada no texto acessível. Confirmar no texto integral.
2. **Início de atividade na 6ª faixa**: o app aplica a partilha da 6ª faixa ao RBT12 proporcional. Confirmar no PGDAS-D se, no ano de início, o sublimite é verificado só pela regra de R$ 300 mil × meses; isso pode reduzir os casos inconclusivos de jan–ago.
3. **Não calculados** (e declarados como tal): ISS/ICMS/IBS devidos fora do DAS, Lucro Real, juros, multa e recolhimento retroativo. Estimar o complemento de ISS/ICMS/IBS permitiria conclusões nos casos jan–set. Não foi feito para não ampliar o projeto.
4. Mantidas as pendências da v3.2.3 (incisos do art. 26, § 7º; janela de março/2027; INSS/IRRF 2027; CPP no DAS; dividendos; PDF da Memória em raster).

## 8. Arquivos
- `app.js`: `avaliarSublimite`, `decidirRecomendacao` (função pura), estados por regime em `computeAll`, `situacaoRegimeInfo`, `recomendacaoInfo`, `categoriasRegimesTexto`, `valorRegimeNota`, textos de tela/PDF/Memória/Pendências/Fontes.
- `tests/suite10_v324.js` (novo), `tests/regressao_v323.js` e `tests/regressao_v323_resultado.json` (novos), `tests/suite4_motor.js`, `tests/suite9_v323.js` e `tests/run-all.js` (expectativas atualizadas).
- `RELATORIO-V3.2.4.md`, `README.md`, `CONTEXTO-PROJETO-ANALISE-TRIBUTARIA.md` (seção 0.1f).
