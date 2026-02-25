import { useState } from 'react';
import { TrendingDown, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Trade, RecoveryStrategy } from '../../types/trade';

interface RecoveryPositionCardProps {
  trade: Trade;
  currentPrice: number;
  strategies: RecoveryStrategy[];
  onExecute: (strategy: RecoveryStrategy) => void;
  isLive: boolean;
}

const STRATEGY_LABELS: Record<RecoveryStrategy['type'], string> = {
  AverageDown: 'Average Down',
  Hedge: 'Hedge Position',
  PartialClose: 'Partial Close',
  DCA: 'DCA Schedule',
};

const STRATEGY_COLORS: Record<RecoveryStrategy['type'], string> = {
  AverageDown: 'text-blue-400 border-blue-400/30',
  Hedge: 'text-purple-400 border-purple-400/30',
  PartialClose: 'text-warning border-warning/30',
  DCA: 'text-profit border-profit/30',
};

export function RecoveryPositionCard({
  trade,
  currentPrice,
  strategies,
  onExecute,
  isLive,
}: RecoveryPositionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = trade.direction === 'LONG';
  const pnlPercent = isLong
    ? ((currentPrice - trade.entry) / trade.entry) * 100
    : ((trade.entry - currentPrice) / trade.entry) * 100;
  const pnlUsdt = (pnlPercent / 100) * trade.positionSize;

  return (
    <div className="bg-card border border-loss/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-loss" />
          <div>
            <div className="text-sm font-bold terminal-text">{trade.symbol}</div>
            <div className="text-xs text-muted-foreground">{trade.modality} · {trade.direction}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold terminal-text text-loss">
            {pnlPercent.toFixed(2)}%
          </div>
          <div className="text-xs terminal-text text-loss">
            {pnlUsdt.toFixed(2)} USDT
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Entry</div>
          <div className="terminal-text font-bold">{trade.entry.toFixed(4)}</div>
        </div>
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Current</div>
          <div className="terminal-text font-bold text-loss">{currentPrice.toFixed(4)}</div>
        </div>
        <div className="bg-muted/30 rounded p-2">
          <div className="text-muted-foreground">Stop Loss</div>
          <div className="terminal-text font-bold">{trade.currentSL.toFixed(4)}</div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full h-7 text-xs text-muted-foreground hover:text-foreground border border-border/50"
      >
        {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
        {expanded ? 'Hide' : 'Show'} Recovery Strategies ({strategies.length})
      </Button>

      {expanded && (
        <div className="space-y-2">
          {strategies.map((strategy, i) => (
            <div
              key={i}
              className="bg-muted/20 rounded border border-border/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`text-xs ${STRATEGY_COLORS[strategy.type]}`}
                >
                  {STRATEGY_LABELS[strategy.type]}
                </Badge>
                <span className="text-xs text-profit terminal-text">
                  +{strategy.expectedPnlImprovement.toFixed(0)}% improvement
                </span>
              </div>
              <p className="text-xs text-foreground/70">{strategy.description}</p>
              {strategy.entryPrice && (
                <div className="text-xs terminal-text text-muted-foreground">
                  Entry: {strategy.entryPrice.toFixed(4)}
                  {strategy.quantity && ` · Qty: ${strategy.quantity.toFixed(4)}`}
                </div>
              )}
              {strategy.levels && (
                <div className="text-xs terminal-text text-muted-foreground">
                  Levels: {strategy.levels.map((l) => l.toFixed(2)).join(' → ')}
                </div>
              )}
              <Button
                size="sm"
                onClick={() => onExecute(strategy)}
                className="w-full h-7 text-xs bg-primary/10 border border-primary/30 text-profit hover:bg-primary/20"
              >
                <Play className="w-3 h-3 mr-1" />
                Execute {isLive ? '(Live)' : '(Simulated)'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
