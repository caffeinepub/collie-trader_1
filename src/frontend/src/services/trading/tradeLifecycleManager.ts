import { TradeStatus, TradeDirection } from '../../types/trade';
import type { Trade, ClosedTrade } from '../../types/trade';
import { appendClosedTrade } from '../storage/tradeStorage';
import { calculateAndSaveStats } from '../statistics/performanceTracker';

export function calculatePnL(trade: Trade, currentPrice: number): { pnl: number; pnlPercent: number } {
  const isLong = trade.direction === TradeDirection.LONG;
  const priceDiff = isLong ? currentPrice - trade.entry : trade.entry - currentPrice;
  const pnlPercent = (priceDiff / trade.entry) * 100;
  const pnl = (priceDiff / trade.entry) * trade.positionSize;
  return { pnl, pnlPercent };
}

export function checkTPSL(
  trade: Trade,
  currentPrice: number
): { updated: Trade; closed: boolean; closedTrade?: ClosedTrade } {
  let updated = { ...trade };
  const isLong = trade.direction === TradeDirection.LONG;

  // Check SL
  const slHit = isLong ? currentPrice <= updated.currentSL : currentPrice >= updated.currentSL;
  if (slHit) {
    const { pnl, pnlPercent } = calculatePnL(trade, updated.currentSL);
    const closedTrade: ClosedTrade = {
      ...updated,
      status: TradeStatus.SLHit,
      closeTime: Date.now(),
      closePrice: updated.currentSL,
      pnl,
      pnlPercent,
    };
    appendClosedTrade(closedTrade);
    calculateAndSaveStats();
    return { updated, closed: true, closedTrade };
  }

  // Check TP3
  const tp3Hit = isLong ? currentPrice >= updated.tp3 : currentPrice <= updated.tp3;
  if (tp3Hit && !updated.tp3Hit) {
    const { pnl, pnlPercent } = calculatePnL(trade, updated.tp3);
    const closedTrade: ClosedTrade = {
      ...updated,
      status: TradeStatus.TP3Hit,
      tp1Hit: true,
      tp2Hit: true,
      tp3Hit: true,
      closeTime: Date.now(),
      closePrice: updated.tp3,
      pnl,
      pnlPercent,
    };
    appendClosedTrade(closedTrade);
    calculateAndSaveStats();
    return { updated, closed: true, closedTrade };
  }

  // Check TP2
  const tp2Hit = isLong ? currentPrice >= updated.tp2 : currentPrice <= updated.tp2;
  if (tp2Hit && !updated.tp2Hit) {
    updated = {
      ...updated,
      tp2Hit: true,
      status: TradeStatus.TP2Hit,
    };
  }

  // Check TP1
  const tp1Hit = isLong ? currentPrice >= updated.tp1 : currentPrice <= updated.tp1;
  if (tp1Hit && !updated.tp1Hit) {
    updated = {
      ...updated,
      tp1Hit: true,
      status: TradeStatus.TP1Hit,
      currentSL: updated.entry, // Move SL to breakeven
    };
  }

  return { updated, closed: false };
}

export function manuallyCloseTrade(trade: Trade, currentPrice: number): ClosedTrade {
  const { pnl, pnlPercent } = calculatePnL(trade, currentPrice);
  const closedTrade: ClosedTrade = {
    ...trade,
    status: TradeStatus.ManuallyClosed,
    closeTime: Date.now(),
    closePrice: currentPrice,
    pnl,
    pnlPercent,
  };
  appendClosedTrade(closedTrade);
  calculateAndSaveStats();
  return closedTrade;
}
