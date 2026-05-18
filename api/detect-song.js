import { recognizeBytes } from 'shazamio-core';
import Busboy from 'busboy';
import { randomUUID } from 'crypto';

export const config = { api: { bodyParser: false } };

function extractAudio(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    let buf = null;
    bb.on('file', (_, stream) => {
      const chunks = [];
      stream.on('data', c => chunks.push(c));
      stream.on('end', () => { buf = Buffer.concat(chunks); });
    });
    bb.on('finish', () => resolve(buf));
    bb.on('error', reject);
    req.pipe(bb);
  });
}

async function queryShazam(sig) {
  const url = `https://amp.shazam.com/discovery/v5/en-US/GB/android/-/tag/${randomUUID()}/${randomUUID()}/`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'Dalvik/2.1.0',
    },
    body: JSON.stringify({
      timezone: 'Europe/London',
      signature: { uri: sig.uri, samplems: sig.samplems },
      timestamp: Date.now(),
      context: {},
      geolocation: {},
    }),
  });
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let audioBuffer;
  try {
    audioBuffer = await extractAudio(req);
  } catch {
    return res.status(400).json({ error: 'parse_failed' });
  }

  if (!audioBuffer || audioBuffer.length < 1000) {
    return res.status(400).json({ error: 'no_audio' });
  }

  let signatures;
  try {
    signatures = recognizeBytes(new Uint8Array(audioBuffer));
  } catch (err) {
    return res.status(422).json({ error: 'fingerprint_failed', detail: String(err) });
  }

  if (!signatures || signatures.length === 0) {
    return res.json({ error: 'not_found' });
  }

  let track = null;
  for (const sig of signatures) {
    try {
      if (!track) {
        const data = await queryShazam(sig);
        if (data?.matches?.[0] && data?.track) track = data.track;
      }
    } catch {}
    try { sig.free(); } catch {}
  }

  if (!track) return res.json({ error: 'not_found' });

  const songMeta = track.sections?.find(s => s.type === 'SONG')?.metadata || [];
  const artworkUrl = track.images?.coverarthq || track.images?.coverart || null;
  const spotifyUri = track.hub?.providers?.find(p => p.type === 'SPOTIFY')?.actions?.[0]?.uri || null;

  return res.json({
    title: track.title,
    artist: track.subtitle,
    album: songMeta.find(m => m.title === 'Album')?.text || null,
    release_date: songMeta.find(m => m.title === 'Released')?.text || null,
    spotify_url: spotifyUri,
    artwork_url: artworkUrl,
  });
}
