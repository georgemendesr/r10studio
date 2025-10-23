const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const file = path.resolve(process.cwd(), process.argv[2]);
if (!file || !fs.existsSync(file)) {
  console.error('Uso: node tools/fix-mojibake-cp1252.cjs <arquivo>');
  process.exit(1);
}
const orig = fs.readFileSync(file, 'utf8');

function cp1252_to_utf8_str(s) {
  const bytes = iconv.encode(s, 'cp1252');
  return iconv.decode(bytes, 'utf8');
}

let once = cp1252_to_utf8_str(orig);
let twice = cp1252_to_utf8_str(once);

fs.writeFileSync(file + '.bak.cp1252.' + Date.now(), orig, 'utf8');
fs.writeFileSync(file, twice, 'utf8');
console.log('Aplicado CP1252->UTF8 x2 em', path.relative(process.cwd(), file));
