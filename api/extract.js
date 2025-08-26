const { extractFromUrlOrText } = require('./_segmenter');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { url, text, maxSeconds } = req.body || {};
    const result = await extractFromUrlOrText({ url, text, maxSeconds: maxSeconds || 90 });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Falha na extração/segmentação' });
  }
};
