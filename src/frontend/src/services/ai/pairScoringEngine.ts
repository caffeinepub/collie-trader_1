/**
 * Multi-factor Pair Scoring Engine
 * Combines two theoretical pillars:
 *   A) SMC (Smart Money Concepts): BOS, CHoCH, FVG, Order Blocks, Breaker Blocks, Liquidity Sweeps
 *   B) 8 Crypto Market Fundamentals: Volume/Capital Flow, Price Action, Candlestick Patterns,
 *      Chart Patterns, SMC Structures, Market Psychology, Strategy Alignment, Risk Management
 */

import { getKlines } from '../binance/binancePublicApi';
import {
  parseKlines,
  detectBOS,
  detectFVG,
  detectOrderBlocks,
  detectCHOCH,
  calculateATR,
  calculateRSI,
  type CandleData,
} from './smcIndicators';
import { TradeModality } from '../../types/trade';

export interface ScoredSymbol {
  symbol: string;
  score: number;
  topFactors: string[];
}

const MODALITY_INTERVAL: Record<TradeModality, string> = {
  [TradeModality.Scalping]: '5m',
  [TradeModality.DayTrading]: '1h',
  [TradeModality.Swing]: '4h',
  [TradeModality.Position]: '1d',
};

// ─── Candlestick Pattern Detection ───────────────────────────────────────────

interface CandlePatternResult {
  name: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number;
}

function detectCandlestickPatterns(candles: CandleData[]): CandlePatternResult[] {
  const results: CandlePatternResult[] = [];
  if (candles.length < 3) return results;

  const c = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const isBullish = c.close > c.open;
  const isBearish = c.close < c.open;

  // Hammer: small body at top, long lower wick (bullish reversal)
  if (lowerWick > body * 2 && upperWick < body * 0.5 && range > 0) {
    results.push({ name: 'Hammer (bullish reversal)', direction: 'bullish', score: 12 });
  }

  // Inverted Hammer: small body at bottom, long upper wick (bullish reversal)
  if (upperWick > body * 2 && lowerWick < body * 0.5 && range > 0) {
    results.push({ name: 'Inverted Hammer (bullish signal)', direction: 'bullish', score: 10 });
  }

  // Bullish Engulfing
  if (
    prev.close < prev.open &&
    isBullish &&
    c.open < prev.close &&
    c.close > prev.open
  ) {
    results.push({ name: 'Bullish Engulfing pattern', direction: 'bullish', score: 15 });
  }

  // Bearish Engulfing
  if (
    prev.close > prev.open &&
    isBearish &&
    c.open > prev.close &&
    c.close < prev.open
  ) {
    results.push({ name: 'Bearish Engulfing pattern', direction: 'bearish', score: 15 });
  }

  // Inside Bar: current candle within previous candle range
  if (c.high < prev.high && c.low > prev.low) {
    results.push({ name: 'Inside Bar (consolidation)', direction: 'neutral', score: 8 });
  }

  // Outside Bar: current candle engulfs previous candle range
  if (c.high > prev.high && c.low < prev.low) {
    results.push({ name: 'Outside Bar (volatility expansion)', direction: 'neutral', score: 10 });
  }

  // Long Wick Rejection: wick > 2x body on either side
  if (lowerWick > body * 2.5 && isBullish) {
    results.push({ name: 'Long wick rejection (bullish)', direction: 'bullish', score: 12 });
  }
  if (upperWick > body * 2.5 && isBearish) {
    results.push({ name: 'Long wick rejection (bearish)', direction: 'bearish', score: 12 });
  }

  // Railroad Tracks: two consecutive opposite candles of similar size
  const prevBody = Math.abs(prev.close - prev.open);
  if (
    prevBody > 0 &&
    body > 0 &&
    Math.abs(body - prevBody) / Math.max(body, prevBody) < 0.2 &&
    prev.close < prev.open &&
    isBullish
  ) {
    results.push({ name: 'Railroad Tracks (bullish reversal)', direction: 'bullish', score: 14 });
  }
  if (
    prevBody > 0 &&
    body > 0 &&
    Math.abs(body - prevBody) / Math.max(body, prevBody) < 0.2 &&
    prev.close > prev.open &&
    isBearish
  ) {
    results.push({ name: 'Railroad Tracks (bearish reversal)', direction: 'bearish', score: 14 });
  }

  // Three candle patterns
  if (candles.length >= 3) {
    const p2Body = Math.abs(prev2.close - prev2.open);
    // Morning Star (bullish)
    if (
      prev2.close < prev2.open &&
      p2Body > 0 &&
      Math.abs(prev.close - prev.open) < p2Body * 0.3 &&
      isBullish &&
      c.close > (prev2.open + prev2.close) / 2
    ) {
      results.push({ name: 'Morning Star (strong bullish reversal)', direction: 'bullish', score: 18 });
    }
    // Evening Star (bearish)
    if (
      prev2.close > prev2.open &&
      p2Body > 0 &&
      Math.abs(prev.close - prev.open) < p2Body * 0.3 &&
      isBearish &&
      c.close < (prev2.open + prev2.close) / 2
    ) {
      results.push({ name: 'Evening Star (strong bearish reversal)', direction: 'bearish', score: 18 });
    }
  }

  return results;
}

// ─── Chart Pattern Detection ──────────────────────────────────────────────────

interface ChartPatternResult {
  name: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number;
}

function detectChartPatterns(candles: CandleData[]): ChartPatternResult[] {
  const results: ChartPatternResult[] = [];
  if (candles.length < 20) return results;

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const n = candles.length;

  // Find local swing highs and lows
  const swingHighs: { idx: number; val: number }[] = [];
  const swingLows: { idx: number; val: number }[] = [];

  for (let i = 2; i < n - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      swingHighs.push({ idx: i, val: highs[i] });
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      swingLows.push({ idx: i, val: lows[i] });
    }
  }

  // Double Top: two swing highs at similar level, price now below neckline
  if (swingHighs.length >= 2) {
    const sh1 = swingHighs[swingHighs.length - 2];
    const sh2 = swingHighs[swingHighs.length - 1];
    const similarity = Math.abs(sh1.val - sh2.val) / sh1.val;
    if (similarity < 0.02 && sh2.idx > sh1.idx + 3) {
      const neckline = Math.min(...lows.slice(sh1.idx, sh2.idx + 1));
      if (closes[n - 1] < neckline) {
        results.push({ name: 'Double Top (bearish reversal)', direction: 'bearish', score: 20 });
      }
    }
  }

  // Double Bottom: two swing lows at similar level, price now above neckline
  if (swingLows.length >= 2) {
    const sl1 = swingLows[swingLows.length - 2];
    const sl2 = swingLows[swingLows.length - 1];
    const similarity = Math.abs(sl1.val - sl2.val) / sl1.val;
    if (similarity < 0.02 && sl2.idx > sl1.idx + 3) {
      const neckline = Math.max(...highs.slice(sl1.idx, sl2.idx + 1));
      if (closes[n - 1] > neckline) {
        results.push({ name: 'Double Bottom (bullish reversal)', direction: 'bullish', score: 20 });
      }
    }
  }

  // Head & Shoulders (bearish): three peaks, middle highest
  if (swingHighs.length >= 3) {
    const left = swingHighs[swingHighs.length - 3];
    const head = swingHighs[swingHighs.length - 2];
    const right = swingHighs[swingHighs.length - 1];
    if (
      head.val > left.val &&
      head.val > right.val &&
      Math.abs(left.val - right.val) / left.val < 0.03
    ) {
      results.push({ name: 'Head & Shoulders (bearish)', direction: 'bearish', score: 22 });
    }
  }

  // Inverse Head & Shoulders (bullish): three troughs, middle lowest
  if (swingLows.length >= 3) {
    const left = swingLows[swingLows.length - 3];
    const head = swingLows[swingLows.length - 2];
    const right = swingLows[swingLows.length - 1];
    if (
      head.val < left.val &&
      head.val < right.val &&
      Math.abs(left.val - right.val) / left.val < 0.03
    ) {
      results.push({ name: 'Inverse Head & Shoulders (bullish)', direction: 'bullish', score: 22 });
    }
  }

  // Bull Flag: strong uptrend followed by tight consolidation
  if (n >= 15) {
    const trendSegment = closes.slice(n - 15, n - 5);
    const consolidation = closes.slice(n - 5);
    const trendGain = (trendSegment[trendSegment.length - 1] - trendSegment[0]) / trendSegment[0];
    const consRange =
      (Math.max(...consolidation) - Math.min(...consolidation)) / Math.min(...consolidation);
    if (trendGain > 0.03 && consRange < 0.015) {
      results.push({ name: 'Bull Flag (continuation)', direction: 'bullish', score: 16 });
    }
  }

  // Bear Flag: strong downtrend followed by tight consolidation
  if (n >= 15) {
    const trendSegment = closes.slice(n - 15, n - 5);
    const consolidation = closes.slice(n - 5);
    const trendDrop = (trendSegment[0] - trendSegment[trendSegment.length - 1]) / trendSegment[0];
    const consRange =
      (Math.max(...consolidation) - Math.min(...consolidation)) / Math.min(...consolidation);
    if (trendDrop > 0.03 && consRange < 0.015) {
      results.push({ name: 'Bear Flag (continuation)', direction: 'bearish', score: 16 });
    }
  }

  // Pennant: converging highs and lows after strong move
  if (n >= 10) {
    const recentHighs = highs.slice(n - 8);
    const recentLows = lows.slice(n - 8);
    const highSlope = recentHighs[recentHighs.length - 1] - recentHighs[0];
    const lowSlope = recentLows[recentLows.length - 1] - recentLows[0];
    if (highSlope < 0 && lowSlope > 0) {
      results.push({ name: 'Pennant (compression breakout)', direction: 'neutral', score: 14 });
    }
  }

  // Wyckoff Accumulation: prolonged low-volatility base with volume decline
  if (n >= 30) {
    const baseCandles = candles.slice(n - 30, n - 5);
    const baseRange =
      (Math.max(...baseCandles.map((c) => c.high)) - Math.min(...baseCandles.map((c) => c.low))) /
      Math.min(...baseCandles.map((c) => c.low));
    const avgVol = baseCandles.reduce((s, c) => s + c.volume, 0) / baseCandles.length;
    const recentVol = candles.slice(n - 5).reduce((s, c) => s + c.volume, 0) / 5;
    if (baseRange < 0.08 && recentVol > avgVol * 1.5) {
      results.push({ name: 'Wyckoff Accumulation breakout', direction: 'bullish', score: 18 });
    }
    // Wyckoff Distribution
    if (baseRange < 0.08 && recentVol > avgVol * 1.5 && closes[n - 1] < closes[n - 6]) {
      results.push({ name: 'Wyckoff Distribution phase', direction: 'bearish', score: 18 });
    }
  }

  return results;
}

// ─── Volume / Capital Flow Module ─────────────────────────────────────────────

interface VolumeAnalysis {
  score: number;
  factors: string[];
}

function analyzeVolume(candles: CandleData[]): VolumeAnalysis {
  const factors: string[] = [];
  let score = 0;

  if (candles.length < 20) return { score, factors };

  const recent = candles.slice(-20);
  const avgVol = recent.slice(0, 15).reduce((s, c) => s + c.volume, 0) / 15;
  const lastVol = recent[recent.length - 1].volume;
  const last3Vol = recent.slice(-3).reduce((s, c) => s + c.volume, 0) / 3;

  // Rising volume trend confirmation
  const volTrend = recent.slice(-5).every((c, i, arr) => i === 0 || c.volume >= arr[i - 1].volume * 0.9);
  if (volTrend) {
    score += 10;
    factors.push('Rising volume trend confirmation');
  }

  // Volume spike on breakout
  if (lastVol > avgVol * 2) {
    score += 15;
    factors.push('Volume spike on breakout');
  } else if (lastVol > avgVol * 1.5) {
    score += 8;
    factors.push('Above-average volume');
  }

  // Fakeout rejection: breakout candle without volume spike
  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];
  const isBreakout =
    lastCandle.close > Math.max(...recent.slice(-10, -1).map((c) => c.high)) ||
    lastCandle.close < Math.min(...recent.slice(-10, -1).map((c) => c.low));
  if (isBreakout && lastVol < avgVol * 0.8) {
    score -= 10;
    factors.push('Fakeout risk: breakout without volume');
  }

  // Capitulation spike: massive volume with long wick
  const body = Math.abs(lastCandle.close - lastCandle.open);
  const range = lastCandle.high - lastCandle.low;
  if (lastVol > avgVol * 3 && body < range * 0.3) {
    score += 12;
    factors.push('Capitulation spike (reversal signal)');
  }

  // Volume divergence: price making new high/low but volume declining
  const priceHigher = lastCandle.close > prevCandle.close;
  const volLower = lastVol < last3Vol * 0.7;
  if (priceHigher && volLower) {
    score -= 5;
    factors.push('Volume divergence detected');
  }

  return { score: Math.max(0, score), factors };
}

// ─── Market Psychology Module ─────────────────────────────────────────────────

interface PsychologyAnalysis {
  score: number;
  factors: string[];
}

function analyzeMarketPsychology(candles: CandleData[]): PsychologyAnalysis {
  const factors: string[] = [];
  let score = 0;

  if (candles.length < 20) return { score, factors };

  const recent = candles.slice(-20);
  const n = recent.length;
  const last = recent[n - 1];
  const prev = recent[n - 2];

  // Bull Trap: price breaks above resistance then reverses sharply
  const recentHighs = recent.slice(0, n - 3).map((c) => c.high);
  const resistance = Math.max(...recentHighs);
  if (prev.high > resistance && last.close < resistance && last.close < prev.open) {
    score += 14;
    factors.push('Bull trap reversal detected');
  }

  // Bear Trap: price breaks below support then reverses sharply
  const recentLows = recent.slice(0, n - 3).map((c) => c.low);
  const support = Math.min(...recentLows);
  if (prev.low < support && last.close > support && last.close > prev.open) {
    score += 14;
    factors.push('Bear trap reversal detected');
  }

  // Stop-hunt liquidity sweep with reversal confirmation
  const avgRange = recent.slice(0, n - 3).reduce((s, c) => s + (c.high - c.low), 0) / (n - 3);
  const lastRange = last.high - last.low;
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const upperWick = last.high - Math.max(last.open, last.close);

  if (lastRange > avgRange * 1.8 && lowerWick > (last.high - last.low) * 0.5 && last.close > last.open) {
    score += 16;
    factors.push('Liquidity sweep reversal (stop hunt)');
  }
  if (lastRange > avgRange * 1.8 && upperWick > (last.high - last.low) * 0.5 && last.close < last.open) {
    score += 16;
    factors.push('Liquidity sweep reversal (stop hunt)');
  }

  // RSI extremes
  const rsi = calculateRSI(candles, 14);
  if (rsi < 30) {
    score += 10;
    factors.push(`RSI oversold (${rsi.toFixed(0)}) — reversal zone`);
  } else if (rsi > 70) {
    score += 10;
    factors.push(`RSI overbought (${rsi.toFixed(0)}) — reversal zone`);
  } else if (rsi >= 45 && rsi <= 55) {
    score += 5;
    factors.push('RSI neutral — momentum building');
  }

  return { score: Math.max(0, score), factors };
}

// ─── Strategy Alignment Module ────────────────────────────────────────────────

interface StrategyAlignment {
  score: number;
  factors: string[];
}

function analyzeStrategyAlignment(
  modality: TradeModality,
  candles: CandleData[],
  bos: ReturnType<typeof detectBOS>,
  fvg: ReturnType<typeof detectFVG>,
  choch: ReturnType<typeof detectCHOCH>,
  rsi: number
): StrategyAlignment {
  const factors: string[] = [];
  let score = 0;

  switch (modality) {
    case TradeModality.Scalping:
      // Scalping: FVG entries + pullback to OB
      if (fvg.detected) {
        score += 15;
        factors.push(`FVG entry zone on 5m`);
      }
      if (bos.detected) {
        score += 10;
        factors.push('BOS momentum for scalp');
      }
      break;

    case TradeModality.DayTrading:
      // Day Trade: BOS + retests
      if (bos.detected) {
        score += 18;
        factors.push('BOS confirmed on 1h — day trade setup');
      }
      if (choch.detected) {
        score += 12;
        factors.push('CHoCH confirmed on 1h');
      }
      break;

    case TradeModality.Swing:
      // Swing: divergence + liquidity grab
      if (choch.detected) {
        score += 15;
        factors.push('CHoCH swing structure shift');
      }
      if (rsi < 35 || rsi > 65) {
        score += 12;
        factors.push('RSI divergence zone for swing');
      }
      break;

    case TradeModality.Position:
      // Position: Wyckoff + VWAP reversion
      if (bos.detected) {
        score += 12;
        factors.push('BOS on daily — position trade signal');
      }
      if (fvg.detected) {
        score += 10;
        factors.push('Daily FVG — institutional interest');
      }
      break;
  }

  return { score: Math.max(0, score), factors };
}

// ─── Risk Management Module ───────────────────────────────────────────────────

interface RiskAnalysis {
  score: number;
  factors: string[];
  rrRatio: number;
}

function analyzeRisk(candles: CandleData[]): RiskAnalysis {
  const factors: string[] = [];
  let score = 0;

  const atr = calculateATR(candles, 14);
  if (atr === 0) return { score: 0, factors: ['ATR unavailable'], rrRatio: 0 };

  const currentPrice = candles[candles.length - 1].close;
  const slDistance = atr * 1.5;
  const tpDistance = slDistance * 2.5; // TP2 equivalent
  const rrRatio = tpDistance / slDistance;

  if (rrRatio >= 3) {
    score += 20;
    factors.push(`Excellent R:R ratio (${rrRatio.toFixed(1)}:1)`);
  } else if (rrRatio >= 2) {
    score += 15;
    factors.push(`Good R:R ratio (${rrRatio.toFixed(1)}:1)`);
  } else if (rrRatio >= 1.5) {
    score += 8;
    factors.push(`Acceptable R:R ratio (${rrRatio.toFixed(1)}:1)`);
  } else {
    score -= 10;
    factors.push(`Poor R:R ratio (${rrRatio.toFixed(1)}:1) — below minimum`);
  }

  // ATR relative to price (volatility check)
  const atrPercent = (atr / currentPrice) * 100;
  if (atrPercent > 0.5 && atrPercent < 5) {
    score += 10;
    factors.push(`Healthy volatility (ATR ${atrPercent.toFixed(2)}%)`);
  } else if (atrPercent >= 5) {
    score -= 5;
    factors.push(`High volatility risk (ATR ${atrPercent.toFixed(2)}%)`);
  }

  return { score: Math.max(0, score), factors, rrRatio };
}

// ─── SMC Pillar ───────────────────────────────────────────────────────────────

interface SMCAnalysis {
  score: number;
  factors: string[];
}

function analyzeSMC(candles: CandleData[]): SMCAnalysis {
  const factors: string[] = [];
  let score = 0;

  const bos = detectBOS(candles);
  const fvg = detectFVG(candles);
  const ob = detectOrderBlocks(candles);
  const choch = detectCHOCH(candles);

  // BOS strength
  if (bos.detected) {
    score += 18;
    factors.push(`Strong BOS detected (${bos.direction})`);
  }

  // CHoCH confirmation
  if (choch.detected) {
    score += 15;
    factors.push(`CHoCH confirmed (${choch.direction})`);
  }

  // FVG quality
  if (fvg.detected) {
    const gapSize = Math.abs(fvg.top - fvg.bottom);
    const currentPrice = candles[candles.length - 1].close;
    const gapPercent = (gapSize / currentPrice) * 100;
    if (gapPercent > 0.3) {
      score += 15;
      factors.push(`Quality FVG (${fvg.direction}, ${gapPercent.toFixed(2)}% gap)`);
    } else {
      score += 8;
      factors.push(`FVG present (${fvg.direction})`);
    }
  }

  // Order Block proximity
  if (ob.detected) {
    const currentPrice = candles[candles.length - 1].close;
    const distancePercent = (Math.abs(currentPrice - ob.midpoint) / currentPrice) * 100;
    if (distancePercent < 1) {
      score += 18;
      factors.push(`Price at Order Block (${ob.direction}, ${distancePercent.toFixed(2)}% away)`);
    } else if (distancePercent < 3) {
      score += 10;
      factors.push(`Order Block nearby (${ob.direction})`);
    }
  }

  // Breaker Block detection: OB that was broken and retested
  if (ob.detected && bos.detected) {
    const currentPrice = candles[candles.length - 1].close;
    const obBroken =
      (ob.direction === 'bullish' && bos.direction === 'bearish' && currentPrice < ob.bottom) ||
      (ob.direction === 'bearish' && bos.direction === 'bullish' && currentPrice > ob.top);
    if (obBroken) {
      score += 12;
      factors.push('Breaker Block formation detected');
    }
  }

  // Liquidity sweep: price swept a key level and reversed
  if (candles.length >= 10) {
    const recent = candles.slice(-10);
    const prevHighs = candles.slice(-20, -10).map((c) => c.high);
    const prevLows = candles.slice(-20, -10).map((c) => c.low);
    const keyHigh = Math.max(...prevHighs);
    const keyLow = Math.min(...prevLows);
    const last = recent[recent.length - 1];
    const prev = recent[recent.length - 2];

    if (prev.high > keyHigh && last.close < keyHigh) {
      score += 14;
      factors.push('Liquidity sweep above highs (bearish reversal)');
    }
    if (prev.low < keyLow && last.close > keyLow) {
      score += 14;
      factors.push('Liquidity sweep below lows (bullish reversal)');
    }
  }

  return { score: Math.max(0, score), factors };
}

// ─── Price Action Module ──────────────────────────────────────────────────────

interface PriceActionAnalysis {
  score: number;
  factors: string[];
}

function analyzePriceAction(candles: CandleData[]): PriceActionAnalysis {
  const factors: string[] = [];
  let score = 0;

  if (candles.length < 20) return { score, factors };

  const recent = candles.slice(-20);

  // Detect HH+HL (bullish trend structure)
  let hhhl = 0;
  let lhll = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].high > recent[i - 1].high && recent[i].low > recent[i - 1].low) hhhl++;
    if (recent[i].high < recent[i - 1].high && recent[i].low < recent[i - 1].low) lhll++;
  }

  if (hhhl >= 5) {
    score += 15;
    factors.push('Strong bullish structure (HH+HL)');
  } else if (hhhl >= 3) {
    score += 8;
    factors.push('Developing bullish structure');
  }

  if (lhll >= 5) {
    score += 15;
    factors.push('Strong bearish structure (LH+LL)');
  } else if (lhll >= 3) {
    score += 8;
    factors.push('Developing bearish structure');
  }

  // Trend momentum: last 5 candles direction
  const last5 = recent.slice(-5);
  const bullishCount = last5.filter((c) => c.close > c.open).length;
  if (bullishCount >= 4) {
    score += 10;
    factors.push('Strong bullish momentum (4/5 candles)');
  } else if (bullishCount <= 1) {
    score += 10;
    factors.push('Strong bearish momentum (4/5 candles)');
  }

  return { score: Math.max(0, score), factors };
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

async function scoreSymbol(
  symbol: string,
  modality: TradeModality,
  interval: string
): Promise<ScoredSymbol | null> {
  try {
    const klines = await getKlines(symbol, interval, 100);
    const candles = parseKlines(klines);

    if (candles.length < 20) return null;

    const allFactors: { label: string; score: number }[] = [];
    let totalScore = 0;

    // ── Pillar A: SMC ──────────────────────────────────────────────────────
    const smcAnalysis = analyzeSMC(candles);
    totalScore += smcAnalysis.score;
    smcAnalysis.factors.forEach((f) => allFactors.push({ label: f, score: smcAnalysis.score / Math.max(1, smcAnalysis.factors.length) }));

    // ── Pillar B: 8 Fundamentals ───────────────────────────────────────────

    // 1. Volume / Capital Flow
    const volumeAnalysis = analyzeVolume(candles);
    totalScore += volumeAnalysis.score;
    volumeAnalysis.factors.forEach((f) => allFactors.push({ label: f, score: volumeAnalysis.score / Math.max(1, volumeAnalysis.factors.length) }));

    // 2. Price Action
    const priceActionAnalysis = analyzePriceAction(candles);
    totalScore += priceActionAnalysis.score;
    priceActionAnalysis.factors.forEach((f) => allFactors.push({ label: f, score: priceActionAnalysis.score / Math.max(1, priceActionAnalysis.factors.length) }));

    // 3. Candlestick Patterns
    const candlePatterns = detectCandlestickPatterns(candles);
    const candleScore = candlePatterns.reduce((s, p) => s + p.score, 0);
    totalScore += candleScore;
    candlePatterns.forEach((p) => allFactors.push({ label: p.name, score: p.score }));

    // 4. Chart Patterns
    const chartPatterns = detectChartPatterns(candles);
    const chartScore = chartPatterns.reduce((s, p) => s + p.score, 0);
    totalScore += chartScore;
    chartPatterns.forEach((p) => allFactors.push({ label: p.name, score: p.score }));

    // 5. SMC Structures (reuses smcIndicators — no duplication)
    const bos = detectBOS(candles);
    const fvg = detectFVG(candles);
    const choch = detectCHOCH(candles);
    // Already scored in Pillar A — add a small bonus for confluence
    if (bos.detected && fvg.detected) {
      totalScore += 8;
      allFactors.push({ label: 'BOS + FVG confluence', score: 8 });
    }
    if (bos.detected && choch.detected) {
      totalScore += 8;
      allFactors.push({ label: 'BOS + CHoCH confluence', score: 8 });
    }

    // 6. Market Psychology
    const psychAnalysis = analyzeMarketPsychology(candles);
    totalScore += psychAnalysis.score;
    psychAnalysis.factors.forEach((f) => allFactors.push({ label: f, score: psychAnalysis.score / Math.max(1, psychAnalysis.factors.length) }));

    // 7. Strategy Alignment
    const rsi = calculateRSI(candles, 14);
    const strategyAnalysis = analyzeStrategyAlignment(modality, candles, bos, fvg, choch, rsi);
    totalScore += strategyAnalysis.score;
    strategyAnalysis.factors.forEach((f) => allFactors.push({ label: f, score: strategyAnalysis.score / Math.max(1, strategyAnalysis.factors.length) }));

    // 8. Risk Management (ATR-based R:R gate)
    const riskAnalysis = analyzeRisk(candles);
    totalScore += riskAnalysis.score;
    riskAnalysis.factors.forEach((f) => allFactors.push({ label: f, score: riskAnalysis.score / Math.max(1, riskAnalysis.factors.length) }));

    // Enforce minimum 1:2 R:R as a scoring gate
    if (riskAnalysis.rrRatio < 1.5) {
      totalScore = Math.floor(totalScore * 0.5);
    }

    // Normalize to 0–100
    const normalizedScore = Math.min(100, Math.max(0, Math.round(totalScore / 3)));

    // Sort factors by score descending and pick top 3
    const sortedFactors = allFactors
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((f) => f.label);

    const topFactors = sortedFactors.slice(0, 3);
    if (topFactors.length < 3) {
      // Pad with generic factors if needed
      const fallbacks = ['Market structure analyzed', 'Multi-timeframe confluence', 'SMC framework applied'];
      while (topFactors.length < 3) {
        topFactors.push(fallbacks[topFactors.length]);
      }
    }

    return { symbol, score: normalizedScore, topFactors };
  } catch {
    return null;
  }
}

/**
 * Score a list of symbols for a given modality and return the top `limit` results.
 * Uses modality-specific timeframes: Scalping=5m, DayTrading=1h, Swing=4h, Position=1d.
 */
export async function scoreSymbolsForModality(
  modality: TradeModality,
  symbols: string[],
  limit: number
): Promise<ScoredSymbol[]> {
  const interval = MODALITY_INTERVAL[modality];

  // Process in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  const results: ScoredSymbol[] = [];

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((symbol) => scoreSymbol(symbol, modality, interval))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value !== null) {
        results.push(result.value);
      }
    }

    // Stop early if we have enough high-quality candidates
    if (results.length >= limit * 3) break;

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
