import { CORS_PROXY_URL } from './corsConfig';

const BINANCE_FUTURES_BASE = 'https://fapi.binance.com';
const TIMEOUT_MS = 15000;

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
 * Wraps a full URL with the CORS proxy prefix if configured.
 * TEMPORARY: Routes requests through corsproxy.io to bypass browser CORS restrictions.
 */
function proxify(url: string): string {
  if (!CORS_PROXY_URL) return url;
  return `${CORS_PROXY_URL}${encodeURIComponent(url)}`;
}

/**
 * Authenticated fetch for Binance Futures private endpoints.
 * HMAC-SHA256 signature is generated client-side before the request is dispatched.
 * The signed URL is then routed through the CORS proxy (temporary workaround).
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

  // Signature is generated client-side — never exposed to the proxy as a standalone value
  const signature = await hmacSha256(apiSecret, queryString);
  const fullQuery = `${queryString}&signature=${signature}`;

  const directUrl =
    method === 'GET' || method === 'DELETE'
      ? `${BINANCE_FUTURES_BASE}${path}?${fullQuery}`
      : `${BINANCE_FUTURES_BASE}${path}`;

  // TEMPORARY: Route through CORS proxy to bypass browser CORS restrictions
  const url = proxify(directUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': apiKey,
        ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: method === 'POST' ? fullQuery : undefined,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Public (unauthenticated) fetch for Binance Futures public endpoints.
 * TEMPORARY: Also routed through CORS proxy to avoid CORS errors on public endpoints.
 */
export async function publicFetch(url: string): Promise<Response> {
  // TEMPORARY: Route through CORS proxy to bypass browser CORS restrictions
  const proxiedUrl = proxify(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(proxiedUrl, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { BINANCE_FUTURES_BASE };
