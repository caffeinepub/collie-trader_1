import { loadTradeHistory, saveStatistics } from '../storage/tradeStorage';
import { TradeModality, TradeStatus } from '../../types/trade';
import type { TradeStatistics, ClosedTrade } from '../../types/trade';

function calcStats(trades: ClosedTrade[], modality: TradeModality | 'Overall'): TradeStatistics {
  if (trades.length === 0) {
    return {
      modality,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgRR: 0,
      totalPnl: 0,
      bestTrade: 0,
      worstTrade: 0,
      currentStreak: 0,
      tp1Hits: 0,
      tp2Hits: 0,
      tp3Hits: 0,
      slHits: 0,
      avgHoldDuration: 0,
    };
  }

  const wins = trades.filter((t) => (t.pnl || 0) > 0);
  const losses = trades.filter((t) => (t.pnl || 0) <= 0);
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const pnls = trades.map((t) => t.pnl || 0);
  const bestTrade = Math.max(...pnls);
  const worstTrade = Math.min(...pnls);

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  // Current streak
  let streak = 0;
  const sorted = [...trades].sort((a, b) => (b.closeTime || 0) - (a.closeTime || 0));
  const firstIsWin = (sorted[0]?.pnl || 0) > 0;
  for (const t of sorted) {
    const isWin = (t.pnl || 0) > 0;
    if (isWin === firstIsWin) streak++;
    else break;
  }
  if (!firstIsWin) streak = -streak;

  const tp1Hits = trades.filter((t) => t.tp1Hit).length;
  const tp2Hits = trades.filter((t) => t.tp2Hit).length;
  const tp3Hits = trades.filter((t) => t.status === TradeStatus.TP3Hit).length;
  const slHits = trades.filter((t) => t.status === TradeStatus.SLHit).length;

  const durations = trades
    .filter((t) => t.closeTime && t.openTime)
    .map((t) => ((t.closeTime || 0) - t.openTime) / 60000);
  const avgHoldDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    modality,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    avgRR,
    totalPnl,
    bestTrade,
    worstTrade,
    currentStreak: streak,
    tp1Hits,
    tp2Hits,
    tp3Hits,
    slHits,
    avgHoldDuration,
  };
}

export function calculateAndSaveStats(): TradeStatistics[] {
  const history = loadTradeHistory();
  const modalities = [TradeModality.Scalping, TradeModality.DayTrading, TradeModality.Swing, TradeModality.Position];

  const stats: TradeStatistics[] = modalities.map((m) =>
    calcStats(history.filter((t) => t.modality === m), m)
  );

  const overall = calcStats(history, 'Overall');
  stats.push(overall);

  saveStatistics(stats);
  return stats;
}
