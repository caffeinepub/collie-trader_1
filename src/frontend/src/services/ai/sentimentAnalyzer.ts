import { parseKlines, calculateRSI } from './smcIndicators';
import type { Kline } from '../../types/binance';

export interface SentimentResult {
  symbol: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  rsi: number;
  strength: number; // 0-100
  trend: 'uptrend' | 'downtrend' | 'sideways';
  ma20: number;
  ma50: number;
  timestamp: number;
}

function calculateMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] || 0;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function analyzeSentiment(symbol: string, klines: Kline[]): SentimentResult {
  const candles = parseKlines(klines);
  const closes = candles.map((c) => c.close);

  const rsi = calculateRSI(candles, 14);
  const ma20 = calculateMA(closes, 20);
  const ma50 = calculateMA(closes, 50);
  const currentPrice = closes[closes.length - 1];

  let trend: 'uptrend' | 'downtrend' | 'sideways';
  if (ma20 > ma50 && currentPrice > ma20) {
    trend = 'uptrend';
  } else if (ma20 < ma50 && currentPrice < ma20) {
    trend = 'downtrend';
  } else {
    trend = 'sideways';
  }

  let sentiment: 'bullish' | 'bearish' | 'neutral';
  let strength: number;

  if (rsi > 60 && trend === 'uptrend') {
    sentiment = 'bullish';
    strength = Math.min(100, (rsi - 50) * 2);
  } else if (rsi < 40 && trend === 'downtrend') {
    sentiment = 'bearish';
    strength = Math.min(100, (50 - rsi) * 2);
  } else {
    sentiment = 'neutral';
    strength = 50;
  }

  return {
    symbol,
    sentiment,
    rsi,
    strength,
    trend,
    ma20,
    ma50,
    timestamp: Date.now(),
  };
}
