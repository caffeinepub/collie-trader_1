import { useEffect, useMemo } from 'react';
import { TradeModality } from '../types/trade';
import { useTradeLifecycle } from '../hooks/useTradeLifecycle';
import { useModalityMode } from '../hooks/useModalityMode';
import { usePricePolling } from '../hooks/usePricePolling';
import { useReversalDetection } from '../hooks/useReversalDetection';
import { ModalityCard } from '../components/trading/ModalityCard';
import { BinancePositionsList } from '../components/trading/BinancePositionsList';
import { ReversalAlertDialog } from '../components/trading/ReversalAlertDialog';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export function Dashboard() {
  const {
    trades,
    generating,
    generateNewTrade,
    closeTrade,
    reverseTrade,
    checkAndUpdateTrades,
    initializeAllTrades,
  } = useTradeLifecycle();

  const { isLive, toggleMode, canGoLive } = useModalityMode();

  const activeSymbols = useMemo(() => {
    const symbols = new Set<string>();
    Object.values(trades).forEach((t) => {
      if (t) symbols.add(t.symbol);
    });
    return Array.from(symbols);
  }, [trades]);

  const { prices } = usePricePolling(activeSymbols, 5000);

  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      checkAndUpdateTrades(prices);
    }
  }, [prices, checkAndUpdateTrades]);

  const { activeSignal, dismissSignal } = useReversalDetection(trades, prices);

  const getModalityForTrade = (tradeId: string) => {
    for (const [modality, trade] of Object.entries(trades)) {
      if (trade?.id === tradeId) return modality as TradeModality;
    }
    return null;
  };

  const modalities = [
    TradeModality.Scalping,
    TradeModality.DayTrading,
    TradeModality.Swing,
    TradeModality.Position,
  ];

  const hasAnyTrade = Object.values(trades).some(Boolean);
  const isAnyGenerating = Object.values(generating).some(Boolean);

  return (
    <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Trading Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {activeSymbols.length > 0
              ? `Monitoring: ${activeSymbols.join(', ')}`
              : 'No active trades — generate a trade to get started'}
          </p>
        </div>
        {!hasAnyTrade && (
          <Button
            size="sm"
            onClick={initializeAllTrades}
            disabled={isAnyGenerating}
            className="text-xs h-8 bg-primary/20 border border-primary/40 text-profit hover:bg-primary/30"
          >
            <Zap className="w-3 h-3 mr-1" />
            {isAnyGenerating ? 'Generating...' : 'Initialize All Trades'}
          </Button>
        )}
      </div>

      {/* 4 Modality Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {modalities.map((modality) => (
          <ModalityCard
            key={modality}
            modality={modality}
            trade={trades[modality]}
            currentPrice={trades[modality] ? prices[trades[modality]!.symbol] : undefined}
            isLive={isLive(modality)}
            canGoLive={canGoLive}
            isGenerating={generating[modality]}
            onToggleLive={() => toggleMode(modality)}
            onClose={() => closeTrade(modality, isLive(modality))}
            onGenerate={() => generateNewTrade(modality)}
          />
        ))}
      </div>

      {/* Binance Positions */}
      <BinancePositionsList />

      {/* Reversal Alert */}
      <ReversalAlertDialog
        signal={activeSignal}
        onClose={(modality) => {
          closeTrade(modality, isLive(modality));
          dismissSignal(activeSignal!);
        }}
        onReverse={(modality) => {
          reverseTrade(modality, isLive(modality));
          dismissSignal(activeSignal!);
        }}
        onDismiss={() => dismissSignal(activeSignal!)}
        getModalityForTrade={getModalityForTrade}
      />
    </div>
  );
}
