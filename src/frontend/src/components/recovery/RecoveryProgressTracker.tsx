import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';

interface RecoveryAction {
  timestamp: number;
  strategyType: string;
  pnlBefore: number;
  pnlAfter: number;
}

interface RecoveryProgressTrackerProps {
  symbol: string;
  initialLoss: number;
  currentLoss: number;
  actions: RecoveryAction[];
}

export function RecoveryProgressTracker({
  symbol,
  initialLoss,
  currentLoss,
  actions,
}: RecoveryProgressTrackerProps) {
  const improvement = initialLoss - currentLoss;
  const improvementPercent = initialLoss !== 0 ? (improvement / Math.abs(initialLoss)) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-profit" />
        <h4 className="text-xs font-semibold">{symbol} Recovery Progress</h4>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Initial Loss</div>
          <div className="terminal-text font-bold text-loss">{initialLoss.toFixed(2)} USDT</div>
        </div>
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Current Loss</div>
          <div className={`terminal-text font-bold ${currentLoss < initialLoss ? 'text-warning' : 'text-loss'}`}>
            {currentLoss.toFixed(2)} USDT
          </div>
        </div>
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Recovered</div>
          <div className="terminal-text font-bold text-profit">+{improvement.toFixed(2)} USDT</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Recovery Progress</span>
          <span className="terminal-text text-profit">{Math.max(0, improvementPercent).toFixed(1)}%</span>
        </div>
        <Progress value={Math.max(0, Math.min(100, improvementPercent))} className="h-2" />
      </div>

      {actions.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-medium">Actions Taken</div>
          {actions.map((action, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
              <span className="text-foreground/70">{action.strategyType}</span>
              <span className={`terminal-text ${action.pnlAfter > action.pnlBefore ? 'text-profit' : 'text-loss'}`}>
                {action.pnlAfter > action.pnlBefore ? '+' : ''}
                {(action.pnlAfter - action.pnlBefore).toFixed(2)} USDT
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
