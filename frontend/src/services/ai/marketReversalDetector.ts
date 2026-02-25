import { parseKlines, detectCHOCH, detectOrderBlocks } from './smcIndicators';
import { getKlines } from '../binance/binancePublicApi';
import type { Kline } from '../../types/binance';
import type { Trade, ReversalSignal } from '../../types/trade';
import { MODALITY_PRIMARY_INTERVAL } from './aiTradeSelection';

export async function checkReversalSignals(
  trade: Trade,
  klines?: Kline[]
): Promise<ReversalSignal | null> {
  try {
    const data = klines || (await getKlines(trade.symbol, trade.interval, 50));
    const candles = parseKlines(data);

    const choch = detectCHOCH(candles);
    if (choch.detected) {
      const isAgainstTrade =
        (trade.direction === 'LONG' && choch.direction === 'bearish') ||
        (trade.direction === 'SHORT' && choch.direction === 'bullish');

      if (isAgainstTrade) {
        return {
          type: 'CHOCH',
          tradeId: trade.id,
          symbol: trade.symbol,
          direction: choch.direction!,
          price: choch.level,
          timestamp: Date.now(),
          description: `Change of Character detected — market structure shifted ${choch.direction}. Consider closing or reversing your ${trade.direction} position.`,
        };
      }
    }

    const ob = detectOrderBlocks(candles);
    if (ob.detected) {
      const currentPrice = candles[candles.length - 1].close;
      const isNearOB = Math.abs(currentPrice - ob.midpoint) / currentPrice < 0.005;
      const isAgainstTrade =
        (trade.direction === 'LONG' && ob.direction === 'bearish') ||
        (trade.direction === 'SHORT' && ob.direction === 'bullish');

      if (isNearOB && isAgainstTrade) {
        return {
          type: 'BreakerBlock',
          tradeId: trade.id,
          symbol: trade.symbol,
          direction: ob.direction!,
          price: ob.midpoint,
          timestamp: Date.now(),
          description: `Breaker Block detected at ${ob.midpoint.toFixed(4)}. Price approaching institutional zone against your ${trade.direction} position.`,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
