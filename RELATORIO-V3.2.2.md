# Análise Tributária v3.2.2 — Relatório de homologação fiscal

Escopo: confrontar o motor da v3.2.1 com as regras legais apontadas e corrigir **somente divergências comprovadas**. v3.2.1 e anteriores permanecem intactas. Sem mudança de cores, fontes, navegação ou relatórios (os PDFs só mudam onde os números ou os textos legais mudaram).

## 1. Resultado da conferência, ponto a ponto

### 1. Fator R em 2027 — **divergência comprovada, corrigida**
| Regra | Fonte | Antes (motor v3.2.1) | Agora (v3.2.2) |
|---|---|---|---|
| RBT12 e FS12 de 2027 em diante = 12 meses **antecedentes ao mês anterior** ao período de apuração | LC 123, art. 18, § 1º, § 1º-A, I e § 5º-K, redação da LC 214/2025 (art. 517, efeitos em 01/01/2027, art. 544); Res. CGSN 140/2018, art. 26, § 5º, IV e V (Res. 190/2026) | janela dos 12 meses imediatamente anteriores | janela `k−13…k−2` para todo período de apuração a partir de jan/2027; 2026 inalterado |
| Início de atividade: 1º e 2º mês | Res. 140, art. 22, § 2º, I e art. 26, § 6º (Res. 190/2026): "1ª faixa dos Anexos I a V"; "fator r … considerado 0,28" | RBT12 = receita × 12 (1º mês); fator "r" calculado | 1ª faixa e fator "r" = 0,28 (Anexo III, mesmo sem folha) |
| Início de atividade: 3º ao 13º mês | Res. 140, art. 22, § 2º, II e § 4º; art. 26, § 4º | média dos meses anteriores × 12 | média dos meses **antecedentes ao mês anterior** × 12; folha anualizada pelo mesmo critério |
| Início de atividade: a partir do 14º mês | art. 22, § 4º, II | janela de 12 meses | janela de 12 meses antecedentes ao mês anterior |
| Anexos 2027–2028: 6ª faixa | Res. 190/2026, art. 6º (vigência 01/01/2027 a 31/12/2028) | I 19% · II 30% · III 33% · IV 33% · V 30,5% | I 18,90% · II 29,90% · III e IV 32,90% · V 30,40% (mesmas parcelas a deduzir) |

Diferenças 2026 × 2027 que **não** exigem correção: a fórmula da alíquota efetiva, o limiar de 28% e as faixas até a 5ª; a base de cálculo mensal passa a ser só a receita de competência (LC 123, art. 18, § 3º, de 2027) — o app já usa a receita do mês; a 6ª faixa só importa para RBT12 acima de R$ 3,6 mi.

Cenário padrão do app (empresa nova, R$ 20 mil/mês, sem folha, 2027): Simples de R$ 38.700 → **R$ 34.650** (= 2 × 1.200 + 10 × 3.225). Contrato avulso de R$ 1,5 mi em 3 meses (2027): R$ 322.500 → **R$ 167.000** (2 × 30.000 + 107.000, Anexo V na 6ª faixa).

### 2. INSS do pró-labore (11%) — **confirmado, sem alteração de cálculo**
- Base normativa: IN RFB 2.110/2022, art. 37, II, "a" (20% com dedução de 45% da contribuição patronal, limitada a 9% do salário de contribuição = 11%); Lei 10.666/2003, art. 4º (a empresa desconta e recolhe até o dia 20); Receita Federal, item 1.5 ("11% para o contribuinte individual que presta serviço à empresa"). Lei 8.212, art. 21 (20%) é a regra geral; os 11% do plano simplificado (§ 2º) valem só sobre o salário mínimo e não se aplicam ao sócio.
- Limites e exceções: base limitada ao teto (R$ 8.475,55 em 2026); com mais de uma fonte pagadora o teto é compartilhado (informação do sócio via eSocial); 20% para prestação a pessoa física e entidade beneficente isenta; MEI e demais casos fora do escopo. O app considera só esta empresa. Optantes do Simples também retêm (orientação de fonte secundária).
- Status em Fontes: hipótese → **oficial**. **Teto do INSS e tabela do IRRF de 2027 ainda não foram publicados**: o app usa os de 2026 (nova entrada, hipótese).

### 3. Composição da folha do Fator R — **regra confirmada; soma da CPP estimada deliberadamente não aplicada**
- Folha fiscal (FS12) = remunerações pagas a pessoas físicas (inclui pró-labore, 13º) + CPP patronal efetivamente recolhida (**inclusive a paga dentro do DAS**) + FGTS efetivamente recolhido; exclui aluguéis e distribuição de lucros (Res. 140, art. 26, § 1º; Manual do PGDAS-D, item 1.5; LC 123, art. 18, § 25: só valores declarados em GFIP/eSocial/DCTFWeb).
- O motor monta a folha de **pró-labore + salários + FGTS (8% só sobre salários, não sobre pró-labore)**, sem somar a CPP do DAS. Somá-la seria tratar uma **estimativa** (depende do DAS do mês anterior e da partilha) como valor **pago**, e criaria dependência circular com o próprio Fator R. Não há dupla contagem: a CPP não entra na folha nem como custo da empresa (R$ 0 de encargos patronais adicionais nos Anexos III/V).
- Efeito da omissão: folha necessária no lado **conservador**. Ordem de grandeza (Anexo III, 1ª faixa): a CPP do DAS equivale a ~2,6% da receita, então a folha fiscal exigida para 28% seria ~25,4% da receita em pró-labore e salários + FGTS. A folha informada pelo usuário deve seguir o conceito fiscal completo (a dica do campo agora diz isso).
- Folha fiscal × custo financeiro: o custo para o sócio (retenções de INSS/IRRF) continua separado e nunca entra como custo da empresa.

### 4. Prazo do Simples Híbrido — **atualizado**
Res. CGSN 186/2026, arts. 1º a 3º, na redação da Res. CGSN 194/2026 (25/09/2026, DOU 28/09/2026): opção pelo Simples para 2027 de 01/09 a 15/10/2026 (pendências regularizáveis até 30/10); opção pelo regime regular de IBS/CBS para jan–jun/2027 de 01/09 a **30/10/2026** (prorrogada de 30/09); cancelamento irretratável de 03/11 a 20/12/2026; empresas com CNPJ de 16/10 a 31/12/2026 (Simples) e 31/10 a 31/12/2026 (IBS/CBS) seguem regra própria; nova janela em março/2027 para jul–dez/2027 (fonte secundária; a Res. 194 trata só de jan–jun). Removida a frase de que a janela "já passou". Aviso curto adicionado ao detalhe do Simples Híbrido e à Memória Técnica.

## 2. Validação

| Verificação | Resultado |
|---|---|
| Cálculo independente (oráculo escrito do texto das normas) × motor: 360 cenários, 4.602 meses (existente/nova/avulsa, 2026–2028, com e sem folha, 1–24 meses, receita fixa e variável) | **0 diferença** (máx. R$ 0,000000) |
| Casos à mão (janela 2026 × 2027, 6ª faixa, empresa nova meses 1–2/3/14, virada dez/2026→jan/2027) | todos conferem |
| Regressão × v3.2.1, **500 cenários inteiramente em 2026** + **200 em 2027 em estado estacionário** (nenhuma regra nova aplicável): totais dos regimes, Simples mês a mês, Híbrido, Presumido, Fator R, exclusão | **0 diferença** |
| Regressão × v3.2.1, 84 cenários do conjunto histórico | 44 idênticos; 40 mudam só em períodos que tocam 2027+: 25 início de atividade, 14 janela defasada, 1 6ª faixa. Lucro Presumido inalterado nos 84. Nenhuma mudança em período inteiro de 2026 |
| Paridade com o motor original (400 casos) | 383 idênticos; 17 divergem só pela 6ª faixa de 2027–2028 (≤ 0,1% da receita anual) |
| Suítes (`node tests/run-all.js`) | 267 verificações PASS, 0 FAIL (suite0 5 · suite 31 · suite2 29 · suite3 18 · suite4_motor 60 · suite5_charts 33 · suite6_ux 46 · suite7 28 · suite8 17) |
| PDFs (jsPDF/html2canvas reais), 3 modelos × cenários A (existente) / B (nova) / C (avulsa) | gerados sem erros. Cenário A: Resumo e Completo **idênticos** à v3.2.1; B e C mudam pelos novos números; Memória Técnica ganha 1 página (fontes) |
| Gráficos (Chart.js real) e auditoria visual 1920/1366/390 × claro/escuro | OK |
| Build | `python3 build.py` OK |

Testes de 2026 × 2027 e de empresa nova × existente, com e sem folha, nos três tipos de simulação, estão em `tests/suite8_v322.js` e `tests/regressao_2026.js`.

## 3. Hipóteses e pendências remanescentes
1. **Art. 26, § 7º (Fator R do 3º mês em diante, empresa nova)**: os incisos não constam das transcrições da Res. 190 acessíveis. O app anualiza folha e receita pelo critério do § 4º (média dos meses antecedentes ao mês anterior) — hipótese; o 1º e o 2º mês (0,28) são oficiais. Para 2026 vale o Manual do PGDAS-D, seção 8.3, também não acessada.
2. **Cláusula de vigência da Res. 190** não foi lida; 01/01/2027 vem da LC 214/2025 (art. 544), das datas dos Anexos e de fontes secundárias. As regras de início de atividade foram aplicadas por período de apuração ≥ jan/2027.
3. **Anexos 2027–2028**: nominais da 6ª faixa conferidos em duas fontes (transcrição da Res. 190 e faixa de alíquotas publicada); parcelas a deduzir dos Anexos I, IV e V e **tabelas de 2029 em diante** não conferidas (mantidas; 2029+ = projeção). A **partilha com IBS/CBS** da Res. 190 (art. 6º) não foi incorporada à base do app.
4. **CPP paga no DAS** não somada à folha fiscal (item 1.3): folha necessária conservadora.
5. **Teto do INSS, salário mínimo e IRRF de 2027** ainda não publicados; usa-se 2026.
6. **Janela de março/2027** para o 2º semestre de 2027: fonte secundária.
7. Histórico de empresa existente tratado como receita média mensal; a defasagem de 2027 só aparece quando a receita do período varia.
8. **11% de INSS**: aplicação a sócio de optante do Simples apoiada em orientação secundária; sem tratar múltiplas fontes, aposentado ou outras rendas.
9. Mantidas as anteriores: CBS 2027+ e IBS 2029+ são projeções; retenção de 10% sobre dividendos (Lei 15.270, art. 6º-A) não modelada; Memória Técnica em PDF é raster; fonte Alata ausente no ambiente de teste.
