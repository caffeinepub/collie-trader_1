import { useState, useEffect, useCallback, useRef } from 'react';
import { TradeModality, TradeDirection, TradeStatus } from '../types/trade';
import type { Trade, RecoveryStrategy } from '../types/trade';
import type { PositionRisk } from '../types/binance';
import { useTradeLifecycle } from '../hooks/useTradeLifecycle';
import { useModalityMode } from '../hooks/useModalityMode';
import { generateRecoveryStrategies } from '../services/ai/positionRecoveryEngine';
import { getPositionRisk } from '../services/binance/binanceAccountService';
import { hasCredentials } from '../services/binance/binanceAuth';
import { RecoveryPositionCard } from '../components/recovery/RecoveryPositionCard';
import { RecoveryProgressTracker } from '../components/recovery/RecoveryProgressTracker';
import { TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface RecoveryData {
  trade: Trade;
  strategies: RecoveryStrategy[];
  initialLoss: number;
  currentLoss: number;
  currentPrice: number;
  actions: Array<{ timestamp: number; strategyType: string; pnlBefore: number; pnlAfter: number }>;
}

/** Convert a live Binance PositionRisk into a minimal Trade-like object for recovery analysis */
function positionRiskToTrade(pos: PositionRisk): Trade {
  const entryPrice = parseFloat(pos.entryPrice);
  const markPrice = parseFloat(pos.markPrice);
  const positionAmt = parseFloat(pos.positionAmt);
  const isLong = positionAmt > 0;
  const notional = Math.abs(parseFloat(pos.notional));

  // Estimate TP/SL levels based on entry price (5% TP, 3% SL)
  const tpMultiplier = isLong ? 1.05 : 0.95;
  const slMultiplier = isLong ? 0.97 : 1.03;
  const tp = entryPrice * tpMultiplier;
  const sl = entryPrice * slMultiplier;

  return {
    id: `binance-${pos.symbol}-${pos.positionSide}`,
    symbol: pos.symbol,
    modality: TradeModality.Scalping,
    direction: isLong ? TradeDirection.LONG : TradeDirection.SHORT,
    entry: entryPrice,
    tp1: tp,
    tp2: entryPrice * (isLong ? 1.08 : 0.92),
    tp3: entryPrice * (isLong ? 1.12 : 0.88),
    stopLoss: sl,
    currentSL: sl,
    status: TradeStatus.Active,
    openTime: Date.now(),
    positionSize: notional,
    isLive: true,
    tp1Hit: false,
    tp2Hit: false,
    tp3Hit: false,
    interval: '15m',
    entryReason: `Live Binance position (mark: ${markPrice.toFixed(4)})`,
  };
}

export function PositionRecovery() {
  const { trades } = useTradeLifecycle();
  const { isLive } = useModalityMode();

  // Stable state: only mutated by initial mount load or explicit Refresh click
  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [credentialsAvailable] = useState(() => hasCredentials());

  // Guard to prevent the mount effect from running more than once
  const mountedRef = useRef(false);

  /**
   * Core recovery analysis: given a list of Trade objects and a price map,
   * filter those with >20% unrealized loss and generate recovery strategies.
   * Returns both the RecoveryData array and the price map used.
   */
  const analyzePositions = useCallback(
    async (
      tradesToAnalyze: Trade[],
      priceMap: Record<string, number>
    ): Promise<RecoveryData[]> => {
      const results: RecoveryData[] = [];

      for (const trade of tradesToAnalyze) {
        const currentPrice = priceMap[trade.symbol] || 0;
        if (!currentPrice) continue;

        const isLongTrade = trade.direction === TradeDirection.LONG;
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
          currentPrice,
          actions: [],
        });
      }

      return results;
    },
    []
  );

  /**
   * Shared fetch-and-analyze logic used by both initial mount and Refresh button.
   * Fetches live Binance positions, merges with local AI trades, runs analysis,
   * and stores results in stable state.
   */
  const fetchAndAnalyze = useCallback(
    async (isManualRefresh = false) => {
      if (!credentialsAvailable) {
        if (isManualRefresh) {
          toast.warning(
            'Binance API credentials not configured. Go to Settings to add your API key and secret.'
          );
        }
        return;
      }

      setLoading(true);

      try {
        // 1. Fetch live positions from Binance /fapi/v2/positionRisk
        let binancePositions: PositionRisk[] = [];
        try {
          binancePositions = await getPositionRisk();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          if (isManualRefresh) {
            toast.error(`Failed to fetch Binance positions: ${msg}`);
          }
          setLoading(false);
          return;
        }

        // 2. Convert Binance positions to Trade objects
        const binanceTrades: Trade[] = binancePositions.map(positionRiskToTrade);

        // 3. Merge with local AI trades (avoid duplicates by symbol)
        const localTrades = Object.values(trades).filter(Boolean) as Trade[];
        const binanceSymbols = new Set(binanceTrades.map((t) => t.symbol));
        const uniqueLocalTrades = localTrades.filter((t) => !binanceSymbols.has(t.symbol));
        const allTrades = [...binanceTrades, ...uniqueLocalTrades];

        if (allTrades.length === 0) {
          if (isManualRefresh) {
            toast.info('No open positions found on Binance.');
          }
          setRecoveryData([]);
          setLoading(false);
          return;
        }

        // 4. Build a price map using markPrice from Binance positions (most accurate)
        const priceMap: Record<string, number> = {};
        for (const pos of binancePositions) {
          const mp = parseFloat(pos.markPrice);
          if (mp > 0) priceMap[pos.symbol] = mp;
        }

        // 5. Re-run positionRecoveryEngine on all positions
        const results = await analyzePositions(allTrades, priceMap);

        // Stable update: set once, never overwritten by polling
        setRecoveryData(results);

        if (isManualRefresh) {
          if (results.length === 0) {
            toast.success('Refresh complete — no positions with loss > 20% detected.');
          } else {
            toast.warning(`${results.length} position(s) in deep loss detected.`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (isManualRefresh) {
          toast.error(`Refresh failed: ${msg}`);
        }
      } finally {
        setLoading(false);
      }
    },
    // NOTE: `trades` is intentionally NOT in the dependency array here because
    // we snapshot it at call time. The ref guard prevents re-runs from re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [credentialsAvailable, analyzePositions]
  );

  /**
   * Initial load on mount — runs exactly once.
   * Uses the same fetchAndAnalyze logic as the Refresh button.
   */
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    fetchAndAnalyze(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Manual Refresh button handler */
  const handleRefresh = useCallback(() => {
    fetchAndAnalyze(true);
  }, [fetchAndAnalyze]);

  const handleExecuteStrategy = (tradeId: string, strategy: RecoveryStrategy) => {
    const rd = recoveryData.find((r) => r.trade.id === tradeId);
    const modalityKey = rd?.trade.modality as TradeModality | undefined;
    const liveMode = modalityKey ? isLive(modalityKey) : false;
    toast.success(`Strategy "${strategy.type}" executed (${liveMode ? 'Live' : 'Simulated'})`);
    setRecoveryData((prev) =>
      prev.map((item) => {
        if (item.trade.id !== tradeId) return item;
        const improvement = (strategy.expectedPnlImprovement / 100) * Math.abs(item.currentLoss);
        const newLoss = item.currentLoss + improvement;
        return {
          ...item,
          currentLoss: newLoss,
          actions: [
            ...item.actions,
            {
              timestamp: Date.now(),
              strategyType: strategy.type,
              pnlBefore: item.currentLoss,
              pnlAfter: newLoss,
            },
          ],
        };
      })
    );
  };

  const noLosers = recoveryData.length === 0;

  return (
    <TooltipProvider>
      <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-loss" />
            <h1 className="text-lg font-bold">Position Recovery</h1>
          </div>

          <div className="flex items-center gap-2">
            {!credentialsAvailable && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 text-xs text-yellow-500 cursor-default">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    No credentials
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs">
                  Binance API key and secret are required to fetch live positions. Configure them in
                  Settings.
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading || !credentialsAvailable}
                  className="h-8 text-xs border-border"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </TooltipTrigger>
              {!credentialsAvailable && (
                <TooltipContent side="left" className="max-w-xs text-xs">
                  Configure Binance API credentials in Settings to enable live position refresh.
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Fetching live positions from Binance and running recovery analysis…
          </div>
        )}

        {!loading && noLosers && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No positions in deep loss</p>
            <p className="text-xs mt-1">
              Positions with unrealized loss &gt; 20% will appear here automatically.
            </p>
            {credentialsAvailable && (
              <p className="text-xs mt-2 text-muted-foreground/70">
                Click <strong>Refresh</strong> to fetch the latest positions from Binance.
              </p>
            )}
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {recoveryData.map((rd) => (
              <div key={rd.trade.id} className="space-y-3">
                <RecoveryPositionCard
                  trade={rd.trade}
                  currentPrice={rd.currentPrice}
                  strategies={rd.strategies}
                  onExecute={(strategy) => handleExecuteStrategy(rd.trade.id, strategy)}
                  isLive={isLive(rd.trade.modality as TradeModality)}
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
        )}
      </div>
    </TooltipProvider>
  );
}
