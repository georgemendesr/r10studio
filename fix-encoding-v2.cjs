const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/modules/video-slide/VideoSlidePage.tsx');

console.log('Lendo arquivo em buffer...');
let content = fs.readFileSync(file, 'utf8');

console.log('Corrigindo linha problemática...');

// Encontrar e substituir a seção problemática completa
const badSection = /\/\/ VINHETA É OBRIGATÃ"RIA - todos os vídeos devem ter\s+if \(!endingVideoUrl && !endingVideoFile\) \{\s*ue\s+toast\.error\("âš ï¸ VINHETA OBRIGATÃ"RIA: Faça upload de uma vinheta final para gerar o vídeo"\);/g;

const goodSection = `// VINHETA É OBRIGATÓRIA - todos os vídeos devem ter
    if (!endingVideoUrl && !endingVideoFile) {
      toast.error("⚠️ VINHETA OBRIGATÓRIA: Faça upload de uma vinheta final para gerar o vídeo");`;

if (content.match(badSection)) {
  content = content.replace(badSection, goodSection);
  console.log('✓ Seção problemática corrigida!');
} else {
  console.log('⚠️  Padrão não encontrado, tentando substituições simples...');
  content = content.replace(/OBRIGATÃ"RIA/g, 'OBRIGATÓRIA');
  content = content.replace(/âš ï¸/g, '⚠️');
  content = content.replace(/ue\s+toast\.error/g, 'toast.error');
}

console.log('Salvando arquivo...');
fs.writeFileSync(file, content, 'utf8');

console.log('✅ Correção concluída!');
