const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/modules/video-slide/VideoSlidePage.tsx');

console.log('📖 Lendo arquivo...');
let content = fs.readFileSync(file, 'utf8');

console.log('🔍 Procurando e corrigindo TODOS os problemas de encoding...\n');

const fixes = [
  // Linha 596-598 - CRÍTICO
  ['// VINHETA É OBRIGATÃ"RIA', '// VINHETA É OBRIGATÓRIA'],
  ['âš ï¸ VINHETA OBRIGATÃ"RIA', '⚠️ VINHETA OBRIGATÓRIA'],
  
  // Remover "ue" estranho antes de toast.error
  ['ue       toast.error', '      toast.error'],
  
  // Outros problemas
  ['âŒ', '❌'],
  ['âœ…', '✅'],
  ['âœ"', '✓'],
  ['âœ¨', '✨'],
  ['âš¡', '⚡'],
  ['ðŸ"±', '📱'],
  ['ðŸ"½ï¸', '🎽️'],
  ['ðŸŽ¬', '🎬'],
  
  // Travessões
  ['â€"', '—'],
  ['â€™', "'"],
  ['â€¢', '•'],
  
  // Palavras problemáticas
  ['constância', 'constância'],
  ['aleatório', 'aleatório'],
  ['máximo', 'máximo'],
  ['variação', 'variação'],
  ['água', 'água'],
  ['padrão', 'padrão'],
  ['obrigatório', 'obrigatório'],
  ['título', 'título'],
  ['público', 'público'],
  ['duração', 'duração'],
  ['número', 'número'],
  ['múltiplos', 'múltiplos'],
  ['sequência', 'sequência'],
  ['Denúncia', 'Denúncia'],
  ['último', 'último'],
  ['após', 'após'],
];

let totalFixed = 0;
fixes.forEach(([bad, good]) => {
  const count = (content.match(new RegExp(bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count > 0) {
    content = content.split(bad).join(good);
    console.log(`✓ ${count}x: "${bad}" → "${good}"`);
    totalFixed += count;
  }
});

console.log(`\n✅ Total de ${totalFixed} correções aplicadas!`);

console.log('\n💾 Salvando arquivo...');
fs.writeFileSync(file, content, 'utf8');

console.log('🎉 PRONTO! Arquivo limpo e salvo com UTF-8!\n');
