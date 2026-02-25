# Specification

## Summary
**Goal:** Fix the "Test Connection" flow in `useCredentials.ts` so the Binance account info request is routed exclusively through the single CORS proxy defined in `corsConfig.ts`.

**Planned changes:**
- Update `useCredentials.ts` to call `getAccountInfo` from `binanceAccountService.ts` (or `authenticatedFetch` from `binanceAuth.ts`) instead of any direct fetch to `fapi.binance.com`.
- Ensure the request is routed only through `CORS_PROXY_URL` from `corsConfig.ts` (`corsproxy.io/?`) with no fallback or secondary proxy.
- Keep HMAC-SHA256 signature generation client-side before the request is dispatched.
- Update `Settings.tsx` if needed to display the account balance on success, or a clear human-readable error message on failure.

**User-visible outcome:** Clicking "Test Connection" in Settings correctly routes the Binance account request through the single CORS proxy, shows the account balance on success, and displays a clear error message on failure.
