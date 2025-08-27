import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import Groq from 'groq-sdk';

const BAR_MS = 900;
const HOLD_MS = 600;
const CHAR_MS = 35;
const MAX_CHARS_PER_SEGMENT = 120;

function estimateMsForText(t) {
  const len = (t || '').length;
  return BAR_MS + HOLD_MS + Math.max(800, Math.round(len * CHAR_MS));
}

function enforceTimeBudget(segments, maxSeconds = 90) {
  const budget = maxSeconds * 1000;
  const kept = [];
  let acc = 0;
  for (const s of segments) {
    const add = estimateMsForText(s.text);
    if (acc + add > budget) break;
    kept.push(s);
    acc += add;
  }
  return kept;
}

function splitByCharLimit(text, maxChars = MAX_CHARS_PER_SEGMENT) {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const parts = [];
  let buf = '';
  for (const w of words) {
    if (buf.length === 0) { buf = w; continue; }
    if ((buf + ' ' + w).length <= maxChars) buf = buf + ' ' + w;
    else { parts.push(buf); buf = w; }
  }
  if (buf) parts.push(buf);
  return parts;
}

function heuristicSegment(text, maxSeconds = 90) {
  const cleaned = (text||'').replace(/\n{2,}/g,'\n').replace(/\s+/g,' ').trim();
  const sentences = cleaned.split(/(?<=[\.!\?])\s+/);
  const segments = [];
  let buf = [];
  let count = 0;
  for (const s of sentences) {
    const words = s.split(/\s+/);
    buf.push(s);
    count += words.length;
    if (count >= 14) { segments.push({ text: buf.join(' ') }); buf = []; count = 0; }
  }
  if (buf.length) segments.push({ text: buf.join(' ') });
  const charLimited = segments.flatMap(s => splitByCharLimit(s.text));
  const normalized = charLimited.map(t => ({ text: t }));
  const trimmed = enforceTimeBudget(normalized, maxSeconds);
  const summary = trimmed.slice(0, 2).map(s => s.text).join(' ');
  const suggestedImages = Math.max(1, Math.round(trimmed.length / 2));
  return { title: '', summary, segments: trimmed, suggestedImages };
}

async function groqSegment(text, maxSeconds = 90) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return heuristicSegment(text, maxSeconds);
  const groq = new Groq({ apiKey });
  const prompt = `Você é editor de telejornal. Produza tópicos curtos, estilo bullet (frases curtas e diretas, 10–18 palavras), prontos para GC. Cada tópico deve ter no máximo ${MAX_CHARS_PER_SEGMENT} caracteres. Mantenha ordem lógica e contexto. Limite a duração total estimada a no máximo ${maxSeconds}s (barra+typewriter). Responda somente com JSON:
{
  "title": "manchete",
  "summary": "resumo de 1 frase",
  "segments": [{"text": "..."}],
  "suggestedImages": 3
}`;
  try {
    const resp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Responda somente com JSON válido.' },
        { role: 'user', content: prompt + "\n\nTEXTO:\n\n" + text }
      ],
      temperature: 0.3,
    });
    const content = resp.choices?.[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(content);
      const split = (parsed.segments || []).flatMap(s => splitByCharLimit(s.text));
      parsed.segments = enforceTimeBudget(split.map(t => ({ text: t })), maxSeconds);
      parsed.suggestedImages = Math.max(1, Math.round((parsed.segments?.length || 0) / 2));
      return parsed;
    } catch {
      return heuristicSegment(text, maxSeconds);
    }
  } catch (err) {
    // Falha na chamada à Groq (chave inválida, rate limit, rede): usar heurística
    return heuristicSegment(text, maxSeconds);
  }
}

async function extractFromUrlOrText({ url, text, maxSeconds = 90 }) {
  let articleText = text || '';
  let title = '';
  if (url) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      const html = await r.text();
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      title = article?.title || dom.window.document.title || '';
      articleText = article?.textContent || dom.window.document.body.textContent || '';
    } catch {
      // Se falhar o fetch/parse, seguimos com o texto já fornecido (se houver)
    }
  }
  if (!articleText.trim()) throw new Error('Texto vazio');
  const segmented = await groqSegment(articleText, maxSeconds);
  if (!segmented.title) segmented.title = title;
  return segmented;
}

export { heuristicSegment, groqSegment, extractFromUrlOrText };
