# Specification

## Summary
**Goal:** Revert the Collie Trader frontend to its exact Version 2 state by removing all CORS proxy logic and AI auto-pair-selection features introduced after Version 2.

**Planned changes:**
- Rewrite `binanceAuth.ts` to call `fapi.binance.com` directly with HMAC-SHA256 signatures, `X-MBX-APIKEY` header, and 15-second timeout — no proxy logic
- Rewrite `binancePublicApi.ts` to call all public Binance Futures endpoints directly without any proxy
- Rewrite `binanceAccountService.ts` to use `authenticatedFetch` and call Binance endpoints directly without any proxy
- Delete `corsConfig.ts` and remove all imports of it from any module
- Rewrite `useCredentials.ts` so Test Connection calls `getAccountInfo` directly, with simple success/failure messaging and no proxy references
- Rewrite `Settings.tsx` to show only API Key/Secret inputs, Test Connection button, and Live Trading toggle — no proxy-related UI
- Delete `pairScoringEngine.ts` and remove all imports of it from any module
- Rewrite `aiTradeSelection.ts` to accept a `symbol` parameter and apply SMC logic (BOS, FVG, Order Blocks) for trade setup generation — no auto-pair-selection
- Rewrite `ModalityCard.tsx` to remove "Pair Selection Rationale" tooltip and "Scanning market..." indicator; show simple "No active trade" empty state
- Rewrite `Dashboard.tsx` to display 4 modality cards in a grid, imported Binance positions below, and a chart per active trade — no scanning indicator or auto-pair-selection UI

**User-visible outcome:** The application behaves exactly as Version 2: Binance API calls are made directly without proxies, the dashboard shows 4 modality cards simultaneously without scanning animations, and the Settings page has no proxy-related UI.
