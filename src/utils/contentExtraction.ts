export type Segment = { text: string; rationale?: string };
export type ExtractionResult = {
  title: string;
  summary: string;
  segments: Segment[];
  suggestedImages: number;
};

export async function extractFromUrlOrText(params: { url?: string; text?: string }): Promise<ExtractionResult> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Falha ao extrair: ${res.status}`);
  return res.json();
}

export async function segmentText(text: string): Promise<ExtractionResult> {
  const res = await fetch('/api/segment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Falha ao segmentar: ${res.status}`);
  return res.json();
}
