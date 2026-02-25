import { useState, useCallback } from 'react';
import { TradeModality } from '../types/trade';
import { isLiveModeAllowed } from '../services/trading/orderExecutor';

const STORAGE_KEYS: Record<TradeModality, string> = {
  [TradeModality.Scalping]: 'modality_mode_scalping',
  [TradeModality.DayTrading]: 'modality_mode_daytrading',
  [TradeModality.Swing]: 'modality_mode_swing',
  [TradeModality.Position]: 'modality_mode_position',
};

function loadMode(modality: TradeModality): boolean {
  return localStorage.getItem(STORAGE_KEYS[modality]) === 'live';
}

export function useModalityMode() {
  const [modes, setModes] = useState<Record<TradeModality, boolean>>(() => ({
    [TradeModality.Scalping]: loadMode(TradeModality.Scalping),
    [TradeModality.DayTrading]: loadMode(TradeModality.DayTrading),
    [TradeModality.Swing]: loadMode(TradeModality.Swing),
    [TradeModality.Position]: loadMode(TradeModality.Position),
  }));

  const toggleMode = useCallback((modality: TradeModality) => {
    if (!isLiveModeAllowed()) return;
    setModes((prev) => {
      const newMode = !prev[modality];
      localStorage.setItem(STORAGE_KEYS[modality], newMode ? 'live' : 'simulated');
      return { ...prev, [modality]: newMode };
    });
  }, []);

  const isLive = useCallback(
    (modality: TradeModality) => modes[modality] && isLiveModeAllowed(),
    [modes]
  );

  return { modes, toggleMode, isLive, canGoLive: isLiveModeAllowed() };
}
