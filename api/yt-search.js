export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'q parameter is required' });
  }

  try {
    const r = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );

    if (!r.ok) {
      return res.status(502).json({ error: `YouTube returned ${r.status}` });
    }

    const html = await r.text();

    const videos = [];
    const seen = new Set();
    const re = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{0,2000}?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/g;
    let match;
    while ((match = re.exec(html)) !== null && videos.length < 5) {
      const [, id, rawTitle] = match;
      if (seen.has(id)) continue;
      seen.add(id);
      let title = rawTitle;
      try {
        title = JSON.parse(`"${rawTitle}"`);
      } catch {}
      videos.push({ id, title });
    }

    // Fallback: grab bare videoIds if the renderer regex found nothing
    if (!videos.length) {
      const idRe = /"videoId":"([\w-]{11})"/g;
      while ((match = idRe.exec(html)) !== null && videos.length < 5) {
        if (seen.has(match[1])) continue;
        seen.add(match[1]);
        videos.push({ id: match[1], title: null });
      }
    }

    if (!videos.length) {
      return res.status(404).json({ error: 'No videos found' });
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ videos });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
