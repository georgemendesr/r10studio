# R10 STUDIO – Punch Zoom Creator

Projeto React + Vite + Tailwind para criar vídeos 9:16 com efeito punch zoom e legenda estilo faixa vermelha.

Como rodar:
- Node 18+ recomendado.
- Instale dependências e inicie o servidor:

1. `npm install`
2. `npm run dev`

Build de produção:
- `npm run build`
- `npm run preview`

Porta padrão: 4501 (configurada no `vite.config.ts`).

Observações:
- A geração de vídeo ocorre no navegador via MediaRecorder. O arquivo é baixado automaticamente ao final.
- Vídeos gerados ficam listados em “/videos” (dados salvos no localStorage).
