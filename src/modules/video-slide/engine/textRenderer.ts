/**
 * textRenderer.ts - Módulo otimizado para renderização de texto typewriter
 * 
 * Pré-calcula layout e métricas para evitar recálculos a cada frame
 */

export interface TextLine {
  text: string;
  width: number;
  y: number;
  blockX: number;
  blockY: number;
  blockWidth: number;
  blockHeight: number;
}

export interface TextLayout {
  lines: TextLine[];
  totalChars: number;
  lineBreakPoints: number[]; // índice de caractere onde cada linha começa
}

const BLOCK_PAD_X = 18;
const BLOCK_PAD_Y = 12;
const BLOCK_GAP = 8;

/**
 * Pré-calcula o layout do texto com quebra de linha
 * Deve ser chamado UMA VEZ antes do loop de renderização
 */
export function precomputeTextLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  startY: number,
  textLeft: number
): TextLayout {
  const font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
  ctx.font = font;
  
  const lines: TextLine[] = [];
  const lineBreakPoints: number[] = [0];
  
  // Quebra de linha por largura
  const hardLines = text.split(/\r?\n/);
  let charCount = 0;
  let yCursor = startY;
  const blockHeight = fontSize + BLOCK_PAD_Y * 2;
  
  for (const hardLine of hardLines) {
    const words = hardLine.split(/\s+/).filter(Boolean);
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = ctx.measureText(testLine).width;
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          // Finalizar linha atual
          const lineWidth = Math.ceil(ctx.measureText(currentLine).width);
          lines.push({
            text: currentLine,
            width: lineWidth,
            y: yCursor + BLOCK_PAD_Y,
            blockX: textLeft - BLOCK_PAD_X,
            blockY: yCursor,
            blockWidth: Math.min(maxWidth + BLOCK_PAD_X * 2, lineWidth + BLOCK_PAD_X * 2),
            blockHeight
          });
          
          charCount += currentLine.length + 1; // +1 para espaço
          lineBreakPoints.push(charCount);
          yCursor += blockHeight + BLOCK_GAP;
        }
        
        // Verificar se palavra é muito grande
        if (ctx.measureText(word).width > maxWidth) {
          let acc = '';
          for (const ch of word) {
            const testCh = acc + ch;
            if (ctx.measureText(testCh).width <= maxWidth) {
              acc = testCh;
            } else {
              if (acc) {
                const lineWidth = Math.ceil(ctx.measureText(acc).width);
                lines.push({
                  text: acc,
                  width: lineWidth,
                  y: yCursor + BLOCK_PAD_Y,
                  blockX: textLeft - BLOCK_PAD_X,
                  blockY: yCursor,
                  blockWidth: Math.min(maxWidth + BLOCK_PAD_X * 2, lineWidth + BLOCK_PAD_X * 2),
                  blockHeight
                });
                charCount += acc.length;
                lineBreakPoints.push(charCount);
                yCursor += blockHeight + BLOCK_GAP;
              }
              acc = ch;
            }
          }
          currentLine = acc;
        } else {
          currentLine = word;
        }
      }
    }
    
    // Finalizar última linha do parágrafo
    if (currentLine) {
      const lineWidth = Math.ceil(ctx.measureText(currentLine).width);
      lines.push({
        text: currentLine,
        width: lineWidth,
        y: yCursor + BLOCK_PAD_Y,
        blockX: textLeft - BLOCK_PAD_X,
        blockY: yCursor,
        blockWidth: Math.min(maxWidth + BLOCK_PAD_X * 2, lineWidth + BLOCK_PAD_X * 2),
        blockHeight
      });
      charCount += currentLine.length;
      yCursor += blockHeight + BLOCK_GAP;
    }
  }
  
  return {
    lines,
    totalChars: text.length,
    lineBreakPoints
  };
}

/**
 * Renderiza um frame do efeito typewriter usando layout pré-calculado
 * Desenha apenas os caracteres visíveis baseado no progresso
 */
export function drawTypewriterFrame(
  ctx: CanvasRenderingContext2D,
  layout: TextLayout,
  charsToShow: number,
  fontSize: number,
  textLeft: number
): void {
  if (charsToShow <= 0 || layout.lines.length === 0) return;
  
  ctx.save();
  ctx.font = `800 ${fontSize}px Poppins, Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  let charsDrawn = 0;
  
  for (const line of layout.lines) {
    if (charsDrawn >= charsToShow) break;
    
    const charsAvailable = charsToShow - charsDrawn;
    const charsInLine = Math.min(line.text.length, charsAvailable);
    
    if (charsInLine <= 0) break;
    
    const partialText = line.text.slice(0, charsInLine);
    const partialWidth = ctx.measureText(partialText).width;
    
    // Bloco vermelho (apenas para texto visível)
    ctx.fillStyle = '#DC2626';
    const rectWidth = Math.min(line.blockWidth, partialWidth + BLOCK_PAD_X * 2);
    ctx.fillRect(line.blockX, line.blockY, rectWidth, line.blockHeight);
    
    // Texto branco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(partialText, textLeft, line.y);
    
    charsDrawn += line.text.length + 1; // +1 para espaço entre linhas
  }
  
  ctx.restore();
}

/**
 * Desenha a barra amarela animada
 */
export function drawYellowBar(
  ctx: CanvasRenderingContext2D,
  progress: number,
  barLeft: number,
  barY: number,
  targetWidth: number,
  height: number = 15
): void {
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const width = Math.floor(targetWidth * easeOutCubic(Math.min(1, progress)));
  
  if (width > 0) {
    ctx.fillStyle = '#eebe32';
    ctx.fillRect(barLeft, barY, width, height);
  }
}
