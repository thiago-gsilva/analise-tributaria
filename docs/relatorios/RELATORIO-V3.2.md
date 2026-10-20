# Análise Tributária v3.2 — Relatório de refinamento visual e fluidez

Escopo: **somente UX/UI**. v3 e v3.1 permanecem intactas (pastas/ZIPs anteriores). Medidas em 1366×768, modo claro.

## 1. Resumo das melhorias
- **Nova análise**: 240 → 76 palavras; 3 modalidades, descrição curta e uma ação; painel "Como cada tipo funciona" removido (duplicava os cartões).
- **Preenchimento**: ~800 → ~250 palavras; página 2.481 → 1.269 px (cenário A). Só CNAE → receita → folha à vista; período/ano-base recolhidos; pró-labore só quando há folha; Fator R em uma linha; ajustes avançados em um retrátil; pendências em um único local (críticas abertas, estimativas recolhidas).
- **Resultados**: ~600 → ~230 palavras; 14 → 1 badge; 2 gráficos + 2 painéis → 1 gráfico principal. Ordem: placar → comparativo (3 cartões) → pontos de atenção → gráfico. Composição, evolução, tabela, Fator R e todo o técnico ficam recolhidos.
- **Relatório**: 3 opções (Executivo, Completo, Memória Técnica) + uma linha de resumo; prévia sob demanda; nome/CNPJ sob demanda.
- **Campos didáticos**: máscara monetária ao digitar; exemplos nos placeholders; erros/avisos junto ao campo; ajuda (?) discreta; "Ver resultados" sem receita aponta o campo.
- **Padronização**: campos 40 px; botões 40/32 px; mesmo h2; divisores discretos; retráteis em lista; tabelas e gráficos com a mesma moldura.

## 2. Experiência real (3 cenários)
| Cenário | Etapa | Campos visíveis (antes → depois) | Palavras (antes → depois) | Cartões/painéis | Badges | Altura da página (px) | Gráficos visíveis |
|---|---|---|---|---|---|---|---|
| A · Empresa existente | Nova análise | 0 → 0 | 240 → 76 | 5 → 3 | 0 → 0 | 774 → 768 | 0 → 0 |
| A · Empresa existente | Preenchimento | 7 → 4 | 794 → 244 | 11 → 3 | 7 → 4 | 2481 → 1269 | 0 → 0 |
| A · Empresa existente | Resultados | 0 → 0 | 577 → 231 | 12 → 4 | 14 → 1 | 2712 → 1745 | 2 → 1 |
| A · Empresa existente | Relatório | 0 → 0 | 171 → 100 | 5 → 3 | 0 → 0 | 817 → 768 | 0 → 0 |
| B · Empresa nova sem folha | Nova análise | 0 → 0 | 240 → 76 | 5 → 3 | 0 → 0 | 774 → 768 | 0 → 0 |
| B · Empresa nova sem folha | Preenchimento | 5 → 2 | 768 → 218 | 11 → 3 | 7 → 4 | 2256 → 1164 | 0 → 0 |
| B · Empresa nova sem folha | Resultados | 0 → 0 | 622 → 231 | 12 → 4 | 14 → 1 | 2852 → 1745 | 2 → 1 |
| B · Empresa nova sem folha | Relatório | 0 → 0 | 171 → 100 | 5 → 3 | 0 → 0 | 817 → 768 | 0 → 0 |
| C · Contrato avulso R$ 1,5 mi em 3 meses | Nova análise | 0 → 0 | 240 → 76 | 5 → 3 | 0 → 0 | 774 → 768 | 0 → 0 |
| C · Contrato avulso R$ 1,5 mi em 3 meses | Preenchimento | 6 → 4 | 848 → 299 | 11 → 3 | 8 → 5 | 2450 → 1367 | 0 → 0 |
| C · Contrato avulso R$ 1,5 mi em 3 meses | Resultados | 0 → 0 | 657 → 248 | 11 → 4 | 15 → 1 | 3115 → 1815 | 2 → 1 |
| C · Contrato avulso R$ 1,5 mi em 3 meses | Relatório | 0 → 0 | 212 → 121 | 7 → 4 | 0 → 0 | 940 → 768 | 0 → 0 |

Digitações necessárias: A = 3 (CNAE, faturamento, folha) · B = 2 + 1 clique ("Sem folha") · C = 2 (CNAE, valor total; 3 meses já vêm preenchidos). Nenhum campo digitado duas vezes (verificado: nenhum caminho de dado repetido entre campos visíveis).
Problemas encontrados e corrigidos na simulação: (1) pró-labore pedido mesmo sem folha → agora só aparece com folha; (2) Ano/Mês/Duração sempre visíveis → recolhidos (avulsa mostra só a duração); (3) Fator R duplicado no preenchimento e em Resultados → linha única no preenchimento; (4) pendências repetidas em duas telas com textos longos → críticas abertas, resto recolhido; (5) cartão + tabela com os mesmos valores → tabela recolhida; (6) "Ver resultados" sem receita abria tela vazia → aviso no campo; (7) CNAE truncado em tela estreita → descrição completa abaixo do campo no mobile.

## 3. Validação
- **Paridade tributária v3.1 × v3.2**: 84 cenários (A, B, C e variações: avulsa existente/nova/out-2027, receita variável, Fator R, comércio, excesso de limite, sem CNAE e 70 aleatórios), JSON **completo** de `computeAll()` comparado byte a byte → **diferença zero**. Blocos de motor (10–50) idênticos ao código da v3.1 (única linha diferente: alias de navegação da aba "comparativo").
- **PDFs**: os 3 modelos gerados com bibliotecas reais; rasters de todas as páginas idênticos aos da v3.1.
- **Suítes** (`node tests/run-all.js`): suite0 5 · suite 31 · suite2 (PDF) 29 · suite3 18 · suite4_motor 60 · suite5_charts 33 · **suite6_ux 44 (nova)** · paridade com a v1 (400 casos, 0 divergências) → **220 PASS, 0 FAIL**. Ajustes em testes antigos foram só consequência de UI intencional (gráficos recolhidos precisam ser abertos; texto "preliminar" passou aos pontos de atenção).
- **Visual** (suite6_ux, auditoria geométrica): 1920×1080, 1366×768 e 390×844 × claro/escuro × cenários A/B/C × 4 etapas (inclusive com todos os retráteis abertos): sem rolagem horizontal da página, sem texto cortado, sem campos soltos, sem sobreposição de campos/botões/gráficos, sem erros de console.

## 4. Pendências restantes
- Pendências tributárias da v3.1 permanecem (LC 123 art. 3º não lido diretamente; INSS/IRRF por fonte secundária; Fator R em início de atividade é hipótese; IBS/CBS não revalidados; Memória Técnica é raster A4, não pesquisável).
- Fonte Alata não está disponível no sandbox: a validação visual usou a fonte de reserva (no navegador do usuário a Alata carrega do Google Fonts).
- Capturas de tela de página inteira mostram barra lateral/coluna "fixas" no meio da página (artefato do `fullPage` com elementos `sticky`); no uso real elas acompanham a rolagem.
- `tests-legado` continuam parcialmente indisponíveis por limitações de ambiente (como na v3.1).
