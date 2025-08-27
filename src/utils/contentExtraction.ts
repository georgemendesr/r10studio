export type Segment = { text: string; rationale?: string };
export type ExtractionResult = {
  title: string;
  summary: string;
  segments: Segment[];
  suggestedImages: number;
};

export async function extractFromUrlOrText(params: { url?: string; text?: string; maxSeconds?: number }): Promise<ExtractionResult> {
  const body = { maxSeconds: 90, ...params } as any;
  try {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    // Fallback no cliente: se houver texto, cria segmentação heurística rápida para não travar o fluxo
    const text = (body.text || '') as string;
    const maxSeconds = (body.maxSeconds || 90) as number;
    if (text && text.trim().length > 0) {
      return heuristicClient(text, maxSeconds);
    }
    throw new Error('Falha ao extrair');
  }
}

function heuristicClient(text: string, maxSeconds = 90): ExtractionResult {
  const BAR_MS = 900;
  const HOLD_MS = 600;
  const CHAR_MS = 35;
  const MAX_CHARS_PER_SEGMENT = 120;
  const estimateMs = (t: string) => BAR_MS + HOLD_MS + Math.max(800, Math.round((t||'').length * CHAR_MS));
  const budget = maxSeconds * 1000;
  const cleaned = (text||'').replace(/\n{2,}/g,'\n').replace(/\s+/g,' ').trim();
  const sentences = cleaned.split(/(?<=[\.!\?])\s+/);
  const parts: string[] = [];
  let buf: string[] = [];
  let count = 0;
  for (const s of sentences) {
    const words = s.split(/\s+/);
    buf.push(s);
    count += words.length;
    if (count >= 14) { parts.push(buf.join(' ')); buf = []; count = 0; }
  }
  if (buf.length) parts.push(buf.join(' '));
  // enforce char limit per segment
  const split: string[] = [];
  for (const p of parts) {
    const ws = p.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of ws) {
      if (!cur) { cur = w; continue; }
      if ((cur + ' ' + w).length <= MAX_CHARS_PER_SEGMENT) cur = cur + ' ' + w; else { split.push(cur); cur = w; }
    }
    if (cur) split.push(cur);
  }
  const segments = [] as { text: string }[];
  let acc = 0;
  for (const s of split) {
    const add = estimateMs(s);
    if (acc + add > budget) break;
    segments.push({ text: s });
    acc += add;
  }
  const summary = segments.slice(0,2).map(s=>s.text).join(' ');
  return { title: '', summary, segments, suggestedImages: Math.max(1, Math.round(segments.length/2)) };
}

export async function segmentText(text: string, maxSeconds = 90): Promise<ExtractionResult> {
  const res = await fetch('/api/segment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, maxSeconds }),
  });
  if (!res.ok) throw new Error(`Falha ao segmentar: ${res.status}`);
  return res.json();
}
