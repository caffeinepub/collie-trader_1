import type { Kline } from '../../types/binance';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function parseKlines(klines: Kline[]): CandleData[] {
  return klines.map((k) => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

export interface BOSResult {
  detected: boolean;
  direction: 'bullish' | 'bearish' | null;
  level: number;
  index: number;
}

export function detectBOS(candles: CandleData[]): BOSResult {
  if (candles.length < 10) return { detected: false, direction: null, level: 0, index: -1 };

  const recent = candles.slice(-20);
  let lastSwingHigh = -Infinity;
  let lastSwingLow = Infinity;
  let swingHighIdx = -1;
  let swingLowIdx = -1;

  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i].high > recent[i - 1].high && recent[i].high > recent[i + 1].high) {
      if (recent[i].high > lastSwingHigh) {
        lastSwingHigh = recent[i].high;
        swingHighIdx = i;
      }
    }
    if (recent[i].low < recent[i - 1].low && recent[i].low < recent[i + 1].low) {
      if (recent[i].low < lastSwingLow) {
        lastSwingLow = recent[i].low;
        swingLowIdx = i;
      }
    }
  }

  const lastCandle = recent[recent.length - 1];

  if (swingHighIdx > 0 && lastCandle.close > lastSwingHigh) {
    return { detected: true, direction: 'bullish', level: lastSwingHigh, index: swingHighIdx };
  }
  if (swingLowIdx > 0 && lastCandle.close < lastSwingLow) {
    return { detected: true, direction: 'bearish', level: lastSwingLow, index: swingLowIdx };
  }

  return { detected: false, direction: null, level: 0, index: -1 };
}

export interface FVGResult {
  detected: boolean;
  direction: 'bullish' | 'bearish' | null;
  top: number;
  bottom: number;
  midpoint: number;
}

export function detectFVG(candles: CandleData[]): FVGResult {
  if (candles.length < 3) return { detected: false, direction: null, top: 0, bottom: 0, midpoint: 0 };

  for (let i = candles.length - 3; i >= Math.max(0, candles.length - 15); i--) {
    const c1 = candles[i];
    const c3 = candles[i + 2];

    // Bullish FVG: gap between c1 high and c3 low
    if (c3.low > c1.high) {
      const top = c3.low;
      const bottom = c1.high;
      return {
        detected: true,
        direction: 'bullish',
        top,
        bottom,
        midpoint: (top + bottom) / 2,
      };
    }

    // Bearish FVG: gap between c1 low and c3 high
    if (c3.high < c1.low) {
      const top = c1.low;
      const bottom = c3.high;
      return {
        detected: true,
        direction: 'bearish',
        top,
        bottom,
        midpoint: (top + bottom) / 2,
      };
    }
  }

  return { detected: false, direction: null, top: 0, bottom: 0, midpoint: 0 };
}

export interface OrderBlockResult {
  detected: boolean;
  direction: 'bullish' | 'bearish' | null;
  top: number;
  bottom: number;
  midpoint: number;
}

export function detectOrderBlocks(candles: CandleData[]): OrderBlockResult {
  if (candles.length < 5) return { detected: false, direction: null, top: 0, bottom: 0, midpoint: 0 };

  const recent = candles.slice(-20);

  for (let i = recent.length - 4; i >= 1; i--) {
    const c = recent[i];
    const next = recent[i + 1];
    const bodySize = Math.abs(c.close - c.open);
    const totalRange = c.high - c.low;
    const isStrongCandle = bodySize > totalRange * 0.6;

    if (!isStrongCandle) continue;

    // Bullish OB: bearish candle followed by strong bullish move
    if (c.close < c.open && next.close > next.open && next.close > c.high) {
      return {
        detected: true,
        direction: 'bullish',
        top: c.open,
        bottom: c.close,
        midpoint: (c.open + c.close) / 2,
      };
    }

    // Bearish OB: bullish candle followed by strong bearish move
    if (c.close > c.open && next.close < next.open && next.close < c.low) {
      return {
        detected: true,
        direction: 'bearish',
        top: c.close,
        bottom: c.open,
        midpoint: (c.close + c.open) / 2,
      };
    }
  }

  return { detected: false, direction: null, top: 0, bottom: 0, midpoint: 0 };
}

export function calculateRSI(candles: CandleData[], period = 14): number {
  if (candles.length < period + 1) return 50;

  const closes = candles.slice(-period - 1).map((c) => c.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateATR(candles: CandleData[], period = 14): number {
  if (candles.length < period + 1) return 0;

  const recent = candles.slice(-period - 1);
  let atrSum = 0;

  for (let i = 1; i < recent.length; i++) {
    const tr = Math.max(
      recent[i].high - recent[i].low,
      Math.abs(recent[i].high - recent[i - 1].close),
      Math.abs(recent[i].low - recent[i - 1].close)
    );
    atrSum += tr;
  }

  return atrSum / period;
}

export function detectCHOCH(candles: CandleData[]): { detected: boolean; direction: 'bullish' | 'bearish' | null; level: number } {
  if (candles.length < 15) return { detected: false, direction: null, level: 0 };

  const recent = candles.slice(-15);
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i].high > recent[i - 1].high && recent[i].high > recent[i + 1].high) {
      swingHighs.push(recent[i].high);
    }
    if (recent[i].low < recent[i - 1].low && recent[i].low < recent[i + 1].low) {
      swingLows.push(recent[i].low);
    }
  }

  const lastCandle = recent[recent.length - 1];

  // CHOCH bearish: price breaks below previous swing low after uptrend
  if (swingLows.length >= 2) {
    const prevLow = swingLows[swingLows.length - 2];
    const lastLow = swingLows[swingLows.length - 1];
    if (lastLow < prevLow && lastCandle.close < lastLow) {
      return { detected: true, direction: 'bearish', level: lastLow };
    }
  }

  // CHOCH bullish: price breaks above previous swing high after downtrend
  if (swingHighs.length >= 2) {
    const prevHigh = swingHighs[swingHighs.length - 2];
    const lastHigh = swingHighs[swingHighs.length - 1];
    if (lastHigh > prevHigh && lastCandle.close > lastHigh) {
      return { detected: true, direction: 'bullish', level: lastHigh };
    }
  }

  return { detected: false, direction: null, level: 0 };
}
