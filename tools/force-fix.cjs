const fs = require('fs');
const path = require('path');

const file = path.resolve(process.cwd(), process.argv[2]);
if (!file || !fs.existsSync(file)) {
  console.error('Uso: node tools/force-fix.cjs <arquivo>');
  process.exit(1);
}
const orig = fs.readFileSync(file, 'utf8');
function pass(s){ return Buffer.from(s, 'latin1').toString('utf8'); }
let out = pass(orig);
out = pass(out);
fs.writeFileSync(file + '.bak.force.' + Date.now(), orig, 'utf8');
fs.writeFileSync(file, out, 'utf8');
console.log('Forçado:', path.relative(process.cwd(), file));
