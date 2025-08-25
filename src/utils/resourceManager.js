// resourceManager.js - Gerenciador de recursos inteligente
export class ResourceManager {
  
  // Verifica disponibilidade de GPU
  static async checkGPUAvailable() {
    try {
      // Tenta detectar DaVinci Resolve ou outros editores de vídeo
      const endpoints = [
        'http://localhost:18080/',  // DaVinci Resolve
        'http://localhost:8080/',   // Outras aplicações
        'http://localhost:3000/'    // Outras aplicações
      ];
      
      const checks = endpoints.map(async (url) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000);
          
          await fetch(url, { 
            method: 'HEAD',
            signal: controller.signal 
          });
          
          clearTimeout(timeoutId);
          return false; // Serviço está rodando
        } catch {
          return true; // Serviço não está rodando
        }
      });
      
      const results = await Promise.all(checks);
      return results.every(available => available);
      
    } catch {
      return true; // Em caso de erro, assume que está disponível
    }
  }

  // Detecta capacidade do sistema
  static detectSystemCapacity() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    const capacity = {
      gpu: !!gl,
      memory: navigator.deviceMemory || 4, // GB
      cores: navigator.hardwareConcurrency || 4,
      connection: navigator.connection?.effectiveType || '4g'
    };
    
    console.log('🖥️ Capacidade do sistema:', capacity);
    return capacity;
  }

  // Determina perfil ótimo baseado no contexto
  static async getOptimalProfile(userPreference = 'standard_news') {
    const { VIDEO_PROFILES } = await import('./videoConfig.js');
    
    try {
      const [gpuAvailable, systemCapacity] = await Promise.all([
        this.checkGPUAvailable(),
        Promise.resolve(this.detectSystemCapacity())
      ]);
      
      // Sistema com recursos limitados
      if (systemCapacity.memory < 4 || systemCapacity.cores < 4) {
        console.warn('⚠️ Sistema com recursos limitados, usando perfil compatibility');
        return VIDEO_PROFILES.compatibility;
      }
      
      // GPU ocupada por outros programas
      if (!gpuAvailable) {
        console.warn('⚠️ GPU pode estar ocupada, usando perfil reduzido');
        return VIDEO_PROFILES.breaking_news;
      }
      
      // Conexão lenta - prefere qualidade menor para upload mais rápido
      if (systemCapacity.connection === 'slow-2g' || systemCapacity.connection === '2g') {
        console.log('🐌 Conexão lenta detectada, otimizando para upload');
        return VIDEO_PROFILES.breaking_news;
      }
      
      // Sistema robusto - pode usar perfil solicitado
      const requestedProfile = VIDEO_PROFILES[userPreference];
      if (requestedProfile) {
        console.log(`✅ Sistema robusto, usando perfil solicitado: ${requestedProfile.name}`);
        return requestedProfile;
      }
      
      // Fallback padrão
      return VIDEO_PROFILES.standard_news;
      
    } catch (error) {
      console.warn('⚠️ Erro na detecção de recursos, usando padrão:', error);
      return VIDEO_PROFILES.standard_news;
    }
  }

  // Monitora recursos durante gravação
  static startResourceMonitoring(callback) {
    let isMonitoring = true;
    
    const monitor = async () => {
      if (!isMonitoring) return;
      
      try {
        // Simula verificação de uso de memória/CPU
        const memoryInfo = performance.memory;
        
        const stats = {
          timestamp: Date.now(),
          memoryUsed: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1048576) : 'N/A',
          memoryLimit: memoryInfo ? Math.round(memoryInfo.jsHeapSizeLimit / 1048576) : 'N/A',
          connectionType: navigator.connection?.effectiveType || 'unknown'
        };
        
        callback(stats);
        
        // Próxima verificação em 10 segundos
        setTimeout(monitor, 10000);
        
      } catch (error) {
        console.warn('Erro no monitoramento de recursos:', error);
      }
    };
    
    monitor();
    
    // Retorna função para parar monitoramento
    return () => {
      isMonitoring = false;
    };
  }

  // Verifica se pode executar upgrade de qualidade em tempo real
  static canUpgradeQuality() {
    const capacity = this.detectSystemCapacity();
    
    return capacity.memory >= 8 && 
           capacity.cores >= 8 && 
           capacity.gpu;
  }

  // Recomendações baseadas no contexto
  static getRecommendations(userSelection) {
    const capacity = this.detectSystemCapacity();
    const recommendations = [];
    
    // Recomendações de qualidade
    if (userSelection === 'premium_content' && capacity.memory < 8) {
      recommendations.push({
        type: 'warning',
        message: 'Sistema pode ter dificuldades com qualidade Premium. Considere usar Padrão.'
      });
    }
    
    if (userSelection === 'breaking_news' && capacity.memory >= 8 && capacity.cores >= 8) {
      recommendations.push({
        type: 'suggestion',
        message: 'Seu sistema pode executar qualidade superior. Considere usar Padrão HD.'
      });
    }
    
    // Recomendações de conectividade
    const connection = navigator.connection?.effectiveType;
    if (connection === '2g' || connection === 'slow-2g') {
      recommendations.push({
        type: 'info',
        message: 'Conexão lenta detectada. Breaking News é ideal para upload rápido.'
      });
    }
    
    return recommendations;
  }

  // Otimizações específicas para não interferir com outros softwares
  static async getVideoEditorSafeProfile() {
    const gpuAvailable = await this.checkGPUAvailable();
    const { VIDEO_PROFILES } = await import('./videoConfig.js');
    
    if (!gpuAvailable) {
      // Se há editores rodando, usa configuração que não compete por recursos
      return {
        ...VIDEO_PROFILES.breaking_news,
        videoBitsPerSecond: 3000000,  // Reduz ainda mais para evitar conflitos
        frameRate: 24                 // FPS mais baixo
      };
    }
    
    return VIDEO_PROFILES.standard_news;
  }
}
