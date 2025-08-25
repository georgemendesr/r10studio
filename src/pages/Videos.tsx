import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, VideoIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Video {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'ready';
  slideCount: number;
  createdAt: string; // ISO ou legacy
  url?: string;
  blob?: Blob;
  format?: string;
}

// Função para carregar vídeos do localStorage
const loadVideosFromStorage = (): Video[] => {
  try {
    const stored = localStorage.getItem('r10-videos');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao carregar vídeos:', error);
    return [];
  }
};

const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  
  // Carregar vídeos quando componente monta
  useEffect(() => {
    setVideos(loadVideosFromStorage());
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Pronto';
      case 'processing':
        return 'Processando';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'pending':
        return <AlertCircleIcon className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
  return 'bg-green-500/15 text-green-700 border-green-500/30';
      case 'processing':
  return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30';
      case 'pending':
  return 'bg-orange-500/15 text-orange-700 border-orange-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

    const downloadVideo = (video: Video) => {
    if (video.status === 'ready' && video.url) {
      toast.success(`Baixando ${video.title}...`);
      console.log('Downloading:', video.url);
      
      const link = document.createElement('a');
      link.href = video.url;
      const ext = video.format || 'webm';
      const safeTitle = (video.title || 'video').replace(/[^a-zA-Z0-9\s]/g, '_').trim() || 'video';
      link.download = `${safeTitle}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const deleteVideo = (id: string) => {
    const next = videos.filter(v => v.id !== id);
    setVideos(next);
    try {
      localStorage.setItem('r10-videos', JSON.stringify(next));
    } catch (e) {
      console.warn('Falha ao persistir vídeos no localStorage:', e);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground">
            Meus Vídeos
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Gerencie e baixe seus vídeos com efeitos punch zoom gerados
          </p>
        </div>
        
        <Button asChild variant="accent" size="lg">
          <Link to="/video-slide">
            <PlusIcon className="w-4 h-4" />
            Criar Novo Vídeo
          </Link>
        </Button>
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <VideoIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Nenhum vídeo ainda</h3>
            <p className="text-muted-foreground mb-6">
              Crie seu primeiro vídeo punch zoom para começar!
            </p>
            <Button asChild variant="accent">
              <Link to="/video-slide">
                <PlusIcon className="w-4 h-4" />
                Criar Seu Primeiro Vídeo
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video.id} className="group hover:shadow-studio transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                    {video.title}
                  </CardTitle>
                  <Badge variant="outline" className={getStatusColor(video.status)}>
                    {getStatusIcon(video.status)}
                    {getStatusText(video.status)}
                  </Badge>
                </div>
                <div className="mt-1">
                  <img src="/r10studio.png" alt="R10 STUDIO" className="h-5 w-auto opacity-80" />
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{video.slideCount} slides</span>
                  <span>•</span>
                  <span>{(() => {
                    const d = new Date(video.createdAt);
                    return isNaN(d.getTime()) ? video.createdAt : d.toLocaleDateString();
                  })()}</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadVideo(video)}
                    disabled={video.status !== 'ready'}
                    variant={video.status === 'ready' ? "accent" : "outline"}
                    size="sm"
                    className="flex-1"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    {video.status === 'ready' ? 'Baixar' : 'Processando...'}
                  </Button>
                  <Button
                    onClick={() => deleteVideo(video.id)}
                    variant="outline"
                    size="sm"
                    className="px-3"
                    title="Excluir vídeo"
                  >
                    <Trash2Icon className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-green-500">
              {videos.filter(v => v.status === 'ready').length}
            </div>
            <p className="text-sm text-muted-foreground">Prontos para Download</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {videos.filter(v => v.status === 'processing').length}
            </div>
            <p className="text-sm text-muted-foreground">Processando</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold text-primary">
              {videos.length}
            </div>
            <p className="text-sm text-muted-foreground">Total de Vídeos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Videos;