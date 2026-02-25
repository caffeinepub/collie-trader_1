# Specification

## Summary
**Goal:** Fix the Position Recovery tab in `PositionRecovery.tsx` so that detected positions remain stable and do not flicker or disappear due to background polling or reactive state updates.

**Planned changes:**
- Decouple the detected positions state from any automatic polling, price updates, or shared context by storing it in a dedicated local `useState([])` variable.
- Populate the detected positions only on initial page mount via a `useEffect` with an empty dependency array (calls `getPositionRisk()` once and runs `positionRecoveryEngine` on the result).
- Ensure the detected positions list is only updated when the user explicitly clicks the Refresh button.
- Keep the Refresh button loading/disabled state during fetch, then restore it after new results are stably stored.
- Show a stable "No positions in critical loss" empty state when no positions meet the threshold.

**User-visible outcome:** Positions with critical losses detected on the Position Recovery tab will remain visible and stable without flickering or spontaneously disappearing, regardless of background activity in other tabs or components.
