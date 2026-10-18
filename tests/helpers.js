const results = [];
const ok = (name, cond, extra) => { if (!cond) process.exitCode = 1; results.push({ name, pass: !!cond, extra }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined && !cond ? '  → ' + JSON.stringify(extra) : '')); };
async function fill(page, id, v) { await page.fill('#' + id, v); await page.press('#' + id, 'Tab'); await page.waitForTimeout(120); }
async function goto(page, etapa) { await page.evaluate((e) => setActive(e), etapa); await page.waitForTimeout(250); }
async function chooseCnae(page, q) {
  await page.fill('#fCnae', q); await page.waitForTimeout(250);
  const first = await page.$('#acList [role="option"], #acList li, #acList button, #acList .ac-item');
  if (!first) return false;
  await first.click(); await page.waitForTimeout(200); return true;
}
async function abrirDet(page, ...ids) { for (const id of ids) await page.evaluate((i) => { const d = document.getElementById('det_' + i); if (d) d.open = true; }, id); await page.waitForTimeout(400); }
module.exports = { ok, fill, goto, chooseCnae, abrirDet, results };

