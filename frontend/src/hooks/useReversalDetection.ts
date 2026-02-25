import { useState, useCallback, useEffect } from 'react';
import { checkReversalSignals } from '../services/ai/marketReversalDetector';
import type { Trade, ReversalSignal } from '../types/trade';
import { TradeModality } from '../types/trade';

export function useReversalDetection(
  trades: Record<TradeModality, Trade | null>,
  prices: Record<string, number>
) {
  const [reversalSignals, setReversalSignals] = useState<ReversalSignal[]>([]);
  const [dismissedSignals, setDismissedSignals] = useState<Set<string>>(new Set());

  useEffect(() => {
    const activeTrades = Object.values(trades).filter(Boolean) as Trade[];
    if (activeTrades.length === 0) return;

    const checkAll = async () => {
      const newSignals: ReversalSignal[] = [];
      for (const trade of activeTrades) {
        const signal = await checkReversalSignals(trade);
        if (signal && !dismissedSignals.has(`${signal.tradeId}_${signal.type}`)) {
          newSignals.push(signal);
        }
      }
      if (newSignals.length > 0) {
        setReversalSignals((prev) => {
          const existingIds = new Set(prev.map((s) => `${s.tradeId}_${s.type}`));
          const fresh = newSignals.filter((s) => !existingIds.has(`${s.tradeId}_${s.type}`));
          return [...prev, ...fresh];
        });
      }
    };

    // Check every 30 seconds
    const timer = setInterval(checkAll, 30000);
    return () => clearInterval(timer);
  }, [trades, dismissedSignals]);

  const dismissSignal = useCallback((signal: ReversalSignal) => {
    setDismissedSignals((prev) => new Set([...prev, `${signal.tradeId}_${signal.type}`]));
    setReversalSignals((prev) =>
      prev.filter((s) => !(s.tradeId === signal.tradeId && s.type === signal.type))
    );
  }, []);

  const activeSignal = reversalSignals[0] || null;

  return { activeSignal, reversalSignals, dismissSignal };
}
