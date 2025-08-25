import { VIDEO_PROFILES } from './videoConfig.js';

export class VideoRecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTime = null;
    this.frameCount = 0;
    this.currentProfile = VIDEO_PROFILES.standard_news;
    this.statsInterval = null;
  }

  // Inicializa com detecção de qualidade
  async initialize(canvas, audioContext, qualityMode = 'standard_news') {
    try {
      // Valida canvas
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas inválido');
      }

      // Configura resolução baseada no perfil
      this.currentProfile = VIDEO_PROFILES[qualityMode] || VIDEO_PROFILES.standard_news;
      
      // Ajusta canvas para resolução do perfil
      canvas.width = this.currentProfile.resolution.width;
      canvas.height = this.currentProfile.resolution.height;
      
      console.log(`📐 Resolução: ${canvas.width}x${canvas.height}`);
      console.log(`🎯 Perfil selecionado: ${this.currentProfile.name}`);
      
      // Captura stream de vídeo
      const videoStream = canvas.captureStream(this.currentProfile.frameRate);
      
      // Configura áudio se disponível
      let finalStream = videoStream;
      if (audioContext && audioContext.state !== 'closed') {
        try {
          const audioDestination = audioContext.createMediaStreamDestination();
          const audioStream = audioDestination.stream;
          
          // Combina vídeo + áudio
          finalStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
          ]);
          console.log('🔊 Áudio integrado ao stream');
        } catch (audioError) {
          console.warn('⚠️ Erro no áudio, usando apenas vídeo:', audioError);
        }
      }
      
      // Cria MediaRecorder com fallback automático
      this.mediaRecorder = await this.createRecorderWithFallback(finalStream);
      
      // Configura handlers
      this.setupEventHandlers();
      
      return true;
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      throw error;
    }
  }

  // Cria recorder com fallback inteligente
  async createRecorderWithFallback(stream) {
    const profiles = [
      this.currentProfile,
      VIDEO_PROFILES.standard_news,
      VIDEO_PROFILES.breaking_news,
      VIDEO_PROFILES.compatibility
    ];
    
    for (const profile of profiles) {
      try {
        // Tenta criar com o perfil
        const options = {
          mimeType: profile.mimeType,
          videoBitsPerSecond: profile.videoBitsPerSecond,
          audioBitsPerSecond: profile.audioBitsPerSecond
        };
        
        // Valida se o tipo é suportado
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.warn(`⚠️ ${profile.name} - MIME não suportado: ${options.mimeType}`);
          continue;
        }
        
        const recorder = new MediaRecorder(stream, options);
        
        // Teste rápido de funcionamento
        const testPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 1000);
          
          recorder.onstart = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          recorder.onerror = (event) => {
            clearTimeout(timeout);
            reject(event.error);
          };
        });
        
        recorder.start();
        await testPromise;
        recorder.stop();
        
        console.log(`✅ Perfil ativo: ${profile.name}`);
        console.log(`📊 Bitrate: ${(profile.videoBitsPerSecond / 1000000).toFixed(1)} Mbps`);
        console.log(`🎵 Áudio: ${(profile.audioBitsPerSecond / 1000)} kbps`);
        
        // Atualiza perfil atual para o que funcionou
        this.currentProfile = profile;
        
        return new MediaRecorder(stream, options);
        
      } catch (error) {
        console.warn(`⚠️ Perfil ${profile.name} falhou: ${error.message}`);
      }
    }
    
    throw new Error('Nenhum perfil de vídeo funcionou!');
  }

  // Configura handlers de eventos
  setupEventHandlers() {
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
        console.log(`📦 Chunk recebido: ${(event.data.size / 1024).toFixed(2)} KB`);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('❌ Erro no MediaRecorder:', event.error);
      this.handleRecordingError(event.error);
    };

    this.mediaRecorder.onstart = () => {
      this.startTime = Date.now();
      console.log('🎬 Gravação iniciada');
      console.log(`📺 Formato: ${this.mediaRecorder.mimeType}`);
    };

    this.mediaRecorder.onstop = () => {
      const duration = (Date.now() - this.startTime) / 1000;
      console.log(`🏁 Gravação finalizada - Duração: ${duration.toFixed(1)}s`);
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }
    };
  }

  // Inicia gravação
  start() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.chunks = [];
      this.frameCount = 0;
      this.mediaRecorder.start(1000); // Chunks de 1 segundo para melhor controle
      
      // Inicia monitoramento de estatísticas
      this.startStatsMonitoring();
      
      return true;
    }
    console.warn('⚠️ MediaRecorder não está pronto para iniciar');
    return false;
  }

  // Inicia monitoramento de stats
  startStatsMonitoring() {
    this.statsInterval = setInterval(() => {
      const stats = this.getStats();
      if (stats && stats.recording) {
        console.log(`📊 Stats: ${stats.duration.toFixed(1)}s | ~${stats.estimatedSizeMB} MB | ${stats.profile}`);
      }
    }, 5000); // Log a cada 5 segundos
  }

  // Para gravação e retorna blob
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Gravação não está ativa'));
        return;
      }

      // Timeout de segurança
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao parar gravação'));
      }, 10000);

      this.mediaRecorder.onstop = () => {
        clearTimeout(timeout);
        
        try {
          const blob = new Blob(this.chunks, { 
            type: this.mediaRecorder.mimeType 
          });
          
          const sizeMB = (blob.size / 1048576).toFixed(2);
          const duration = (Date.now() - this.startTime) / 1000;
          const bitrate = (blob.size * 8) / duration / 1000000;
          
          console.log(`
📊 Estatísticas Finais do Vídeo:
- Tamanho: ${sizeMB} MB
- Duração: ${duration.toFixed(1)}s  
- Bitrate real: ${bitrate.toFixed(1)} Mbps
- Perfil usado: ${this.currentProfile.name}
- Resolução: ${this.currentProfile.resolution.width}x${this.currentProfile.resolution.height}
- MIME: ${this.mediaRecorder.mimeType}
          `);
          
          // Valida qualidade mínima
          if (blob.size < 100000) { // Menos de 100KB indica erro
            reject(new Error(`Vídeo muito pequeno (${sizeMB} MB), possível erro de renderização`));
            return;
          }
          
          if (duration < 1) {
            reject(new Error(`Duração muito curta (${duration.toFixed(1)}s), possível erro`));
            return;
          }
          
          resolve({
            blob,
            metadata: {
              duration,
              size: blob.size,
              sizeMB: parseFloat(sizeMB),
              bitrate,
              profile: this.currentProfile.name,
              mimeType: this.mediaRecorder.mimeType,
              resolution: this.currentProfile.resolution,
              frameRate: this.currentProfile.frameRate
            }
          });
          
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  // Tratamento de erros
  handleRecordingError(error) {
    console.error('🚨 Erro na gravação:', error);
    
    // Limpa recursos
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    
    // Aqui poderia implementar retry automático com perfil menor
  }

  // Monitora performance em tempo real
  getStats() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }
    
    const duration = (Date.now() - this.startTime) / 1000;
    const estimatedSize = (this.currentProfile.videoBitsPerSecond * duration) / 8;
    
    return {
      recording: true,
      duration,
      estimatedSizeMB: (estimatedSize / 1048576).toFixed(2),
      profile: this.currentProfile.name,
      fps: this.currentProfile.frameRate,
      state: this.mediaRecorder.state,
      chunksReceived: this.chunks.length
    };
  }

  // Força parada de emergência
  forceStop() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }
    } catch (error) {
      console.error('Erro ao forçar parada:', error);
    }
  }

  // Obtém status atual
  getStatus() {
    if (!this.mediaRecorder) {
      return 'not_initialized';
    }
    return this.mediaRecorder.state;
  }
}
