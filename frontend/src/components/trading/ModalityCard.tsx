import { useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Zap, RefreshCw, X, Info, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  isScanning?: boolean;
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
  isScanning = false,
  onToggleLive,
  onClose,
  onGenerate,
}: ModalityCardProps) {
  const [showRationale, setShowRationale] = useState(false);

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
  const hasRationale = trade?.scoringFactors && trade.scoringFactors.length > 0;
  const scanning = isScanning || isGenerating;

  return (
    <div
      className={`relative bg-card border rounded-lg p-4 flex flex-col gap-3 transition-all ${
        trade
          ? isProfitable
            ? 'border-profit/30 shadow-profit-glow'
            : 'border-loss/30 shadow-loss-glow'
          : scanning
          ? 'border-primary/40 shadow-[0_0_12px_rgba(var(--primary-rgb),0.15)]'
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
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-bold terminal-text">{trade.symbol}</div>
                {hasRationale && (
                  <button
                    onClick={() => setShowRationale((v) => !v)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Why this pair?"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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

          {/* AI Pair Selection Rationale (expandable) */}
          {hasRationale && showRationale && (
            <div className="rounded-md border border-border/60 bg-background/50 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-primary tracking-wide">
                  WHY THIS PAIR?
                </span>
                <button
                  onClick={() => setShowRationale(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
              <ul className="space-y-1">
                {trade.scoringFactors!.map((factor, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-profit text-xs mt-0.5 shrink-0">•</span>
                    <span className="text-xs text-muted-foreground terminal-text leading-relaxed">
                      {factor}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
      ) : (
        /* Empty / Scanning State */
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          {scanning ? (
            <>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs text-primary font-medium terminal-text animate-pulse">
                  Scanning market...
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[160px] leading-relaxed">
                AI analyzing all USDⓈ-M pairs with 8-module framework
              </p>
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground text-center">No active trade</div>
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerate}
                disabled={isGenerating}
                className="text-xs h-7 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Zap className="w-3 h-3 mr-1" />
                Scan & Generate
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
