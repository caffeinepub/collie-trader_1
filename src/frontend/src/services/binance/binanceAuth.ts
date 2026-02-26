const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';

export function getCredentials(): { apiKey: string; apiSecret: string } {
  return {
    apiKey: localStorage.getItem('binance_api_key') || '',
    apiSecret: localStorage.getItem('binance_api_secret') || '',
  };
}

export function saveCredentials(apiKey: string, apiSecret: string): void {
  localStorage.setItem('binance_api_key', apiKey);
  localStorage.setItem('binance_api_secret', apiSecret);
}

export function hasCredentials(): boolean {
  const { apiKey, apiSecret } = getCredentials();
  return apiKey.length > 0 && apiSecret.length > 0;
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => ('00' + b.toString(16)).slice(-2))
    .join('');
}

/**
 * Authenticated fetch for Binance Futures private endpoints.
 * HMAC-SHA256 signature is generated client-side before the request is dispatched.
 * Calls fapi.binance.com directly.
 */
export async function authenticatedFetch(
  path: string,
  params: Record<string, string | number | boolean> = {},
  method: 'GET' | 'POST' | 'DELETE' = 'GET'
): Promise<Response> {
  const { apiKey, apiSecret } = getCredentials();
  if (!apiKey || !apiSecret) {
    throw new Error('Binance API credentials not configured');
  }

  const timestamp = Date.now();
  const allParams = { ...params, timestamp };
  const queryString = Object.entries(allParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const signature = await hmacSha256(apiSecret, queryString);
  const fullQuery = `${queryString}&signature=${signature}`;

  const url =
    method === 'GET' || method === 'DELETE'
      ? `${BINANCE_FUTURES_BASE}${path}?${fullQuery}`
      : `${BINANCE_FUTURES_BASE}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    return await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'X-MBX-APIKEY': apiKey,
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: method === 'POST' ? fullQuery : undefined,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Public (unauthenticated) fetch for Binance Futures public endpoints.
 * Calls fapi.binance.com directly.
 */
export async function publicFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export { BINANCE_FUTURES_BASE };
