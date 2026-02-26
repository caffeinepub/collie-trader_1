import type { Trade } from '../../types/trade';
import { TradeModality } from '../../types/trade';
import { Progress } from '@/components/ui/progress';

interface PortfolioExposureProps {
  trades: Record<TradeModality, Trade | null>;
  prices: Record<string, number>;
}

const MODALITY_COLORS: Record<TradeModality, string> = {
  [TradeModality.Scalping]: 'text-yellow-400',
  [TradeModality.DayTrading]: 'text-blue-400',
  [TradeModality.Swing]: 'text-purple-400',
  [TradeModality.Position]: 'text-orange-400',
};

export function PortfolioExposure({ trades, prices }: PortfolioExposureProps) {
  const totalCapital = parseFloat(localStorage.getItem('total_capital') || '10000');

  const exposures = Object.entries(trades).map(([modality, trade]) => {
    if (!trade) return { modality: modality as TradeModality, risk: 0, percent: 0 };
    const risk = Math.abs(trade.entry - trade.currentSL) * (trade.positionSize / trade.entry);
    const percent = (risk / totalCapital) * 100;
    return { modality: modality as TradeModality, risk, percent };
  });

  const totalRisk = exposures.reduce((sum, e) => sum + e.risk, 0);
  const totalPercent = (totalRisk / totalCapital) * 100;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Portfolio Exposure</h3>
        <div className={`text-sm font-bold terminal-text ${totalPercent > 10 ? 'text-loss' : totalPercent > 5 ? 'text-warning' : 'text-profit'}`}>
          {totalPercent.toFixed(1)}% at risk
        </div>
      </div>

      <div className="space-y-3">
        {exposures.map(({ modality, risk, percent }) => (
          <div key={modality} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={MODALITY_COLORS[modality]}>{modality}</span>
              <span className="terminal-text text-muted-foreground">
                ${risk.toFixed(2)} ({percent.toFixed(1)}%)
              </span>
            </div>
            <Progress value={Math.min(100, percent * 5)} className="h-1.5" />
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total Capital at Risk</span>
        <span className={`terminal-text font-bold ${totalPercent > 10 ? 'text-loss' : 'text-warning'}`}>
          ${totalRisk.toFixed(2)} / ${totalCapital.toFixed(0)}
        </span>
      </div>
    </div>
  );
}
