// Página antiga descontinuada. Mantida apenas como stub para compatibilidade.
// Não utilizada nas rotas. Use "/video-slide".
import React from 'react';

const DeprecatedVideoNew: React.FC = () => {
  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-2">Página descontinuada</h1>
      <p className="text-muted-foreground">
        Este editor foi substituído pelo novo Editor de Slides. Acesse em
        <span className="font-semibold"> /video-slide</span>.
      </p>
    </div>
  );
};

export default DeprecatedVideoNew;