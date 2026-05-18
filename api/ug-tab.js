import { ugFetch } from './_ug-client.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const tabId = parseInt(id, 10);

  if (!id || isNaN(tabId) || tabId <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  try {
    const data = await ugFetch('/tab/info', {
      tab_id: tabId,
      tab_access_type: 'private',
    });

    return res.status(200).json(data);
  } catch (err) {
    const status = err.message.includes('rate limit') ? 503 : 502;
    return res.status(status).json({ error: err.message });
  }
}
