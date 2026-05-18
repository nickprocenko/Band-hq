import { ugFetch } from './_ug-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  try {
    const data = await ugFetch('/tab/url', { url });
    return res.status(200).json({
      id: data.id,
      song_name: data.song_name,
      artist_name: data.artist_name,
      type: data.type,
      type_name: data.type_name,
      version: data.version,
      tonality_name: data.tonality_name,
    });
  } catch (err) {
    const status = err.message.includes('rate limit') ? 503 : 502;
    return res.status(status).json({ error: err.message });
  }
}
