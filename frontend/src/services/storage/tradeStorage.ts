import type { Trade, ClosedTrade, TradeStatistics } from '../../types/trade';
import { TradeModality } from '../../types/trade';

const ACTIVE_TRADES_KEY = 'ai_daily_trades';
const TRADE_HISTORY_KEY = 'user_trade_history';
const STATISTICS_KEY = 'trade_statistics';

export function saveActiveTrades(trades: Record<TradeModality, Trade | null>): void {
  try {
    localStorage.setItem(ACTIVE_TRADES_KEY, JSON.stringify(trades));
  } catch (e) {
    console.error('Failed to save active trades:', e);
  }
}

export function loadActiveTrades(): Record<TradeModality, Trade | null> {
  try {
    const data = localStorage.getItem(ACTIVE_TRADES_KEY);
    if (!data) return getEmptyTrades();
    return JSON.parse(data);
  } catch {
    return getEmptyTrades();
  }
}

export function getEmptyTrades(): Record<TradeModality, Trade | null> {
  return {
    [TradeModality.Scalping]: null,
    [TradeModality.DayTrading]: null,
    [TradeModality.Swing]: null,
    [TradeModality.Position]: null,
  };
}

export function appendClosedTrade(trade: ClosedTrade): void {
  try {
    const history = loadTradeHistory();
    history.unshift(trade);
    // Keep last 500 trades
    const trimmed = history.slice(0, 500);
    localStorage.setItem(TRADE_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to append closed trade:', e);
  }
}

export function loadTradeHistory(): ClosedTrade[] {
  try {
    const data = localStorage.getItem(TRADE_HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveStatistics(stats: TradeStatistics[]): void {
  try {
    localStorage.setItem(STATISTICS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save statistics:', e);
  }
}

export function loadStatistics(): TradeStatistics[] {
  try {
    const data = localStorage.getItem(STATISTICS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function clearTradeHistory(): void {
  localStorage.removeItem(TRADE_HISTORY_KEY);
  localStorage.removeItem(STATISTICS_KEY);
}
