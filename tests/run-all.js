// Executa todas as suítes em sequência. Uso: node tests/run-all.js
const { spawnSync } = require('child_process');
const path = require('path');
const suites = ['suite0_existente.js', 'suite.js', 'suite2.js', 'suite3.js', 'suite4_motor.js', 'suite5_charts.js', 'suite6_ux.js', 'suite7_v321.js', 'suite8_v322.js', 'suite9_v323.js', 'suite10_v324.js', 'parity.js'];
let fail = 0;
for (const s of suites) {
  console.log('\n===== ' + s + ' =====');
  const r = spawnSync('node', [path.join(__dirname, s)], { stdio: 'inherit' });
  if (r.status !== 0) { fail++; console.log('>>> FALHOU: ' + s); }
}
console.log(fail ? '\n' + fail + ' suíte(s) com falha' : '\nTodas as suítes passaram');
process.exit(fail ? 1 : 0);
