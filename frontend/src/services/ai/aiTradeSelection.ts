import { getKlines, getExchangeInfo } from '../binance/binancePublicApi';
import { parseKlines, detectBOS, detectFVG, detectOrderBlocks, calculateATR } from './smcIndicators';
import { TradeModality, TradeDirection } from '../../types/trade';
import type { TradeSetup } from '../../types/trade';
import { scoreSymbolsForModality } from './pairScoringEngine';

const MODALITY_PRIMARY_INTERVAL: Record<TradeModality, string> = {
  [TradeModality.Scalping]: '5m',
  [TradeModality.DayTrading]: '1h',
  [TradeModality.Swing]: '4h',
  [TradeModality.Position]: '1d',
};

// Fallback symbols if exchange info fetch fails
const FALLBACK_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT',
];

async function fetchAllPerpetualSymbols(): Promise<string[]> {
  try {
    const exchangeSymbols = await getExchangeInfo();
    return exchangeSymbols
      .filter((s) => s.quoteAsset === 'USDT')
      .map((s) => s.symbol);
  } catch {
    return FALLBACK_SYMBOLS;
  }
}

async function buildTradeSetupForSymbol(
  symbol: string,
  modality: TradeModality,
  scoringFactors: string[]
): Promise<TradeSetup | null> {
  const interval = MODALITY_PRIMARY_INTERVAL[modality];

  try {
    const klines = await getKlines(symbol, interval, 100);
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

    // ATR-based TP/SL calculation
    const atrMultiplier = getATRMultiplier(modality);
    let tp1: number, tp2: number, tp3: number, stopLoss: number;

    if (direction === TradeDirection.LONG) {
      stopLoss = entryPrice - atr * atrMultiplier.sl;
      tp1 = entryPrice + atr * atrMultiplier.tp1;
      tp2 = entryPrice + atr * atrMultiplier.tp2;
      tp3 = entryPrice + atr * atrMultiplier.tp3;
    } else {
      stopLoss = entryPrice + atr * atrMultiplier.sl;
      tp1 = entryPrice - atr * atrMultiplier.tp1;
      tp2 = entryPrice - atr * atrMultiplier.tp2;
      tp3 = entryPrice - atr * atrMultiplier.tp3;
    }

    const risk = Math.abs(entryPrice - stopLoss);
    const reward1 = Math.abs(tp1 - entryPrice);
    const rrRatio = risk > 0 ? reward1 / risk : 0;

    // Ensure minimum 1:2 RR
    if (rrRatio < 2) {
      if (direction === TradeDirection.LONG) {
        tp1 = entryPrice + risk * 2;
        tp2 = entryPrice + risk * 3;
        tp3 = entryPrice + risk * 4.5;
      } else {
        tp1 = entryPrice - risk * 2;
        tp2 = entryPrice - risk * 3;
        tp3 = entryPrice - risk * 4.5;
      }
    }

    return {
      symbol,
      direction,
      entry: entryPrice,
      tp1,
      tp2,
      tp3,
      stopLoss,
      modality,
      interval,
      entryReason,
      rrRatio: Math.abs(tp1 - entryPrice) / Math.abs(entryPrice - stopLoss),
      scoringFactors,
    };
  } catch {
    return null;
  }
}

/**
 * Autonomously selects the best pair for the given modality using the
 * 8-module AI scoring engine, then generates a trade setup for it.
 * Falls back through top candidates if the first doesn't produce a valid setup.
 */
export async function generateTradeSetup(modality: TradeModality): Promise<TradeSetup | null> {
  try {
    // Fetch all USDⓈ-M Perpetual symbols
    const allSymbols = await fetchAllPerpetualSymbols();

    // Score top candidates using the 8-module knowledge framework
    const topCandidates = await scoreSymbolsForModality(modality, allSymbols, 10);

    if (topCandidates.length === 0) {
      // Last resort fallback
      for (const symbol of FALLBACK_SYMBOLS.slice(0, 3)) {
        const setup = await buildTradeSetupForSymbol(symbol, modality, [
          'Fallback symbol — exchange data unavailable',
        ]);
        if (setup) return setup;
      }
      return null;
    }

    // Iterate through top candidates until we find a valid setup
    for (const candidate of topCandidates) {
      const setup = await buildTradeSetupForSymbol(
        candidate.symbol,
        modality,
        candidate.scoringFactors
      );
      if (setup) return setup;
    }

    return null;
  } catch (error) {
    console.error(`Failed to generate trade for ${modality}:`, error);
    return null;
  }
}

function getATRMultiplier(modality: TradeModality) {
  switch (modality) {
    case TradeModality.Scalping:
      return { sl: 1.0, tp1: 2.0, tp2: 3.0, tp3: 4.5 };
    case TradeModality.DayTrading:
      return { sl: 1.5, tp1: 3.0, tp2: 5.0, tp3: 8.0 };
    case TradeModality.Swing:
      return { sl: 2.0, tp1: 4.0, tp2: 7.0, tp3: 12.0 };
    case TradeModality.Position:
      return { sl: 3.0, tp1: 6.0, tp2: 10.0, tp3: 18.0 };
  }
}

export { MODALITY_PRIMARY_INTERVAL };
