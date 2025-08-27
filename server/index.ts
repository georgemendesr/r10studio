import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import Groq from 'groq-sdk';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

type Segment = {
	text: string;
	rationale?: string;
};

type ExtractionResult = {
	title: string;
	summary: string;
	segments: Segment[];
	suggestedImages: number;
};

const BAR_MS = 900;
const HOLD_MS = 600;
const CHAR_MS = 35;
const MAX_CHARS_PER_SEGMENT = 120;

function estimateMsForText(t: string): number {
	const len = (t || '').length;
	return BAR_MS + HOLD_MS + Math.max(800, Math.round(len * CHAR_MS));
}

function enforceTimeBudget(segments: Segment[], maxSeconds = 90): Segment[] {
	const budget = maxSeconds * 1000;
	const kept: Segment[] = [];
	let acc = 0;
	for (const s of segments) {
		const add = estimateMsForText(s.text);
		if (acc + add > budget) break;
		kept.push(s);
		acc += add;
	}
	return kept;
}

function splitByCharLimit(text: string, maxChars = MAX_CHARS_PER_SEGMENT): string[] {
	const words = (text || '').trim().split(/\s+/).filter(Boolean);
	const parts: string[] = [];
	let buf = '';
	for (const w of words) {
		if (buf.length === 0) {
			buf = w;
			continue;
		}
		if ((buf + ' ' + w).length <= maxChars) {
			buf = buf + ' ' + w;
		} else {
			parts.push(buf);
			buf = w;
		}
	}
	if (buf) parts.push(buf);
	return parts;
}

function heuristicSegment(text: string, maxSeconds = 90): ExtractionResult {
	const cleaned = text
		.replace(/\n{2,}/g, '\n')
		.replace(/\s+/g, ' ')
		.trim();
	const sentences = cleaned.split(/(?<=[.!?])\s+/);
	// Agrupar em blocos curtos (10-18 palavras)
	const segments: Segment[] = [];
	let buf: string[] = [];
	let count = 0;
	for (const s of sentences) {
		const words = s.split(/\s+/);
		buf.push(s);
		count += words.length;
		if (count >= 14) {
			segments.push({ text: buf.join(' ') });
			buf = [];
			count = 0;
		}
	}
	if (buf.length) segments.push({ text: buf.join(' ') });
		// Impor limite de caracteres por segmento
		const charLimited = segments.flatMap(s => splitByCharLimit(s.text));
		const normalized: Segment[] = charLimited.map(t => ({ text: t }));
		const trimmed = enforceTimeBudget(normalized, maxSeconds);
	// Sugerir 1 imagem a cada ~2 blocos
	const suggestedImages = Math.max(1, Math.round(trimmed.length / 2));
	const summary = segments.slice(0, 2).map(s => s.text).join(' ');
	return { title: '', summary, segments: trimmed, suggestedImages };
}

async function groqSegment(text: string, maxSeconds = 90): Promise<ExtractionResult> {
	if (!groq) return heuristicSegment(text, maxSeconds);
	const prompt = `Você é editor de telejornal. Produza tópicos curtos, estilo bullet (frases curtas e diretas, 10–18 palavras), prontos para GC. Cada tópico deve ter no máximo ${MAX_CHARS_PER_SEGMENT} caracteres (não ultrapassar). Mantenha ordem lógica e contexto. Limite a duração total estimada do vídeo a no máximo ${maxSeconds}s considerando animação de digitação (barra+typewriter). Devolva JSON:
{
	"title": "manchete curta se houver",
	"summary": "resumo enxuto (1 frase)",
	"segments": [{"text": "..."}],
	"suggestedImages": 3
}
Texto:
"""
${text}
"""`;
		try {
			const resp = await groq.chat.completions.create({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{ role: 'system', content: 'Responda somente com JSON válido.' },
					{ role: 'user', content: prompt },
				],
				temperature: 0.3,
			});
			const content = resp.choices?.[0]?.message?.content || '';
			try {
				const parsed = JSON.parse(content);
				// Impor limite de caracteres e orçamento localmente mesmo após LLM
				const split = (parsed.segments || []).flatMap((s: Segment) => splitByCharLimit(s.text));
				parsed.segments = enforceTimeBudget(split.map(t => ({ text: t })), maxSeconds);
				parsed.suggestedImages = Math.max(1, Math.round((parsed.segments?.length || 0) / 2));
				return parsed;
			} catch {
				return heuristicSegment(text, maxSeconds);
			}
		} catch {
			return heuristicSegment(text, maxSeconds);
		}
}

app.post('/api/extract', async (req, res) => {
	try {
	const { url, text, maxSeconds } = req.body as { url?: string; text?: string; maxSeconds?: number };
		if (!url && !text) return res.status(400).json({ error: 'Informe url ou text' });

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
				} catch (err) {
					console.warn('Falha ao buscar/parsear URL, seguindo com texto bruto se houver');
				}
			}
		if (!articleText.trim()) return res.status(422).json({ error: 'Não foi possível extrair texto' });

		const segmented = await groqSegment(articleText, maxSeconds || 90);
		// Propagar título se vazio
		if (!segmented.title) segmented.title = title;
		return res.json(segmented);
	} catch (e: unknown) {
		console.error('extract error', e);
		return res.status(500).json({ error: 'Falha na extração/segmentação' });
	}
});

app.post('/api/segment', async (req, res) => {
	try {
	const { text, maxSeconds } = req.body as { text: string; maxSeconds?: number };
		if (!text) return res.status(400).json({ error: 'Informe text' });
	const segmented = await groqSegment(text, maxSeconds || 90);
		return res.json(segmented);
	} catch (e: unknown) {
		console.error('segment error', e);
		return res.status(500).json({ error: 'Falha na segmentação' });
	}
});

const PORT = Number(process.env.PORT) || 4501;
app.listen(PORT, () => {
	console.log(`[server] listening on http://localhost:${PORT}`);
});

