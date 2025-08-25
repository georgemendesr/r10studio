import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Crown, Gauge } from "lucide-react";

interface QualitySelectorProps {
  value: string;
  onChange: (value: string) => void;
  systemCapacity?: any;
  recommendations?: any[];
}

export function QualitySelector({ value, onChange, systemCapacity, recommendations }: QualitySelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          🎬 Qualidade do Vídeo Profissional
        </label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breaking_news">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="font-medium">Breaking News</div>
                  <div className="text-xs text-muted-foreground">720p • 4 Mbps • Upload Rápido</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="standard_news">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="font-medium">Notícias Padrão</div>
                  <div className="text-xs text-muted-foreground">1080p • 10 Mbps • Qualidade HD</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="premium_content">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="font-medium">Conteúdo Premium</div>
                  <div className="text-xs text-muted-foreground">1080p • 20 Mbps • Qualidade Cinematográfica</div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {systemCapacity && (
        <div className="bg-muted/30 rounded p-3">
          <div className="text-xs font-medium mb-2">Status do Sistema:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>GPU: {systemCapacity.gpu ? '✅ Disponível' : '❌ Limitada'}</div>
            <div>RAM: {systemCapacity.memory} GB</div>
            <div>CPU: {systemCapacity.cores} cores</div>
            <div>Rede: {systemCapacity.connection}</div>
          </div>
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <div className="space-y-1">
          {recommendations.map((rec, index) => (
            <Badge 
              key={index} 
              variant={rec.type === 'warning' ? 'destructive' : rec.type === 'suggestion' ? 'default' : 'secondary'}
              className="text-xs w-full justify-start py-1"
            >
              {rec.message}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
