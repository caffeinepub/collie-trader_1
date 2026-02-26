import { useState, useCallback, useEffect, useRef } from 'react';
import { TradeModality, TradeDirection, TradeStatus } from '../types/trade';
import type { Trade } from '../types/trade';
import { loadActiveTrades, saveActiveTrades } from '../services/storage/tradeStorage';
import { checkTPSL, manuallyCloseTrade } from '../services/trading/tradeLifecycleManager';
import { generateTradeSetup } from '../services/ai/aiTradeSelection';
import { executeTradeOpen, executeTradeClose } from '../services/trading/orderExecutor';

function generateId(): string {
  return `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useTradeLifecycle() {
  const [trades, setTrades] = useState<Record<TradeModality, Trade | null>>(loadActiveTrades);
  const [generating, setGenerating] = useState<Record<TradeModality, boolean>>({
    [TradeModality.Scalping]: false,
    [TradeModality.DayTrading]: false,
    [TradeModality.Swing]: false,
    [TradeModality.Position]: false,
  });
  const pricesRef = useRef<Record<string, number>>({});

  // Persist trades on change
  useEffect(() => {
    saveActiveTrades(trades);
  }, [trades]);

  const updatePrices = useCallback((prices: Record<string, number>) => {
    pricesRef.current = prices;
  }, []);

  const checkAndUpdateTrades = useCallback(
    async (prices: Record<string, number>) => {
      pricesRef.current = prices;
      setTrades((prev) => {
        const updated = { ...prev };
        let changed = false;

        for (const modality of Object.values(TradeModality)) {
          const trade = prev[modality];
          if (!trade) continue;

          const currentPrice = prices[trade.symbol];
          if (!currentPrice) continue;

          const { updated: newTrade, closed } = checkTPSL(trade, currentPrice);

          if (closed) {
            updated[modality] = null;
            changed = true;
            setTimeout(() => {
              generateNewTrade(modality);
            }, 2000);
          } else if (JSON.stringify(newTrade) !== JSON.stringify(trade)) {
            updated[modality] = newTrade;
            changed = true;
          }
        }

        return changed ? updated : prev;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const generateNewTrade = useCallback(async (modality: TradeModality) => {
    setGenerating((prev) => ({ ...prev, [modality]: true }));
    try {
      // AI auto-selects the best pair using SMC + 8 Fundamentals scoring
      const setup = await generateTradeSetup(modality);
      if (!setup) return;

      const newTrade: Trade = {
        id: generateId(),
        modality,
        symbol: setup.symbol,
        direction: setup.direction,
        entry: setup.entry,
        tp1: setup.tp1,
        tp2: setup.tp2,
        tp3: setup.tp3,
        stopLoss: setup.stopLoss,
        currentSL: setup.stopLoss,
        status: TradeStatus.Active,
        openTime: Date.now(),
        positionSize: parseFloat(localStorage.getItem('total_capital') || '1000') * 0.02,
        isLive: false,
        tp1Hit: false,
        tp2Hit: false,
        tp3Hit: false,
        interval: setup.interval,
        entryReason: setup.entryReason,
        topFactors: setup.topFactors,
      };

      setTrades((prev) => ({ ...prev, [modality]: newTrade }));
    } catch (error) {
      console.error(`Failed to generate trade for ${modality}:`, error);
    } finally {
      setGenerating((prev) => ({ ...prev, [modality]: false }));
    }
  }, []);

  const closeTrade = useCallback(
    async (modality: TradeModality, isLive: boolean) => {
      const trade = trades[modality];
      if (!trade) return;

      const currentPrice = pricesRef.current[trade.symbol] || trade.entry;
      await executeTradeClose(trade, currentPrice, isLive);
      manuallyCloseTrade(trade, currentPrice);
      setTrades((prev) => ({ ...prev, [modality]: null }));

      setTimeout(() => generateNewTrade(modality), 2000);
    },
    [trades, generateNewTrade]
  );

  const reverseTrade = useCallback(
    async (modality: TradeModality, isLive: boolean) => {
      const trade = trades[modality];
      if (!trade) return;

      const currentPrice = pricesRef.current[trade.symbol] || trade.entry;
      manuallyCloseTrade(trade, currentPrice);

      const newDirection =
        trade.direction === TradeDirection.LONG ? TradeDirection.SHORT : TradeDirection.LONG;
      const atrApprox = Math.abs(trade.tp1 - trade.entry) / 2;

      const newTrade: Trade = {
        ...trade,
        id: generateId(),
        direction: newDirection,
        entry: currentPrice,
        stopLoss:
          newDirection === TradeDirection.LONG
            ? currentPrice - atrApprox
            : currentPrice + atrApprox,
        currentSL:
          newDirection === TradeDirection.LONG
            ? currentPrice - atrApprox
            : currentPrice + atrApprox,
        tp1:
          newDirection === TradeDirection.LONG
            ? currentPrice + atrApprox * 2
            : currentPrice - atrApprox * 2,
        tp2:
          newDirection === TradeDirection.LONG
            ? currentPrice + atrApprox * 3
            : currentPrice - atrApprox * 3,
        tp3:
          newDirection === TradeDirection.LONG
            ? currentPrice + atrApprox * 4.5
            : currentPrice - atrApprox * 4.5,
        status: TradeStatus.Active,
        openTime: Date.now(),
        closeTime: undefined,
        closePrice: undefined,
        pnl: undefined,
        pnlPercent: undefined,
        tp1Hit: false,
        tp2Hit: false,
        tp3Hit: false,
        isLive,
        topFactors: ['Reversal trade', 'Direction flipped', 'ATR-based levels'],
      };

      await executeTradeOpen(newTrade, isLive);
      setTrades((prev) => ({ ...prev, [modality]: newTrade }));
    },
    [trades]
  );

  const initializeAllTrades = useCallback(async () => {
    const modalities = Object.values(TradeModality);
    for (const modality of modalities) {
      if (!trades[modality]) {
        await generateNewTrade(modality);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }, [trades, generateNewTrade]);

  return {
    trades,
    generating,
    generateNewTrade,
    closeTrade,
    reverseTrade,
    checkAndUpdateTrades,
    updatePrices,
    initializeAllTrades,
  };
}
