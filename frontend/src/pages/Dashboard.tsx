import { useEffect, useMemo, useState } from 'react';
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

  // Track scanning state per modality (true while AI is selecting a pair)
  const [scanningStates, setScanningStates] = useState<Record<TradeModality, boolean>>({
    [TradeModality.Scalping]: false,
    [TradeModality.DayTrading]: false,
    [TradeModality.Swing]: false,
    [TradeModality.Position]: false,
  });

  // Sync scanning state with generating state from the lifecycle hook
  useEffect(() => {
    setScanningStates({ ...generating });
  }, [generating]);

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

  const handleGenerate = async (modality: TradeModality) => {
    setScanningStates((prev) => ({ ...prev, [modality]: true }));
    try {
      await generateNewTrade(modality);
    } finally {
      setScanningStates((prev) => ({ ...prev, [modality]: false }));
    }
  };

  const handleInitializeAll = async () => {
    const modalities = Object.values(TradeModality);
    setScanningStates({
      [TradeModality.Scalping]: true,
      [TradeModality.DayTrading]: true,
      [TradeModality.Swing]: true,
      [TradeModality.Position]: true,
    });
    try {
      await initializeAllTrades();
    } finally {
      setScanningStates({
        [TradeModality.Scalping]: false,
        [TradeModality.DayTrading]: false,
        [TradeModality.Swing]: false,
        [TradeModality.Position]: false,
      });
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Trading Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {activeSymbols.length > 0
              ? `Monitoring: ${activeSymbols.join(', ')}`
              : 'AI scanning all USDⓈ-M pairs — best opportunities selected automatically'}
          </p>
        </div>
        {!hasAnyTrade && (
          <Button
            size="sm"
            onClick={handleInitializeAll}
            disabled={Object.values(scanningStates).some(Boolean)}
            className="text-xs h-8 bg-primary/20 border border-primary/40 text-profit hover:bg-primary/30"
          >
            <Zap className="w-3 h-3 mr-1" />
            {Object.values(scanningStates).some(Boolean) ? 'Scanning...' : 'Initialize All Trades'}
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
            isScanning={scanningStates[modality]}
            onToggleLive={() => toggleMode(modality)}
            onClose={() => closeTrade(modality, isLive(modality))}
            onGenerate={() => handleGenerate(modality)}
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
