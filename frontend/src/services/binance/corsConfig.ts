/**
 * CORS Proxy Configuration
 *
 * TEMPORARY WORKAROUND: Browser-based apps cannot make authenticated requests
 * directly to fapi.binance.com due to CORS restrictions. All Binance API calls
 * are routed through this public proxy until a backend relay or permanent
 * solution is implemented.
 *
 * ⚠️  SECURITY NOTE: The HMAC-SHA256 signature is still generated client-side.
 * Only the signed request (with headers/query params) passes through the proxy.
 * API key and secret are never sent as standalone values to the proxy.
 *
 * corsproxy.io requires the target URL as a `url=` query parameter (URL-encoded).
 * Format: https://corsproxy.io/?url=<encodeURIComponent(targetUrl)>
 *
 * To switch proxies or remove the proxy entirely, change CORS_PROXY_URL here.
 * Setting it to '' will disable proxying and send requests directly to Binance.
 */
export const CORS_PROXY_URL = 'https://corsproxy.io/?url=';
