import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PlusIcon, TrashIcon, UploadIcon, PlayIcon, PauseIcon, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { toast } from "sonner";
import PunchZoomYoYo from "@/components/PunchZoomYoYo";
import { v4 as uuidv4 } from "uuid";

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
  const [watermark, setWatermark] = useState<Watermark>({ file: "/logo-r10-piaui.png", position: "bottom-right" });
  const [vinheteUrl, setVinheteUrl] = useState<string>("");
  const [useFlash, setUseFlash] = useState(false);
  const [useFade, setUseFade] = useState(false);
  const [keepFirstCaption, setKeepFirstCaption] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(true);
  // Área protegida
  const [protectedUnlocked, setProtectedUnlocked] = useState<boolean>(()=>{
    try { return localStorage.getItem('r10-protected') === '1'; } catch { return false; }
  });
  const [protectedInput, setProtectedInput] = useState<string>("");
  
  // Estados para trilha sonora e vinheta
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [endingVideoFile, setEndingVideoFile] = useState<File | null>(null);
  const [endingVideoUrl, setEndingVideoUrl] = useState<string>("");
  const [useEndingVideo, setUseEndingVideo] = useState(false);

  // Estados para controle de seleção
  const [selectedLogoId, setSelectedLogoId] = useState('none');
  const [selectedAudioId, setSelectedAudioId] = useState('none');
  const [selectedEndingId, setSelectedEndingId] = useState('none');
  
  // Estados para controle de prévia de áudio
  const [currentPreviewAudio, setCurrentPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<string | null>(null);
  // UI: miniaturas compactas
  const [compactView, setCompactView] = useState<boolean>(true);
  const [bulkEffectValue, setBulkEffectValue] = useState<string>('ALEATORIO');
  const [bulkTextValue, setBulkTextValue] = useState<string>('');

  // Carregar configurações permanentes do localStorage
  useEffect(() => {
  const savedWatermark = localStorage.getItem('r10-watermark');
  const savedVinhete = localStorage.getItem('r10-vinhete');
  // Sempre usar a marca d'água oficial do portal, ignorando customizações
  const officialWatermark = '/logo-r10-piaui.png';
  if (!protectedUnlocked) {
    setWatermark(prev => ({ ...prev, file: officialWatermark }));
    try { localStorage.setItem('r10-watermark', officialWatermark); } catch {}
  } else if (savedWatermark) {
    setWatermark(prev => ({ ...prev, file: savedWatermark }));
  }
    
    if (savedVinhete) {
      setVinheteUrl(savedVinhete);
      setUseEndingVideo(true);
    }
  }, []);

  // Handlers para configurações permanentes
  const handleWatermarkChange = (file: string) => {
    setWatermark(prev => ({ ...prev, file }));
    try { localStorage.setItem('r10-watermark', file); } catch {}
  };

  const handleVinheteChange = (file: string) => {
    setVinheteUrl(file);
    setUseEndingVideo(!!file);
  };

  // Função para controlar prévia de áudio
  const toggleAudioPreview = (audioFile: string, audioId: string) => {
    // Parar áudio atual se estiver tocando
    if (currentPreviewAudio) {
      currentPreviewAudio.pause();
      currentPreviewAudio.currentTime = 0;
    }

    // Se é o mesmo áudio que está tocando, apenas pausar
    if (isPreviewPlaying === audioId) {
      setIsPreviewPlaying(null);
      setCurrentPreviewAudio(null);
      return;
    }

    // Tocar novo áudio
    if (audioFile) {
      const audio = new Audio(audioFile);
      audio.volume = 0.3; // Volume mais baixo para prévia
      audio.currentTime = 0;
      
      audio.addEventListener('ended', () => {
        setIsPreviewPlaying(null);
        setCurrentPreviewAudio(null);
      });

      audio.addEventListener('error', () => {
        toast.error('Erro ao carregar trilha sonora');
        setIsPreviewPlaying(null);
        setCurrentPreviewAudio(null);
      });

      audio.play().then(() => {
        setCurrentPreviewAudio(audio);
        setIsPreviewPlaying(audioId);
        
        // Parar prévia após 10 segundos
        setTimeout(() => {
          if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
            setIsPreviewPlaying(null);
            setCurrentPreviewAudio(null);
          }
        }, 10000);
        
      }).catch(() => {
        toast.error('Erro ao reproduzir trilha sonora');
      });
    }
  };

  // Limpar áudio quando componente desmonta
  useEffect(() => {
    return () => {
      if (currentPreviewAudio) {
        currentPreviewAudio.pause();
        currentPreviewAudio.currentTime = 0;
      }
    };
  }, [currentPreviewAudio]);

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
      id: 'trilha1', 
      name: '🎵 Trilha R10 - Slide 1', 
      file: '/TRILHA R10 SLIDE (1).mp3', 
      description: 'Trilha oficial R10 STUDIO - Versão 1' 
    },
    { 
      id: 'trilha2', 
      name: '🎶 Trilha R10 - Slide 2', 
      file: '/TRILHA R10 SLIDE (2).mp3', 
      description: 'Trilha oficial R10 STUDIO - Versão 2' 
    },
    { 
      id: 'trilha3', 
      name: '🎼 Trilha R10 - Slide 3', 
      file: '/TRILHA R10 SLIDE (3).mp3', 
      description: 'Trilha oficial R10 STUDIO - Versão 3' 
    },
    { 
      id: 'custom', 
      name: '📤 Upload Personalizada', 
      file: '', 
      description: 'Sua trilha personalizada' 
    }
  ];

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
    if (!endingVideoUrl) {
      toast.error("Envie a vinheta final (vídeo) na Área Protegida antes de gerar");
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
  const stream = canvas.captureStream(FRAME_RATE);
  const videoTrack = (stream.getVideoTracks()[0] as any);
  const requestFrameIfSupported = () => {
        try { if (videoTrack && typeof videoTrack.requestFrame === 'function') videoTrack.requestFrame(); } catch {}
      };
  // Utilitário de espera
  const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
      
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
        videoBitsPerSecond: 15000000 // Aumentado de 12M para 15M para máxima qualidade
      });      const chunks: BlobPart[] = [];
      
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

        // Limpeza de recursos
        try {
          if (currentPreviewAudio) {
            currentPreviewAudio.pause();
          }
        } catch {}
        setIsGenerating(false);
      };
      
      // Iniciar gravação
      mediaRecorder.start();
      
      // Iniciar áudio sincronizado se houver (antes da renderização)
      if (audioElement && audioContext) {
        try {
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          await audioElement.play();
        } catch (error) {
          console.warn('Erro ao iniciar áudio:', error);
        }
      }
      
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

      // Pré-carregar vinheta (apenas vídeo)
      let vinheteVideo: HTMLVideoElement | null = null;
      const finalVinheteUrl = endingVideoUrl;
      if (finalVinheteUrl) {
        vinheteVideo = document.createElement('video');
        vinheteVideo.src = finalVinheteUrl;
        vinheteVideo.muted = true;
        vinheteVideo.loop = false;
        try {
          await new Promise<void>((res) => {
            if (!vinheteVideo) return res();
            vinheteVideo.oncanplay = () => res();
            vinheteVideo.onerror = () => res();
            vinheteVideo.load();
          });
        } catch (e) {
          console.warn('Falha ao carregar vinheta de vídeo:', e);
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

  for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const durationSecInput = slide.durationSec || 5;
        const captionText = keepFirstCaption ? (slides[0]?.caption || '') : (slide.caption || '');
        const img = preloadedImages[i];
        
  console.log(`🎬 Renderizando slide ${i + 1}/${slides.length} - Duração alvo: ${durationSecInput}s`);
        
  // Efeito com timing preciso
  const { durationMs, steps } = getEffectSpec(slide.effect || 'ALEATORIO');
        
  // totalFrames é definido após o cálculo de durationMsEffective
        
  // Pré-calcular quebra de linhas (performance) - FONTE MAIOR
        let textLines: string[] = [];
        let totalCharsAll = 0;
        if (captionText) {
          const SAFE_MARGIN = 50; // margem de segurança em cada lado
          const baseFont = 48;
          const fontSizePX = Math.round(baseFont * 1.2); // +20%
          const padXPre = 20; // padding do retângulo vermelho
          ctx.font = `800 ${fontSizePX}px Poppins, Arial, sans-serif`;
          // largura máxima para o texto (área útil do retângulo alinhado à margem direita)
          const maxW = canvas.width - (SAFE_MARGIN * 2) - (padXPre * 2);

          // Wrap robusto: preserva espaços e quebra palavras muito longas por caracteres
          const tokens = captionText.split(/(\s+)/);
          let current = '';
          const isWhitespace = (s: string) => /^\s+$/.test(s);
          for (const t of tokens) {
            const candidate = current + t;
            const width = ctx.measureText(candidate).width;
            if (width <= maxW) {
              current = candidate;
              continue;
            }
            // Se estourou e já temos algo na linha, envia a linha atual e reavalia o token
            if (current.length > 0) {
              textLines.push(current);
              current = '';
              // Reprocessar o mesmo token agora com linha vazia
              if (isWhitespace(t)) {
                // espaço líder pode ser descartado
                continue;
              }
            }
            // Se a palavra sozinha já não cabe, quebrar por caracteres
            if (!isWhitespace(t)) {
              let chunk = '';
              for (const ch of t) {
                const testChunk = chunk + ch;
                if (ctx.measureText(testChunk).width <= maxW) {
                  chunk = testChunk;
                } else {
                  if (chunk.length > 0) textLines.push(chunk);
                  chunk = ch; // começa próximo pedaço
                }
              }
              // o que sobrou vira início de próxima linha
              current = chunk;
            }
          }
          if (current.length > 0) textLines.push(current);
          totalCharsAll = textLines.reduce((acc, line) => acc + line.length, 0);
        }

  // Protocolo de garantia: tempos mínimos para animações
  const BAR_DURATION_MS = 900; // animação suave da barra (~0.9s)
  const POST_HOLD_MS = 600; // pequena pausa após texto completo
  // Duração do typewriter baseada no número de caracteres (suave, consistente)
  const CHAR_TIME_MS = 35; // ~28 chars/seg
  const computedTypewriterMs = Math.max(800, Math.round(totalCharsAll * CHAR_TIME_MS));
  const TYPEWRITER_DURATION_MS = computedTypewriterMs;

  // Slide deve durar pelo menos: barra + texto + hold final
  const minRequiredMs = BAR_DURATION_MS + TYPEWRITER_DURATION_MS + POST_HOLD_MS;
  const durationMsEffective = Math.max(durationSecInput * 1000, minRequiredMs);
  const totalFrames = Math.max(1, Math.round(durationMsEffective / FRAME_MS));
  console.log(`📽️ Slide ${i + 1}: ${totalFrames} frames (${(durationMsEffective/1000).toFixed(2)}s a ${FRAME_RATE}fps)`);

        const slideStart = Date.now();
        for (let frame = 0; frame < totalFrames; frame++) {
          // Timing: baseado em tempo real e alvo de 30fps
          const targetMs = frame * FRAME_MS;
          const elapsedMs = Math.max(0, Date.now() - slideStart);
          
          // Limpar canvas
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // CORRIGIDO: PUNCH ZOOM = CORTES SECOS E BRUSCOS (não interpolação!)
          let scale = 1.0;
          for (let s = 0; s < steps.length; s++) {
            if (elapsedMs >= steps[s].atMs) {
              scale = steps[s].scale; // CORTE SECO BRUSCO - muda instantaneamente
            }
          }
          
          // Desenhar imagem com zoom ANIMADO (garantir cobertura total, sem bordas pretas)
          const imgAspect = img.width / img.height;
          const canvasAspect = canvas.width / canvas.height;
          
          // scale mínimo necessário para cobrir o canvas inteiro (cover)
          const coverScale = imgAspect > canvasAspect
            ? canvas.height / (canvas.height * 1) // base pela altura
            : canvas.width / (canvas.width * 1);   // base pela largura
          const safeScale = Math.max(scale, 1.0); // nunca menor que 1x
          const finalScale = Math.max(safeScale, coverScale); // evita áreas pretas

          let drawW, drawH;
          if (imgAspect > canvasAspect) {
            // Imagem mais larga: ajustar pela altura
            drawH = canvas.height * finalScale;
            drawW = drawH * imgAspect;
          } else {
            // Imagem mais alta: ajustar pela largura
            drawW = canvas.width * finalScale;
            drawH = drawW / imgAspect;
          }
          
          // Alinhamento corrigido
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
          
          // CORRIGIDO: Fade entre slides
          if (useFade && i > 0 && frame < 15) { // 15 frames = 0.5s de fade
            const prevImg = preloadedImages[i - 1];
            const fadeAlpha = (15 - frame) / 15; // De 1.0 a 0.0
            ctx.globalAlpha = fadeAlpha;
            
            // Mesmo cálculo de escala para imagem anterior (sem zoom)
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

          // CORRIGIDO: Flash nos primeiros frames
          if (useFlash && frame < 5) { // 5 frames = flash mais visível
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 0.7 - (frame * 0.14); // Fade out mais suave
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
          }
          
          // CORRIGIDO: Linha amarela antes do texto + texto com typewriter (cores da referência)
          if (textLines.length > 0) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            // Configurações baseadas em fonte (+20%)
            const SAFE_MARGIN = 50;
            const fontSize = Math.round(48 * 1.2);
            ctx.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Alinhamentos: barra mais à esquerda que o texto
            const textLeft = SAFE_MARGIN;
            const barLeft = SAFE_MARGIN; // respeita margem de segurança
            const maxRectWidthGlobal = (canvas.width - SAFE_MARGIN) - textLeft;

            const padX = 20;
            const padY = Math.round(fontSize * 0.25); // altura do bloco acompanha o tamanho da fonte
            const rectHeight = fontSize + padY * 2;
            const lineGap = Math.max(8, Math.round(fontSize * 0.1)); // separação mínima entre blocos
            const lineHeight = rectHeight + lineGap;

            const totalH = textLines.length * lineHeight;
            // Subir conjunto (barra + texto) aproximadamente 270px
            let y = canvas.height - (200 + 270) - totalH; // topo do bloco de texto mais alto

            // Corrigir Y mínimo para não colar demais no topo em casos com muitas linhas
            const minTopSafe = 120;
            if (y < minTopSafe) y = minTopSafe;

            // 1) Linha amarela animada (antes do texto)
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            const preLineDurationMs = BAR_DURATION_MS; // barra com easing e mais longa
            const preLineProgress = easeOutCubic(Math.min(1, elapsedMs / preLineDurationMs));
            const yellowWidthTarget = Math.min(100, maxRectWidthGlobal); // largura fixa (limitada pela margem)
            const yellowWidth = Math.max(0, Math.floor(yellowWidthTarget * preLineProgress));
            const yellowHeight = 15; // altura fixa 15px
            // Subir a barra amarela ~20px acima do que estava
            const yellowY = y - Math.round(fontSize * 0.5) - 20; // acima do texto proporcional + 20px
            if (yellowWidth > 0) {
              ctx.fillStyle = '#eebe32';
              ctx.fillRect(barLeft, yellowY, yellowWidth, yellowHeight);
            }

            // 2) Texto (typewriter) inicia após a linha completar
            const typewriterStartDelayMs = preLineDurationMs; // texto só aparece após a barra
            const elapsedForText = Math.max(0, elapsedMs - typewriterStartDelayMs);
            const typewriterDurationMs = TYPEWRITER_DURATION_MS;
            // Contagem discreta: 1 caractere a cada CHAR_TIME_MS (mais estável visualmente)
            const totalCharsToShow = Math.min(
              totalCharsAll,
              Math.floor(elapsedForText / CHAR_TIME_MS)
            );
            let remaining = totalCharsToShow;

            for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
              const line = textLines[lineIndex];
              if (remaining <= 0) break; // nada mais a mostrar
              const showForLine = Math.min(line.length, remaining);
              const renderText = line.slice(0, showForLine);
              remaining -= showForLine;

              if (renderText.length > 0) {
                // Como a linha já foi pré-quebrada para caber, basta medir e desenhar
                const textWidth = ctx.measureText(renderText).width;
                const rectWidth = Math.min(textWidth + padX * 2, maxRectWidthGlobal);
                if (rectWidth > 0) {
                  ctx.fillStyle = '#cb403a';
                  ctx.fillRect(textLeft, y - padY, rectWidth, rectHeight);
                  ctx.fillStyle = '#ffffff';
                  ctx.fillText(renderText, textLeft + padX, y - padY + rectHeight / 2);
                }
              }
              y += lineHeight;
            }
      ctx.restore();
          }

          // CORRIGIDO: Marca d'água NO TOPO DIREITO (não embaixo) e mais visível
          if (watermarkImg) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const wmTargetWidth = 220; // maior para visibilidade conforme referência
            const ratio = watermarkImg.width / watermarkImg.height;
            const wmW = wmTargetWidth;
            const wmH = Math.round(wmTargetWidth / ratio);

            // Posição: 100px das bordas (40 + 60 solicitados)
            const x = canvas.width - wmW - 100; // mais ao meio
            const y = 100; // mais abaixo
            
            ctx.globalAlpha = 0.3; // transparência suave (~30%)
            ctx.drawImage(watermarkImg, x, y, wmW, wmH);
            ctx.globalAlpha = 1.0;
            ctx.restore();
          }
          
          // Sinalizar frame ao track (quando suportado) para capturar frame
          requestFrameIfSupported();
          // Pacing para 30fps
          const now = Date.now() - slideStart;
          const delay = Math.max(0, targetMs - now);
          if (delay > 0) await sleep(delay);
        }
      }
      
      // Calcular duração total do vídeo (para referência)
      const totalVideoMs = slides.reduce((acc, slide) => acc + (slide.durationSec || 5) * 1000, 0);
      // Duração da vinheta: usar a duração do vídeo enviado
      let endingDurationMs = 0;
      if (useEndingVideo && endingVideoUrl && vinheteVideo && !isNaN(vinheteVideo.duration) && vinheteVideo.duration > 0) {
        endingDurationMs = Math.round(vinheteVideo.duration * 1000);
      }
      const finalDurationMs = totalVideoMs + endingDurationMs;
      
      // Renderizar vinheta permanente se configurada
      if ((vinheteVideo) && endingDurationMs > 0) {
        const vinheteFrames = Math.round((endingDurationMs / 1000) * FRAME_RATE);
        vinheteVideo.currentTime = 0;
        try { await vinheteVideo.play(); } catch {}
        
  const vinheteStart = Date.now();
  for (let frame = 0; frame < vinheteFrames; frame++) {
          // Limpar canvas
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          if (vinheteVideo) {
            // Renderizar frame atual do vídeo da vinheta
            const vinheteAspect = vinheteVideo.videoWidth / vinheteVideo.videoHeight;
            const canvasAspect = canvas.width / canvas.height;
            
            let drawW, drawH, dx, dy;
            if (vinheteAspect > canvasAspect) {
              drawH = canvas.height;
              drawW = drawH * vinheteAspect;
              dx = (canvas.width - drawW) / 2;
              dy = 0;
            } else {
              drawW = canvas.width;
              drawH = drawW / vinheteAspect;
              dx = 0;
              dy = (canvas.height - drawH) / 2;
            }
            
            ctx.drawImage(vinheteVideo, dx, dy, drawW, drawH);
            // Avançar o vídeo para o próximo frame baseado no tempo
            const frameTime = (frame / FRAME_RATE);
            vinheteVideo.currentTime = Math.min(vinheteVideo.duration, frameTime);
          }
          
          // Adicionar watermark também na vinheta
          if (watermarkImg) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const wmTargetWidth = 220;
            const ratio = watermarkImg.width / watermarkImg.height;
            const wmW = wmTargetWidth;
            const wmH = Math.round(wmTargetWidth / ratio);
            const x = canvas.width - wmW - 100; // 100px da direita (40+60)
            const y = 100; // 100px do topo (40+60)
            ctx.globalAlpha = 0.3;
            ctx.drawImage(watermarkImg, x, y, wmW, wmH);
            ctx.globalAlpha = 1.0;
            ctx.restore();
          }

          requestFrameIfSupported();
          const now = Date.now() - vinheteStart;
          const targetMs = frame * FRAME_MS;
          const delay = Math.max(0, targetMs - now);
          if (delay > 0) await sleep(delay);
        }
        
        // Parar vídeo da vinheta se estava rodando
        if (vinheteVideo) {
          vinheteVideo.pause();
          vinheteVideo.currentTime = 0;
        }
      }
      
      const endTime = performance.now();
      console.log(`Renderização concluída em ${Math.round(endTime - startTime)}ms`);
      
      // Parar gravação imediatamente após o fim do render
      try {
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        if (audioContext) {
          await audioContext.close();
        }
      } catch {}
      mediaRecorder.stop();
      
    } catch (error) {
      console.error('Erro ao gerar vídeo:', error);
      toast.error("Falha ao gerar vídeo", { id: "generating" });
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      {/* Header com Logo R10 STUDIO */}
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <img src="/r10studio.png" alt="R10 STUDIO" className="h-24 object-contain" />
        </div>
        <div className="flex justify-center">
        {/* Settings de watermark/vinheta não exibidos no editor para manter fluxo limpo */}
        </div>
      </div>

      {/* Título (compacto) */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input
              value={title}
              onChange={(e)=>setTitle(e.target.value)}
              placeholder="Opcional"
              className="h-8 text-sm max-w-md"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                slides.length > 0 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
              }`}>2</div>
              Imagens da Reportagem ({slides.length}/20)
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Selecione múltiplas imagens de uma vez</p>
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
          {/* Toolbar: modo compacto, aplicar efeito/texto para todos */}
          {slides.length > 0 && (
            <div className="sticky top-2 z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-3 p-3 border rounded-md bg-secondary/50 backdrop-blur">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="compact-view"
                  checked={compactView}
                  onChange={(e) => setCompactView(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="compact-view" className="text-sm">Modo compacto (miniaturas menores)</Label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="all-effect-select"
                  value={bulkEffectValue}
                  onChange={(e)=>setBulkEffectValue(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {zoomEffects.map(effect => (
                    <option key={effect.value} value={effect.value}>{effect.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!bulkEffectValue) return;
                    setSlides(prev => prev.map(s => ({ ...s, effect: bulkEffectValue as Slide['effect'] })));
                    toast.success('Efeito aplicado a todos os slides');
                  }}
                >Aplicar efeito a todos</Button>
                <input
                  value={bulkTextValue}
                  onChange={(e)=>setBulkTextValue(e.target.value)}
                  placeholder="Texto para todos os slides"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm w-64"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={()=>{
                    setSlides(prev=>prev.map(s=>({ ...s, caption: bulkTextValue })));
                    toast.success('Texto aplicado a todos os slides');
                  }}
                >Aplicar texto a todos</Button>
              </div>
            </div>
          )}
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
              {/* Slides Grid - compacto, em colunas responsivas */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {slides.map((slide, index) => (
                  <div key={slide.id} className="space-y-3 p-3 border border-border rounded-lg bg-secondary/20">
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

                    <div className="grid grid-cols-1 gap-3">
                      {/* Image Upload */}
                      <div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={(e) => handleImageUpload(slide.id, e)}
                          id={`image-${slide.id}`}
                          className="hidden"
                        />
                        <div className="mt-1 space-y-2">
                          {slide.image ? (
                            <>
                              {compactView ? (
                                <img
                                  src={slide.image}
                                  alt={`Slide ${index + 1}`}
                                  className="w-full max-h-48 object-contain rounded border bg-white"
                                />
                              ) : (
                                <PunchZoomYoYo
                                  image={slide.image}
                                  caption={slide.caption || "Preview"}
                                  effect={slide.effect}
                                  textAnimation={slide.textAnimation}
                                  alignH={slide.alignH}
                                  alignV={slide.alignV}
                                />
                              )}
                              <div>
                                <Button asChild variant="outline" size="sm">
                                  <label htmlFor={`image-${slide.id}`} className="cursor-pointer">
                                    <UploadIcon className="w-4 h-4 mr-2" />
                                    Trocar imagem
                                  </label>
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button asChild variant="outline" size="sm">
                              <label htmlFor={`image-${slide.id}`} className="cursor-pointer">
                                <UploadIcon className="w-4 h-4 mr-2" />
                                Escolher Arquivo
                              </label>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Caption e controles */}
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`caption-${slide.id}`} className="text-xs">Texto (opcional)</Label>
                          <Textarea
                            id={`caption-${slide.id}`}
                            value={slide.caption}
                            onChange={(e) => {
                              updateSlide(slide.id, 'caption', e.target.value.slice(0, 140));
                              autoResize(e.target);
                            }}
                            onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                            placeholder="Digite o texto da manchete (opcional)..."
                            className="mt-1 min-h-[40px] resize-none overflow-hidden font-archivo"
                            maxLength={140}
                            style={{ height: 'auto' }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <Label htmlFor={`effect-${slide.id}`} className="text-xs">Efeito</Label>
                            <select
                              id={`effect-${slide.id}`}
                              value={slide.effect}
                              onChange={(e) => updateSlide(slide.id, 'effect', e.target.value as Slide['effect'])}
                              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                            >
                              {zoomEffects.map(effect => (
                                <option key={effect.value} value={effect.value}>
                                  {effect.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Duração</Label>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={slide.durationSec ?? 5}
                                onChange={(e) => updateSlide(slide.id, 'durationSec', Number(e.target.value))}
                                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">s</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <Label className="text-xs">Alinhamento H</Label>
                            <div className="mt-1 inline-flex rounded-md overflow-hidden border">
                              <button
                                type="button"
                                className={`px-2 py-1 ${ (slide.alignH||'center')==='left' ? 'bg-primary/10' : 'bg-background' }`}
                                title="Esquerda"
                                onClick={()=>updateSlide(slide.id, 'alignH', 'left')}
                              >
                                <AlignLeft className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 ${ (slide.alignH||'center')==='center' ? 'bg-primary/10' : 'bg-background' } border-l`}
                                title="Centro"
                                onClick={()=>updateSlide(slide.id, 'alignH', 'center')}
                              >
                                <AlignCenter className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 ${ (slide.alignH||'center')==='right' ? 'bg-primary/10' : 'bg-background' } border-l`}
                                title="Direita"
                                onClick={()=>updateSlide(slide.id, 'alignH', 'right')}
                              >
                                <AlignRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Alinhamento V</Label>
                            <div className="mt-1 inline-flex rounded-md overflow-hidden border">
                              <button
                                type="button"
                                className={`px-2 py-1 ${ (slide.alignV||'center')==='top' ? 'bg-primary/10' : 'bg-background' }`}
                                title="Topo"
                                onClick={()=>updateSlide(slide.id, 'alignV', 'top')}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 ${ (slide.alignV||'center')==='center' ? 'bg-primary/10' : 'bg-background' } border-l`}
                                title="Centro"
                                onClick={()=>updateSlide(slide.id, 'alignV', 'center')}
                              >
                                <AlignCenter className="w-4 h-4 rotate-90" />
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 ${ (slide.alignV||'center')==='bottom' ? 'bg-primary/10' : 'bg-background' } border-l`}
                                title="Base"
                                onClick={()=>updateSlide(slide.id, 'alignV', 'bottom')}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
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
            {/* Área Protegida */}
            <div className="p-3 border rounded-md">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Área Protegida</Label>
                {!protectedUnlocked ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Senha"
                      type="password"
                      value={protectedInput}
                      onChange={(e)=>setProtectedInput(e.target.value)}
                      className="h-8 text-sm w-32"
                    />
                    <Button
                      size="sm"
                      onClick={()=>{
                        if (protectedInput === '850327') {
                          setProtectedUnlocked(true);
                          try { localStorage.setItem('r10-protected','1'); } catch {}
                          toast.success('Área Protegida desbloqueada');
                        } else {
                          toast.error('Senha incorreta');
                        }
                      }}
                    >Desbloquear</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-sm">✓ Desbloqueada</span>
                    <Button size="sm" variant="ghost" onClick={()=>{
                      setProtectedUnlocked(false);
                      try { localStorage.removeItem('r10-protected'); } catch {}
                    }}>Bloquear</Button>
                  </div>
                )}
              </div>
              {protectedUnlocked && (
                <div className="mt-3 space-y-4">
                  {/* Marca d'água custom */}
                  <div>
                    <Label className="text-xs">Marca d’água (arquivo)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        placeholder="/caminho/para/logo.png"
                        value={watermark.file}
                        onChange={(e)=>handleWatermarkChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Se vazio, usa a oficial do portal.</p>
                  </div>
                  {/* Vinheta Final (upload obrigatório de vídeo) */}
                  <div>
                    <Label className="text-xs">Vinheta Final (vídeo)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="file"
                        id="ending-protected"
                        accept=".mp4,.webm"
                        onChange={handleEndingVideoUpload}
                        className="hidden"
                      />
                      <Button asChild size="sm" variant="outline">
                        <label htmlFor="ending-protected" className="cursor-pointer">
                          <UploadIcon className="w-4 h-4 mr-2" />
                          {endingVideoFile ? 'Trocar vinheta' : 'Enviar vinheta'}
                        </label>
                      </Button>
                      {(endingVideoFile || endingVideoUrl) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={()=>{
                            try {
                              const url = endingVideoUrl;
                              if (url) {
                                localStorage.setItem('r10-vinhete', url);
                                setVinheteUrl(url);
                                setUseEndingVideo(true);
                                toast.success('Vinheta salva como padrão');
                              } else {
                                toast.error('Envie um vídeo de vinheta primeiro');
                              }
                            } catch {}
                          }}
                        >Salvar</Button>
                      )}
                    </div>
                    {(endingVideoFile || endingVideoUrl) && (
                      <p className="text-xs text-muted-foreground mt-1">📄 {endingVideoFile?.name || endingVideoUrl}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
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

            {/* Logo / Marca d'água – oculto por padrão (controle permanente) */}
            
            {/* Trilha Sonora */}
            <div>
              <Label className="text-base font-medium">🎵 Trilha Sonora</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Escolha uma trilha oficial R10 ou faça upload personalizado
                {audioUrl && (
                  <span className="ml-2 text-green-600 font-medium">
                    ✓ Trilha selecionada
                  </span>
                )}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {predefinedAudios.map((audio) => (
                  <div
                    key={audio.id}
                    className={`p-3 border rounded-lg transition-all ${
                      selectedAudioId === audio.id 
                        ? 'border-blue-400 bg-blue-50/50 shadow-sm' 
                        : 'border-border hover:border-blue-300 hover:bg-blue-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => applySelectedAudio(audio.id)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-sm mb-1">{audio.name}</div>
                        <div className="text-xs text-muted-foreground">{audio.description}</div>
                      </button>
                      
                      {/* Botão de prévia apenas para trilhas com arquivo */}
                      {audio.file && (
                        <Button
                          onClick={() => toggleAudioPreview(audio.file, audio.id)}
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-8 w-8 p-0 hover:bg-blue-100"
                          title={isPreviewPlaying === audio.id ? 'Pausar prévia' : 'Ouvir prévia (10s)'}
                        >
                          {isPreviewPlaying === audio.id ? (
                            <PauseIcon className="w-4 h-4 text-blue-600" />
                          ) : (
                            <PlayIcon className="w-4 h-4 text-blue-600" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
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

            {/* Vinheta de Encerramento – upload obrigatório */}
            <div className="pt-2 border-t">
              <Label className="text-base font-medium">🎬 Vinheta Final</Label>
              <p className="text-sm text-muted-foreground mb-3">
                A vinheta final (vídeo) será inserida automaticamente após os slides.
              </p>
              {/* Upload acontece via Área Protegida (acima). */}
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
                {slides.reduce((acc, s) => acc + (s.durationSec || 5), 0)}s
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