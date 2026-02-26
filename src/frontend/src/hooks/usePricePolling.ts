import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllTickerPrices, getTickerPrice } from '../services/binance/binancePublicApi';

export function usePricePolling(symbols: string[], intervalMs = 5000) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return;
    try {
      if (symbols.length === 1) {
        const price = await getTickerPrice(symbols[0]);
        setPrices((prev) => ({ ...prev, [symbols[0]]: price }));
      } else {
        const all = await getAllTickerPrices();
        const filtered: Record<string, number> = {};
        for (const sym of symbols) {
          if (all[sym]) filtered[sym] = all[sym];
        }
        setPrices((prev) => ({ ...prev, ...filtered }));
      }
      setLastUpdate(Date.now());
    } catch {
      // Silently fail on polling errors
    }
  }, [symbols]);

  useEffect(() => {
    if (symbols.length === 0) return;
    setIsPolling(true);
    fetchPrices();
    timerRef.current = setInterval(fetchPrices, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPolling(false);
    };
  }, [fetchPrices, intervalMs, symbols.join(',')]);

  return { prices, lastUpdate, isPolling, refetch: fetchPrices };
}
