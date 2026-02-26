import { parseKlines, detectOrderBlocks, calculateATR } from './smcIndicators';
import { getKlines } from '../binance/binancePublicApi';
import type { Trade } from '../../types/trade';
import type { RecoveryStrategy } from '../../types/trade';

export async function generateRecoveryStrategies(
  trade: Trade,
  currentPrice: number
): Promise<RecoveryStrategy[]> {
  const strategies: RecoveryStrategy[] = [];

  try {
    const klines = await getKlines(trade.symbol, trade.interval, 100);
    const candles = parseKlines(klines);
    const atr = calculateATR(candles, 14);
    const ob = detectOrderBlocks(candles);

    const isLong = trade.direction === 'LONG';
    const unrealizedLoss = isLong
      ? ((currentPrice - trade.entry) / trade.entry) * 100
      : ((trade.entry - currentPrice) / trade.entry) * 100;

    // Strategy 1: Average Down / Up
    const avgLevel = isLong
      ? currentPrice - atr * 0.5
      : currentPrice + atr * 0.5;

    const avgEntry = (trade.entry + avgLevel) / 2;
    const newBreakeven = avgEntry;
    const pnlImprovement = Math.abs(trade.entry - newBreakeven) / Math.abs(trade.entry - currentPrice) * 100;

    strategies.push({
      type: 'AverageDown',
      description: `Add position at ${avgLevel.toFixed(4)} to reduce average entry to ${avgEntry.toFixed(4)}. Breakeven improves by ~${pnlImprovement.toFixed(0)}%.`,
      entryPrice: avgLevel,
      quantity: trade.positionSize / avgLevel,
      expectedPnlImprovement: pnlImprovement,
    });

    // Strategy 2: Order Block based averaging
    if (ob.detected) {
      const obEntry = isLong ? ob.bottom : ob.top;
      strategies.push({
        type: 'AverageDown',
        description: `Order Block zone detected at ${ob.bottom.toFixed(4)}–${ob.top.toFixed(4)}. Add at OB midpoint ${ob.midpoint.toFixed(4)} for institutional support.`,
        entryPrice: ob.midpoint,
        quantity: trade.positionSize * 0.5 / ob.midpoint,
        expectedPnlImprovement: Math.abs(trade.entry - ob.midpoint) / Math.abs(trade.entry - currentPrice) * 50,
      });
    }

    // Strategy 3: Partial Close
    const partialCloseImprovement = 30;
    strategies.push({
      type: 'PartialClose',
      description: `Close 50% of position now to reduce exposure. Remaining position needs ${(Math.abs(unrealizedLoss) / 2).toFixed(1)}% recovery to break even.`,
      quantity: trade.positionSize * 0.5 / currentPrice,
      expectedPnlImprovement: partialCloseImprovement,
    });

    // Strategy 4: DCA Schedule
    const dcaLevels = isLong
      ? [currentPrice - atr, currentPrice - atr * 2, currentPrice - atr * 3]
      : [currentPrice + atr, currentPrice + atr * 2, currentPrice + atr * 3];

    strategies.push({
      type: 'DCA',
      description: `Dollar Cost Average across 3 levels: ${dcaLevels.map((l) => l.toFixed(2)).join(', ')}. Equal position size at each level.`,
      levels: dcaLevels,
      quantity: trade.positionSize / 3 / currentPrice,
      expectedPnlImprovement: 45,
    });

    // Strategy 5: Hedge
    const hedgeEntry = currentPrice;
    strategies.push({
      type: 'Hedge',
      description: `Open opposite ${isLong ? 'SHORT' : 'LONG'} position at ${hedgeEntry.toFixed(4)} to neutralize further losses while waiting for reversal.`,
      entryPrice: hedgeEntry,
      quantity: trade.positionSize / currentPrice,
      expectedPnlImprovement: 60,
    });

  } catch (error) {
    // Fallback strategies without kline data
    strategies.push({
      type: 'PartialClose',
      description: 'Close 50% of position to reduce exposure and risk.',
      expectedPnlImprovement: 30,
    });
    strategies.push({
      type: 'Hedge',
      description: 'Open opposite position to neutralize further losses.',
      expectedPnlImprovement: 50,
    });
    strategies.push({
      type: 'DCA',
      description: 'Dollar cost average at lower levels to improve entry price.',
      expectedPnlImprovement: 40,
    });
  }

  return strategies;
}
