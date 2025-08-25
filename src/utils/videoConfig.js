// Configurações profissionais para portal de notícias
export const VIDEO_PROFILES = {
  // Para notícias urgentes/breaking news (upload rápido)
  breaking_news: {
    name: 'Breaking News',
    resolution: { width: 720, height: 1280 },
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 4000000,     // 4 Mbps
    audioBitsPerSecond: 128000,      // 128 kbps
    frameRate: 30
  },
  
  // Padrão para notícias diárias (equilíbrio qualidade/tamanho)
  standard_news: {
    name: 'Notícias Padrão',
    resolution: { width: 1080, height: 1920 },
    mimeType: 'video/mp4;codecs=avc1.42E01E',
    videoBitsPerSecond: 10000000,    // 10 Mbps - Qualidade Full HD excelente
    audioBitsPerSecond: 192000,      // 192 kbps - Áudio cristalino
    frameRate: 30
  },
  
  // Para reportagens especiais/documentários
  premium_content: {
    name: 'Conteúdo Premium',
    resolution: { width: 1080, height: 1920 },
    mimeType: 'video/mp4;codecs=avc1.42E01E',
    videoBitsPerSecond: 20000000,    // 20 Mbps - Qualidade cinematográfica
    audioBitsPerSecond: 320000,      // 320 kbps - Áudio máxima qualidade
    frameRate: 30
  },
  
  // Fallback para dispositivos fracos
  compatibility: {
    name: 'Modo Compatibilidade',
    resolution: { width: 540, height: 960 },
    mimeType: 'video/webm',
    videoBitsPerSecond: 2000000,     // 2 Mbps
    audioBitsPerSecond: 96000,       // 96 kbps
    frameRate: 24
  }
};

// Detecta o melhor codec suportado
export function getBestSupportedCodec() {
  const codecs = [
    { mimeType: 'video/mp4;codecs=avc1.640034', name: 'H.264 High Profile' },
    { mimeType: 'video/mp4;codecs=avc1.42E01E', name: 'H.264 Main Profile' },
    { mimeType: 'video/webm;codecs=vp9', name: 'VP9' },
    { mimeType: 'video/webm;codecs=vp8', name: 'VP8' },
    { mimeType: 'video/webm', name: 'WebM Default' }
  ];
  
  for (const codec of codecs) {
    if (MediaRecorder.isTypeSupported(codec.mimeType)) {
      console.log(`✅ Usando codec: ${codec.name}`);
      return codec.mimeType;
    }
  }
  
  throw new Error('Nenhum codec de vídeo suportado!');
}
