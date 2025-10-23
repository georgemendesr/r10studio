const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/modules/video-slide/VideoSlidePage.tsx');

console.log('Lendo arquivo...');
let content = fs.readFileSync(file, 'utf8');

console.log('Corrigindo encoding...');

// Correções específicas
const fixes = [
  ['OBRIGATÃ"RIA', 'OBRIGATÓRIA'],
  ['âš ï¸', '⚠️'],
  ['âŒ', '❌'],
  ['âœ…', '✅'],
  ['âœ"', '✓'],
  ['â€"', '—'],
  ['â€¢', '•'],
];

fixes.forEach(([bad, good]) => {
  const before = content.length;
  content = content.split(bad).join(good);
  const after = content.length;
  if (before !== after) {
    console.log(`✓ Substituído: ${bad} → ${good}`);
  }
});

console.log('Salvando arquivo...');
fs.writeFileSync(file, content, 'utf8');

console.log('✅ Encoding corrigido com sucesso!');
