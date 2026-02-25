import { useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Zap, X, Brain, ChevronDown, ChevronUp, Scan } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import type { Trade } from '../../types/trade';
import { TradeModality, TradeDirection } from '../../types/trade';
import { calculatePnL } from '../../services/trading/tradeLifecycleManager';

interface ModalityCardProps {
  modality: TradeModality;
  trade: Trade | null;
  currentPrice?: number;
  isLive: boolean;
  canGoLive: boolean;
  isGenerating: boolean;
  onToggleLive: () => void;
  onClose: () => void;
  onGenerate: () => void;
}

const MODALITY_LABELS: Record<TradeModality, string> = {
  [TradeModality.Scalping]: 'SCALPING',
  [TradeModality.DayTrading]: 'DAY TRADE',
  [TradeModality.Swing]: 'SWING',
  [TradeModality.Position]: 'POSITION',
};

const MODALITY_COLORS: Record<TradeModality, string> = {
  [TradeModality.Scalping]: 'text-yellow-400',
  [TradeModality.DayTrading]: 'text-blue-400',
  [TradeModality.Swing]: 'text-purple-400',
  [TradeModality.Position]: 'text-orange-400',
};

const MODALITY_SCAN_COLORS: Record<TradeModality, string> = {
  [TradeModality.Scalping]: 'bg-yellow-400',
  [TradeModality.DayTrading]: 'bg-blue-400',
  [TradeModality.Swing]: 'bg-purple-400',
  [TradeModality.Position]: 'bg-orange-400',
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

export function ModalityCard({
  modality,
  trade,
  currentPrice,
  isLive,
  canGoLive,
  isGenerating,
  onToggleLive,
  onClose,
  onGenerate,
}: ModalityCardProps) {
  const [rationaleOpen, setRationaleOpen] = useState(false);

  const isLong = trade?.direction === TradeDirection.LONG;
  const pnlData = trade && currentPrice ? calculatePnL(trade, currentPrice) : null;
  const isProfitable = (pnlData?.pnl || 0) >= 0;

  const getTPProgress = (tp: number) => {
    if (!trade || !currentPrice) return 0;
    const range = Math.abs(tp - trade.entry);
    const progress = Math.abs(currentPrice - trade.entry);
    return Math.min(100, (progress / range) * 100);
  };

  const duration = trade ? Date.now() - trade.openTime : 0;
  const dotColor = MODALITY_SCAN_COLORS[modality];

  return (
    <div
      className={`relative bg-card border rounded-lg p-4 flex flex-col gap-3 transition-all ${
        trade
          ? isProfitable
            ? 'border-profit/30 shadow-profit-glow'
            : 'border-loss/30 shadow-loss-glow'
          : isGenerating
          ? 'border-primary/40 shadow-sm'
          : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold tracking-widest ${MODALITY_COLORS[modality]}`}>
            {MODALITY_LABELS[modality]}
          </span>
          {trade && (
            <Badge
              variant="outline"
              className={`text-xs px-1.5 py-0 h-5 ${
                isLong
                  ? 'border-profit/50 text-profit bg-profit/10'
                  : 'border-loss/50 text-loss bg-loss/10'
              }`}
            >
              {isLong ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {trade.direction}
            </Badge>
          )}
          {isGenerating && !trade && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 border-primary/40 text-primary bg-primary/5">
              <Scan className="w-3 h-3 mr-1 animate-pulse" />
              Scanning
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${isLive ? 'text-loss' : 'text-muted-foreground'}`}>
              {isLive ? 'LIVE' : 'SIM'}
            </span>
            <Switch
              checked={isLive}
              onCheckedChange={onToggleLive}
              disabled={!canGoLive && !isLive}
              className="scale-75"
            />
          </div>
        </div>
      </div>

      {/* Trade Content */}
      {trade ? (
        <>
          {/* Symbol & Price */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold terminal-text">{trade.symbol}</div>
              <div className="text-xs text-muted-foreground terminal-text">
                Entry: {formatPrice(trade.entry)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold terminal-text">
                {currentPrice ? formatPrice(currentPrice) : '—'}
              </div>
              {pnlData && (
                <div
                  className={`text-xs font-bold terminal-text ${
                    isProfitable ? 'text-profit' : 'text-loss'
                  }`}
                >
                  {isProfitable ? '+' : ''}
                  {pnlData.pnl.toFixed(2)} USDT ({pnlData.pnlPercent.toFixed(2)}%)
                </div>
              )}
            </div>
          </div>

          {/* TP/SL Levels */}
          <div className="space-y-1.5">
            {[
              { label: 'TP3', value: trade.tp3, hit: trade.tp3Hit, color: 'bg-profit' },
              { label: 'TP2', value: trade.tp2, hit: trade.tp2Hit, color: 'bg-profit/70' },
              { label: 'TP1', value: trade.tp1, hit: trade.tp1Hit, color: 'bg-profit/50' },
              { label: 'SL', value: trade.currentSL, hit: false, color: 'bg-loss' },
            ].map(({ label, value, hit, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`text-xs w-7 terminal-text ${
                    label === 'SL' ? 'text-loss' : 'text-profit'
                  } ${hit ? 'line-through opacity-50' : ''}`}
                >
                  {label}
                </span>
                <div className="flex-1">
                  <Progress
                    value={label !== 'SL' ? getTPProgress(value) : 0}
                    className={`h-1 ${hit ? 'opacity-40' : ''}`}
                  />
                </div>
                <span
                  className={`text-xs terminal-text w-20 text-right ${
                    label === 'SL' ? 'text-loss' : 'text-muted-foreground'
                  }`}
                >
                  {formatPrice(value)}
                </span>
              </div>
            ))}
          </div>

          {/* Pair Selection Rationale */}
          {trade.topFactors && trade.topFactors.length > 0 && (
            <Collapsible open={rationaleOpen} onOpenChange={setRationaleOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
                  <Brain className="w-3 h-3 text-primary/70" />
                  <span className="font-medium">Pair Selection Rationale</span>
                  {rationaleOpen ? (
                    <ChevronUp className="w-3 h-3 ml-auto" />
                  ) : (
                    <ChevronDown className="w-3 h-3 ml-auto" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1.5 space-y-1 pl-4 border-l border-primary/20">
                  {trade.topFactors.slice(0, 3).map((factor, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-primary/60 text-xs mt-0.5">#{i + 1}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{factor}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="terminal-text">{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              {trade.entryReason && (
                <span className="text-xs text-muted-foreground truncate max-w-24">
                  {trade.entryReason}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-loss"
                onClick={onClose}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </>
      ) : isGenerating ? (
        /* Scanning State */
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="relative flex items-center justify-center">
            {/* Animated scanning rings */}
            <div className={`absolute w-12 h-12 rounded-full ${dotColor} opacity-10 animate-ping`} />
            <div className={`absolute w-8 h-8 rounded-full ${dotColor} opacity-20 animate-ping`} style={{ animationDelay: '0.3s' }} />
            <div className={`w-5 h-5 rounded-full ${dotColor} opacity-80 flex items-center justify-center`}>
              <Scan className="w-3 h-3 text-background" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-xs font-medium text-foreground/80 animate-pulse">
              Scanning market...
            </div>
            <div className="text-xs text-muted-foreground">
              SMC + 8 Fundamentals analysis
            </div>
          </div>
          {/* Animated dots */}
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-60`}
                style={{
                  animation: 'bounce 1.2s infinite',
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <div className="text-xs text-muted-foreground text-center">No active trade</div>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating}
            className="text-xs h-7 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Zap className="w-3 h-3 mr-1" />
            Generate Trade
          </Button>
        </div>
      )}
    </div>
  );
}
