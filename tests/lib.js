// Utilitários de teste (Playwright). Serve a pasta do projeto, abre wrapper-local.html e,
// quando node_modules/{chart.js,jspdf,html2canvas} NÃO existem (ou STUBS=1), injeta stubs
// mínimos das bibliotecas — suficientes para validar fluxo, dados e consistência, mas NÃO
// o desenho real dos gráficos/PDF (para isso, rode `npm install` e use as bibliotecas reais).
const fs = require('fs'), path = require('path'), http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const S = require('./stubs');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
function serve(port, root) {
  return new Promise((res, rej) => {
    const s = http.createServer((q, r) => {
      const p = path.join(root || ROOT, decodeURIComponent(q.url.split('?')[0]));
      fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(d); });
    });
    s.on('error', rej); s.listen(port, () => res(s));
  });
}
const temLibsReais = () => fs.existsSync(path.join(ROOT, 'node_modules/chart.js')) && fs.existsSync(path.join(ROOT, 'node_modules/jspdf')) && fs.existsSync(path.join(ROOT, 'node_modules/html2canvas'));
async function aplicarStubs(page) {
  await page.route('**/node_modules/chart.js/**', (r) => r.fulfill({ contentType: 'text/javascript', body: S.chartStub }));
  await page.route('**/node_modules/jspdf/**', (r) => r.fulfill({ contentType: 'text/javascript', body: S.jspdfStub }));
  await page.route('**/node_modules/html2canvas/**', (r) => r.fulfill({ contentType: 'text/javascript', body: S.h2cStub }));
}
async function open(opts = {}) {
  const port = opts.port || 8793;
  const server = await serve(port, opts.root);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, colorScheme: opts.colorScheme || 'light', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts.g/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.stubs === true || (opts.stubs !== false && (process.env.STUBS === '1' || !temLibsReais()))) await aplicarStubs(page);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto('http://localhost:' + port + '/wrapper-local.html');
  await page.waitForTimeout(400);
  return { page, errors, close: async () => { await browser.close(); server.close(); } };
}
module.exports = { open, serve, aplicarStubs, ROOT, chromium };
