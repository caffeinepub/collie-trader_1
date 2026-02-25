# Specification

## Summary
**Goal:** Wire the Refresh button on the Position Recovery page to actually fetch live position data from Binance and re-run the recovery engine.

**Planned changes:**
- Call `getPositionRisk()` from `binanceAccountService.ts` when the Refresh button is clicked, hitting `GET /fapi/v2/positionRisk` via `authenticatedFetch`
- Re-execute `positionRecoveryEngine` with the freshly fetched positions to detect those with unrealized loss exceeding 20%
- Update the displayed list of recovery candidates with the new results
- Show a loading spinner and disable the Refresh button while the operation is in progress, restoring to normal on completion or error
- Show an error message if the fetch fails
- Show a warning or disabled state with tooltip if API credentials are not configured in localStorage

**User-visible outcome:** Clicking Refresh on the Position Recovery page now fetches real-time position data from Binance, re-evaluates deeply negative positions, and updates the list — with visible loading feedback and proper error handling.
