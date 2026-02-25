import { useState, useEffect } from 'react';
import { TradeModality } from '../types/trade';
import type { Trade, RecoveryStrategy } from '../types/trade';
import { useTradeLifecycle } from '../hooks/useTradeLifecycle';
import { useModalityMode } from '../hooks/useModalityMode';
import { usePricePolling } from '../hooks/usePricePolling';
import { generateRecoveryStrategies } from '../services/ai/positionRecoveryEngine';
import { RecoveryPositionCard } from '../components/recovery/RecoveryPositionCard';
import { RecoveryProgressTracker } from '../components/recovery/RecoveryProgressTracker';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RecoveryData {
  trade: Trade;
  strategies: RecoveryStrategy[];
  initialLoss: number;
  currentLoss: number;
  actions: Array<{ timestamp: number; strategyType: string; pnlBefore: number; pnlAfter: number }>;
}

export function PositionRecovery() {
  const { trades } = useTradeLifecycle();
  const { isLive } = useModalityMode();
  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [loading, setLoading] = useState(false);

  const activeSymbols = Object.values(trades)
    .filter(Boolean)
    .map((t) => t!.symbol);

  const { prices } = usePricePolling(activeSymbols, 5000);

  const loadRecoveryData = async () => {
    setLoading(true);
    const results: RecoveryData[] = [];

    for (const trade of Object.values(trades)) {
      if (!trade) continue;
      const currentPrice = prices[trade.symbol] || trade.entry;
      const isLongTrade = trade.direction === 'LONG';
      const pnlPercent = isLongTrade
        ? ((currentPrice - trade.entry) / trade.entry) * 100
        : ((trade.entry - currentPrice) / trade.entry) * 100;

      // Only flag positions with > 20% loss
      if (pnlPercent >= -20) continue;

      const pnlUsdt = (pnlPercent / 100) * trade.positionSize;
      const strategies = await generateRecoveryStrategies(trade, currentPrice);

      results.push({
        trade,
        strategies,
        initialLoss: pnlUsdt,
        currentLoss: pnlUsdt,
        actions: [],
      });
    }

    setRecoveryData(results);
    setLoading(false);
  };

  useEffect(() => {
    if (Object.values(trades).some(Boolean) && Object.keys(prices).length > 0) {
      loadRecoveryData();
    }
  }, [prices]);

  const handleExecuteStrategy = (tradeId: string, strategy: RecoveryStrategy) => {
    toast.success(`Strategy "${strategy.type}" executed (${isLive(tradeId as TradeModality) ? 'Live' : 'Simulated'})`);
    setRecoveryData((prev) =>
      prev.map((rd) => {
        if (rd.trade.id !== tradeId) return rd;
        const improvement = (strategy.expectedPnlImprovement / 100) * Math.abs(rd.currentLoss);
        const newLoss = rd.currentLoss + improvement;
        return {
          ...rd,
          currentLoss: newLoss,
          actions: [
            ...rd.actions,
            {
              timestamp: Date.now(),
              strategyType: strategy.type,
              pnlBefore: rd.currentLoss,
              pnlAfter: newLoss,
            },
          ],
        };
      })
    );
  };

  const noLosers = recoveryData.length === 0;

  return (
    <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-loss" />
          <h1 className="text-lg font-bold">Position Recovery</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadRecoveryData}
          disabled={loading}
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

      {noLosers && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No positions in deep loss</p>
          <p className="text-xs mt-1">
            Positions with unrealized loss &gt; 20% will appear here automatically.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {recoveryData.map((rd) => (
          <div key={rd.trade.id} className="space-y-3">
            <RecoveryPositionCard
              trade={rd.trade}
              currentPrice={prices[rd.trade.symbol] || rd.trade.entry}
              strategies={rd.strategies}
              onExecute={(strategy) => handleExecuteStrategy(rd.trade.id, strategy)}
              isLive={isLive(rd.trade.modality)}
            />
            {rd.actions.length > 0 && (
              <RecoveryProgressTracker
                symbol={rd.trade.symbol}
                initialLoss={rd.initialLoss}
                currentLoss={rd.currentLoss}
                actions={rd.actions}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
