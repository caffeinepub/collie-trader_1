import { getKlines } from '../binance/binancePublicApi';
import { parseKlines, detectBOS, detectFVG, detectOrderBlocks, calculateATR } from './smcIndicators';
import { TradeModality, TradeDirection } from '../../types/trade';
import type { TradeSetup } from '../../types/trade';

export const MODALITY_PRIMARY_INTERVAL: Record<TradeModality, string> = {
  [TradeModality.Scalping]: '5m',
  [TradeModality.DayTrading]: '1h',
  [TradeModality.Swing]: '4h',
  [TradeModality.Position]: '1d',
};

const DEFAULT_SYMBOLS: Record<TradeModality, string> = {
  [TradeModality.Scalping]: 'BTCUSDT',
  [TradeModality.DayTrading]: 'ETHUSDT',
  [TradeModality.Swing]: 'SOLUSDT',
  [TradeModality.Position]: 'BTCUSDT',
};

export async function generateTradeSetup(
  modality: TradeModality,
  symbol?: string
): Promise<TradeSetup | null> {
  const targetSymbol = symbol || DEFAULT_SYMBOLS[modality];
  const interval = MODALITY_PRIMARY_INTERVAL[modality];

  try {
    const klines = await getKlines(targetSymbol, interval, 100);
    const candles = parseKlines(klines);

    if (candles.length < 20) return null;

    const currentPrice = candles[candles.length - 1].close;
    const atr = calculateATR(candles, 14);

    if (atr === 0) return null;

    const bos = detectBOS(candles);
    const fvg = detectFVG(candles);
    const ob = detectOrderBlocks(candles);

    let direction: TradeDirection | null = null;
    let entryReason = '';
    let entryPrice = currentPrice;

    // Determine direction from SMC signals
    if (bos.detected && bos.direction === 'bullish') {
      direction = TradeDirection.LONG;
      entryReason = `BOS Bullish on ${interval}`;
    } else if (bos.detected && bos.direction === 'bearish') {
      direction = TradeDirection.SHORT;
      entryReason = `BOS Bearish on ${interval}`;
    } else if (fvg.detected && fvg.direction === 'bullish') {
      direction = TradeDirection.LONG;
      entryPrice = fvg.midpoint;
      entryReason = `FVG Bullish on ${interval}`;
    } else if (fvg.detected && fvg.direction === 'bearish') {
      direction = TradeDirection.SHORT;
      entryPrice = fvg.midpoint;
      entryReason = `FVG Bearish on ${interval}`;
    } else if (ob.detected && ob.direction === 'bullish') {
      direction = TradeDirection.LONG;
      entryPrice = ob.midpoint;
      entryReason = `Order Block Bullish on ${interval}`;
    } else if (ob.detected && ob.direction === 'bearish') {
      direction = TradeDirection.SHORT;
      entryPrice = ob.midpoint;
      entryReason = `Order Block Bearish on ${interval}`;
    } else {
      // Fallback: use trend direction from recent candles
      const recentCloses = candles.slice(-10).map((c) => c.close);
      const trend = recentCloses[recentCloses.length - 1] > recentCloses[0];
      direction = trend ? TradeDirection.LONG : TradeDirection.SHORT;
      entryReason = trend ? 'Trend Continuation Long' : 'Trend Continuation Short';
    }

    // Use current price if entry is too far
    if (Math.abs(entryPrice - currentPrice) / currentPrice > 0.02) {
      entryPrice = currentPrice;
    }

    const slDistance = atr * 1.5;
    const stopLoss =
      direction === TradeDirection.LONG
        ? entryPrice - slDistance
        : entryPrice + slDistance;

    const tp1 =
      direction === TradeDirection.LONG
        ? entryPrice + slDistance * 1.5
        : entryPrice - slDistance * 1.5;
    const tp2 =
      direction === TradeDirection.LONG
        ? entryPrice + slDistance * 2.5
        : entryPrice - slDistance * 2.5;
    const tp3 =
      direction === TradeDirection.LONG
        ? entryPrice + slDistance * 4
        : entryPrice - slDistance * 4;

    const rrRatio = Math.abs(tp2 - entryPrice) / Math.abs(entryPrice - stopLoss);

    return {
      symbol: targetSymbol,
      direction,
      entry: entryPrice,
      tp1,
      tp2,
      tp3,
      stopLoss,
      modality,
      interval,
      entryReason,
      rrRatio,
    };
  } catch (error) {
    console.error(`Failed to generate trade setup for ${targetSymbol}:`, error);
    return null;
  }
}
