import { createHash } from 'crypto';
import { randomBytes } from 'crypto';

const UG_API_BASE = 'https://api.ultimate-guitar.com/api/v1';
const UG_USER_AGENT = 'UGT_ANDROID/4.11.1 (Pixel; 8.1.0)';

function generateDeviceId() {
  return randomBytes(8).toString('hex').slice(0, 16);
}

function generateApiKey(deviceId) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  const payload = `${deviceId}${date}:${hour}createLog()`;
  return createHash('md5').update(payload).digest('hex');
}

export function buildHeaders() {
  const deviceId = generateDeviceId();
  return {
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
    'Connection': 'close',
    'User-Agent': UG_USER_AGENT,
    'X-UG-CLIENT-ID': deviceId,
    'X-UG-API-KEY': generateApiKey(deviceId),
  };
}

export async function ugFetch(path, params = {}) {
  const url = new URL(`${UG_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      v.forEach((val) => url.searchParams.append(k, val));
    } else {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: buildHeaders(),
    // 8 second timeout leaves headroom within Vercel's 10s limit
    signal: AbortSignal.timeout(8000),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`UG API returned non-JSON (${res.status}). Possible rate limit.`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UG API error ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}
