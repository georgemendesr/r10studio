// Mojibake fixer: reconverte texto mal decodificado (Ã, â, ð) para UTF-8 correto
// Estratégia: interpretar o conteúdo atual como latin1 e decodificar como utf8, 1-2 vezes.
// Mede padrões ruins antes/depois e só salva se melhorar.

const fs = require('fs');
const path = require('path');

function countBadPatterns(s) {
  const re = /[Ãâð][^\s]/g; // heurística simples: caracteres típicos de mojibake
  const matches = s.match(re);
  return matches ? matches.length : 0;
}

function fixOnce(s) {
  return Buffer.from(s, 'latin1').toString('utf8');
}

function processFile(absPath) {
  const orig = fs.readFileSync(absPath, 'utf8');
  const before = countBadPatterns(orig);

  let fixed = fixOnce(orig);
  let mid = countBadPatterns(fixed);

  // Se ainda tem muito, tenta segunda passada (às vezes há dupla camada)
  if (mid >= before * 0.8) {
    const second = fixOnce(fixed);
    const afterSecond = countBadPatterns(second);
    if (afterSecond < mid) {
      fixed = second;
      mid = afterSecond;
    }
  }

  if (mid < before) {
    const backup = absPath + '.bak.' + Date.now();
    fs.writeFileSync(backup, orig, { encoding: 'utf8' });
    fs.writeFileSync(absPath, fixed, { encoding: 'utf8' });
    console.log(`✔ Corrigido: ${path.relative(process.cwd(), absPath)} | ruins: ${before} -> ${mid} | backup: ${path.basename(backup)}`);
    return true;
  } else {
    console.log(`ℹ Sem melhoria: ${path.relative(process.cwd(), absPath)} | ruins: ${before}`);
    return false;
  }
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Uso: node tools/fix-mojibake.cjs <caminho-relativo-arquivo>');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), target);
  if (!fs.existsSync(abs)) {
    console.error('Arquivo não encontrado:', abs);
    process.exit(2);
  }
  processFile(abs);
}

if (require.main === module) {
  main();
}
