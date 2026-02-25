import { useState, useEffect } from 'react';
import { getExchangeInfo } from '../services/binance/binancePublicApi';
import type { ExchangeSymbol } from '../types/binance';

export function useBinancePairs() {
  const [pairs, setPairs] = useState<ExchangeSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExchangeInfo()
      .then((symbols) => {
        setPairs(symbols.filter((s) => s.quoteAsset === 'USDT').slice(0, 100));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { pairs, loading, error };
}
