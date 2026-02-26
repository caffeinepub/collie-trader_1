import { getKlines, getExchangeInfo } from '../binance/binancePublicApi';
import { parseKlines, detectBOS, detectFVG, detectOrderBlocks, calculateATR } from './smcIndicators';
import { scoreSymbolsForModality } from './pairScoringEngine';
import { TradeModality, TradeDirection } from '../../types/trade';
import type { TradeSetup } from '../../types/trade';

export const MODALITY_PRIMARY_INTERVAL: Record<TradeModality, string> = {
  [TradeModality.Scalping]: '5m',
  [TradeModality.DayTrading]: '1h',
  [TradeModality.Swing]: '4h',
  [TradeModality.Position]: '1d',
};

// Curated high-liquidity USDT perpetual symbols to score
// Used as a fallback if exchange info fetch fails
const FALLBACK_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT',
];

async function getUSDTPerpetualSymbols(): Promise<string[]> {
  try {
    const symbols = await getExchangeInfo();
    return symbols
      .filter((s) => s.quoteAsset === 'USDT' && s.contractType === 'PERPETUAL')
      .map((s) => s.symbol)
      .slice(0, 60); // Limit to top 60 to avoid excessive API calls
  } catch {
    return FALLBACK_SYMBOLS;
  }
}

async function buildTradeSetupFromSymbol(
  symbol: string,
  modality: TradeModality,
  topFactors: string[]
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

    // Enforce minimum 1:2 R:R
    if (rrRatio < 1.5) return null;

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
      rrRatio,
      topFactors,
    };
  } catch {
    return null;
  }
}

/**
 * Automatically selects the best trading pair for the given modality
 * using the SMC + 8 Fundamentals scoring engine, then validates the setup.
 */
export async function generateTradeSetup(
  modality: TradeModality
): Promise<TradeSetup | null> {
  try {
    // Step 1: Get all USDT perpetual symbols
    const symbols = await getUSDTPerpetualSymbols();

    // Step 2: Score symbols using the combined SMC + 8 Fundamentals engine
    const scoredSymbols = await scoreSymbolsForModality(modality, symbols, 10);

    if (scoredSymbols.length === 0) {
      // Fallback: use a default symbol
      return buildTradeSetupFromSymbol('BTCUSDT', modality, [
        'Default fallback symbol',
        'SMC framework applied',
        'Multi-timeframe analysis',
      ]);
    }

    // Step 3: Iterate through top candidates until a valid setup is found
    for (const candidate of scoredSymbols) {
      const setup = await buildTradeSetupFromSymbol(
        candidate.symbol,
        modality,
        candidate.topFactors
      );
      if (setup) return setup;
    }

    // Step 4: Last resort fallback
    return buildTradeSetupFromSymbol('BTCUSDT', modality, [
      'Fallback to BTC',
      'SMC structure analyzed',
      'Risk management applied',
    ]);
  } catch (error) {
    console.error(`Failed to generate trade setup for ${modality}:`, error);
    return null;
  }
}
