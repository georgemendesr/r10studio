import { groqSegment, heuristicSegment } from './_segmenter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { text, maxSeconds } = req.body || {};
    if (!text) return res.status(400).json({ error: 'Informe text' });
    try {
      const result = await groqSegment(text, maxSeconds || 90);
      return res.status(200).json(result);
    } catch {
      const fb = heuristicSegment(text, maxSeconds || 90);
      return res.status(200).json(fb);
    }
  } catch (e) {
    res.status(500).json({ error: 'Falha na segmentação' });
  }
}
