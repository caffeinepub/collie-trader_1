import { TradeModality } from '../types/trade';
import { useTradeLifecycle } from '../hooks/useTradeLifecycle';
import { usePricePolling } from '../hooks/usePricePolling';
import { PositionSizeCalculator } from '../components/risk/PositionSizeCalculator';
import { PortfolioExposure } from '../components/risk/PortfolioExposure';
import { LeverageBracketTable } from '../components/risk/LeverageBracketTable';
import { TradeSimulator } from '../components/risk/TradeSimulator';
import { ShieldAlert } from 'lucide-react';

export function RiskManagement() {
  const { trades } = useTradeLifecycle();

  const activeSymbols = Object.values(trades)
    .filter(Boolean)
    .map((t) => t!.symbol);

  const { prices } = usePricePolling(activeSymbols, 10000);

  return (
    <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-warning" />
        <h1 className="text-lg font-bold">Risk Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PositionSizeCalculator />
        <PortfolioExposure trades={trades} prices={prices} />
        <LeverageBracketTable />
        <TradeSimulator />
      </div>
    </div>
  );
}
