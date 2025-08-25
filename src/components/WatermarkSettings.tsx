import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SettingsIcon, LockIcon, UploadIcon } from 'lucide-react';

interface WatermarkSettingsProps {
  onWatermarkChange: (file: string) => void;
  onVinheteChange: (file: string) => void;
}

const WatermarkSettings = ({ onWatermarkChange, onVinheteChange }: WatermarkSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentWatermark, setCurrentWatermark] = useState('');
  const [currentVinhete, setCurrentVinhete] = useState('');

  const ADMIN_PASSWORD = '850327';

  // Carregar configurações salvas do localStorage
  useEffect(() => {
    const savedWatermark = localStorage.getItem('r10-watermark');
    const savedVinhete = localStorage.getItem('r10-vinhete');
    
    if (savedWatermark) {
      setCurrentWatermark(savedWatermark);
      onWatermarkChange(savedWatermark);
    } else {
      // Definir marca d'água padrão do R10 Piauí
      const defaultWatermark = '/logo-r10-piaui.png';
      setCurrentWatermark(defaultWatermark);
      onWatermarkChange(defaultWatermark);
    }
    
    if (savedVinhete) {
      setCurrentVinhete(savedVinhete);
      onVinheteChange(savedVinhete);
    }
  }, [onWatermarkChange, onVinheteChange]);

  const handlePasswordSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast.success('🔓 Acesso autorizado!');
    } else {
      toast.error('❌ Senha incorreta!');
      setPassword('');
    }
  };

  const handleWatermarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem válido');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCurrentWatermark(dataUrl);
        localStorage.setItem('r10-watermark', dataUrl);
        onWatermarkChange(dataUrl);
        toast.success('✅ Marca d\'água atualizada permanentemente!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVinheteUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de vídeo ou imagem válido');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCurrentVinhete(dataUrl);
        localStorage.setItem('r10-vinhete', dataUrl);
        onVinheteChange(dataUrl);
        toast.success('✅ Vinheta de encerramento atualizada permanentemente!');
      };
      reader.readAsDataURL(file);
    }
  };

  const resetToDefault = () => {
    const defaultWatermark = '/logo-r10-piaui.png';
    setCurrentWatermark(defaultWatermark);
    localStorage.setItem('r10-watermark', defaultWatermark);
    onWatermarkChange(defaultWatermark);
    toast.success('🔄 Marca d\'água restaurada para o padrão R10 Piauí');
  };

  const removeVinhete = () => {
    setCurrentVinhete('');
    localStorage.removeItem('r10-vinhete');
    onVinheteChange('');
    toast.success('🗑️ Vinheta de encerramento removida');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon className="w-4 h-4 mr-2" />
          Configurações Avançadas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockIcon className="w-5 h-5" />
            Configurações de Marca D'água e Vinheta
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!isAuthenticated ? (
            <Card>
              <CardHeader>
                <CardTitle>🔐 Acesso Restrito</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label htmlFor="password">Digite a senha de acesso:</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha..."
                      onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                    <Button onClick={handlePasswordSubmit}>
                      Confirmar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Apenas administradores podem alterar as configurações permanentes.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Marca d'água */}
              <Card>
                <CardHeader>
                  <CardTitle>🏷️ Marca D'água Permanente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentWatermark && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <p className="text-sm font-medium mb-2">Marca d'água atual:</p>
                      <img 
                        src={currentWatermark} 
                        alt="Marca d'água atual" 
                        className="max-w-32 max-h-32 object-contain border rounded"
                      />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="watermark-upload">Nova marca d'água:</Label>
                    <div className="flex gap-2">
                      <input
                        id="watermark-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleWatermarkUpload}
                        className="hidden"
                      />
                      <Button asChild variant="outline" size="sm">
                        <label htmlFor="watermark-upload" className="cursor-pointer">
                          <UploadIcon className="w-4 h-4 mr-2" />
                          Upload Nova Marca D'água
                        </label>
                      </Button>
                      <Button onClick={resetToDefault} variant="secondary" size="sm">
                        🔄 Restaurar R10 Piauí
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    A marca d'água será aplicada automaticamente em todos os vídeos gerados.
                  </p>
                </CardContent>
              </Card>

              {/* Vinheta de encerramento */}
              <Card>
                <CardHeader>
                  <CardTitle>🎬 Vinheta de Encerramento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentVinhete && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <p className="text-sm font-medium mb-2">Vinheta atual:</p>
                      {currentVinhete.startsWith('data:video') ? (
                        <video 
                          src={currentVinhete} 
                          className="max-w-48 max-h-32 object-contain border rounded"
                          controls
                        />
                      ) : (
                        <img 
                          src={currentVinhete} 
                          alt="Vinheta atual" 
                          className="max-w-48 max-h-32 object-contain border rounded"
                        />
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="vinhete-upload">Nova vinheta:</Label>
                    <div className="flex gap-2">
                      <input
                        id="vinhete-upload"
                        type="file"
                        accept="video/*,image/*"
                        onChange={handleVinheteUpload}
                        className="hidden"
                      />
                      <Button asChild variant="outline" size="sm">
                        <label htmlFor="vinhete-upload" className="cursor-pointer">
                          <UploadIcon className="w-4 h-4 mr-2" />
                          Upload Nova Vinheta
                        </label>
                      </Button>
                      {currentVinhete && (
                        <Button onClick={removeVinhete} variant="destructive" size="sm">
                          🗑️ Remover Vinheta
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    A vinheta será adicionada automaticamente no final de todos os vídeos (3 segundos).
                    Aceita arquivos de vídeo (.mp4, .webm) ou imagem (.jpg, .png).
                  </p>
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>💾 Permanente:</strong> Essas configurações ficam salvas permanentemente no sistema 
                  e serão aplicadas automaticamente em todos os vídeos futuros até serem alteradas novamente.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WatermarkSettings;
