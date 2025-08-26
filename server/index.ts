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

function heuristicSegment(text: string): ExtractionResult {
	const cleaned = text
		.replace(/\n{2,}/g, '\n')
		.replace(/\s+/g, ' ')
		.trim();
	const sentences = cleaned.split(/(?<=[\.\!\?])\s+/);
	// Agrupar em blocos de 15-25 palavras
	const segments: Segment[] = [];
	let buf: string[] = [];
	let count = 0;
	for (const s of sentences) {
		const words = s.split(/\s+/);
		buf.push(s);
		count += words.length;
		if (count >= 18) {
			segments.push({ text: buf.join(' ') });
			buf = [];
			count = 0;
		}
	}
	if (buf.length) segments.push({ text: buf.join(' ') });
	// Sugerir 1 imagem a cada 1-2 segmentos dependendo do tamanho
	const suggestedImages = Math.max(1, Math.round(segments.length / 1.5));
	const summary = segments.slice(0, 2).map(s => s.text).join(' ');
	return { title: '', summary, segments, suggestedImages };
}

async function groqSegment(text: string): Promise<ExtractionResult> {
	if (!groq) return heuristicSegment(text);
	const prompt = `Você é um editor de textos de telejornal. Divida o texto abaixo em blocos curtos (2-3 linhas cada, ~15-25 palavras), prontos para GC e leitura, mantendo sentido jornalístico e ordem lógica. Depois, diga quantas imagens seriam ideais para ilustrar (1 imagem a cada 1-2 blocos, sem exagero). Formato JSON:
{
	"title": "manchete curta se houver",
	"summary": "resumo de 1-2 frases",
	"segments": [{"text": "..."}],
	"suggestedImages": 3
}
Texto:
"""
${text}
"""`;
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
		return parsed;
	} catch {
		return heuristicSegment(text);
	}
}

app.post('/api/extract', async (req, res) => {
	try {
		const { url, text } = req.body as { url?: string; text?: string };
		if (!url && !text) return res.status(400).json({ error: 'Informe url ou text' });

		let articleText = text || '';
		let title = '';

		if (url) {
			const r = await fetch(url, { redirect: 'follow' });
			const html = await r.text();
			const dom = new JSDOM(html, { url });
			const reader = new Readability(dom.window.document);
			const article = reader.parse();
			title = article?.title || dom.window.document.title || '';
			articleText = article?.textContent || dom.window.document.body.textContent || '';
		}
		if (!articleText.trim()) return res.status(422).json({ error: 'Não foi possível extrair texto' });

		const segmented = await groqSegment(articleText);
		// Propagar título se vazio
		if (!segmented.title) segmented.title = title;
		return res.json(segmented);
	} catch (e: any) {
		console.error('extract error', e);
		return res.status(500).json({ error: 'Falha na extração/segmentação' });
	}
});

app.post('/api/segment', async (req, res) => {
	try {
		const { text } = req.body as { text: string };
		if (!text) return res.status(400).json({ error: 'Informe text' });
		const segmented = await groqSegment(text);
		return res.json(segmented);
	} catch (e: any) {
		console.error('segment error', e);
		return res.status(500).json({ error: 'Falha na segmentação' });
	}
});

const PORT = Number(process.env.PORT) || 4501;
app.listen(PORT, () => {
	console.log(`[server] listening on http://localhost:${PORT}`);
});

