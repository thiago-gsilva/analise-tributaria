# Análise Tributária

Simulador e comparador de regimes tributários — Simples Nacional (com Fator R),
Simples Híbrido (IBS/CBS) e Lucro Presumido — com geração de relatório em PDF
(apresentação de slides 16:9).

## Estrutura do projeto

- `shell.html` — esqueleto estático da página (HTML/CSS), sem `<script>` próprio. **Fonte de verdade** para marcação/estilo.
- `app.js` — toda a lógica da aplicação (motor de cálculo, estado, renderização, gráficos e geração do PDF). **Fonte de verdade** para o código.
- `build.py` — combina `shell.html` + `app.js` nos três arquivos abaixo. Rode `python3 build.py` (ou `npm run build`) sempre que editar `shell.html` ou `app.js`.
  - `index.html` — fragmento HTML puro (sem `<html>/<head>/<body>`), pronto para publicação como artifact.
  - `wrapper.html` — documento HTML completo equivalente, usando os scripts de terceiros (Chart.js, jsPDF, html2canvas) via CDN.
  - `wrapper-local.html` — mesmo documento, mas apontando para as cópias locais em `node_modules/` (usado nos testes automatizados, sem depender de rede).
- `data/cnaes.json` — base classificatória de CNAEs (CONCLA/IBGE, CNAE 2.3), carregada via `fetch()` pela aplicação.
- `test-*.js` — suíte de testes automatizados (Playwright): `test-cnae.js`, `test-hibrido.js`, `test-pdf.js`, `test-comparativo-presumido.js` (rodam contra um servidor local), `test-darkmode.js` e `test-full.js` (rodam via `file://`, com limitações conhecidas de CORS nesse modo).

**Importante:** nunca edite `index.html`, `wrapper.html` ou `wrapper-local.html` diretamente — eles são gerados. Edite `shell.html`/`app.js` e rode o build novamente.

## Como rodar localmente

```bash
npm install
python3 build.py

# Servidor local (necessário para os testes que carregam data/cnaes.json via fetch)
python3 -m http.server 8791
# abra http://localhost:8791/wrapper-local.html no navegador
```

## Rodando os testes

```bash
# com o servidor local (acima) rodando em outro terminal:
node test-cnae.js
node test-hibrido.js
node test-pdf.js
node test-comparativo-presumido.js
```

## Publicação

O arquivo `index.html` gerado é o artefato de publicação (fragmento HTML autocontido, com `data/cnaes.json` como arquivo auxiliar).
