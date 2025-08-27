import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import Groq from 'groq-sdk';

class RobustExtractor {
  constructor() {
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    }
  }

  // Divide texto quando Groq falha
  heuristicSegment(text, maxSegments = 8) {
    if (!text || text.trim().length === 0) {
      return ['Conteúdo não disponível'];
    }

    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.,!?;:-]/g, '')
      .trim();

    if (cleanText.length < 50) {
      return [cleanText];
    }

    // Tenta dividir por parágrafos primeiro
    const paragraphs = cleanText
      .split(/\n\s*\n|\. [A-Z]/)
      .filter(p => p.trim().length > 20)
      .map(p => p.trim());

    if (paragraphs.length <= maxSegments && paragraphs.length >= 2) {
      return paragraphs.slice(0, maxSegments);
    }

    // Se não deu certo, divide por sentenças
    const sentences = cleanText
      .split(/[.!?]+\s+/)
      .filter(s => s.trim().length > 15)
      .map(s => s.trim() + (s.endsWith('.') ? '' : '.'));

    if (sentences.length <= maxSegments) {
      return sentences;
    }

    // Agrupa sentenças em segmentos
    const segments = [];
    let currentSegment = '';
    const targetLength = Math.ceil(cleanText.length / maxSegments);

    for (const sentence of sentences) {
      if (currentSegment.length + sentence.length <= targetLength * 1.5) {
        currentSegment += (currentSegment ? ' ' : '') + sentence;
      } else {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = sentence;
        }
      }
      
      if (segments.length >= maxSegments - 1) {
        break;
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments.length > 0 ? segments : [cleanText.slice(0, 200) + '...'];
  }

  // Pega conteúdo de URL com headers melhores
  async extractContentFromUrl(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Não foi possível extrair o conteúdo');
      }

      return {
        title: article.title || 'Sem título',
        content: article.textContent || article.content || ''
      };

    } catch (error) {
      throw new Error(`Falha ao extrair URL: ${error.message}`);
    }
  }

  // Usa Groq para segmentar
  async groqSegment(content) {
    if (!this.groq) {
      throw new Error('Groq não disponível');
    }

    try {
      const prompt = `Divida este texto em 6-8 segmentos para stories. Cada segmento deve ter 10-25 palavras e ser impactante:

"${content.slice(0, 2000)}"

Responda apenas com os segmentos, um por linha.`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 500,
      });

      const result = completion.choices[0]?.message?.content;
      
      if (!result) {
        throw new Error('Resposta vazia do Groq');
      }

      const segments = result
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 5)
        .slice(0, 8);

      if (segments.length < 2) {
        throw new Error('Poucos segmentos gerados');
      }

      return segments;

    } catch (error) {
      throw new Error(`Groq falhou: ${error.message}`);
    }
  }

  // Método principal - sempre retorna algo
  async extract(urlOrText) {
    let title = '';
    let content = '';

    // 1. Extrai conteúdo
    const isUrl = urlOrText.startsWith('http://') || urlOrText.startsWith('https://');
    
    if (isUrl) {
      try {
        const extracted = await this.extractContentFromUrl(urlOrText);
        title = extracted.title;
        content = extracted.content;
      } catch (error) {
        console.warn('URL extraction failed:', error.message);
        // Continua sem dar erro - vai usar fallback
      }
    } else {
      content = urlOrText;
      title = 'Conteúdo customizado';
    }

    // Se não tem conteúdo suficiente, retorna erro claro
    if (!content || content.trim().length < 10) {
      return {
        success: false,
        method: 'fallback',
        error: 'Não foi possível extrair conteúdo. Cole o texto diretamente.'
      };
    }

    // 2. Tenta Groq primeiro
    try {
      const segments = await this.groqSegment(content);
      return {
        success: true,
        title,
        content,
        segments,
        method: 'groq'
      };
    } catch (groqError) {
      console.warn('Groq failed, using heuristic:', groqError.message);
    }

    // 3. Sempre funciona com fallback
    try {
      const segments = this.heuristicSegment(content);
      return {
        success: true,
        title,
        content,
        segments,
        method: 'heuristic'
      };
    } catch (error) {
      return {
        success: false,
        method: 'fallback',
        error: 'Erro na segmentação. Tente um texto diferente.'
      };
    }
  }
}

// Handler da API - sempre retorna resposta
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({
      success: false,
      method: 'fallback',
      error: 'Método não permitido'
    });
  }

  try {
    const { url, text } = req.body;
    const input = url || text;

    if (!input || typeof input !== 'string') {
      return res.status(200).json({
        success: false,
        method: 'fallback',
        error: 'URL ou texto é obrigatório'
      });
    }

    const extractor = new RobustExtractor();
    const result = await extractor.extract(input.trim());

    return res.status(200).json(result);

  } catch (error) {
    console.error('Extract API error:', error);
    
    return res.status(200).json({
      success: false,
      method: 'fallback',
      error: 'Erro interno. Cole o texto diretamente.'
    });
  }
}
