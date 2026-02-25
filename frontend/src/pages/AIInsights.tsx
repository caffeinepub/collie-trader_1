import { useState, useEffect } from 'react';
import { TradeModality } from '../types/trade';
import { useTradeLifecycle } from '../hooks/useTradeLifecycle';
import { usePricePolling } from '../hooks/usePricePolling';
import { getKlines } from '../services/binance/binancePublicApi';
import { analyzeSentiment } from '../services/ai/sentimentAnalyzer';
import { forecastTrend } from '../services/ai/trendForecaster';
import { getTradeAdvice } from '../services/ai/tradeAdvisor';
import { SentimentCard } from '../components/insights/SentimentCard';
import { TrendForecastCard } from '../components/insights/TrendForecastCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Brain, Lightbulb } from 'lucide-react';
import type { SentimentResult } from '../services/ai/sentimentAnalyzer';
import type { TrendForecast } from '../services/ai/trendForecaster';
import type { TradeAdvice } from '../services/ai/tradeAdvisor';
import { MODALITY_PRIMARY_INTERVAL } from '../services/ai/aiTradeSelection';

interface InsightData {
  symbol: string;
  modality: TradeModality;
  sentiment: SentimentResult | null;
  forecast: TrendForecast | null;
  advice: TradeAdvice[];
}

export function AIInsights() {
  const { trades } = useTradeLifecycle();
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [loading, setLoading] = useState(false);

  const activeSymbols = Object.values(trades)
    .filter(Boolean)
    .map((t) => t!.symbol);

  const { prices } = usePricePolling(activeSymbols, 10000);

  const fetchInsights = async () => {
    setLoading(true);
    const results: InsightData[] = [];

    for (const [modality, trade] of Object.entries(trades)) {
      if (!trade) continue;
      try {
        const interval = MODALITY_PRIMARY_INTERVAL[modality as TradeModality];
        const klines = await getKlines(trade.symbol, interval, 100);
        const currentPrice = prices[trade.symbol] || trade.entry;

        const sentiment = analyzeSentiment(trade.symbol, klines);
        const forecast = forecastTrend(trade.symbol, klines);
        const advice = getTradeAdvice(trade, currentPrice);

        results.push({
          symbol: trade.symbol,
          modality: modality as TradeModality,
          sentiment,
          forecast,
          advice,
        });
      } catch {
        results.push({
          symbol: trade.symbol,
          modality: modality as TradeModality,
          sentiment: null,
          forecast: null,
          advice: [],
        });
      }
    }

    setInsights(results);
    setLoading(false);
  };

  useEffect(() => {
    if (Object.values(trades).some(Boolean)) {
      fetchInsights();
    }
  }, []);

  const noTrades = !Object.values(trades).some(Boolean);

  return (
    <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-profit" />
          <h1 className="text-lg font-bold">AI Insights</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={loading || noTrades}
          className="h-8 text-xs border-border"
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {noTrades && (
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active trades to analyze.</p>
          <p className="text-xs mt-1">Go to Dashboard and generate trades first.</p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-6">
          {insights.map((insight) => (
            <div key={`${insight.symbol}_${insight.modality}`} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="text-sm font-bold terminal-text">{insight.symbol}</span>
                <span className="text-xs text-muted-foreground">— {insight.modality}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insight.sentiment && <SentimentCard sentiment={insight.sentiment} />}
                {insight.forecast && (
                  <TrendForecastCard forecast={insight.forecast} modality={insight.modality} />
                )}
              </div>

              {insight.advice.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-warning" />
                    <span className="text-xs font-semibold">Trade Advisor</span>
                  </div>
                  <div className="space-y-2">
                    {insight.advice.map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded border text-xs ${
                          a.urgency === 'high'
                            ? 'border-loss/30 bg-loss/5'
                            : a.urgency === 'medium'
                            ? 'border-warning/30 bg-warning/5'
                            : 'border-border bg-muted/20'
                        }`}
                      >
                        <span
                          className={`font-bold shrink-0 ${
                            a.urgency === 'high'
                              ? 'text-loss'
                              : a.urgency === 'medium'
                              ? 'text-warning'
                              : 'text-profit'
                          }`}
                        >
                          {a.title}
                        </span>
                        <span className="text-foreground/70">{a.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!noTrades && insights.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Click Refresh to load AI insights for your active trades.
        </div>
      )}
    </div>
  );
}
