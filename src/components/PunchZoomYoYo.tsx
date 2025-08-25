import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface PunchZoomYoYoProps {
  image: string;
  caption: string;
  effect?: string;
  textAnimation?: string;
  className?: string;
  alignH?: 'left' | 'center' | 'right';
  alignV?: 'top' | 'center' | 'bottom';
}

const PunchZoomYoYo = ({ image, caption, effect = "ALEATORIO", textAnimation = "fade-in", className = "", alignH = 'center', alignV = 'center' }: PunchZoomYoYoProps) => {
  const [scale, setScale] = useState(1);
  const [showText, setShowText] = useState(false);

  const getZoomSequence = (effectType: string) => {
    const effects = {
      ZOOM_3X_IN: { scales: [1.00, 1.15, 1.30], duration: 300 },
      ZOOM_4X_IN: { scales: [1.00, 1.10, 1.25, 1.40], duration: 300 },
      ZOOM_3X_OUT: { scales: [1.30, 1.15, 1.00], duration: 300 },
      ZOOM_4X_OUT: { scales: [1.40, 1.25, 1.10, 1.00], duration: 300 },
      PULSE: { scales: [1.00, 1.12, 1.00], duration: 200 },
      ALEATORIO: { scales: [1.00, 1.12, 1.25, 1.12, 1.00], duration: 200 }
    };
    
    if (effectType === "ALEATORIO") {
      const effectKeys = Object.keys(effects).filter(key => key !== "ALEATORIO");
      const randomEffect = effectKeys[Math.floor(Math.random() * effectKeys.length)];
      return effects[randomEffect as keyof typeof effects];
    }
    
    return effects[effectType as keyof typeof effects] || effects.ALEATORIO;
  };

  useEffect(() => {
    const { scales, duration } = getZoomSequence(effect);
    let currentStep = 0;

    const interval = setInterval(() => {
      setScale(scales[currentStep]);
      currentStep = (currentStep + 1) % scales.length;
    }, duration);

    // Show text animation after first few frames
    const textTimer = setTimeout(() => setShowText(true), duration * 1.5);

    return () => {
      clearInterval(interval);
      clearTimeout(textTimer);
    };
  }, [effect]);

  return (
    <Card className={`relative overflow-hidden bg-secondary/20 border-border ${className}`}>
      {/* Proporção 9:16 (1080x1920) */}
      <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
        <img
          src={image}
          alt={caption}
          className="w-full h-full object-cover transition-transform duration-200 ease-in-out"
          style={{
            transform: `scale(${scale})`,
            objectPosition:
              alignH === 'left' ? (alignV === 'top' ? 'left top' : alignV === 'bottom' ? 'left bottom' : 'left center') :
              alignH === 'right' ? (alignV === 'top' ? 'right top' : alignV === 'bottom' ? 'right bottom' : 'right center') :
              (alignV === 'top' ? 'center top' : alignV === 'bottom' ? 'center bottom' : 'center center')
          }}
        />
        
        {/* Indicador de formato */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          9:16
        </div>
        
        {/* Text overlay - R10 style */}
        {caption && (
          <div className={`absolute bottom-4 left-4 right-4`}>
            {/* Efeito typewriter simples no preview */}
            <div className="text-left font-[800]" style={{ fontFamily: 'Poppins, Arial, sans-serif' }}>
              <div className="inline-block bg-red-500 text-white px-3 py-2" style={{ lineHeight: 1.2 }}>
                {caption}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Informação sobre redimensionamento */}
      <div className="p-2 bg-orange-500/10 text-center">
        <p className="text-xs text-orange-400">
          Imagem será ajustada automaticamente para 1080x1920px
        </p>
      </div>
    </Card>
  );
};

export default PunchZoomYoYo;