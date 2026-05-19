import { recognizeBytes } from 'shazamio-core';
import Busboy from 'busboy';
import { randomUUID } from 'crypto';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';

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

// shazamio-core doesn't support WebM/Opus (what MediaRecorder sends); convert to MP3 first
function convertToMp3(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegStatic, [
      '-i', 'pipe:0',
      '-acodec', 'libmp3lame', '-ar', '44100', '-ac', '1', '-q:a', '5',
      '-f', 'mp3', 'pipe:1',
    ]);
    const chunks = [];
    ff.stdin.end(inputBuffer);
    ff.stdout.on('data', c => chunks.push(c));
    ff.stdout.on('end', () => resolve(Buffer.concat(chunks)));
    ff.stderr.on('data', () => {});
    ff.on('error', reject);
  });
}

const DALVIK_UAS = [
  'Dalvik/2.1.0 (Linux; U; Android 9; SM-G960F Build/PPR1.180610.011)',
  'Dalvik/2.1.0 (Linux; U; Android 10; SM-G973F Build/QP1A.190711.020)',
  'Dalvik/2.1.0 (Linux; U; Android 11; Pixel 4 Build/RQ3A.210805.001)',
  'Dalvik/2.1.0 (Linux; U; Android 12; SM-S908B Build/SP1A.210812.016)',
];

async function queryShazam(sig) {
  const ua = DALVIK_UAS[Math.floor(Math.random() * DALVIK_UAS.length)];
  const url =
    `https://amp.shazam.com/discovery/v5/en-US/GB/iphone/-/tag/${randomUUID()}/${randomUUID()}` +
    `?sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=true&video=v3`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': 'en-US',
      'Accept-Encoding': 'gzip, deflate',
      'X-Shazam-Platform': 'IPHONE',
      'X-Shazam-AppVersion': '14.1.0',
      'User-Agent': ua,
    },
    body: JSON.stringify({
      timezone: 'Europe/Moscow',
      signature: { uri: sig.uri, samplems: sig.samplems },
      timestamp: Date.now(),
      context: {},
      geolocation: {},
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Shazam ${r.status}: ${text.slice(0, 120)}`);
  }
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

  let mp3Buffer;
  try {
    mp3Buffer = await convertToMp3(audioBuffer);
  } catch (err) {
    return res.status(422).json({ error: 'conversion_failed', detail: String(err) });
  }

  let signatures;
  try {
    signatures = recognizeBytes(new Uint8Array(mp3Buffer));
  } catch (err) {
    return res.status(422).json({ error: 'fingerprint_failed', detail: String(err) });
  }

  if (!signatures || signatures.length === 0) {
    return res.json({ error: 'not_found' });
  }

  let track = null;
  let shazamError = null;
  for (const sig of signatures) {
    try {
      if (!track) {
        const data = await queryShazam(sig);
        if (data?.matches?.[0] && data?.track) track = data.track;
      }
    } catch (e) {
      shazamError = String(e);
    }
    try { sig.free(); } catch {}
  }

  if (!track) {
    if (shazamError) return res.json({ error: 'shazam_unavailable', detail: shazamError });
    return res.json({ error: 'not_found' });
  }

  function cleanTitle(raw) {
    return raw
      .replace(/\s*\(radio edit\)/gi, '')
      .replace(/\s*\(remastered[^)]*\)/gi, '')
      .replace(/\s*\(live[^)]*\)/gi, '')
      .replace(/\s*\(acoustic[^)]*\)/gi, '')
      .replace(/\s*\(feat\.[^)]*\)/gi, '')
      .replace(/\s*\(ft\.[^)]*\)/gi, '')
      .replace(/\s*-\s*remastered\s*\d*/gi, '')
      .replace(/\s*\(single version\)/gi, '')
      .replace(/\s*\(album version\)/gi, '')
      .trim();
  }

  const songMeta = track.sections?.find(s => s.type === 'SONG')?.metadata || [];
  const artworkUrl = track.images?.coverarthq || track.images?.coverart || null;
  const spotifyActions = track.hub?.providers?.find(p => p.type === 'SPOTIFY')?.actions || [];
  const spotifyUri = spotifyActions.find(a => a.uri?.startsWith('spotify:track:'))?.uri
    || spotifyActions.find(a => a.uri?.startsWith('https://open.spotify.com/track/'))?.uri
    || null;

  return res.json({
    title: cleanTitle(track.title),
    artist: track.subtitle,
    album: songMeta.find(m => m.title === 'Album')?.text || null,
    release_date: songMeta.find(m => m.title === 'Released')?.text || null,
    spotify_url: spotifyUri,
    artwork_url: artworkUrl,
  });
}
