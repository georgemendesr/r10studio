const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/modules/video-slide/VideoSlidePage.tsx');

console.log('📖 Lendo arquivo como buffer...');
const buffer = fs.readFileSync(file);
let content = buffer.toString('utf8');

console.log('🔧 Aplicando correções byte por byte...\n');

// Substituições diretas dos bytes problemáticos
const byteFixes = [
  // Linha 596 e 598
  [Buffer.from([0xC3, 0x83, 0xE2, 0x80, 0x9C]), 'Ó'],  // OBRIGATÃ"RIA
  [Buffer.from([0xC3, 0xA2, 0xC5, 0xA1, 0x20, 0xC3, 0xAF, 0xC2, 0xB8]), '⚠️'],  // emoji warning
  
  // Tentar remover "ue       " antes de toast
  ['ue       toast', '      toast'],
  ['ue      toast', '      toast'],
  ['ue     toast', '      toast'],
  ['ue toast', '      toast'],
];

// Primeiro tenta substituições de string
content = content.replace(/OBRIGATÃ"RIA/g, 'OBRIGATÓRIA');
content = content.replace(/âš ï¸/g, '⚠️');
content = content.replace(/Ãrea/g, 'Área');
content = content.replace(/seleção/g, 'seleção');
content = content.replace(/duração/g, 'duração');
content = content.replace(/Função/g, 'Função');
content = content.replace(/não/g, 'não');
content = content.replace(/renderização/g, 'renderização');
content = content.replace(/determinístico/g, 'determinístico');

// Remove o "ue" estranho
content = content.replace(/ue\s+toast\.error/g, '      toast.error');

console.log('✅ Correções aplicadas!');

console.log('\n💾 Salvando arquivo...');
fs.writeFileSync(file, content, 'utf8');

console.log('🎉 Arquivo salvo!\n');

// Verificar resultado
const lines = content.split('\n');
console.log('🔍 Verificando linha 598:');
console.log(lines[597]);
