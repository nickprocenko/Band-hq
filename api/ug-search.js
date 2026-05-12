import { ugFetch } from './_ug-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, type = '300', page = '1' } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'q parameter is required' });
  }

  try {
    const data = await ugFetch('/tab/search', {
      title: q.trim(),
      'type[]': type,
      page,
    });

    const tabs = (data.tabs || []).map((tab) => ({
      id: tab.id,
      song_name: tab.song_name,
      artist_name: tab.artist_name,
      type: tab.type,
      type_name: tab.type_name,
      version: tab.version,
      rating: tab.rating,
      votes: tab.votes,
      tonality_name: tab.tonality_name,
      difficulty: tab.difficulty,
      url_web: tab.tab_url,
    }));

    return res.status(200).json({ tabs, artists: data.artists || [] });
  } catch (err) {
    const status = err.message.includes('rate limit') ? 503 : 502;
    return res.status(status).json({ error: err.message });
  }
}
