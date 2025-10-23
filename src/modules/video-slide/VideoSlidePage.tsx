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
import { extractFromUrlOrText, type ExtractionResult } from "@/utils/contentExtraction";
// R10-FIXPACK-001 - Novo engine de renderização determinístico
// Nota: imports de um engine experimental foram removidos por estarem vazios/não utilizados
// Função para converter Slide local para RenderSlide do engine
// Removido: convertToRenderSlide e mapeamento de efeitos do engine experimental
interface Slide {
  id: string;
  // mídia do slide: imagem (dataURL/URL) ou vídeo (URL)
  mediaType?: 'image' | 'video';
  image?: string;
  video?: string;
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
  const [bulkEffectValue, setBulkEffectValue] = useState<string>('STEP_IN_PRECISION');
  const [bulkTextValue, setBulkTextValue] = useState<string>('');
  const [bulkDurationValue, setBulkDurationValue] = useState<number>(5); // NOVO: duração em lote
  // Extração/segmentação
  const [articleUrl, setArticleUrl] = useState<string>('');
  const [articleText, setArticleText] = useState<string>('');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  // Carregar configurações permanentes do localStorage
  useEffect(() => {
  const savedWatermark = localStorage.getItem('r10-watermark');
  const savedVinhete = localStorage.getItem('r10-vinheta');
  const savedVinheteId = localStorage.getItem('r10-vinheta-id');
  // Carregar vinheta salva
  const savedVinheta = localStorage.getItem('vinhetaVideo');
  if (savedVinheta) {
    console.log('Vinheta carregada automaticamente');
    setEndingVideoUrl(savedVinheta);
    setUseEndingVideo(true);
  }
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
      setEndingVideoUrl(savedVinhete);
      setUseEndingVideo(true);
    }
    if (savedVinheteId) {
      setSelectedEndingId(savedVinheteId);
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
    // Salvar vinheta no localStorage para persistência
    try { localStorage.setItem('r10-vinheta', file); } catch {}
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
      name: 'Logo Personalizada', 
      file: watermark.file, 
      description: 'Upload da sua própria marca d\'água' 
    }
  ];
  // Vinhetas de encerramento pré-cadastradas
  const predefinedEndings = [
    { 
      id: 'custom', 
      name: 'Upload Personalizada', 
      file: '', 
      description: 'Sua vinheta personalizada - OBRIGATÓRIA' 
    }
  ];
  // Trilhas sonoras pré-cadastradas
  const predefinedAudios = [
    { 
      id: 'none', 
      name: 'Sem Áudio', 
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
      name: 'Upload Personalizada', 
      file: '', 
      description: 'Sua trilha personalizada' 
    }
  ];
  // Templates pré-configurados para jornalismo
  const journalismTemplates = [
    {
      id: 'impact',
      name: '⚡ Impact',
      description: 'Step multi-impacto com cortes secos',
      effects: ['STEP_IN_MULTI_IMPACT'],
      useFlash: true,
      useFade: false,
      keepFirstCaption: true,
      duration: 5
    },
    {
      id: 'precision',
  name: 'Precision',
      description: 'Zoom progressivo e preciso',
      effects: ['STEP_IN_PRECISION'],
      useFlash: false,
      useFade: false,
      keepFirstCaption: true,
      duration: 5
    },
    {
      id: 'aggressive',
  name: 'Aggressive In-Out',
      description: 'Vai e volta agressivo',
      effects: ['CUT_IN_OUT_AGGRESSIVE'],
      useFlash: false,
      useFade: false,
      keepFirstCaption: false,
      duration: 5
    },
    {
      id: 'reveal',
      name: '✨ Double Reveal',
      description: 'Dois punches com recuo',
      effects: ['DOUBLE_PUNCH_REVEAL'],
      useFlash: false,
      useFade: false,
      keepFirstCaption: false,
      duration: 5
    },
    {
      id: 'hard4x',
  name: 'Hard In 4x',
      description: 'Punch rápido para 4x',
      effects: ['HARD_IN_4X'],
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
  // Aplicar vinheta selecionada - VINHETA É OBRIGATÓRIA
  const applySelectedEnding = (endingId: string) => {
    setSelectedEndingId(endingId);
    const selectedEnding = predefinedEndings.find(ending => ending.id === endingId);
    if (selectedEnding) {
      if (selectedEnding.file) {
        setEndingVideoUrl(selectedEnding.file);
        setEndingVideoFile(null); // Limpar arquivo custom se houver
        setUseEndingVideo(true);
        // Salvar vinheta selecionada no localStorage para persistência
        try { localStorage.setItem('r10-vinheta', selectedEnding.file); } catch {}
        try { localStorage.setItem('r10-vinheta-id', endingId); } catch {}
      } else {
        // Para opção 'custom', manter estado atual mas exigir upload
        setUseEndingVideo(true);
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
      try {
        // Criar URL do vídeo
        setEndingVideoFile(file);
        const url = URL.createObjectURL(file);
        setEndingVideoUrl(url);
        setSelectedEndingId('custom');
        setUseEndingVideo(true);
        // Salvar URLs no localStorage (não o arquivo inteiro)
        try { localStorage.setItem('r10-vinheta', url); } catch {}
        try { localStorage.setItem('r10-vinheta-id', 'custom'); } catch {}
        console.log('✅ Vinheta carregada com sucesso!');
        toast.success('Vinheta personalizada carregada!');
      } catch (error) {
        console.error('Erro ao carregar vinheta:', error);
        toast.error('Erro ao carregar vinheta. Tente um arquivo menor.');
      }
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
  // Efeitos permitidos (nomes técnicos)
  const zoomEffects = [
    { value: "STEP_IN_MULTI_IMPACT", label: "Step Zoom In · Multi-Impact" }, // antigo DENÚNCIA IMPACTO
    { value: "STEP_IN_PRECISION", label: "Step Zoom In · Precision" },      // antigo EXCLUSIVA
    { value: "CUT_IN_OUT_AGGRESSIVE", label: "Cut Zoom In-Out · Aggressive" }, // antigo confronto
    { value: "DOUBLE_PUNCH_REVEAL", label: "Double Punch Reveal" },         // antigo revelação
    { value: "HARD_IN_4X", label: "Hard Zoom In · 4x" }                     // antigo zoom 4x
  ];
  // Único efeito de texto: typewriter (digitando)
  const addSlide = () => {
    setSlides(prev => [
      ...prev,
      {
        id: uuidv4(),
        mediaType: 'image',
        image: "",
        caption: "",
        effect: "STEP_IN_PRECISION",
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
  // NOVO: Função para mover slides
  const moveSlide = (fromIndex: number, toIndex: number) => {
    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(fromIndex, 1);
    newSlides.splice(toIndex, 0, movedSlide);
    setSlides(newSlides);
  };
  // NOVO: Função para aplicar duração a todos os slides
  const applyDurationToAll = (duration: number) => {
    setSlides(prev => prev.map(slide => ({ ...slide, durationSec: duration })));
    toast.success(`Duração de ${duration}s aplicada a todos os slides`);
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
  // CORREÇÃO: Força atualização da interface limpando e resetando o input
      event.target.value = '';
      // Força re-render
      setSlides(prev => [...prev]);
    }
  };
  const processMultipleFiles = async (files: File[], targetSlideId?: string) => {
    const mediaFiles = files.filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (mediaFiles.length === 0) {
      toast.error('Selecione imagens (.jpg, .png, .webp) ou vídeos (.mp4, .webm)');
      return;
    }
    // Limite razoável para performance (máximo 20 slides)
    if (!targetSlideId && slides.length + mediaFiles.length > 20) {
      toast.error(`Máximo de 20 slides permitidos para manter boa performance. Você tem ${slides.length} e está tentando adicionar ${mediaFiles.length}.`);
      return;
    }
  toast.loading(`Processando ${mediaFiles.length} arquivo(s)...`, { id: "processing" });
  try {
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const isVideo = file.type.startsWith('video/');
        const labelIndex = slides.length + i + 1;
        if (targetSlideId && i === 0) {
          if (isVideo) {
            const url = URL.createObjectURL(file);
            updateSlide(targetSlideId, 'mediaType', 'video');
            updateSlide(targetSlideId, 'video', url);
            updateSlide(targetSlideId, 'image', undefined as unknown as string);
          } else {
            const dataUrl = await readFileAsDataURL(file);
            updateSlide(targetSlideId, 'mediaType', 'image');
            updateSlide(targetSlideId, 'image', dataUrl);
            updateSlide(targetSlideId, 'video', undefined as unknown as string);
          }
        } else {
          if (isVideo) {
            const url = URL.createObjectURL(file);
            const newSlide: Slide = {
              id: uuidv4(),
              mediaType: 'video',
              video: url,
              caption: `Slide ${labelIndex}`,
              effect: "STEP_IN_PRECISION",
              textAnimation: "typewriter",
              durationSec: 5,
              alignH: 'center',
              alignV: 'center',
            };
            setSlides(prev => [...prev, newSlide]);
          } else {
            const dataUrl = await readFileAsDataURL(file);
            const newSlide: Slide = {
              id: uuidv4(),
              mediaType: 'image',
              image: dataUrl,
              caption: `Slide ${labelIndex}`,
              effect: "STEP_IN_PRECISION",
              textAnimation: "typewriter",
              durationSec: 5,
              alignH: 'center',
              alignV: 'center',
            };
            setSlides(prev => [...prev, newSlide]);
          }
        }
      }
      toast.success(`${mediaFiles.length} arquivo(s) carregado(s)`, { id: "processing" });
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
    if (slides.some(slide => {
      const isVid = (slide.mediaType || 'image') === 'video';
      return isVid ? !slide.video : !slide.image;
    })) {
      toast.error("Por favor, adicione mídia (imagem ou vídeo) a todos os slides");
      return;
    }
    // Debug: verificar configuração da vinheta
    console.log('🎬 Configuração da vinheta ao gerar:');
    console.log('- useEndingVideo:', useEndingVideo);
    console.log('- endingVideoUrl:', endingVideoUrl);
    console.log('- endingVideoFile:', endingVideoFile);
    console.log('- selectedEndingId:', selectedEndingId);
    // VINHETA É OBRIGATÓRIA - todos os vídeos devem ter
    if (!endingVideoUrl && !endingVideoFile) {
      toast.error("⚠️ VINHETA OBRIGATÓRIA: Faça upload de uma vinheta final para gerar o vídeo");
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
  // Tentar fixar 30 fps no track para maximizar qualidade/constância
  try { await videoTrack?.applyConstraints?.({ frameRate: 30 }); } catch {}
  const requestFrameIfSupported = () => {
        try { if (videoTrack && typeof videoTrack.requestFrame === 'function') videoTrack.requestFrame(); } catch {}
      };
  // Utilitário de espera
  const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
      // Criar audio context para mixer de áudio se houver trilha sonora
  let audioContext: AudioContext | null = null;
  let audioStream: MediaStream | null = null;
  let audioElement: HTMLAudioElement | null = null;
  let endingAudioElement: HTMLVideoElement | null = null; // usaremos o elemento da vinheta para áudio
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
      // Preferir H.264 (MP4) original que gerava 34MB - configurações restauradas
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
        videoBitsPerSecond: 15000000 // Bitrate original que gerava 34MB
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
        const map: Record<string, { durationMs: number; steps: Array<{ atMs: number; scale: number }> }> = {
          // STEP_IN_MULTI_IMPACT (antigo Denúncia Impacto): múltiplos punches em sequência
          STEP_IN_MULTI_IMPACT: { 
            durationMs: 1000,
            steps: [
              { atMs: 0, scale: 1.1 },
              { atMs: 200, scale: 1.3 },
              { atMs: 400, scale: 1.1 },
              { atMs: 600, scale: 1.4 },
              { atMs: 800, scale: 1.2 }
            ]
          },
          // STEP_IN_PRECISION (antigo Exclusiva): zoom progressivo e preciso
          STEP_IN_PRECISION: {
            durationMs: 900,
            steps: [
              { atMs: 0, scale: 1.0 },
              { atMs: 300, scale: 1.2 },
              { atMs: 600, scale: 1.45 }
            ]
          },
          // CUT_IN_OUT_AGGRESSIVE (antigo Confronto): vai e volta agressivo
          CUT_IN_OUT_AGGRESSIVE: {
            durationMs: 800,
            steps: [
              { atMs: 0, scale: 1.2 },
              { atMs: 200, scale: 0.9 },
              { atMs: 400, scale: 1.4 },
              { atMs: 600, scale: 1.0 }
            ]
          },
          // DOUBLE_PUNCH_REVEAL (antigo Revelação): dois punches com recuo
          DOUBLE_PUNCH_REVEAL: {
            durationMs: 1000,
            steps: [
              { atMs: 0, scale: 1.0 },
              { atMs: 200, scale: 1.3 },
              { atMs: 600, scale: 1.1 },
              { atMs: 800, scale: 1.5 }
            ]
          },
          // HARD_IN_4X (antigo Zoom 4x): punch rápido para 1.5 (aprox 4x relativo ao recorte)
          HARD_IN_4X: {
            durationMs: 1200,
            steps: [
              { atMs: 0, scale: 1.0 },
              { atMs: 300, scale: 1.5 }
            ]
          }
        };
        return map[effect] ?? map['STEP_IN_PRECISION'];
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
      const finalVinheteUrl = useEndingVideo && endingVideoUrl ? endingVideoUrl : 
                             useEndingVideo && endingVideoFile ? URL.createObjectURL(endingVideoFile) : '';
      if (finalVinheteUrl && useEndingVideo) {
        console.log('🎬 Carregando vinheta final:', finalVinheteUrl);
        vinheteVideo = document.createElement('video');
        vinheteVideo.src = finalVinheteUrl;
        vinheteVideo.muted = true;
        vinheteVideo.loop = false;
        try {
          await new Promise<void>((res) => {
            if (!vinheteVideo) return res();
            vinheteVideo.oncanplay = () => {
              console.log(`✅ Vinheta carregada - duração: ${vinheteVideo!.duration}s`);
              res();
            };
            vinheteVideo.onerror = (e) => {
              console.error('❌ Erro ao carregar vinheta:', e);
              res();
            };
            vinheteVideo.load();
          });
        } catch (e) {
          console.warn('Falha ao carregar vinheta de vídeo:', e);
          vinheteVideo = null;
        }
      }
  // Renderizar cada slide - TIMING E EFEITOS CORRIGIDOS
  const startTime = performance.now();
  const preloadedImages: (HTMLImageElement | null)[] = [];
  const preloadedVideos: (HTMLVideoElement | null)[] = [];
      // Pré-carregar todas as imagens
      for (let i = 0; i < slides.length; i++) {
        const s = slides[i];
        if ((s.mediaType || 'image') === 'video' && s.video) {
          const v = document.createElement('video');
          v.src = s.video;
          v.muted = true;
          v.loop = false;
          v.preload = 'auto';
          await new Promise<void>((res) => {
            const onReady = () => { v.oncanplay = null; v.onerror = null; res(); };
            v.oncanplay = onReady;
            v.onerror = onReady;
            try { v.load(); } catch {}
          });
          preloadedVideos[i] = v;
          preloadedImages[i] = null;
        } else if (s.image) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = s.image as string;
          });
          preloadedImages[i] = img;
          preloadedVideos[i] = null;
        } else {
          preloadedImages[i] = null;
          preloadedVideos[i] = null;
        }
      }
      // Parâmetros de drift sutil por slide (movimento suave e aleatório após o punch)
      const driftParams = slides.map(() => ({
        // frequências baixas (ciclos por segundo)
  f1: 0.06 + Math.random() * 0.06, // ~0.06–0.12 Hz
  f2: 0.04 + Math.random() * 0.05, // ~0.04–0.09 Hz
        phase1: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
  ampShift: 0.35 + Math.random() * 0.25, // 35%–60% do alcance máximo permitido
  ampScale: 0.004 + Math.random() * 0.004 // 0.4%–0.8% de variação de escala
      }));
      const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
  for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
  const isVideo = (slide.mediaType || 'image') === 'video' && !!preloadedVideos[i];
  const videoEl = isVideo ? preloadedVideos[i]! : null;
  const durationSecInput = slide.durationSec || (isVideo && videoEl && !isNaN(videoEl.duration) && videoEl.duration > 0 ? Math.min(videoEl.duration, 10) : 5);
        const captionText = keepFirstCaption ? (slides[0]?.caption || '') : (slide.caption || '');
        const img = preloadedImages[i];
  console.log(`🎬 Renderizando slide ${i + 1}/${slides.length} - Duração alvo: ${durationSecInput}s`);
  // Efeito com timing preciso
  const { durationMs, steps } = getEffectSpec(slide.effect || 'ALEATORIO');
  const lastStepAtMs = steps.reduce((m, s) => Math.max(m, s.atMs), 0);
  // totalFrames é definido após o cálculo de durationMsEffective
  // CORREÇÃO: Usar função simples ao invés de classe complexa
  let textSetupDone = false;
  if (captionText) {
    // Preparar fonte e configurações para o typewriter
    const SAFE_MARGIN = 50;
    const baseFont = 48;
    const fontSizePX = Math.round(baseFont * 1.2);
    const font = `800 ${fontSizePX}px Poppins, Arial, sans-serif`;
    const maxW = canvas.width - (SAFE_MARGIN * 2) - 40; // padding
    // Configuração será feita no primeiro frame onde o texto aparece
  }
  // Protocolo de garantia: tempos mínimos para animações
  const BAR_DURATION_MS = 900; // animação suave da barra (~0.9s)
  const POST_HOLD_MS = 600; // pequena pausa após texto completo
  // Duração do typewriter baseada no número de caracteres (suave, consistente)
  const CHAR_TIME_MS = 35; // ~28 chars/seg
  // Slide deve durar pelo menos: barra + texto + hold final
  const minRequiredMs = BAR_DURATION_MS + (captionText ? captionText.length * CHAR_TIME_MS + 800 : 0) + POST_HOLD_MS;
  const durationMsEffective = Math.max(durationSecInput * 1000, minRequiredMs);
  const totalFrames = Math.max(1, Math.round(durationMsEffective / FRAME_MS));
  console.log(`📽️ Slide ${i + 1}: ${totalFrames} frames (${(durationMsEffective/1000).toFixed(2)}s a ${FRAME_RATE}fps)`);
  const slideStart = Date.now();
  // Controle de vídeo: voltar a setar currentTime por frame
  let lastVidTimeSet = -1;
  // Estado do typewriter
  let typewriterStarted = false;
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
          // Desenhar imagem com zoom e drift suave após o punch (cortes secos + movimento contínuo)
          const mediaAspect = isVideo && videoEl ? (videoEl.videoWidth / videoEl.videoHeight) : (img.width / img.height);
          const canvasAspect = canvas.width / canvas.height;
          // Garantir que não apareçam bordas pretas: nossa base 1.0 já cobre o canvas (pela lógica abaixo)
          const baseSafeScale = Math.max(scale, 1.0);
          // Ativar drift sutil após o último step do punch
          let drawScale = baseSafeScale;
          if (elapsedMs >= lastStepAtMs + 50) {
            const dp = driftParams[i];
            const t = (elapsedMs - lastStepAtMs) / 1000; // segundos após punch
            // micro variação de escala (bem sutil)
            const sOsc = dp.ampScale * Math.sin(2 * Math.PI * dp.f1 * t + dp.phase1)
                        + (dp.ampScale * 0.5) * Math.sin(2 * Math.PI * dp.f2 * t + dp.phase2);
            // zoom extra de 3% para permitir pan sem risco de borda
            drawScale = baseSafeScale * 1.03 * (1 + sOsc);
          }
          let drawW, drawH;
          if (mediaAspect > canvasAspect) {
            // Imagem mais larga: ajustar pela altura
            drawH = canvas.height * drawScale;
            drawW = drawH * mediaAspect;
          } else {
            // Imagem mais alta: ajustar pela largura
            drawW = canvas.width * drawScale;
            drawH = drawW / mediaAspect;
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
          // Aplicar pan suave e aleatório somente após o punch (mantendo cobertura sem bordas)
          if (elapsedMs >= lastStepAtMs + 50) {
            const dp = driftParams[i];
            const t = (elapsedMs - lastStepAtMs) / 1000;
            const excessX = Math.max(0, drawW - canvas.width);
            const excessY = Math.max(0, drawH - canvas.height);
            // offsets em [-0.5, 0.5] escalados pela amplitude
            const ox = dp.ampShift * 0.5 * Math.sin(2 * Math.PI * dp.f2 * t + dp.phase2);
            const oy = dp.ampShift * 0.4 * Math.sin(2 * Math.PI * (dp.f1 * 0.7) * t + dp.phase1 * 0.6);
            const shiftX = (excessX / 2) * ox;
            const shiftY = (excessY / 2) * oy;
            dx = clamp(dx + shiftX, canvas.width - drawW, 0);
            dy = clamp(dy + shiftY, canvas.height - drawH, 0);
          }
          // Avançar vídeo proporcional ao tempo, se for mídia de vídeo (seek por frame garante atualização)
          if (isVideo && videoEl) {
            const tSec = Math.min((isFinite(videoEl.duration) && videoEl.duration > 0) ? videoEl.duration : durationSecInput, elapsedMs / 1000);
            try { videoEl.currentTime = tSec; lastVidTimeSet = tSec; } catch {}
            try { ctx.drawImage(videoEl, dx, dy, drawW, drawH); } catch {}
          } else {
            ctx.drawImage(img, dx, dy, drawW, drawH);
          }
          // CORRIGIDO: Fade entre slides
          if (useFade && i > 0 && frame < 15) { // 15 frames = 0.5s de fade
            const prevImg = preloadedImages[i - 1];
            const prevVid = preloadedVideos[i - 1];
            const fadeAlpha = (15 - frame) / 15; // De 1.0 a 0.0
            ctx.globalAlpha = fadeAlpha;
            // Mesmo cálculo de escala para mídia anterior (sem punch)
            if (prevVid) {
              const a = prevVid.videoWidth / prevVid.videoHeight;
              let w, h;
              if (a > canvasAspect) { h = canvas.height; w = h * a; } else { w = canvas.width; h = w / a; }
              const px = (canvas.width - w) / 2;
              const py = (canvas.height - h) / 2;
              try { ctx.drawImage(prevVid, px, py, w, h); } catch {}
            } else if (prevImg) {
              const a = prevImg.width / prevImg.height;
              let w, h;
              if (a > canvasAspect) { h = canvas.height; w = h * a; } else { w = canvas.width; h = w / a; }
              const px = (canvas.width - w) / 2;
              const py = (canvas.height - h) / 2;
              ctx.drawImage(prevImg, px, py, w, h);
            }
            ctx.globalAlpha = 1.0;
          }
          // CORRIGIDO: Flash nos primeiros frames
          if (useFlash && frame < 5) { // 5 frames = flash mais visível
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 0.7 - (frame * 0.14); // Fade out mais suave
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
          }
          // CORRIGIDO: Linha amarela antes do texto + texto com typewriter
          if (captionText) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const SAFE_MARGIN = 50;
            const fontSize = Math.round(48 * 1.2);
            const textLeft = SAFE_MARGIN;
            const barLeft = SAFE_MARGIN;
            const maxTextWidth = canvas.width - SAFE_MARGIN * 2;
            const BLOCK_GAP = 8; // espaçamento entre blocos vermelhos
            // Posição do texto (subir conjunto ~270px)
            let y = canvas.height - (200 + 270) - 100;
            if (y < 120) y = 120;
            // 1) Linha amarela animada (antes do texto)
            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
            const preLineDurationMs = BAR_DURATION_MS;
            const preLineProgress = easeOutCubic(Math.min(1, elapsedMs / preLineDurationMs));
            const yellowWidthTarget = Math.min(100, canvas.width - SAFE_MARGIN - textLeft);
            const yellowWidth = Math.max(0, Math.floor(yellowWidthTarget * preLineProgress));
            const yellowHeight = 15;
            const yellowY = y - Math.round(fontSize * 0.5) - 20;
            if (yellowWidth > 0) {
              ctx.fillStyle = '#eebe32';
              ctx.fillRect(barLeft, yellowY, yellowWidth, yellowHeight);
            }
            // 2) Texto com efeito typewriter em blocos vermelhos
            ctx.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            // progresso do typewriter após a barra amarela
            const startTextMs = BAR_DURATION_MS + 100;
            const progressedMs = Math.max(0, elapsedMs - startTextMs);
            const charsToShow = Math.min(captionText.length, Math.floor(progressedMs / CHAR_TIME_MS));
            if (charsToShow > 0) {
              const textToDraw = captionText.slice(0, charsToShow);
              // Quebra de linha por largura
              const wrapByWidth = (text: string, maxW: number) => {
                const hardLines = text.split(/\r?\n/);
                const out: string[] = [];
                for (const hard of hardLines) {
                  const words = hard.split(/\s+/).filter(Boolean);
                  let line = '';
                  for (const w of words) {
                    const test = line ? line + ' ' + w : w;
                    if (ctx.measureText(test).width <= maxW) {
                      line = test;
                    } else {
                      if (line) out.push(line);
                      // palavra muito grande: quebra forçada se necessário
                      if (ctx.measureText(w).width > maxW) {
                        let acc = '';
                        for (const ch of w) {
                          const testCh = acc + ch;
                          if (ctx.measureText(testCh).width <= maxW) acc = testCh; else { out.push(acc); acc = ch; }
                        }
                        line = acc;
                      } else {
                        line = w;
                      }
                    }
                  }
                  if (line) out.push(line);
                }
                return out;
              };
              const lines = wrapByWidth(textToDraw, maxTextWidth);
              // métricas dos blocos
              const blockPadX = 18;
              const blockPadY = 12;
              const blockHeight = fontSize + blockPadY * 2;
              let yCursor = y;
              for (const line of lines) {
                const lineW = Math.ceil(ctx.measureText(line).width);
                const rectX = textLeft - blockPadX;
                const rectY = yCursor;
                const rectW = Math.min(maxTextWidth + blockPadX * 2, lineW + blockPadX * 2);
                const rectH = blockHeight;
                // bloco vermelho
                ctx.fillStyle = '#DC2626';
                ctx.fillRect(rectX, rectY, rectW, rectH);
                // texto branco centralizado verticalmente no bloco
                ctx.fillStyle = '#FFFFFF';
                const textY = rectY + blockPadY; // baseline top + padding
                ctx.fillText(line, textLeft, textY);
                yCursor += rectH + BLOCK_GAP;
              }
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
      if (useEndingVideo && vinheteVideo && !isNaN(vinheteVideo.duration) && vinheteVideo.duration > 0) {
        endingDurationMs = Math.round(vinheteVideo.duration * 1000);
        console.log(`🎬 Vinheta final configurada - duração: ${endingDurationMs}ms`);
      }
      const finalDurationMs = totalVideoMs + endingDurationMs;
      // Renderizar vinheta permanente se configurada
      if (useEndingVideo && vinheteVideo && endingDurationMs > 0) {
        console.log('🎬 Iniciando renderização da vinheta final...');
        // 1) Se houver trilha sonora tocando, parar ao iniciar vinheta
        if (audioElement) {
          try { audioElement.pause(); } catch {}
        }
        // 2) Conectar áudio da vinheta ao stream principal
        try {
          if (!audioContext) audioContext = new AudioContext();
          endingAudioElement = vinheteVideo; // usar o próprio elemento de vídeo como fonte de áudio
          const endingSource = audioContext.createMediaElementSource(endingAudioElement);
          const endingDest = audioContext.createMediaStreamDestination();
          endingSource.connect(endingDest);
          // adicionar faixas de áudio da vinheta ao stream (sem remover faixas de trilha já pausadas)
          endingDest.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (e) {
          console.warn('Falha ao conectar áudio da vinheta:', e);
        }
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
                {/* NOVO: Controle de duração em lote */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={bulkDurationValue}
                    onChange={(e) => setBulkDurationValue(Number(e.target.value))}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm w-20"
                  />
                  <span className="text-xs text-muted-foreground">s</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDurationToAll(bulkDurationValue)}
                  >
                    Aplicar duração a todos
                  </Button>
                </div>
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
                  JPG, PNG, WEBP - múltiplas imagens - Drag & Drop
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
                      <div className="flex items-center gap-1">
                        {/* NOVO: Botões para mover slides */}
                        <Button
                          onClick={() => moveSlide(index, Math.max(0, index - 1))}
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => moveSlide(index, Math.min(slides.length - 1, index + 1))}
                          variant="ghost"
                          size="sm"
                          disabled={index === slides.length - 1}
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => removeSlide(slide.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Mídia do Slide: imagem ou vídeo */}
                      <div>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
                          onChange={(e) => handleImageUpload(slide.id, e)}
                          id={`image-${slide.id}`}
                          className="hidden"
                        />
                        <div className="mt-1 space-y-2">
                          {(slide.mediaType === 'video' && slide.video) || (slide.mediaType !== 'video' && slide.image) ? (
                            <>
                              {compactView ? (
                                slide.mediaType === 'video' && slide.video ? (
                                  <div className="relative">
                                    <video
                                      src={slide.video}
                                      className="w-full h-32 object-cover rounded border bg-black"
                                      muted
                                    />
                                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                      📹 VÍDEO
                                    </div>
                                  </div>
                                ) : slide.image ? (
                                  <div className="relative">
                                    <img
                                      src={slide.image}
                                      alt={`Slide ${index + 1}`}
                                      className="w-full h-32 object-cover rounded border bg-gray-100"
                                    />
                                    <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                      🖼️ IMAGEM
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                                    <span className="text-gray-400 text-sm">Sem mídia</span>
                                  </div>
                                )
                              ) : (
                                slide.mediaType === 'video' && slide.video ? (
                                  <video
                                    src={slide.video}
                                    className="w-full rounded border bg-black"
                                    controls
                                  />
                                ) : (
                                  <PunchZoomYoYo
                                    image={slide.image as string}
                                    caption={slide.caption || "Preview"}
                                    effect={slide.effect}
                                    textAnimation={slide.textAnimation}
                                    alignH={slide.alignH}
                                    alignV={slide.alignV}
                                  />
                                )
                              )}
                              <div>
                                <Button asChild variant="outline" size="sm">
                                  <label htmlFor={`image-${slide.id}`} className="cursor-pointer">
                                    <UploadIcon className="w-4 h-4 mr-2" />
                                    Trocar mídia
                                  </label>
                                </Button>
                              </div>
                            </>
                          ) : (
                            <Button asChild variant="outline" size="sm">
                              <label htmlFor={`image-${slide.id}`} className="cursor-pointer">
                                <UploadIcon className="w-4 h-4 mr-2" />
                                Escolher mídia (imagem ou vídeo)
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
      {/* Extração inteligente de matéria */}
      <Card>
        <CardHeader>
          <CardTitle>Assistente de texto jornalístico (beta)</CardTitle>
          <p className="text-sm text-muted-foreground">Tópicos curtos e diretos para um vídeo de no máximo 90s. Cole o link ou o texto.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Link da matéria (opcional)</Label>
              <Input value={articleUrl} onChange={(e)=>setArticleUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Ou texto bruto (opcional)</Label>
              <Textarea value={articleText} onChange={(e)=>setArticleText(e.target.value)} placeholder="Cole o texto aqui..." className="min-h-[90px]" />
            </div>
          </div>
          <div className="flex gap-2">
      <Button size="sm" onClick={async()=>{
              if (!articleUrl && !articleText.trim()) {
                toast.error('Informe o link ou cole o texto.');
                return;
              }
              try {
                setIsExtracting(true);
        const result = await extractFromUrlOrText({ url: articleUrl || undefined, text: articleText || undefined, maxSeconds: 90 });
                setExtraction(result);
                toast.success('Texto segmentado com sucesso.');
              } catch (e:any) {
                toast.error('Falha ao extrair/segmentar.');
              } finally {
                setIsExtracting(false);
              }
            }} disabled={isExtracting}>{isExtracting ? 'Processando...' : 'Analisar'}</Button>
            {extraction && (
              <Button size="sm" variant="outline" onClick={()=>{
                // Popular texto dos slides com os blocos segmentados
                const segs = extraction.segments || [];
                if (segs.length === 0) return;
                // Garante no máximo 20
                const limited = segs.slice(0, 20);
                const ensureSlides = Math.max(slides.length, limited.length);
                const next: Slide[] = [];
                for (let i=0;i<ensureSlides;i++) {
                  const existing = slides[i];
                  const caption = limited[i]?.text || existing?.caption || '';
                  if (existing) next.push({ ...existing, caption });
                  else next.push({ id: uuidv4(), image: '', caption, effect: 'STEP_IN_PRECISION', textAnimation: 'typewriter', durationSec: 5, alignH: 'center', alignV: 'center' });
                }
                setSlides(next);
                if (extraction.title && !title) setTitle(extraction.title);
              }}>Aplicar aos slides</Button>
            )}
          </div>
          {extraction && (
            <div className="mt-2 p-2 border rounded">
              <div className="text-sm font-medium">Sugestão de imagens: {extraction.suggestedImages}</div>
              <ul className="list-disc pl-4 text-sm mt-2 space-y-1">
                {extraction.segments.map((s, idx)=> (
                  <li key={idx} className="leading-snug">{s.text}</li>
                ))}
              </ul>
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
              {showAdvancedSettings ? 'Ocultar' : 'Mostrar'}
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
                    <span className="text-green-600 text-sm">✅ Desbloqueada</span>
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
                    <Label className="text-xs">Marca d'água (arquivo)</Label>
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
                      <p className="text-xs text-muted-foreground mt-1">Arquivo: {endingVideoFile?.name || endingVideoUrl}</p>
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
                    ✅ Trilha selecionada
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
                      Arquivo: {audioFile.name}
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* Vinheta de Encerramento – upload obrigatório */}
            <div className="pt-2 border-t">
              <Label className="text-base font-medium">🎬 Vinheta Final *OBRIGATÓRIA*</Label>
              <p className="text-sm text-muted-foreground mb-3">
                A vinheta final (vídeo) será inserida automaticamente após os slides.
                {(endingVideoFile || endingVideoUrl) && (
                  <span className="ml-2 text-green-600 font-medium">
                    ✅ Vinheta carregada
                  </span>
                )}
              </p>
              {/* Upload público da vinheta */}
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="file"
                  id="ending-public"
                  accept=".mp4,.webm"
                  onChange={handleEndingVideoUpload}
                  className="hidden"
                />
                <Button asChild size="sm" variant="outline">
                  <label htmlFor="ending-public" className="cursor-pointer">
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
                  >Salvar como padrão</Button>
                )}
              </div>
              {(endingVideoFile || endingVideoUrl) && (
                <p className="text-xs text-muted-foreground mt-1">Arquivo: {endingVideoFile?.name || 'Vinheta carregada'}</p>
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







