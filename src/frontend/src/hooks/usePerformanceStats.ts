import { useState, useCallback, useEffect } from 'react';
import { calculateAndSaveStats } from '../services/statistics/performanceTracker';
import { loadStatistics } from '../services/storage/tradeStorage';
import type { TradeStatistics } from '../types/trade';

export function usePerformanceStats() {
  const [stats, setStats] = useState<TradeStatistics[]>(() => {
    const saved = loadStatistics();
    return saved.length > 0 ? saved : calculateAndSaveStats();
  });

  const refresh = useCallback(() => {
    const newStats = calculateAndSaveStats();
    setStats(newStats);
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  const getModalityStats = useCallback(
    (modality: string) => stats.find((s) => s.modality === modality),
    [stats]
  );

  const overallStats = stats.find((s) => s.modality === 'Overall');

  return { stats, refresh, getModalityStats, overallStats };
}
