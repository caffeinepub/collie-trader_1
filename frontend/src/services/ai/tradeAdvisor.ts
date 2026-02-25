import type { Trade } from '../../types/trade';

export interface TradeAdvice {
  type: 'tighten_sl' | 'take_partial' | 'hold' | 'close_early' | 'add_position';
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
}

export function getTradeAdvice(trade: Trade, currentPrice: number): TradeAdvice[] {
  const advice: TradeAdvice[] = [];
  const isLong = trade.direction === 'LONG';
  const pnlPercent = isLong
    ? ((currentPrice - trade.entry) / trade.entry) * 100
    : ((trade.entry - currentPrice) / trade.entry) * 100;

  const distToTP1 = Math.abs(currentPrice - trade.tp1) / Math.abs(trade.tp1 - trade.entry);
  const distToSL = Math.abs(currentPrice - trade.currentSL) / Math.abs(trade.entry - trade.currentSL);

  // Tighten SL advice
  if (pnlPercent > 3 && !trade.tp1Hit) {
    advice.push({
      type: 'tighten_sl',
      title: 'Tighten Stop Loss',
      description: `Trade is ${pnlPercent.toFixed(1)}% in profit. Consider moving SL to breakeven to protect gains.`,
      urgency: 'medium',
    });
  }

  // Take partial profit
  if (distToTP1 < 0.15 && !trade.tp1Hit) {
    advice.push({
      type: 'take_partial',
      title: 'Near TP1 — Take Partial',
      description: `Price is within 15% of TP1. Consider taking 30-50% partial profit now.`,
      urgency: 'high',
    });
  }

  // Close early if near SL
  if (distToSL < 0.1) {
    advice.push({
      type: 'close_early',
      title: 'Near Stop Loss',
      description: `Price is dangerously close to your stop loss. Consider closing early to minimize loss.`,
      urgency: 'high',
    });
  }

  // Hold advice
  if (trade.tp1Hit && !trade.tp2Hit) {
    advice.push({
      type: 'hold',
      title: 'TP1 Hit — Hold for TP2',
      description: `TP1 achieved. SL moved to breakeven. Hold position for TP2 target.`,
      urgency: 'low',
    });
  }

  if (advice.length === 0) {
    advice.push({
      type: 'hold',
      title: 'Hold Position',
      description: `Trade is progressing normally. Monitor price action and wait for TP levels.`,
      urgency: 'low',
    });
  }

  return advice;
}
