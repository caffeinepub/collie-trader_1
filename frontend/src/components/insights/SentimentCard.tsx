import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SentimentResult } from '../../services/ai/sentimentAnalyzer';
import { Progress } from '@/components/ui/progress';

interface SentimentCardProps {
  sentiment: SentimentResult;
}

export function SentimentCard({ sentiment }: SentimentCardProps) {
  const isBullish = sentiment.sentiment === 'bullish';
  const isBearish = sentiment.sentiment === 'bearish';

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold terminal-text text-foreground">{sentiment.symbol}</span>
        <div
          className={`flex items-center gap-1.5 text-xs font-bold ${
            isBullish ? 'text-profit' : isBearish ? 'text-loss' : 'text-warning'
          }`}
        >
          {isBullish ? (
            <TrendingUp className="w-4 h-4" />
          ) : isBearish ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
          {sentiment.sentiment.toUpperCase()}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">RSI (14)</span>
          <span
            className={`terminal-text font-bold ${
              sentiment.rsi > 70
                ? 'text-loss'
                : sentiment.rsi < 30
                ? 'text-profit'
                : 'text-foreground'
            }`}
          >
            {sentiment.rsi.toFixed(1)}
          </span>
        </div>
        <Progress
          value={sentiment.rsi}
          className="h-1.5"
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Trend</span>
        <span
          className={`terminal-text ${
            sentiment.trend === 'uptrend'
              ? 'text-profit'
              : sentiment.trend === 'downtrend'
              ? 'text-loss'
              : 'text-warning'
          }`}
        >
          {sentiment.trend.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Strength</span>
        <div className="flex items-center gap-2">
          <Progress value={sentiment.strength} className="h-1 w-16" />
          <span className="terminal-text text-foreground">{sentiment.strength.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
