/**
 * frameTimer.ts - Controle preciso de timing para renderização de vídeo
 * 
 * Usa performance.now() para timing de alta precisão
 */

const FRAME_RATE = 30;
const FRAME_MS = 1000 / FRAME_RATE;

/**
 * Classe para controle preciso de timing de frames
 * Evita drift acumulado usando tempo absoluto
 */
export class FrameTimer {
    private startTime: number = 0;
    private frameCount: number = 0;

    start(): void {
        this.startTime = performance.now();
        this.frameCount = 0;
    }

    /**
     * Retorna o tempo decorrido desde o início em ms
     */
    getElapsedMs(): number {
        return performance.now() - this.startTime;
    }

    /**
     * Retorna o tempo alvo para o frame atual
     */
    getTargetMs(frame: number): number {
        return frame * FRAME_MS;
    }

    /**
     * Aguarda até o momento certo para o próximo frame
     * Usa requestAnimationFrame para precisão
     */
    async waitForNextFrame(frame: number): Promise<void> {
        const targetTime = this.startTime + (frame * FRAME_MS);
        const now = performance.now();

        if (now >= targetTime) {
            // Já passou do tempo, não esperar
            return;
        }

        const delay = targetTime - now;

        // Para delays curtos (< 4ms), usar busy-wait
        // Para delays maiores, usar setTimeout + ajuste fino
        if (delay < 4) {
            // Busy-wait para precisão máxima
            while (performance.now() < targetTime) {
                // spin
            }
        } else {
            // setTimeout para não bloquear a thread
            await new Promise<void>(resolve => {
                setTimeout(() => {
                    // Ajuste fino com busy-wait
                    while (performance.now() < targetTime) {
                        // spin
                    }
                    resolve();
                }, Math.max(0, delay - 2));
            });
        }
    }

    /**
     * Incrementa contador de frames
     */
    nextFrame(): number {
        return ++this.frameCount;
    }

    /**
     * Calcula quantos frames para uma duração em ms
     */
    static msToFrames(ms: number): number {
        return Math.max(1, Math.round(ms / FRAME_MS));
    }

    /**
     * Calcula duração em ms para um número de frames
     */
    static framesToMs(frames: number): number {
        return frames * FRAME_MS;
    }
}

/**
 * Constantes de timing para animações
 */
export const TIMING = {
    FRAME_RATE,
    FRAME_MS,
    BAR_DURATION_MS: 900,
    POST_HOLD_MS: 600,
    CHAR_TIME_MS: 35,
} as const;

/**
 * Calcula a duração mínima necessária para um slide com texto
 */
export function calculateMinSlideDuration(textLength: number): number {
    const { BAR_DURATION_MS, POST_HOLD_MS, CHAR_TIME_MS } = TIMING;
    return BAR_DURATION_MS + (textLength > 0 ? textLength * CHAR_TIME_MS + 800 : 0) + POST_HOLD_MS;
}
