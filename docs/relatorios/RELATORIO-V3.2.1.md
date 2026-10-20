# Análise Tributária v3.2.1 — Relatório de consolidação

Escopo: fechar as pendências da auditoria da v3.2 **sem reconstruir nem expandir o sistema**. v3, v3.1 e v3.2 permanecem intactas. Identidade visual, fontes, cores e navegação não foram alteradas; nenhuma fórmula tributária foi modificada.

## 1. O que mudou

### Fator R — metodologia da vantagem líquida
- A vantagem é decomposta em: **economia no DAS** · **pró-labore adicional** · **retenções do sócio** (INSS 11% até o teto de R$ 8.475,55 e IRRF 2026) · **encargos patronais aplicáveis** (a CPP patronal dos Anexos III e V já está no DAS, portanto R$ 0 adicionais).
- INSS/IRRF retidos **não são tratados como custo da empresa**: são descontados do pró-labore do sócio e entram só no *saldo estimado* (economia − retenções).
- Novo veredito (`veredito`): `compensa`, `nao-compensa`, `sem-economia` (folha já atinge 28%), `sem-ganho` (acrescentar folha não reduz o DAS), `indicativo-favoravel`, `indicativo-desfavoravel`. **"Compensa" só aparece quando as premissas essenciais estão confirmadas**; enquanto faltar informação o texto é "indicativo" e lista o que falta (folha de referência, retenções do sócio, Fator R no início de atividade, RBT12 estimado, janela de 12 meses, pró-labore atual, RBT12 histórico).
- A folha necessária para 28% e a economia no DAS são calculadas exatamente como na v3.2.

### RBT12
- Em empresa existente, quando o RBT12 é estimado aparece uma linha discreta sob a receita: **"RBT12 estimado · Informar o real"**. O clique abre o campo no próprio lugar, preenchido com a estimativa e em foco; "Voltar a estimar" restaura. Não é preciso abrir os ajustes avançados. Empresa nova não mostra a linha.

### Resultados
- Fator R só é exibido quando se aplica (Anexos III/V): retrátil, coluna mensal e linha de atenção ficam ocultos em outros casos.
- Selo **Preliminar / Definitivo** no destaque, com a linha "Para tornar definitivo: …" e links diretos (até 3, mais "+n") para o campo ou a pendência. O aviso repetido de "preliminar" foi removido dos pontos de atenção. Nenhum cartão novo.
- Regimes que dependem de alíquotas de 2027+ ganham a marca "projeção 2027+" (Simples puro não).

## 2. Revisão em fontes oficiais

| Tema | Situação | Fonte |
|---|---|---|
| Teto do INSS R$ 8.475,55 | **Oficial** | Portaria Interministerial MPS/MF nº 13/2026 |
| IRRF 2026 (tabela, desconto simplificado R$ 607,20, redução até R$ 7.350) | **Oficial** | Tabelas da Receita 2026; Lei 15.270/2025, art. 3º-A |
| CPP incluída no Simples (exceto Anexo IV) | **Oficial** | LC 123/2006, art. 13, VI e §3º |
| Composição da folha do Fator R (pró-labore + salários + FGTS; exclui aluguéis e distribuição de lucros) | **Oficial** | Manual do PGDAS-D (17/06/2025), item 1.5 |
| Cronograma de transição IBS/CBS; IBS 0,1% em 2027 | **Oficial** | EC 132/2023, ADCT art. 127 |
| Janelas de opção pelo regime regular do Simples | **Oficial** | CGSN Res. 190/191 de 2026 |
| Retenção de 10% sobre dividendos acima de R$ 50 mil/mês | Oficial, **não modelada** | Lei 15.270/2025, art. 6º-A |
| 11% de INSS retido do sócio | **Hipótese** (apoiada na Receita e na Lei 10.666, art. 4º; artigo exato não confirmado) | — |
| Fator R no início de atividade | **Hipótese** (item 8.3 do manual do PGDAS-D não foi acessível) | — |
| CPP efetivamente paga não somada à folha | **Hipótese conservadora** | Manual PGDAS-D, item 1.5 |
| Alíquotas de referência CBS (2027+) e IBS (2029+) | **Projeção** (não definidas oficialmente: TCU até 30/10/2026; Senado até 15/12/2026) | — |

Todas as entradas estão registradas na seção **Fontes** do aplicativo, com a classificação oficial / hipótese / projeção.

## 3. Validação

| Verificação | Resultado |
|---|---|
| Regressão v3.2 × v3.2.1, 84 cenários (empresa existente, nova e avulsa) | 308.357 nós comparados · **0 diferenças inesperadas** · 162 diferenças apenas em campos alterados de propósito (`compensa` 18, `vantagemRotulo` 40, pendências título 35 / texto 52 / foco 17) · 19 campos novos aditivos |
| Totais tributários (cenário avulso R$ 1,5 mi/3 meses) | 322.500 / 391.500 / 335.700 — idênticos à v3.2 |
| Paridade motor × referência (400 casos) | **0 divergências** (diferença máx. R$ 0,0000) |
| Suítes (`node tests/run-all.js`) | suite0 5 · suite 31 · suite2 29 · suite3 18 · suite4_motor 60 · suite5_charts 33 · suite6_ux 44 · suite7_v321 28 = **248 PASS, 0 FAIL** |
| Auditoria visual (1920/1366/390 px × claro/escuro × cenários A/B/C × 4 etapas, detalhes abertos) | sem estouros nem erros de console |
| Gráficos (Chart.js real) | 33 verificações OK |
| PDFs com bibliotecas reais (jsPDF + html2canvas) | Resumo, Completo e Memória Técnica gerados nos cenários A, B e C, sem erros. A × v3.2 por rasterização: Resumo e cenário B idênticos; Completo idêntico exceto o slide do Fator R; Memória difere só nos textos e em uma 8ª página (novas fontes). |
| Build | `python3 build.py` OK (index.html, wrapper.html, wrapper-local.html) |

Antes × depois (imagens): `docs/v3.2.1-comparacao/` (9 JPGs: cenário A em notebook claro/escuro e celular × preenchimento/resultado/Fator R).

Um ajuste final: quando acrescentar a folha necessária não reduz o DAS (ex.: contrato avulso, Anexo V → III com DAS maior), o veredito é "Não compensa: o Fator R não reduz o DAS neste cenário", em vez de "sem economia a avaliar". Só texto; nenhum número mudou.

## 4. Pendências remanescentes
1. **11% de INSS do sócio**: base legal apoiada, artigo exato não confirmado.
2. **Fator R em início de atividade**: o item 8.3 do manual do PGDAS-D não foi acessado; a proporcionalização segue como hipótese de planejamento.
3. **CPP não somada à folha do Fator R**: hipótese conservadora; pode subestimar o Fator R de quem paga CPP efetiva.
4. **Alíquotas CBS 2027+ e IBS 2029+**: projeções até a definição oficial (TCU/Senado, out–dez/2026).
5. **Retenção de 10% sobre dividendos (Lei 15.270, art. 6º-A)**: não modelada.
6. **Janela de opção pelo Simples Híbrido de set/2026**: já encerrada; a próxima é mar/2027 (para o 2º semestre de 2027).
7. **Memória Técnica em PDF** é rasterizada (texto não selecionável).
8. **Fonte Alata** ausente no ambiente de teste; em produção depende do Google Fonts (há fallback).
9. Não considera deduções pessoais do sócio (dependentes etc.) nem custos reais da folha.
