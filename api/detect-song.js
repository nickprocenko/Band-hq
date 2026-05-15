export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] || '';
  const apiToken = process.env.AUDD_API_KEY || '';

  // Rebuild multipart body with api_token injected as a field
  const boundary = (contentType.match(/boundary=([^\s;]+)/) || [])[1];
  let body;
  let ct;

  if (boundary) {
    // Inject api_token field before the first boundary
    const tokenField = `--${boundary}\r\nContent-Disposition: form-data; name="api_token"\r\n\r\n${apiToken}\r\n`;
    body = Buffer.concat([Buffer.from(tokenField), buffer]);
    ct = contentType;
  } else {
    return res.status(400).json({ error: 'expected multipart/form-data' });
  }

  let data;
  try {
    const response = await fetch('https://api.audd.io/', {
      method: 'POST',
      headers: { 'Content-Type': ct },
      body,
    });
    data = await response.json();
  } catch (err) {
    return res.status(502).json({ error: 'audd_unreachable' });
  }

  if (data.status === 'success' && data.result) {
    const r = data.result;
    return res.json({
      title: r.title,
      artist: r.artist,
      album: r.album || null,
      release_date: r.release_date || null,
      spotify_url: r.spotify?.external_urls?.spotify || null,
    });
  }

  return res.json({ error: data.error?.error_code || 'not_found' });
}
