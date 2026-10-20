# Análise Tributária v3.2.3 — Conferência final dos Anexos e das regras de 2027

Escopo: encerrar as pendências fiscais que podiam ser resolvidas em fontes oficiais. v3.2.2 e anteriores permanecem intactas. **Sem mudança de layout, cores, fontes, navegação ou funcionalidades.** Só mudaram números e textos onde havia fundamento oficial. O app só ganhou um aviso informativo (sublimite, item 4).

## 1. Resumo do que mudou no motor

| # | Mudança | Fundamento | Efeito |
|---|---|---|---|
| 1 | Partilha do DAS de 2027 em diante usa as tabelas oficiais, com CBS e IBS por Anexo, faixa e período (2027-28, 2029, 2030, 2031, 2032, 2033+) | LC 123, Anexos I–V, redação da LC 214/2025, art. 519 (Anexos XVIII–XXII), efeitos em 01/01/2027 (art. 544) | Só a **composição** do DAS muda. O total do Simples não muda |
| 2 | 6ª faixa de 2029 em diante: I 19% · II 30% · III e IV 33% · V 30,5% | Mesmas tabelas (2027-28 permanece I 18,9 · II 29,9 · III e IV 32,9 · V 30,4) | Simples sobe até 0,1 p.p. da alíquota nominal nos anos 2029+ com RBT12 > R$ 3,6 mi |
| 3 | **Simples Híbrido**: retira do DAS **somente** as parcelas de CBS e IBS | Res. CGSN 140, arts. 21 III, 22-A e 40-C a 40-E (Res. 190/2026) | Híbrido de 2027+ **sobe** (antes retirava também PIS/COFINS e ISS/ICMS) |
| 4 | **Híbrido em 2026** = DAS integral (a opção só existe a partir de 2027) | Res. 140, art. 22-A; janelas da Res. 186/194 | O Híbrido de 2026 era fictício e passa a ser igual ao Simples |
| 5 | Fator r com receita ou folha zero e folha anualizada pela média da própria folha | Res. 140, art. 26, §§ 4º, 6º e 7º | Só em meses com receita zero e folha > 0 (fator 0,28); incisos do § 7º ainda por confirmar (item 3) |
| 6 | Aviso informativo de sublimite de ICMS/ISS/IBS (R$ 3,6 mi; R$ 300 mil × meses no ano de início) | LC 123, art. 13-A; Res. 140, arts. 9º e 12 | Apenas alerta. Não altera nenhum cálculo |

## 2. Conferência ponto a ponto

### 2.1 Anexos I a V, 2027 e 2028 — conferidos
- **Fonte:** republicação do Senado Federal das tabelas da LC 123 após a LC 214/2025, com os cinco Anexos lidos linha a linha. Alíquotas nominais e parcelas a deduzir de 2027–2028 são iguais às de 2026, exceto a 6ª faixa (item 1.2).
- **Partilha:** em 2027–2028, CBS + IBS ocupam exatamente a parcela de PIS + COFINS de 2026 em todas as faixas de 1 a 5 (teste automático). ISS e ICMS saem das tabelas pelo crescimento do IBS até 2033.
- **Notas especiais incorporadas:** limite de 5% de ISS nas 5ªs faixas dos Anexos III e IV, com os fatores de redistribuição da lei.
- **Observação:** no Anexo III, 2027–2028, a 3ª e a 4ª faixas somam 100,01% como publicadas (IBS 0,19%). Mantido como publicado.
- **Resolução CGSN 190/2026 × legislação complementar:** as tabelas e as regras do Híbrido da Res. 190 repetem a LC 123 com a redação da LC 214. Nas fontes acessíveis não encontrei divergência entre as duas, nem alteração posterior da Res. 190 que mude esses números (o texto integral da Res. 190 não esteve acessível; ver 2.3).

### 2.2 Simples Híbrido — corrigido
Antes (v3.2.2), a retirada do DAS usava a partilha antiga (PIS/COFINS e ISS/ICMS). Isso é incompatível com a transição: a lei retira só CBS e IBS e o ISS/ICMS permanece no DAS.

Agora, para cada mês, o motor:
- calcula o DAS normalmente;
- retira apenas as parcelas de CBS e IBS da partilha do **Anexo, faixa e ano** do mês;
- soma o IBS/CBS do regime regular, por fora, às alíquotas de referência (projeção).

Conferência à mão (empresa nova, R$ 20 mil/mês, 2027):
- DAS: 34.650.
- Parcelas retiradas: 2 × 1.200 × 15,60% (Anexo III, 1ª faixa) + 10 × 3.225 × 17,15% (Anexo V, 2ª faixa) = 5.905,275.
- IBS/CBS regulares: 12 × 20.000 × 8,9% = 21.360.
- Híbrido: **50.104,72**. O motor dá exatamente esse valor.

### 2.3 Fator r a partir do 3º mês — conferido, com duas ressalvas
- **Janela e início de atividade:** confirmados (meses 1–2 na 1ª faixa com r = 0,28; meses 3–13: média dos meses antecedentes ao mês anterior × 12; do 14º mês em diante, a janela normal). Folha e receita são anualizadas cada uma pela sua média.
- **Casos de zero:** folha e receita zero → 0,01; folha > 0 com receita zero → 0,28; ambos > 0 → razão; folha zero com receita > 0 → 0,01. Para o enquadramento, 0,01 e 0 são equivalentes (Anexo V).
- **Ressalva A:** os incisos do § 7º foram conferidos só em reprodução secundária, porque as transcrições acessíveis da Res. 190 os omitem. Por isso a entrada em Fontes **permanece "hipótese"**.
- **Ressalva B:** o **art. 9º da Res. 190 não pôde ser localizado** nas cópias acessíveis (cópias truncadas ou bloqueadas). Registrei a vigência em 01/01/2027 com o art. 9º, como você indicou, e deixei no texto a nota de que o dispositivo não foi lido. A data também é sustentada pela LC 214/2025, art. 544, e pela vigência dos Anexos republicados. **Peço que confira o art. 9º no texto integral antes de usar o relatório com terceiros.**

### 2.4 Teste: empresa nova com R$ 1.500.000 em 3 meses
Contrato avulso de empresa nova, R$ 500 mil por mês. Limite geral do ano de início: R$ 400.000 × meses. Sublimite de ICMS/ISS/IBS: R$ 300.000 × meses (a partir de 2027).

| Abertura | Meses no ano | Limite geral | Receita do ano | Excesso | Sublimite | Excesso do sublimite | Efeito |
|---|---|---|---|---|---|---|---|
| jan a ago/2027 | 12 a 5 | 4,8 mi a 2,0 mi | 1,5 mi | não | 3,6 mi a 1,5 mi | não | Simples R$ 167.000 |
| set/2027 | 4 | 1,6 mi | 1,5 mi | não | 1,2 mi | **+25%** | Simples R$ 167.000 (limite geral respeitado). Alerta de sublimite: excesso de 25% (> 20%), logo ICMS/ISS/IBS saem do Simples retroativamente à abertura |
| out/2027 | 3 | 1,2 mi | 1,5 mi | **+25%** | 0,9 mi | +66,7% | Exclusão **retroativa** ao início: 3 meses marcados fora do Simples |
| nov/2027 | 2 | 0,8 mi | 1,0 mi | **+25%** | 0,6 mi | +66,7% | idem |
| dez/2027 | 1 | 0,4 mi | 0,5 mi | **+25%** | 0,3 mi | +66,7% | idem |
| out, nov, dez/2026 | 3, 2, 1 | 1,2 / 0,8 / 0,4 mi | 1,5 / 1,0 / 0,5 mi | **+25%** | — (não existe em 2026) | — | Exclusão retroativa. Simples R$ 322.500 · 322.000 · 244.500 |

Regra do excesso: acima de 20%, o efeito é retroativo ao início da atividade; até 20%, a partir do ano seguinte. Em todas as aberturas de 2027 o Simples calculado é R$ 167.000, porque os 3 meses do contrato são sempre os meses 1, 2 e 3 da atividade.

**Reconciliação de R$ 322.500 × R$ 167.000 (R$ 155.500 de diferença):**
- **322.500 (v3.2.1 e regras de 2026):** o RBT12 do 1º mês era receita × 12 = R$ 6 mi, na 6ª faixa do Anexo V: (6 mi × 30,5% − 540 mil) ÷ 6 mi = 21,5%. Os 3 meses davam 3 × 107.500.
- **167.000 (v3.2.2 e v3.2.3, regras de 2027):** os meses 1 e 2 vão para a 1ª faixa do Anexo III com r = 0,28, a 6%, o que dá 2 × 30.000. O mês 3 fica no Anexo V, 6ª faixa de 2027–28 (30,4%): (6 mi × 30,4% − 540 mil) ÷ 6 mi = 21,4%, o que dá 107.000.
- **Diferença:** 2 × (107.500 − 30.000) + (107.500 − 107.000) = 155.000 + 500 = **155.500**.

O Presumido (R$ 335.700) não muda. O Híbrido sai de R$ 249.640 (v3.2.2) para R$ 269.975,40 pelo item 1.3.

### 2.5 Projeções preservadas
- **INSS e IRRF de 2027:** o app continua com o teto de R$ 8.475,55 e a tabela do IRRF de 2026, e a entrada continua "hipótese". Nenhum valor inventado.
- **CBS 2027+ e IBS 2029+** (alíquotas de referência do regime regular): continuam projeção. O TCU ainda não enviou o cálculo da CBS e o Senado ainda não fixou a alíquota.

## 3. Validação

| Verificação | Resultado |
|---|---|
| Suítes (`node tests/run-all.js`) | **Todas passam**, incluindo a nova `suite9_v323.js` (23 verificações) |
| Oráculo independente × motor (suite8): 360 cenários, 4.602 meses, 2026–2028 | **0 diferença** (R$ 0,000000). O oráculo foi atualizado para 6ª faixa 2029+ e fator r de zero |
| Tabelas: 5 Anexos × 6 períodos × 6 faixas | Somam 100% (exceções publicadas: Anexo III 2027-28, 3ª e 4ª faixas = 100,01%). CBS+IBS = PIS+COFINS de 2026 nas faixas 1–5 |
| Paridade com o app original (400 casos) | Simples e Presumido: **0 divergência** (3 casos esperados pela 6ª faixa 2027-28). Híbrido: 333 divergentes **por desenho** (item 1.3); não compõe a paridade |
| Regressão × v3.2.2 (`tests/regressao_v322.js`): 1.100 cenários, 11.124 meses | **0 diferença inesperada** (tabela abaixo) |
| PDFs reais (jsPDF/html2canvas), 3 modelos × cenários A/B/C | Gerados sem erro (resumo 2 p., completa 5 p., memória 11 p.). Totais conferem com a tela; tabela do Híbrido soma exatamente |
| Build | `python3 build.py` OK |

### Regressão × v3.2.2 — toda alteração numérica, por categoria
Presumido: **0 diferença em 1.100 cenários**. Exclusão por excesso: sem mudança.

| Cat. | Causa | Cenários | Meses | Maior Δ mensal | Fundamento |
|---|---|---|---|---|---|
| S1 | Simples, 6ª faixa de 2029+ | 124 | 956 | R$ 1.522,02 | Anexos da LC 123 (LC 214, art. 519) |
| S2 | Simples, fator r e folha com receita zero | 1 | 1 | R$ 0,00 (só muda o Anexo/faixa) | Res. 140, art. 26 |
| H1 | Híbrido de 2026 = DAS integral | 494 | 2.212 | R$ 89.414,22 | Res. 140, art. 22-A (opção a partir de 2027) |
| H2 | Híbrido de 2027+ retira só CBS/IBS | 798 | 7.841 | R$ 67.516,46 | Res. 140, arts. 22-A e 40-C a 40-E |

Só 26 cenários ficam idênticos em tudo, porque o Híbrido muda em quase todos. Simples e Presumido de 2026 e de 2027–2028 não mudam, exceto pelos casos S2.

Efeito nos três cenários de referência (total do período):

| Cenário | Simples | Híbrido v3.2.2 → v3.2.3 | Presumido |
|---|---|---|---|
| A. Empresa existente, R$ 40 mil/mês, 2027 | 83.700 | 95.325,45 → **111.228,45** | 93.984 |
| B. Empresa nova, R$ 20 mil/mês, 2027 | 34.650 | 43.818,22 → **50.104,72** | 46.992 |
| C. Avulso R$ 1,5 mi em 3 meses, 2027 | 167.000 | 249.640,00 → **269.975,40** | 335.700 |

## 4. Aviso novo: sublimite (somente informativo)
O sublimite de R$ 3,6 mi (e R$ 300 mil × meses no ano de início) vale para ICMS, ISS e IBS pelo Simples. Quando excedido, esses tributos passam a ser devidos fora do Simples. O app **não modela** esse efeito. Mostra uma pendência de atenção em "Pendências e premissas" dizendo que o custo do Simples está subestimado. Não aparece para RBT12 proporcionalizado de empresa nova.

## 5. Pendências remanescentes
1. **Art. 9º da Res. 190** (vigência em 01/01/2027): registrado como você indicou, mas **não localizado** no texto acessível. Confirmar no texto integral.
2. **Art. 26, § 7º, incisos** (fator r do 3º mês em diante e casos de zero): reprodução secundária. Entrada em Fontes continua "hipótese".
3. **IBS/CBS do regime regular:** alíquotas de referência (CBS 8,8%; IBS 0,1% em 2027–28 e crescente depois) são projeção até a resolução do Senado.
4. **Janela de março/2027** (opção para jul–dez/2027): fonte secundária.
5. **Sublimite de ICMS/ISS/IBS:** só alerta; o efeito financeiro não é calculado.
6. **INSS (teto) e IRRF de 2027:** usam os valores de 2026 até a publicação oficial.
7. **CPP paga no DAS** continua fora da folha fiscal do app (hipótese conservadora da v3.2.2).
8. Mantidas as anteriores: retenção de 10% sobre dividendos não modelada; Memória Técnica em PDF é raster; fonte Alata ausente no ambiente de teste.

## 6. Arquivos
- `app.js`: tabelas oficiais (`ANEXOS_LC214`), `partilhaOficial`, 6ª faixa 2029+, `calcFatorRLegal`, Híbrido reescrito, alerta de sublimite, Fontes e textos.
- `tests/suite9_v323.js` (novo), `tests/regressao_v322.js` (novo), `tests/suite8_v322.js`, `tests/suite6_ux.js` e `tests/parity.js` (expectativas atualizadas), `tests/run-all.js`.
- `RELATORIO-V3.2.3.md`, `README.md` e `CONTEXTO-PROJETO-ANALISE-TRIBUTARIA.md` (seção 0.1e).
