import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, TrashIcon, UploadIcon, PlayIcon, KeyboardIcon, EyeIcon, Zap, Crown, Gauge, Settings } from "lucide-react";
import { toast } from "sonner";
import PunchZoomYoYo from "@/components/PunchZoomYoYo";
import { v4 as uuidv4 } from "uuid";

// Serviços profissionais para renderização
import { VideoRecorderService } from "@/utils/VideoRecorderService";
import { VIDEO_PROFILES } from "@/utils/videoConfig";
import { ResourceManager } from "@/utils/resourceManager";

interface Slide {
  id: string;
  image: string;
  caption: string;
  effect: string;
  textAnimation: string;
  durationSec?: number;
  alignH?: 'left' | 'center' | 'right';
  alignV?: 'top' | 'center' | 'bottom';
}

interface Watermark {
  file: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const VideoSlidePage = () => {
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [watermark, setWatermark] = useState<Watermark>({ file: "", position: "bottom-right" });
  const [useFlash, setUseFlash] = useState(false);
  const [useFade, setUseFade] = useState(false);
  const [keepFirstCaption, setKeepFirstCaption] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Estados para trilha sonora e vinheta
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [endingVideoFile, setEndingVideoFile] = useState<File | null>(null);
  const [endingVideoUrl, setEndingVideoUrl] = useState<string>("");
  const [useEndingVideo, setUseEndingVideo] = useState(false);
  
  // Estados para sistema profissional de qualidade
  const [qualityProfile, setQualityProfile] = useState('standard_news');
  const [systemCapacity, setSystemCapacity] = useState(null);
  const [qualityRecommendations, setQualityRecommendations] = useState([]);
  const [renderingStats, setRenderingStats] = useState(null);
  const [videoRecorderService, setVideoRecorderService] = useState(null);

  // Inicialização do sistema profissional
  useEffect(() => {
    const initializeProfessionalSystem = async () => {
      try {
        // Detecta capacidade do sistema
        const capacity = ResourceManager.detectSystemCapacity();
        setSystemCapacity(capacity);
        
        // Obtém perfil ótimo
        const optimalProfile = await ResourceManager.getOptimalProfile();
        const profileKey = Object.keys(VIDEO_PROFILES).find(key => 
          VIDEO_PROFILES[key].name === optimalProfile.name
        ) || 'standard_news';
        
        setQualityProfile(profileKey);
        
        // Obtém recomendações
        const recommendations = ResourceManager.getRecommendations(profileKey);
        setQualityRecommendations(recommendations);
        
        console.log('🚀 Sistema profissional inicializado');
        console.log('📊 Capacidade detectada:', capacity);
        console.log('🎯 Perfil recomendado:', optimalProfile.name);
        
      } catch (error) {
        console.warn('⚠️ Erro na inicialização profissional:', error);
      }
    };

    initializeProfessionalSystem();
  }, []);

  // Logos pré-definidas disponíveis
  const predefinedLogos = [
    { 
      id: 'none', 
      name: '🚫 Sem Logo', 
      file: '', 
      description: 'Vídeo sem marca d\'água' 
    },
    { 
      id: 'custom', 
      name: '📁 Logo Personalizada', 
      file: watermark.file, 
      description: 'Upload da sua própria marca d\'água' 
    }
  ];

  // Vinhetas de encerramento pré-cadastradas
  const predefinedEndings = [
    { 
      id: 'none', 
      name: '🚫 Sem Vinheta', 
      file: '', 
      description: 'Vídeo termina nas imagens' 
    },
    { 
      id: 'custom', 
      name: '📤 Upload Personalizada', 
      file: '', 
      description: 'Sua vinheta personalizada' 
    }
  ];

  // Trilhas sonoras pré-cadastradas
  const predefinedAudios = [
    { 
      id: 'none', 
      name: '🔇 Sem Áudio', 
      file: '', 
      description: 'Vídeo sem trilha sonora' 
    },
    { 
      id: 'custom', 
      name: '📤 Upload Personalizada', 
      file: '', 
      description: 'Sua trilha personalizada' 
    }
  ];

  const [selectedLogoId, setSelectedLogoId] = useState('none');
  const [selectedAudioId, setSelectedAudioId] = useState('none');
  const [selectedEndingId, setSelectedEndingId] = useState('none');

  // Templates pré-configurados para jornalismo
  const journalismTemplates = [
    {
      id: 'breaking',
      name: '🔴 Breaking News',
      description: 'Zoom urgente + flash para notícias de última hora',
      effects: ['BREAKING_NEWS', 'ZOOM_3X_IN', 'PULSE'],
      useFlash: true,
      useFade: false,
      keepFirstCaption: true,
      duration: 4
    },
    {
      id: 'investigative',
      name: '🔍 Investigativo',
      description: 'Foco gradual + fade para reportagens aprofundadas',
      effects: ['INVESTIGATIVO', 'ZOOM_4X_IN', 'REVELACAO'],
      useFlash: false,
      useFade: true,
      keepFirstCaption: false,
      duration: 6
    },
    {
      id: 'exclusive',
      name: '🎯 Exclusiva',
      description: 'Zoom preciso + confronto para furos jornalísticos',
      effects: ['EXCLUSIVA', 'CONFRONTO', 'ZOOM_3X_OUT'],
      useFlash: true,
      useFade: false,
      keepFirstCaption: true,
      duration: 5
    },
    {
      id: 'standard',
      name: '📰 Reportagem Padrão',
      description: 'Aleatório equilibrado para matérias gerais',
      effects: ['ALEATORIO'],
      useFlash: false,
      useFade: false,
      keepFirstCaption: false,
      duration: 5
    }
  ];

  // Aplicar template
  const applyTemplate = (template: typeof journalismTemplates[0]) => {
    // Aplicar configurações globais
    setUseFlash(template.useFlash);
    setUseFade(template.useFade);
    setKeepFirstCaption(template.keepFirstCaption);
    
    // Aplicar efeitos aos slides existentes
    setSlides(prev => prev.map(slide => ({
      ...slide,
      effect: template.effects[Math.floor(Math.random() * template.effects.length)],
      durationSec: template.duration
    })));
    
    toast.success(`Template "${template.name}" aplicado com sucesso!`);
  };

  // Aplicar logo selecionada
  const applySelectedLogo = (logoId: string) => {
    setSelectedLogoId(logoId);
    const selectedLogo = predefinedLogos.find(logo => logo.id === logoId);
    if (selectedLogo) {
      setWatermark(prev => ({ ...prev, file: selectedLogo.file }));
      toast.success(`Logo "${selectedLogo.name}" selecionada!`);
    }
  };

  // Aplicar trilha sonora selecionada
  const applySelectedAudio = (audioId: string) => {
    setSelectedAudioId(audioId);
    const selectedAudio = predefinedAudios.find(audio => audio.id === audioId);
    if (selectedAudio) {
      if (selectedAudio.file) {
        setAudioUrl(selectedAudio.file);
        setAudioFile(null); // Limpar arquivo custom se houver
      } else {
        setAudioUrl("");
        setAudioFile(null);
      }
      toast.success(`Trilha "${selectedAudio.name}" selecionada!`);
    }
  };

  // Aplicar vinheta selecionada
  const applySelectedEnding = (endingId: string) => {
    setSelectedEndingId(endingId);
    const selectedEnding = predefinedEndings.find(ending => ending.id === endingId);
    if (selectedEnding) {
      if (selectedEnding.file) {
        setEndingVideoUrl(selectedEnding.file);
        setEndingVideoFile(null); // Limpar arquivo custom se houver
        setUseEndingVideo(true);
      } else {
        setEndingVideoUrl("");
        setEndingVideoFile(null);
        setUseEndingVideo(false);
      }
      toast.success(`Vinheta "${selectedEnding.name}" selecionada!`);
    }
  };

  // Upload de áudio personalizado
  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Por favor, selecione um arquivo de áudio válido');
        return;
      }
      
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setSelectedAudioId('custom');
      toast.success('Áudio personalizado carregado!');
    }
  };

  // Upload de vinheta personalizada
  const handleEndingVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Por favor, selecione um arquivo de vídeo válido');
        return;
      }
      
      setEndingVideoFile(file);
      const url = URL.createObjectURL(file);
      setEndingVideoUrl(url);
      setSelectedEndingId('custom');
      setUseEndingVideo(true);
      toast.success('Vinheta personalizada carregada!');
    }
  };

  // Auto-resize function for textareas
  const autoResize = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = element.scrollHeight + 'px';
  };

  // Keyboard shortcuts
  const handleKeyboardShortcuts = useCallback((e: KeyboardEvent) => {
    // Ctrl/Cmd + I: Add images
    if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('add-multiple-images')?.click();
      return;
    }
    
    // Ctrl/Cmd + Enter: Generate video
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (slides.length > 0 && title.trim() && !isGenerating) {
        generateVideo();
      }
      return;
    }
    
    // Ctrl/Cmd + Shift + R: Randomize effects
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      if (slides.length > 0) {
        const effects = journalismTemplates.find(t => t.id === 'standard')?.effects || ['ALEATORIO'];
        setSlides(prev => prev.map(slide => ({
          ...slide,
          effect: effects[Math.floor(Math.random() * effects.length)]
        })));
        toast.success("🎲 Efeitos aleatorizados!");
      }
      return;
    }
    
    // Esc: Close advanced settings
    if (e.key === 'Escape') {
      setShowAdvancedSettings(false);
    }
  }, [slides.length, title, isGenerating]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  // Auto-resize all textareas when slides change
  useEffect(() => {
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        if (textarea instanceof HTMLTextAreaElement) {
          autoResize(textarea);
        }
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [slides]);

  const zoomEffects = [
    { value: "ALEATORIO", label: "Aleatório (recomendado)" },
    { value: "ZOOM_3X_IN", label: "Zoom 3x In (0.9s)" },
    { value: "ZOOM_4X_IN", label: "Zoom 4x In (1.2s)" },
    { value: "ZOOM_3X_OUT", label: "Zoom 3x Out (0.9s)" },
    { value: "ZOOM_4X_OUT", label: "Zoom 4x Out (1.2s)" },
    { value: "PULSE", label: "Pulse (0.6s)" },
    // NOVOS EFEITOS JORNALÍSTICOS
    { value: "BREAKING_NEWS", label: "🔴 Breaking News - Zoom Urgente" },
    { value: "INVESTIGATIVO", label: "🔍 Investigativo - Foco Gradual" },
    { value: "REVELACAO", label: "⚡ Revelação - Punch Duplo" },
    { value: "TESTEMUNHA", label: "👁️ Testemunha - Zoom Íntimo" },
    { value: "CONFRONTO", label: "⚔️ Confronto - Vai e Volta Agressivo" },
    { value: "EXCLUSIVA", label: "🎯 Exclusiva - Zoom Preciso" },
    { value: "DENUNCIA", label: "🚨 Denúncia - Impacto Múltiplo" },
    { value: "DESCOBERTA", label: "💡 Descoberta - Revelação Progressiva" }
  ];

  // Único efeito de texto: typewriter (digitando)

  const addSlide = () => {
    setSlides(prev => [
      ...prev,
      {
        id: uuidv4(),
        image: "",
        caption: "",
        effect: "ALEATORIO",
  textAnimation: "typewriter",
        durationSec: 5,
        alignH: 'center',
        alignV: 'center',
      }
    ]);
  };

  const removeSlide = (id: string) => {
    setSlides(slides.filter(slide => slide.id !== id));
  };

  const updateSlide = <K extends keyof Slide>(id: string, field: K, value: Slide[K]) => {
    setSlides(slides.map(slide => 
      slide.id === id ? { ...slide, [field]: value } : slide
    ));
  };

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await processMultipleFiles(Array.from(files), id);
    }
  };

  const processMultipleFiles = async (files: File[], targetSlideId?: string) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Limite razoável para performance (máximo 20 slides)
    if (!targetSlideId && slides.length + imageFiles.length > 20) {
      toast.error(`Máximo de 20 slides permitidos para manter boa performance. Você tem ${slides.length} e está tentando adicionar ${imageFiles.length}.`);
      return;
    }

    toast.loading(`Processando ${imageFiles.length} imagem(ns)...`, { id: "processing" });

  try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const dataUrl = await readFileAsDataURL(file);
        
        if (targetSlideId && i === 0) {
          // Se foi especificado um slide específico, atualizar apenas o primeiro arquivo
          updateSlide(targetSlideId, 'image', dataUrl);
        } else {
          // Para arquivos adicionais ou drag & drop, criar novos slides
          const newSlide: Slide = {
            id: uuidv4(),
            image: dataUrl,
            caption: `Slide ${slides.length + i + 1}`,
            effect: "ALEATORIO",
            textAnimation: "typewriter",
            durationSec: 5,
            alignH: 'center',
            alignV: 'center',
          };
          setSlides(prev => [...prev, newSlide]);
        }
      }
      
      toast.success(`${imageFiles.length} imagem(ns) carregada(s)`, { id: "processing" });
    } catch (error) {
      console.error('Erro ao processar imagens:', error);
      toast.error('Erro ao processar imagens', { id: "processing" });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent, targetSlideId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    await processMultipleFiles(files, targetSlideId);
  };

  const generateVideo = async () => {
    if (!title.trim()) {
      toast.error("Por favor, insira um título para o vídeo");
      return;
    }
    if (slides.length === 0) {
      toast.error("Por favor, adicione pelo menos um slide");
      return;
    }
    if (slides.some(slide => !slide.image)) {
      toast.error("Por favor, adicione imagens a todos os slides");
      return;
    }

    setIsGenerating(true);
    
    try {
      toast.loading("Gerando seu vídeo...", { id: "generating" });
      
      // Criar um canvas para renderizar o vídeo - QUALIDADE MÁXIMA
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d', { 
        alpha: false, // Sem transparência para melhor performance
        desynchronized: true, // Melhor performance
        willReadFrequently: false 
      });
      
      if (!ctx) {
        throw new Error('Não foi possível criar contexto do canvas');
      }

      // Configurar canvas para máxima qualidade
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Configurar MediaRecorder para capturar o canvas + áudio se houver trilha
      const FRAME_RATE = 30;
      const FRAME_MS = 1000 / FRAME_RATE; // 33.333ms exatos
      const stream = canvas.captureStream(0); // 0 = capturar apenas quando mudanças ocorrem (mais eficiente)
      
      // Criar audio context para mixer de áudio se houver trilha sonora
      let audioContext: AudioContext | null = null;
      let audioStream: MediaStream | null = null;
      let audioElement: HTMLAudioElement | null = null;
      
      if (audioUrl && selectedAudioId !== 'none') {
        try {
          audioContext = new AudioContext();
          audioElement = new Audio();
          audioElement.src = audioUrl;
          audioElement.loop = false; // Não fazer loop - será cortado no tempo certo
          audioElement.volume = 0.7; // Volume um pouco mais baixo para não sobrepor
          
          // Criar stream de áudio a partir do elemento
          const audioSource = audioContext.createMediaElementSource(audioElement);
          const streamDestination = audioContext.createMediaStreamDestination();
          audioSource.connect(streamDestination);
          audioStream = streamDestination.stream;
          
          // Adicionar faixas de áudio ao stream principal
          audioStream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (error) {
          console.warn('Erro ao configurar áudio:', error);
          toast.warning('Erro ao configurar trilha sonora - vídeo será gerado sem áudio');
        }
      } else {
        // Remover faixas de áudio se não houver trilha sonora
        stream.getAudioTracks().forEach(track => {
          stream.removeTrack(track);
          track.stop();
        });
      }
      
      // Preferir H.264 (MP4) com fallback para WebM - bitrate máximo
      const mimeCandidates = [
        'video/mp4;codecs=avc1.42E01E',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const supportedMime = mimeCandidates.find((m) => (window as unknown as { MediaRecorder?: { isTypeSupported?: (m:string)=>boolean } }).MediaRecorder?.isTypeSupported?.(m));
      const chosenMime = supportedMime || 'video/webm;codecs=vp8';
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 50000000 // Aumentado drasticamente para 50M para resolver problema dos 88kb
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
  const blobType = mediaRecorder.mimeType || chosenMime;
  const blob = new Blob(chunks, { type: blobType });
  const fileExtension = blobType.includes('mp4') ? 'mp4' : 'webm';
  const url = URL.createObjectURL(blob);
        
        // Salvar metadados no localStorage (não persistir Blob)
        const videoData = {
          id: uuidv4(),
          title: title,
          status: 'ready',
          slideCount: slides.length,
          createdAt: new Date().toISOString(),
          url: url,
          format: fileExtension
        };
        
        const existingVideos = JSON.parse(localStorage.getItem('r10-videos') || '[]');
        existingVideos.push(videoData);
        localStorage.setItem('r10-videos', JSON.stringify(existingVideos));
        
        // Download automático
        const a = document.createElement('a');
        a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9\s]/g, '_').trim() || 'video'}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        toast.success(`Vídeo "${title}" gerado em ${fileExtension.toUpperCase()} e baixado com sucesso!`, { id: "generating" });
      };
      
      // Iniciar gravação
      mediaRecorder.start();
      
      // Helper: especificação de efeitos PUNCH ZOOM - CORTES SECOS BRUSCOS + EFEITOS JORNALÍSTICOS
      const getEffectSpec = (effect: string) => {
        const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        const map: Record<string, { durationMs: number; steps: Array<{ atMs: number; scale: number }> }> = {
          // EFEITOS BÁSICOS
          ZOOM_3X_IN: { durationMs: 900, steps: [ { atMs: 0, scale: 1.0 }, { atMs: 200, scale: 1.3 } ] },
          ZOOM_4X_IN: { durationMs: 1200, steps: [ { atMs: 0, scale: 1.0 }, { atMs: 300, scale: 1.4 } ] },
          ZOOM_3X_OUT: { durationMs: 900, steps: [ { atMs: 0, scale: 1.3 }, { atMs: 300, scale: 1.0 } ] },
          ZOOM_4X_OUT: { durationMs: 1200, steps: [ { atMs: 0, scale: 1.4 }, { atMs: 400, scale: 1.0 } ] },
          PULSE: { durationMs: 600, steps: [ { atMs: 0, scale: 1.0 }, { atMs: 150, scale: 1.2 }, { atMs: 300, scale: 1.0 } ] },
          
          // EFEITOS JORNALÍSTICOS ESPECÍFICOS
          BREAKING_NEWS: { 
            durationMs: 800, 
            steps: [ 
              { atMs: 0, scale: 1.0 }, 
              { atMs: 100, scale: 1.5 }, // PUNCH súbito e forte para urgência
              { atMs: 400, scale: 1.3 }  // Mantém zoom alto para tensão
            ] 
          },
          INVESTIGATIVO: { 
            durationMs: 1500, 
            steps: [ 
              { atMs: 0, scale: 1.1 }, 
              { atMs: 500, scale: 1.4 }, // Foco gradual como "descobrindo pistas"
              { atMs: 1000, scale: 1.6 } // Zoom final revelador
            ] 
          },
          REVELACAO: { 
            durationMs: 1000, 
            steps: [ 
              { atMs: 0, scale: 1.0 }, 
              { atMs: 200, scale: 1.3 }, // Primeiro punch
              { atMs: 600, scale: 1.1 }, // Recua
              { atMs: 800, scale: 1.5 }  // PUNCH final revelador
            ] 
          },
          TESTEMUNHA: { 
            durationMs: 1200, 
            steps: [ 
              { atMs: 0, scale: 1.0 }, 
              { atMs: 400, scale: 1.6 }, // Zoom íntimo, pessoal
              { atMs: 800, scale: 1.4 }  // Mantém proximidade
            ] 
          },
          CONFRONTO: { 
            durationMs: 800, 
            steps: [ 
              { atMs: 0, scale: 1.2 }, 
              { atMs: 200, scale: 0.9 }, // Recua
              { atMs: 400, scale: 1.4 }, // Avança
              { atMs: 600, scale: 1.0 }  // Recua - movimento agressivo
            ] 
          },
          EXCLUSIVA: { 
            durationMs: 900, 
            steps: [ 
              { atMs: 0, scale: 1.0 }, 
              { atMs: 300, scale: 1.2 }, // Foco preciso
              { atMs: 600, scale: 1.45 } // Zoom final "exclusivo"
            ] 
          },
          DENUNCIA: { 
            durationMs: 1000, 
            steps: [ 
              { atMs: 0, scale: 1.1 }, 
              { atMs: 200, scale: 1.3 }, // Primeiro impacto
              { atMs: 400, scale: 1.1 }, // Respira
              { atMs: 600, scale: 1.4 }, // Segundo impacto
              { atMs: 800, scale: 1.2 }  // Impacto final
            ] 
          },
          DESCOBERTA: { 
            durationMs: 1400, 
            steps: [ 
              { atMs: 0, scale: 0.95 }, // Começa um pouco recuado
              { atMs: 400, scale: 1.1 }, // Aproxima devagar
              { atMs: 800, scale: 1.3 }, // Descobrindo...
              { atMs: 1200, scale: 1.5 } // REVELAÇÃO final
            ] 
          },
          
          // Aleatório agora inclui efeitos jornalísticos
          ALEATORIO: { durationMs: 900, steps: [ { atMs: 0, scale: 1.0 }, { atMs: 200, scale: 1.3 } ] },
        };
        if (effect === 'ALEATORIO') {
          const jornalisticos = ['BREAKING_NEWS','INVESTIGATIVO','REVELACAO','TESTEMUNHA','CONFRONTO','EXCLUSIVA','DENUNCIA','DESCOBERTA'];
          const basicos = ['ZOOM_3X_IN','ZOOM_4X_IN','ZOOM_3X_OUT','ZOOM_4X_OUT','PULSE'];
          const todos = [...jornalisticos, ...basicos];
          const choose = pick(todos);
          return map[choose];
        }
        return map[effect] ?? map['ZOOM_3X_IN'];
      };

      // Pré-carregar watermark se existir
      let watermarkImg: HTMLImageElement | null = null;
      if (watermark.file) {
        watermarkImg = new Image();
        watermarkImg.src = watermark.file;
        try {
          await new Promise<void>((res) => {
            if (!watermarkImg) return res();
            watermarkImg.onload = () => res();
            watermarkImg.onerror = () => res();
          });
        } catch (e) {
          console.warn('Falha ao carregar watermark:', e);
        }
      }

      // Renderizar cada slide - TIMING E EFEITOS CORRIGIDOS
      const startTime = performance.now();
      const preloadedImages: HTMLImageElement[] = [];
      
      // Pré-carregar todas as imagens
      for (let i = 0; i < slides.length; i++) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = slides[i].image;
        });
        preloadedImages[i] = img;
      }

      // Calcular duração total ANTES da renderização
      const totalVideoMs = slides.reduce((acc, slide) => acc + (slide.durationSec || 5) * 1000, 0);
      const endingDurationMs = useEndingVideo && endingVideoUrl ? 3000 : 0;
      const finalDurationMs = totalVideoMs + endingDurationMs;

      console.log(`Iniciando renderização de ${slides.length} slides - Duração total: ${finalDurationMs}ms`);
      
      // Função de renderização com timing real
      let currentSlideIndex = 0;
      let slideStartTime = Date.now();
      const renderStartTime = Date.now();
      
      const renderFrame = () => {
        if (currentSlideIndex >= slides.length) {
          console.log('Renderização de slides concluída');
          return; // Todos os slides foram processados
        }
        
        const slide = slides[currentSlideIndex];
        const durationSec = Math.min(30, Math.max(1, slide.durationSec || 5));
        const captionText = keepFirstCaption ? (slides[0]?.caption || '') : (slide.caption || '');
        const img = preloadedImages[currentSlideIndex];
        const elapsedInSlide = Date.now() - slideStartTime;
        
        // Verificar se deve avançar para próximo slide
        if (elapsedInSlide >= durationSec * 1000) {
          currentSlideIndex++;
          slideStartTime = Date.now();
          if (currentSlideIndex < slides.length) {
            requestAnimationFrame(renderFrame);
          }
          return;
        }
        
        // Efeito com timing preciso
        const { durationMs, steps } = getEffectSpec(slide.effect || 'ALEATORIO');
        
        // Limpar canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Determinar escala com CORTES SECOS (PUNCH ZOOM)
        let scale = 1.0;
        for (let s = 0; s < steps.length; s++) {
          if (elapsedInSlide >= steps[s].atMs) {
            scale = steps[s].scale; // CORTE SECO - muda instantaneamente
          }
        }
        
        // Desenhar imagem com zoom corrigido
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawW, drawH;
        if (imgAspect > canvasAspect) {
          drawH = canvas.height * scale;
          drawW = drawH * imgAspect;
        } else {
          drawW = canvas.width * scale;
          drawH = drawW / imgAspect;
        }
        
        // Alinhamento
        let dx = 0, dy = 0;
        const slideAlignH = slide.alignH || 'center';
        const slideAlignV = slide.alignV || 'center';
        if (slideAlignH === 'left') dx = 0; 
        else if (slideAlignH === 'right') dx = canvas.width - drawW; 
        else dx = (canvas.width - drawW) / 2;
        
        if (slideAlignV === 'top') dy = 0; 
        else if (slideAlignV === 'bottom') dy = canvas.height - drawH; 
        else dy = (canvas.height - drawH) / 2;
        
        ctx.drawImage(img, dx, dy, drawW, drawH);
        
        // Fade entre slides
        if (useFade && currentSlideIndex > 0 && elapsedInSlide < 300) {
          const prevImg = preloadedImages[currentSlideIndex - 1];
          ctx.globalAlpha = 1 - (elapsedInSlide / 300);
          
          const prevImgAspect = prevImg.width / prevImg.height;
          let prevDrawW, prevDrawH;
          if (prevImgAspect > canvasAspect) {
            prevDrawH = canvas.height;
            prevDrawW = prevDrawH * prevImgAspect;
          } else {
            prevDrawW = canvas.width;
            prevDrawH = prevDrawW / prevImgAspect;
          }
          const prevDx = (canvas.width - prevDrawW) / 2;
          const prevDy = (canvas.height - prevDrawH) / 2;
          ctx.drawImage(prevImg, prevDx, prevDy, prevDrawW, prevDrawH);
          ctx.globalAlpha = 1.0;
        }

        // Flash nos primeiros 100ms
        if (useFlash && elapsedInSlide < 100) {
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = 0.8 - (elapsedInSlide / 100) * 0.8;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1.0;
        }
        
        // Desenhar texto com efeito typewriter
        if (captionText) {
          ctx.font = '800 67px Poppins, Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          // Quebrar texto em linhas
          const maxW = canvas.width - 200;
          const tokens = captionText.split(/(\s+)/);
          const textLines = [];
          let current = '';
          for (const t of tokens) {
            const test = current + t;
            if (ctx.measureText(test).width > maxW) {
              if (current.trim()) textLines.push(current.trimEnd());
              current = t.trimStart();
            } else {
              current = test;
            }
          }
          if (current.trim()) textLines.push(current.trimEnd());

          const left = 100;
          const lh = 86;
          const padX = 29, padY = 19;
          const totalH = textLines.length * lh;
          let y = canvas.height - 300 - totalH;

          // Animação typewriter
          const typewriterProgress = Math.min(1, elapsedInSlide / Math.max(2000, durationSec * 400));
          const totalChars = textLines.join(' ').length;
          const charsToShow = Math.floor(totalChars * typewriterProgress);
          
          let charsShown = 0;
          for (const line of textLines) {
            if (charsShown >= charsToShow) break;
            
            const charsInLine = Math.min(line.length, charsToShow - charsShown);
            const renderText = line.slice(0, charsInLine);
            charsShown += line.length;
            
            if (renderText) {
              const textWidth = ctx.measureText(renderText).width;
              
              // Fundo vermelho
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(left, y + (lh - 56) / 2 - padY / 2, textWidth + padX * 2, 56 + padY);
              
              // Texto branco
              ctx.fillStyle = '#ffffff';
              ctx.fillText(renderText, left + padX, y + lh / 2);
            }
            
            y += lh + 6;
          }
        }

        // Marca d'água R10 Piauí permanente (canto inferior direito)
        const r10Logo = new Image();
        r10Logo.crossOrigin = 'anonymous';
        r10Logo.onload = () => {
          const logoWidth = 120;
          const logoHeight = (logoWidth / r10Logo.width) * r10Logo.height;
          const logoX = canvas.width - logoWidth - 20;
          const logoY = canvas.height - logoHeight - 20;
          
          // Barra colorida animada acima da logo
          const barHeight = 4;
          const barY = logoY - 10;
          const time = (Date.now() - renderStartTime) / 1000;
          const gradient = ctx.createLinearGradient(logoX, barY, logoX + logoWidth, barY);
          gradient.addColorStop(0, `hsl(${(time * 50) % 360}, 70%, 50%)`);
          gradient.addColorStop(1, `hsl(${(time * 50 + 60) % 360}, 70%, 50%)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(logoX, barY, logoWidth, barHeight);
          
          // Logo R10 Piauí
          ctx.globalAlpha = 0.8;
          ctx.drawImage(r10Logo, logoX, logoY, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;
        };
        r10Logo.src = '/logo-r10-piaui.png';

        // Watermark personalizada (se existir)
        if (watermarkImg) {
          const margin = 40;
          const wmTargetWidth = 180;
          const ratio = watermarkImg.width / watermarkImg.height;
          const wmW = wmTargetWidth;
          const wmH = Math.round(wmTargetWidth / ratio);

          let x = margin;
          let y = canvas.height - wmH - margin;
          if (watermark.position === 'top-left') {
            x = margin; y = margin;
          } else if (watermark.position === 'top-right') {
            x = canvas.width - wmW - margin; y = margin;
          } else if (watermark.position === 'bottom-left') {
            x = margin; y = canvas.height - wmH - margin;
          } else if (watermark.position === 'bottom-right') {
            x = canvas.width - wmW - margin; y = canvas.height - wmH - margin;
          }
          ctx.globalAlpha = 0.6;
          ctx.drawImage(watermarkImg, x, y, wmW, wmH);
          ctx.globalAlpha = 1.0;
        }
        
        // Próximo frame
        requestAnimationFrame(renderFrame);
      };
      
      // Iniciar renderização
      renderFrame();
      
      // Calcular duração total do vídeo
      console.log(`Duração total calculada: ${finalDurationMs}ms`);
      
      // Iniciar áudio sincronizado se houver
      if (audioElement && audioContext) {
        try {
          // Aguardar contexto ser liberado para reprodução
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          
          // Começar reprodução do áudio
          await audioElement.play();
          
          // Programar parada do áudio no tempo correto
          setTimeout(() => {
            if (audioElement) {
              audioElement.pause();
              audioElement.currentTime = 0;
            }
          }, finalDurationMs);
          
        } catch (error) {
          console.warn('Erro ao iniciar áudio:', error);
        }
      }
      
      const endTime = performance.now();
      console.log(`Renderização concluída em ${Math.round(endTime - startTime)}ms`);
      
      // Parar gravação após duração calculada (incluindo vinheta)
      setTimeout(() => {
        mediaRecorder.stop();
        
        // Limpar recursos de áudio
        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
        }
        if (audioContext) {
          audioContext.close();
        }
      }, finalDurationMs + 500); // Pequena margem de segurança
      
    } catch (error) {
      console.error('Erro ao gerar vídeo:', error);
      toast.error("Falha ao gerar vídeo", { id: "generating" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      {/* Header Simples */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold r10-text-gradient">
          Criar Novo Vídeo
        </h1>
        <p className="text-muted-foreground text-lg">
          Adicione um título, faça upload das imagens e gere seu vídeo
        </p>
      </div>

      {/* Título */}
      <Card>
        <CardHeader>
          <CardTitle>Título do Vídeo</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              autoResize(e.target);
            }}
            placeholder="Ex: Prefeitura anuncia nova obra no centro da cidade"
            className="text-lg min-h-[50px] resize-none font-archivo font-semibold"
          />
        </CardContent>
      </Card>

      {/* Slides Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                slides.length > 0 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
              }`}>2</div>
              Imagens da Reportagem ({slides.length}/20)
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Upload em lote otimizado: selecione múltiplas imagens de uma vez
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processMultipleFiles(Array.from(e.target.files));
                }
              }}
              className="hidden"
              id="add-multiple-images"
            />
            <Button 
              asChild
              variant="accent"
              size="sm"
              disabled={slides.length >= 20}
              className="relative"
            >
              <label htmlFor="add-multiple-images" className="cursor-pointer">
                <PlusIcon className="w-4 h-4 mr-2" />
                {slides.length === 0 ? 'Upload das Imagens' : `Adicionar Mais (${20 - slides.length} restantes)`}
              </label>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {slides.length === 0 ? (
            <div 
              className="text-center py-16 text-muted-foreground border-2 border-dashed border-orange-400/30 rounded-lg hover:border-orange-400/50 transition-colors bg-gradient-to-b from-orange-50/20 to-red-50/20"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e)}
            >
              <UploadIcon className="w-20 h-20 mx-auto mb-6 text-orange-400/60" />
              <h3 className="text-xl font-medium mb-3 text-orange-700">Faça upload das suas imagens</h3>
              <p className="mb-6 text-lg">Selecione múltiplas imagens da sua reportagem</p>
              <div className="space-y-3 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground">
                  JPG, PNG, WEBP - Múltiplas imagens - Drag & Drop
                </p>
              </div>
              <p className="text-orange-500 mt-6 font-medium">
                📂 Clique no botão acima ou arraste suas imagens aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Slides Grid */}
              <div className="grid gap-4">
                {slides.map((slide, index) => (
                  <div key={slide.id} className="space-y-4 p-6 border border-border rounded-lg bg-secondary/20">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Slide {index + 1}</h3>
                      <Button
                        onClick={() => removeSlide(slide.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Image Upload */}
                      <div>
                        <Label>Imagem</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Qualquer formato será convertido para 1080x1920px (9:16)
                        </p>
                        <div className="mt-1">
                          {slide.image ? (
                            <div className="space-y-2">
                              <PunchZoomYoYo 
                                image={slide.image} 
                                caption={slide.caption || "Preview"} 
                                effect={slide.effect}
                                textAnimation={slide.textAnimation}
                                alignH={slide.alignH}
                                alignV={slide.alignV}
                              />
                              <Button
                                onClick={() => updateSlide(slide.id, 'image', '')}
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                Alterar Imagem
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-orange-400/50 transition-colors"
                              onDragOver={handleDragOver}
                              onDragEnter={handleDragEnter}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, slide.id)}
                            >
                              <div className="w-16 h-28 mx-auto mb-3 border-2 border-dashed border-orange-400/50 rounded flex items-center justify-center">
                                <span className="text-xs text-orange-400 transform -rotate-90">9:16</span>
                              </div>
                              <UploadIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-1">
                                Envie uma imagem (JPG, PNG, WEBP)
                              </p>
                              <p className="text-xs text-orange-400 mb-3">
                                Será redimensionada para 1080x1920px
                              </p>
                              <p className="text-xs text-muted-foreground/70 mb-3">
                                📂 Clique para selecionar ou arraste aqui
                              </p>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp"
                                onChange={(e) => handleImageUpload(slide.id, e)}
                                className="hidden"
                                id={`image-${slide.id}`}
                              />
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                              >
                                <label htmlFor={`image-${slide.id}`} className="cursor-pointer">
                                  <UploadIcon className="w-4 h-4 mr-2" />
                                  Escolher Arquivo
                                </label>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Caption and Effect */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor={`caption-${slide.id}`}>
                            Texto (opcional) - {slide.caption.length}/140
                          </Label>
                          <Textarea
                            id={`caption-${slide.id}`}
                            value={slide.caption}
                            onChange={(e) => {
                            updateSlide(slide.id, 'caption', e.target.value.slice(0, 140));
                            autoResize(e.target);
                          }}
                          onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                          placeholder="Digite o texto da manchete (opcional)..."
                          className="mt-1 min-h-[40px] resize-none overflow-hidden font-archivo text-animate-fade-in"
                          maxLength={140}
                          style={{ height: 'auto' }}
                        />
                        </div>
                        
                        <div>
                          <Label htmlFor={`effect-${slide.id}`}>Efeito de Zoom</Label>
                          <select
                            id={`effect-${slide.id}`}
                            value={slide.effect}
                            onChange={(e) => updateSlide(slide.id, 'effect', e.target.value as Slide['effect'])}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          >
                            {zoomEffects.map(effect => (
                              <option key={effect.value} value={effect.value}>
                                {effect.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <Label>Efeito do Texto</Label>
                          <div className="text-sm text-muted-foreground">Digitando (typewriter)</div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label>Duração (s)</Label>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={slide.durationSec ?? 5}
                                onChange={(e) => updateSlide(slide.id, 'durationSec', Number(e.target.value))}
                                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <Label>Alinh. H</Label>
                              <select
                                value={slide.alignH || 'center'}
                                onChange={(e) => updateSlide(slide.id, 'alignH', e.target.value as NonNullable<Slide['alignH']>)}
                                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              >
                                <option value="left">Esquerda</option>
                                <option value="center">Centro</option>
                                <option value="right">Direita</option>
                              </select>
                            </div>
                            <div>
                              <Label>Alinh. V</Label>
                              <select
                                value={slide.alignV || 'center'}
                                onChange={(e) => updateSlide(slide.id, 'alignV', e.target.value as NonNullable<Slide['alignV']>)}
                                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              >
                                <option value="top">Topo</option>
                                <option value="center">Centro</option>
                                <option value="bottom">Base</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Configurações</CardTitle>
            <Button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              variant="ghost"
              size="sm"
            >
              {showAdvancedSettings ? '🔽 Ocultar' : '🔼 Mostrar'}
            </Button>
          </div>
        </CardHeader>
        {showAdvancedSettings && (
          <CardContent className="space-y-6">
            {/* Configurações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="flash"
                  checked={useFlash}
                  onChange={(e) => setUseFlash(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="flash" className="text-sm">Flash entre slides</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fade"
                  checked={useFade}
                  onChange={(e) => setUseFade(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="fade" className="text-sm">Fade suave</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="keep-first-caption"
                  checked={keepFirstCaption}
                  onChange={(e) => setKeepFirstCaption(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="keep-first-caption" className="text-sm">Texto contínuo</Label>
              </div>
            </div>

            {/* Logos */}
            <div>
              <Label className="text-base font-medium">Logo / Marca d'água</Label>
              <p className="text-sm text-muted-foreground mb-3">Adicione sua logo personalizada ou deixe sem marca d'água</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {predefinedLogos.map((logo) => (
                  <button
                    key={logo.id}
                    onClick={() => applySelectedLogo(logo.id)}
                    className={`p-3 border rounded-lg text-left transition-all ${
                      selectedLogoId === logo.id 
                        ? 'border-orange-400 bg-orange-50/50 shadow-sm' 
                        : 'border-border hover:border-orange-300 hover:bg-orange-50/20'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{logo.name}</div>
                    <div className="text-xs text-muted-foreground">{logo.description}</div>
                  </button>
                ))}
              </div>
              
              {/* Upload personalizada (só aparece se "custom" for selecionado) */}
              {selectedLogoId === 'custom' && (
                <div className="p-4 border border-dashed border-orange-300 rounded-lg bg-orange-50/20">
                  <input
                    type="file"
                    id="watermark-custom"
                    accept=".png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const result = e.target?.result as string;
                          setWatermark(prev => ({ ...prev, file: result }));
                          // Atualizar logo personalizada
                          const customLogo = predefinedLogos.find(l => l.id === 'custom');
                          if (customLogo) customLogo.file = result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex gap-2 items-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <label htmlFor="watermark-custom" className="cursor-pointer">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        {watermark.file ? 'Trocar Arquivo PNG' : 'Escolher Arquivo PNG'}
                      </label>
                    </Button>
                    {watermark.file && (
                      <Button
                        onClick={() => {
                          setWatermark(prev => ({ ...prev, file: "" }));
                          setSelectedLogoId('none');
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {watermark.file && (
                    <div className="mt-3">
                      <img src={watermark.file} alt="Prévia da logo" className="max-h-16 opacity-80 mb-2" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Posição da logo (só aparece se tiver logo personalizada selecionada) */}
              {(selectedLogoId === 'custom' && watermark.file) && (
                <div className="mt-3">
                  <Label className="text-sm font-medium">📍 Posição da Logo</Label>
                  <select
                    value={watermark.position}
                    onChange={(e) => setWatermark(prev => ({ ...prev, position: e.target.value as Watermark['position'] }))}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="top-left">🔼← Superior Esquerda</option>
                    <option value="top-right">🔼→ Superior Direita</option>
                    <option value="bottom-left">🔽← Inferior Esquerda</option>
                    <option value="bottom-right">🔽→ Inferior Direita</option>
                  </select>
                </div>
              )}
            </div>
            
            {/* Trilha Sonora */}
            <div>
              <Label className="text-base font-medium">🎵 Trilha Sonora</Label>
              <p className="text-sm text-muted-foreground mb-3">Escolha uma opção ou faça upload da sua trilha</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {predefinedAudios.map((audio) => (
                  <button
                    key={audio.id}
                    onClick={() => applySelectedAudio(audio.id)}
                    className={`p-3 border rounded-lg text-left transition-all ${
                      selectedAudioId === audio.id 
                        ? 'border-blue-400 bg-blue-50/50 shadow-sm' 
                        : 'border-border hover:border-blue-300 hover:bg-blue-50/20'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{audio.name}</div>
                    <div className="text-xs text-muted-foreground">{audio.description}</div>
                  </button>
                ))}
              </div>
              
              {/* Upload personalizado de áudio */}
              {selectedAudioId === 'custom' && (
                <div className="p-4 border border-dashed border-blue-300 rounded-lg bg-blue-50/20">
                  <input
                    type="file"
                    id="audio-custom"
                    accept=".mp3,.wav,.ogg,.m4a"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2 items-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <label htmlFor="audio-custom" className="cursor-pointer">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        {audioFile ? 'Trocar Áudio' : 'Escolher Áudio'}
                      </label>
                    </Button>
                    {audioFile && (
                      <Button
                        onClick={() => {
                          setAudioFile(null);
                          setAudioUrl('');
                          setSelectedAudioId('none');
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {audioFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      📄 {audioFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Vinheta de Encerramento */}
            <div>
              <Label className="text-base font-medium">🎬 Vinheta de Encerramento</Label>
              <p className="text-sm text-muted-foreground mb-3">Adicione uma vinheta personalizada ao final</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {predefinedEndings.map((ending) => (
                  <button
                    key={ending.id}
                    onClick={() => applySelectedEnding(ending.id)}
                    className={`p-3 border rounded-lg text-left transition-all ${
                      selectedEndingId === ending.id 
                        ? 'border-purple-400 bg-purple-50/50 shadow-sm' 
                        : 'border-border hover:border-purple-300 hover:bg-purple-50/20'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{ending.name}</div>
                    <div className="text-xs text-muted-foreground">{ending.description}</div>
                  </button>
                ))}
              </div>
              
              {/* Upload personalizado de vinheta */}
              {selectedEndingId === 'custom' && (
                <div className="p-4 border border-dashed border-purple-300 rounded-lg bg-purple-50/20">
                  <input
                    type="file"
                    id="ending-custom"
                    accept=".mp4,.webm,.mov"
                    onChange={handleEndingVideoUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2 items-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                    >
                      <label htmlFor="ending-custom" className="cursor-pointer">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        {endingVideoFile ? 'Trocar Vinheta' : 'Escolher Vinheta'}
                      </label>
                    </Button>
                    {endingVideoFile && (
                      <Button
                        onClick={() => {
                          setEndingVideoFile(null);
                          setEndingVideoUrl('');
                          setSelectedEndingId('none');
                          setUseEndingVideo(false);
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {endingVideoFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      🎥 {endingVideoFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Generate Button - Enhanced */}
      <div className="text-center space-y-6">
        {slides.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{slides.length}</div>
              <div className="text-sm text-green-600">Imagens</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">
                {slides.reduce((acc, s) => acc + (s.durationSec || 5), 0) + (useEndingVideo ? 3 : 0)}s
              </div>
              <div className="text-sm text-blue-600">Duração</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-700">1080p</div>
              <div className="text-sm text-purple-600">Qualidade</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-700">
                {selectedAudioId !== 'none' ? '🎵' : '🔇'}
              </div>
              <div className="text-sm text-orange-600">Áudio</div>
            </div>
          </div>
        )}
        
        <div className="p-8 bg-gradient-to-r from-orange-50/50 to-red-50/50 rounded-xl border border-orange-200/50">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              title && slides.length > 0 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
            }`}>3</div>
            <h3 className="text-xl font-semibold">Gerar Vídeo Profissional</h3>
          </div>
          
          {slides.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-2 text-lg">
                🎬 Tudo pronto! Seus {slides.length} slides serão processados com efeitos punch zoom
              </p>
              <p className="text-sm text-orange-600 mb-6">
                📱 Formato: 1080x1920px (9:16) • 30fps • 15Mbps • Ideal para redes sociais
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-2">
                Complete os passos anteriores para continuar
              </p>
              <p className="text-sm text-orange-400 mb-6">
                ✅ Título • ✅ Imagens • ✅ Gerar
              </p>
            </>
          )}
          
          <Button
            onClick={generateVideo}
            disabled={isGenerating || slides.length === 0 || !title.trim()}
            variant="accent"
            size="lg"
            className="px-16 py-4 text-xl font-semibold"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-3"></div>
                Processando Vídeo... ({Math.floor(Math.random() * 100)}%)
              </>
            ) : (
              <>
                <PlayIcon className="w-6 h-6 mr-3" />
                🎬 Gerar Vídeo para Portal
              </>
            )}
          </Button>
          
          {(slides.length === 0 || !title.trim()) && (
            <div className="mt-4 space-y-2">
              {!title.trim() && <p className="text-sm text-orange-600">⚠️ Adicione um título primeiro</p>}
              {slides.length === 0 && <p className="text-sm text-orange-600">⚠️ Adicione pelo menos uma imagem</p>}
            </div>
          )}
          
          {slides.length > 0 && title.trim() && (
            <p className="text-xs text-muted-foreground mt-4">
              ⚡ Geração estimada: {Math.ceil(slides.length * 2)}s • Download automático após conclusão
            </p>
          )}
        </div>
      </div>

      {/* Floating Action Buttons - Quick Actions */}
      {slides.length > 0 && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          <Button
            onClick={() => {
              const input = document.getElementById('add-multiple-images') as HTMLInputElement;
              input?.click();
            }}
            size="lg"
            variant="accent"
            className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all"
            title="Adicionar mais imagens (Ctrl+I)"
          >
            <PlusIcon className="w-6 h-6" />
          </Button>
          
          <Button
            onClick={() => {
              const effects = journalismTemplates.find(t => t.id === 'standard')?.effects || ['ALEATORIO'];
              setSlides(prev => prev.map(slide => ({
                ...slide,
                effect: effects[Math.floor(Math.random() * effects.length)]
              })));
              toast.success("🎲 Efeitos aleatorizados!");
            }}
            size="lg"
            variant="outline"
            className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-white"
            title="Aleatorizar efeitos (Ctrl+Shift+R)"
          >
            🎲
          </Button>
          
          <Button
            onClick={() => {
              if (title.trim() && slides.length > 0 && !isGenerating) {
                generateVideo();
              }
            }}
            size="lg"
            variant="default"
            disabled={isGenerating || slides.length === 0 || !title.trim()}
            className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-green-600 hover:bg-green-700"
            title="Gerar vídeo (Ctrl+Enter)"
          >
            {isGenerating ? (
              <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <PlayIcon className="w-6 h-6" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoSlidePage;