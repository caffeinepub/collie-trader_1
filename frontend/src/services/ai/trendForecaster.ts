import { parseKlines, calculateRSI, calculateATR } from './smcIndicators';
import type { Kline } from '../../types/binance';

export interface TrendForecast {
  symbol: string;
  continuationProbability: number;
  reversalProbability: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
  timestamp: number;
}

export function forecastTrend(symbol: string, klines: Kline[]): TrendForecast {
  const candles = parseKlines(klines);
  const closes = candles.map((c) => c.close);
  const rsi = calculateRSI(candles, 14);
  const atr = calculateATR(candles, 14);

  const factors: string[] = [];
  let continuationScore = 50;

  // RSI momentum
  if (rsi > 55) {
    continuationScore += 10;
    factors.push('RSI bullish momentum');
  } else if (rsi < 45) {
    continuationScore -= 10;
    factors.push('RSI bearish momentum');
  }

  // Overbought/oversold
  if (rsi > 70) {
    continuationScore -= 15;
    factors.push('RSI overbought — reversal risk');
  } else if (rsi < 30) {
    continuationScore += 15;
    factors.push('RSI oversold — bounce potential');
  }

  // Price momentum (last 5 candles)
  const last5 = closes.slice(-5);
  const momentum = (last5[4] - last5[0]) / last5[0];
  if (Math.abs(momentum) > 0.02) {
    if (momentum > 0) {
      continuationScore += 8;
      factors.push('Strong upward momentum');
    } else {
      continuationScore -= 8;
      factors.push('Strong downward momentum');
    }
  }

  // Volatility (ATR relative to price)
  const currentPrice = closes[closes.length - 1];
  const atrPercent = (atr / currentPrice) * 100;
  if (atrPercent > 3) {
    continuationScore -= 5;
    factors.push('High volatility — uncertain direction');
  } else if (atrPercent < 1) {
    continuationScore += 5;
    factors.push('Low volatility — consolidation');
  }

  // Volume trend
  const volumes = candles.slice(-10).map((c) => c.volume);
  const avgVol = volumes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
  const recentVol = volumes.slice(5).reduce((a, b) => a + b, 0) / 5;
  if (recentVol > avgVol * 1.3) {
    continuationScore += 7;
    factors.push('Increasing volume confirms trend');
  }

  continuationScore = Math.max(10, Math.min(90, continuationScore));
  const reversalProbability = 100 - continuationScore;

  let confidence: 'high' | 'medium' | 'low';
  if (factors.length >= 3) confidence = 'high';
  else if (factors.length >= 2) confidence = 'medium';
  else confidence = 'low';

  return {
    symbol,
    continuationProbability: continuationScore,
    reversalProbability,
    confidence,
    factors,
    timestamp: Date.now(),
  };
}
