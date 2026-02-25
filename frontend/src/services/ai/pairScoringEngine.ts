import { getKlines } from '../binance/binancePublicApi';
import {
  parseKlines,
  detectBOS,
  detectFVG,
  detectOrderBlocks,
  calculateATR,
  calculateRSI,
  detectCHOCH,
  type CandleData,
} from './smcIndicators';
import { TradeModality } from '../../types/trade';

export interface ScoredSymbol {
  symbol: string;
  score: number; // 0–100
  scoringFactors: string[]; // top 3 human-readable reasons
}

const MODALITY_INTERVAL: Record<TradeModality, string> = {
  [TradeModality.Scalping]: '5m',
  [TradeModality.DayTrading]: '1h',
  [TradeModality.Swing]: '4h',
  [TradeModality.Position]: '1d',
};

// ─── Module 3: Candlestick Pattern Detection ────────────────────────────────

interface CandlePatternResult {
  name: string;
  bullish: boolean;
  strength: number; // 0–1
}

function detectCandlePatterns(candles: CandleData[]): CandlePatternResult[] {
  if (candles.length < 3) return [];
  const results: CandlePatternResult[] = [];
  const c = candles[candles.length - 1];
  const c1 = candles[candles.length - 2];
  const c2 = candles[candles.length - 3];

  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const isBullish = c.close > c.open;

  // Hammer: small body at top, long lower wick (>2x body), tiny upper wick
  if (lowerWick > body * 2 && upperWick < body * 0.5 && range > 0) {
    results.push({ name: 'Hammer', bullish: true, strength: Math.min(1, lowerWick / range) });
  }

  // Inverted Hammer
  if (upperWick > body * 2 && lowerWick < body * 0.5 && range > 0) {
    results.push({ name: 'Inverted Hammer', bullish: true, strength: Math.min(1, upperWick / range) });
  }

  // Engulfing
  const prevBody = Math.abs(c1.close - c1.open);
  if (body > prevBody * 1.1) {
    if (isBullish && c1.close < c1.open && c.open <= c1.close && c.close >= c1.open) {
      results.push({ name: 'Bullish Engulfing', bullish: true, strength: Math.min(1, body / (prevBody + 0.0001)) });
    }
    if (!isBullish && c1.close > c1.open && c.open >= c1.close && c.close <= c1.open) {
      results.push({ name: 'Bearish Engulfing', bullish: false, strength: Math.min(1, body / (prevBody + 0.0001)) });
    }
  }

  // Inside Bar: current candle completely inside previous
  if (c.high < c1.high && c.low > c1.low) {
    results.push({ name: 'Inside Bar', bullish: isBullish, strength: 0.6 });
  }

  // Long Wick Rejection: wick > 60% of total range
  if (lowerWick / (range + 0.0001) > 0.6) {
    results.push({ name: 'Long Wick Rejection (Bullish)', bullish: true, strength: lowerWick / range });
  }
  if (upperWick / (range + 0.0001) > 0.6) {
    results.push({ name: 'Long Wick Rejection (Bearish)', bullish: false, strength: upperWick / range });
  }

  // Railroad Tracks: two large opposite candles
  const c1Body = Math.abs(c1.close - c1.open);
  const c1Range = c1.high - c1.low;
  if (
    c1Body > c1Range * 0.6 &&
    body > range * 0.6 &&
    isBullish !== c1.close > c1.open &&
    Math.abs(body - c1Body) / (c1Body + 0.0001) < 0.3
  ) {
    results.push({ name: 'Railroad Tracks', bullish: isBullish, strength: 0.85 });
  }

  // Doji
  if (body < range * 0.1 && range > 0) {
    results.push({ name: 'Doji', bullish: isBullish, strength: 0.5 });
  }

  // Morning Star (3-candle)
  const c2Body = Math.abs(c2.close - c2.open);
  if (
    c2.close < c2.open && c2Body > (c2.high - c2.low) * 0.5 &&
    Math.abs(c1.close - c1.open) < (c1.high - c1.low) * 0.3 &&
    c.close > c.open && body > (c.high - c.low) * 0.5 &&
    c.close > (c2.open + c2.close) / 2
  ) {
    results.push({ name: 'Morning Star', bullish: true, strength: 0.9 });
  }

  // Evening Star (3-candle)
  if (
    c2.close > c2.open && c2Body > (c2.high - c2.low) * 0.5 &&
    Math.abs(c1.close - c1.open) < (c1.high - c1.low) * 0.3 &&
    c.close < c.open && body > (c.high - c.low) * 0.5 &&
    c.close < (c2.open + c2.close) / 2
  ) {
    results.push({ name: 'Evening Star', bullish: false, strength: 0.9 });
  }

  return results;
}

// ─── Module 4: Chart Pattern Detection ──────────────────────────────────────

interface ChartPatternResult {
  name: string;
  bullish: boolean;
  strength: number;
}

function detectChartPatterns(candles: CandleData[]): ChartPatternResult[] {
  if (candles.length < 20) return [];
  const results: ChartPatternResult[] = [];
  const recent = candles.slice(-30);

  // Find swing highs and lows
  const swingHighs: { idx: number; price: number }[] = [];
  const swingLows: { idx: number; price: number }[] = [];

  for (let i = 2; i < recent.length - 2; i++) {
    if (
      recent[i].high > recent[i - 1].high &&
      recent[i].high > recent[i - 2].high &&
      recent[i].high > recent[i + 1].high &&
      recent[i].high > recent[i + 2].high
    ) {
      swingHighs.push({ idx: i, price: recent[i].high });
    }
    if (
      recent[i].low < recent[i - 1].low &&
      recent[i].low < recent[i - 2].low &&
      recent[i].low < recent[i + 1].low &&
      recent[i].low < recent[i + 2].low
    ) {
      swingLows.push({ idx: i, price: recent[i].low });
    }
  }

  // Double Top
  if (swingHighs.length >= 2) {
    const h1 = swingHighs[swingHighs.length - 2];
    const h2 = swingHighs[swingHighs.length - 1];
    const diff = Math.abs(h1.price - h2.price) / h1.price;
    if (diff < 0.02 && h2.idx > h1.idx + 3) {
      results.push({ name: 'Double Top', bullish: false, strength: 0.8 });
    }
  }

  // Double Bottom
  if (swingLows.length >= 2) {
    const l1 = swingLows[swingLows.length - 2];
    const l2 = swingLows[swingLows.length - 1];
    const diff = Math.abs(l1.price - l2.price) / l1.price;
    if (diff < 0.02 && l2.idx > l1.idx + 3) {
      results.push({ name: 'Double Bottom', bullish: true, strength: 0.8 });
    }
  }

  // Head & Shoulders (bearish)
  if (swingHighs.length >= 3) {
    const [left, head, right] = swingHighs.slice(-3);
    if (
      head.price > left.price &&
      head.price > right.price &&
      Math.abs(left.price - right.price) / left.price < 0.03
    ) {
      results.push({ name: 'Head & Shoulders', bullish: false, strength: 0.85 });
    }
  }

  // Inverse Head & Shoulders (bullish)
  if (swingLows.length >= 3) {
    const [left, head, right] = swingLows.slice(-3);
    if (
      head.price < left.price &&
      head.price < right.price &&
      Math.abs(left.price - right.price) / left.price < 0.03
    ) {
      results.push({ name: 'Inverse Head & Shoulders', bullish: true, strength: 0.85 });
    }
  }

  // Ascending Triangle: flat resistance + rising lows
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-2);
    const recentLows = swingLows.slice(-2);
    const highsDiff = Math.abs(recentHighs[0].price - recentHighs[1].price) / recentHighs[0].price;
    const lowsRising = recentLows[1].price > recentLows[0].price;
    if (highsDiff < 0.015 && lowsRising) {
      results.push({ name: 'Ascending Triangle', bullish: true, strength: 0.75 });
    }
  }

  // Descending Triangle: flat support + falling highs
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-2);
    const recentLows = swingLows.slice(-2);
    const lowsDiff = Math.abs(recentLows[0].price - recentLows[1].price) / recentLows[0].price;
    const highsFalling = recentHighs[1].price < recentHighs[0].price;
    if (lowsDiff < 0.015 && highsFalling) {
      results.push({ name: 'Descending Triangle', bullish: false, strength: 0.75 });
    }
  }

  // Wyckoff Accumulation: range-bound with decreasing volume and bullish close
  const rangeCandles = recent.slice(-15);
  const prices = rangeCandles.map((c) => c.close);
  const maxP = Math.max(...prices);
  const minP = Math.min(...prices);
  const rangePercent = (maxP - minP) / minP;
  const avgVolFirst = rangeCandles.slice(0, 7).reduce((s, c) => s + c.volume, 0) / 7;
  const avgVolLast = rangeCandles.slice(-7).reduce((s, c) => s + c.volume, 0) / 7;
  const lastClose = rangeCandles[rangeCandles.length - 1].close;

  if (rangePercent < 0.05 && avgVolLast < avgVolFirst * 0.8 && lastClose > (maxP + minP) / 2) {
    results.push({ name: 'Wyckoff Accumulation', bullish: true, strength: 0.7 });
  }
  if (rangePercent < 0.05 && avgVolLast < avgVolFirst * 0.8 && lastClose < (maxP + minP) / 2) {
    results.push({ name: 'Wyckoff Distribution', bullish: false, strength: 0.7 });
  }

  return results;
}

// ─── Module 5: Volume / Capital Flow Analysis ────────────────────────────────

interface VolumeAnalysis {
  trend: 'increasing' | 'decreasing' | 'neutral';
  hasBreakoutVolume: boolean;
  hasDivergence: boolean;
  hasCapitulation: boolean;
  hasVolumeFakeout: boolean;
  score: number; // 0–25
  factors: string[];
}

function analyzeVolume(candles: CandleData[]): VolumeAnalysis {
  if (candles.length < 20) {
    return { trend: 'neutral', hasBreakoutVolume: false, hasDivergence: false, hasCapitulation: false, hasVolumeFakeout: false, score: 10, factors: [] };
  }

  const recent = candles.slice(-20);
  const avgVol = recent.reduce((s, c) => s + c.volume, 0) / recent.length;
  const lastVol = recent[recent.length - 1].volume;
  const prevVol = recent[recent.length - 2].volume;
  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];

  const factors: string[] = [];
  let score = 10;

  // Volume trend
  const firstHalfAvg = recent.slice(0, 10).reduce((s, c) => s + c.volume, 0) / 10;
  const secondHalfAvg = recent.slice(10).reduce((s, c) => s + c.volume, 0) / 10;
  const trend: 'increasing' | 'decreasing' | 'neutral' =
    secondHalfAvg > firstHalfAvg * 1.1 ? 'increasing' :
    secondHalfAvg < firstHalfAvg * 0.9 ? 'decreasing' : 'neutral';

  if (trend === 'increasing') {
    score += 5;
    factors.push('Volume trend increasing — capital inflow confirmed');
  }

  // Breakout volume: last candle volume > 1.5x average AND price moved significantly
  const priceMove = Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open;
  const hasBreakoutVolume = lastVol > avgVol * 1.5 && priceMove > 0.005;
  if (hasBreakoutVolume) {
    score += 8;
    factors.push(`Volume spike (${(lastVol / avgVol).toFixed(1)}x avg) confirms breakout`);
  }

  // Volume fakeout: price broke out but volume is below average
  const priceBreakout = priceMove > 0.01;
  const hasVolumeFakeout = priceBreakout && lastVol < avgVol * 0.8;
  if (hasVolumeFakeout) {
    score -= 8;
    factors.push('Low-volume breakout detected — possible fakeout');
  }

  // Divergence: price rising but volume falling
  const priceTrend = lastCandle.close > prevCandle.close;
  const volFalling = lastVol < prevVol * 0.8;
  const hasDivergence = priceTrend && volFalling;
  if (hasDivergence) {
    score -= 4;
    factors.push('Price/volume divergence — weakening momentum');
  }

  // Capitulation: extreme volume spike with large bearish candle
  const hasCapitulation = lastVol > avgVol * 3 && lastCandle.close < lastCandle.open &&
    Math.abs(lastCandle.close - lastCandle.open) > (lastCandle.high - lastCandle.low) * 0.6;
  if (hasCapitulation) {
    score += 6;
    factors.push('Volume capitulation detected — potential reversal bottom');
  }

  return {
    trend,
    hasBreakoutVolume,
    hasDivergence,
    hasCapitulation,
    hasVolumeFakeout,
    score: Math.max(0, Math.min(25, score)),
    factors,
  };
}

// ─── Module 6: Market Psychology (Bull/Bear Traps, Stop Hunts) ───────────────

interface PsychologyAnalysis {
  hasBullTrap: boolean;
  hasBearTrap: boolean;
  hasStopHunt: boolean;
  score: number; // 0–15
  factors: string[];
}

function analyzePsychology(candles: CandleData[]): PsychologyAnalysis {
  if (candles.length < 10) {
    return { hasBullTrap: false, hasBearTrap: false, hasStopHunt: false, score: 8, factors: [] };
  }

  const recent = candles.slice(-15);
  const factors: string[] = [];
  let score = 8;

  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  const prev2 = recent[recent.length - 3];

  // Find recent swing high/low
  let swingHigh = -Infinity;
  let swingLow = Infinity;
  for (let i = 0; i < recent.length - 2; i++) {
    if (recent[i].high > swingHigh) swingHigh = recent[i].high;
    if (recent[i].low < swingLow) swingLow = recent[i].low;
  }

  // Bull Trap: price briefly broke above swing high then reversed bearishly
  const hasBullTrap =
    prev.high > swingHigh &&
    last.close < swingHigh &&
    last.close < last.open &&
    Math.abs(last.close - last.open) > (last.high - last.low) * 0.4;

  if (hasBullTrap) {
    score -= 5;
    factors.push('Bull trap detected — false breakout above resistance');
  }

  // Bear Trap: price briefly broke below swing low then reversed bullishly
  const hasBearTrap =
    prev.low < swingLow &&
    last.close > swingLow &&
    last.close > last.open &&
    Math.abs(last.close - last.open) > (last.high - last.low) * 0.4;

  if (hasBearTrap) {
    score += 5;
    factors.push('Bear trap reversal — liquidity sweep below support');
  }

  // Stop Hunt: long wick that swept a key level then reversed
  const upperWick = last.high - Math.max(last.open, last.close);
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const range = last.high - last.low;

  const hasStopHunt =
    (lowerWick > range * 0.5 && last.close > last.open) ||
    (upperWick > range * 0.5 && last.close < last.open);

  if (hasStopHunt) {
    score += 4;
    factors.push('Stop hunt pattern — liquidity sweep with reversal');
  }

  // Trend alignment bonus: consistent direction in last 5 candles
  const last5 = recent.slice(-5);
  const bullishCount = last5.filter((c) => c.close > c.open).length;
  if (bullishCount >= 4) {
    score += 3;
    factors.push('Strong bullish momentum — 4/5 recent candles bullish');
  } else if (bullishCount <= 1) {
    score += 3;
    factors.push('Strong bearish momentum — 4/5 recent candles bearish');
  }

  return {
    hasBullTrap,
    hasBearTrap,
    hasStopHunt,
    score: Math.max(0, Math.min(15, score)),
    factors,
  };
}

// ─── Module 7: Strategy Alignment ────────────────────────────────────────────

interface StrategyAlignment {
  score: number; // 0–20
  factors: string[];
}

function analyzeStrategyAlignment(
  modality: TradeModality,
  candles: CandleData[],
  bos: ReturnType<typeof detectBOS>,
  fvg: ReturnType<typeof detectFVG>,
  ob: ReturnType<typeof detectOrderBlocks>,
  choch: ReturnType<typeof detectCHOCH>,
  rsi: number
): StrategyAlignment {
  const factors: string[] = [];
  let score = 5;

  switch (modality) {
    case TradeModality.Scalping:
      // Scalping: FVG entries + pullback structure + RSI extremes
      if (fvg.detected) { score += 8; factors.push(`FVG ${fvg.direction} entry zone identified`); }
      if (bos.detected) { score += 5; factors.push(`BOS ${bos.direction} — momentum confirmed`); }
      if (rsi < 35 || rsi > 65) { score += 4; factors.push(`RSI at ${rsi.toFixed(0)} — momentum extreme`); }
      break;

    case TradeModality.DayTrading:
      // Day Trade: BOS confirmation + retest + VWAP alignment
      if (bos.detected) { score += 8; factors.push(`BOS ${bos.direction} confirmed on ${MODALITY_INTERVAL[modality]}`); }
      if (ob.detected) { score += 5; factors.push(`Order Block ${ob.direction} — institutional zone`); }
      if (rsi > 40 && rsi < 60) { score += 4; factors.push('RSI neutral — room for directional move'); }
      break;

    case TradeModality.Swing:
      // Swing: divergences + liquidity grabs + FVG
      if (fvg.detected) { score += 6; factors.push(`FVG ${fvg.direction} — imbalance zone for swing entry`); }
      if (ob.detected) { score += 6; factors.push(`Order Block ${ob.direction} — swing demand/supply zone`); }
      if (choch.detected) { score += 5; factors.push(`CHoCH ${choch.direction} — character change for swing`); }
      break;

    case TradeModality.Position:
      // Position: Wyckoff phases + macro structure + BOS on higher TF
      if (bos.detected) { score += 7; factors.push(`BOS ${bos.direction} on daily — macro trend shift`); }
      if (choch.detected) { score += 6; factors.push(`CHoCH ${choch.direction} — long-term structure change`); }
      if (rsi < 40 || rsi > 60) { score += 4; factors.push(`RSI ${rsi.toFixed(0)} — position entry zone`); }
      break;
  }

  return { score: Math.max(0, Math.min(20, score)), factors };
}

// ─── Module 8: Risk Management Validation ────────────────────────────────────

interface RiskValidation {
  isValid: boolean;
  atr: number;
  rrAchievable: boolean;
  score: number; // 0–15
  factors: string[];
}

function validateRisk(candles: CandleData[], modality: TradeModality): RiskValidation {
  const atr = calculateATR(candles, 14);
  const currentPrice = candles[candles.length - 1].close;
  const factors: string[] = [];
  let score = 5;

  if (atr === 0) {
    return { isValid: false, atr: 0, rrAchievable: false, score: 0, factors: ['Insufficient data for ATR calculation'] };
  }

  const atrPercent = (atr / currentPrice) * 100;

  // Modality-specific ATR thresholds
  const minAtrPercent: Record<TradeModality, number> = {
    [TradeModality.Scalping]: 0.1,
    [TradeModality.DayTrading]: 0.3,
    [TradeModality.Swing]: 0.8,
    [TradeModality.Position]: 1.5,
  };

  const maxAtrPercent: Record<TradeModality, number> = {
    [TradeModality.Scalping]: 1.0,
    [TradeModality.DayTrading]: 3.0,
    [TradeModality.Swing]: 8.0,
    [TradeModality.Position]: 20.0,
  };

  const isVolatilityOk = atrPercent >= minAtrPercent[modality] && atrPercent <= maxAtrPercent[modality];

  if (isVolatilityOk) {
    score += 5;
    factors.push(`ATR ${atrPercent.toFixed(2)}% — optimal volatility for ${modality}`);
  } else if (atrPercent < minAtrPercent[modality]) {
    score -= 3;
    factors.push(`ATR too low (${atrPercent.toFixed(2)}%) — insufficient volatility`);
  } else {
    score -= 2;
    factors.push(`ATR high (${atrPercent.toFixed(2)}%) — elevated risk`);
  }

  // 1:2 R:R achievability: stop = 1x ATR, target = 2x ATR
  // This is always achievable with ATR-based sizing, but we check if the move is realistic
  const rrAchievable = atrPercent >= minAtrPercent[modality];
  if (rrAchievable) {
    score += 5;
    factors.push('1:2 R:R achievable with ATR-based stop placement');
  }

  return {
    isValid: isVolatilityOk,
    atr,
    rrAchievable,
    score: Math.max(0, Math.min(15, score)),
    factors,
  };
}

// ─── Composite Scoring ────────────────────────────────────────────────────────

async function scoreSymbol(
  symbol: string,
  modality: TradeModality,
  interval: string
): Promise<ScoredSymbol | null> {
  try {
    const klines = await getKlines(symbol, interval, 100);
    const candles = parseKlines(klines);

    if (candles.length < 20) return null;

    // Module 2: Price Action / SMC (25 points)
    const bos = detectBOS(candles);
    const fvg = detectFVG(candles);
    const ob = detectOrderBlocks(candles);
    const choch = detectCHOCH(candles);
    const rsi = calculateRSI(candles, 14);

    let smcScore = 5;
    const smcFactors: string[] = [];

    if (bos.detected) {
      smcScore += 10;
      smcFactors.push(`BOS ${bos.direction} detected on ${interval} — structural break confirmed`);
    }
    if (fvg.detected) {
      smcScore += 8;
      smcFactors.push(`FVG ${fvg.direction} imbalance zone on ${interval}`);
    }
    if (ob.detected) {
      smcScore += 7;
      smcFactors.push(`Order Block ${ob.direction} — institutional zone on ${interval}`);
    }
    if (choch.detected) {
      smcScore += 5;
      smcFactors.push(`CHoCH ${choch.direction} — character change signal`);
    }
    smcScore = Math.min(25, smcScore);

    // Module 3: Candlestick Patterns (0–10 bonus)
    const candlePatterns = detectCandlePatterns(candles);
    let candleScore = 0;
    const candleFactors: string[] = [];
    for (const p of candlePatterns.slice(0, 2)) {
      candleScore += Math.round(p.strength * 5);
      candleFactors.push(`${p.name} pattern — ${p.bullish ? 'bullish' : 'bearish'} signal`);
    }
    candleScore = Math.min(10, candleScore);

    // Module 4: Chart Patterns (0–10 bonus)
    const chartPatterns = detectChartPatterns(candles);
    let chartScore = 0;
    const chartFactors: string[] = [];
    for (const p of chartPatterns.slice(0, 2)) {
      chartScore += Math.round(p.strength * 5);
      chartFactors.push(`${p.name} — ${p.bullish ? 'bullish' : 'bearish'} formation`);
    }
    chartScore = Math.min(10, chartScore);

    // Module 5: Volume Analysis (0–25)
    const volumeAnalysis = analyzeVolume(candles);

    // Module 6: Psychology (0–15)
    const psychAnalysis = analyzePsychology(candles);

    // Module 7: Strategy Alignment (0–20)
    const strategyAlignment = analyzeStrategyAlignment(modality, candles, bos, fvg, ob, choch, rsi);

    // Module 8: Risk Management (0–15)
    const riskValidation = validateRisk(candles, modality);

    // Composite score (max 100 from weighted modules)
    const rawScore =
      smcScore +           // 0–25
      candleScore +        // 0–10
      chartScore +         // 0–10
      volumeAnalysis.score + // 0–25
      psychAnalysis.score +  // 0–15
      strategyAlignment.score + // 0–20
      riskValidation.score;    // 0–15
    // Total max = 120, normalize to 100
    const normalizedScore = Math.min(100, Math.round((rawScore / 120) * 100));

    // Collect all factors and pick top 3 by relevance
    const allFactors = [
      ...smcFactors,
      ...candleFactors,
      ...chartFactors,
      ...volumeAnalysis.factors,
      ...psychAnalysis.factors,
      ...strategyAlignment.factors,
      ...riskValidation.factors,
    ];

    // Deduplicate and take top 3
    const uniqueFactors = Array.from(new Set(allFactors)).slice(0, 3);

    return {
      symbol,
      score: normalizedScore,
      scoringFactors: uniqueFactors.length > 0
        ? uniqueFactors
        : [`${modality} analysis complete — score: ${normalizedScore}`],
    };
  } catch {
    return null;
  }
}

/**
 * Score a list of symbols for a given modality and return the top `limit` results.
 * Implements the 8-module knowledge framework from the trading methodology.
 */
export async function scoreSymbolsForModality(
  modality: TradeModality,
  symbols: string[],
  limit: number
): Promise<ScoredSymbol[]> {
  const interval = MODALITY_INTERVAL[modality];

  // Process symbols in batches to avoid rate limiting
  const BATCH_SIZE = 8;
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

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Sort by score descending and return top `limit`
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
