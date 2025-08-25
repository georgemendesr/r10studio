# 🚀 GUIA DE DEPLOY - R10 STUDIO

## Pré-requisitos
1. Conta GitHub (gratuita)
2. Conta Vercel (gratuita)

## Passo 1: Preparar o Código
```bash
# Testar build local primeiro
npm run build

# Verificar se tudo está funcionando
npm run preview
```

## Passo 2: Subir para GitHub
1. Criar repositório novo no GitHub
2. Nome sugerido: `r10-studio-video-creator`
3. Fazer push do código:

```bash
git init
git add .
git commit -m "Initial commit - R10 Studio Video Creator"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/r10-studio-video-creator.git
git push -u origin main
```

## Passo 3: Deploy na Vercel
1. Ir para https://vercel.com
2. Fazer login com GitHub
3. Clicar "New Project"
4. Selecionar o repositório `r10-studio-video-creator`
5. Configurações automáticas detectadas:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. Clicar "Deploy"

## Passo 4: Configurações Adicionais
- Domínio personalizado (opcional)
- Variáveis de ambiente (se necessário)
- Analytics (gratuito)

## ✅ Resultado
- URL: `https://r10-studio.vercel.app`
- HTTPS automático
- CDN global
- Deploy automático a cada push

## 🔧 Troubleshooting Comum

### Erro de Build
```bash
# Se der erro, testar localmente:
npm run build
npm run preview
```

### Arquivos Estáticos
- Todos os arquivos em `/public/` serão servidos automaticamente
- Trilhas sonoras e logos já estão configuradas corretamente

### Performance
- Vite otimiza automaticamente o bundle
- Arquivos de mídia servidos via CDN da Vercel
- Carregamento instantâneo global

## 🎯 Domínio Personalizado (Opcional)
1. Comprar domínio (sugestões):
   - `r10studio.com.br`
   - `videor10.com.br`
   - `studior10.com.br`
2. Configurar no painel da Vercel
3. DNS automático
