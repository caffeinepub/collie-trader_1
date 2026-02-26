import { usePerformanceStats } from '../hooks/usePerformanceStats';
import { StatCard } from '../components/statistics/StatCard';
import { TradeModality } from '../types/trade';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw, Trophy, Target, TrendingUp, Clock } from 'lucide-react';
import { loadTradeHistory } from '../services/storage/tradeStorage';

const MODALITY_COLORS: Record<string, string> = {
  [TradeModality.Scalping]: 'text-yellow-400',
  [TradeModality.DayTrading]: 'text-blue-400',
  [TradeModality.Swing]: 'text-purple-400',
  [TradeModality.Position]: 'text-orange-400',
  Overall: 'text-profit',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function Statistics() {
  const { stats, refresh, overallStats } = usePerformanceStats();
  const history = loadTradeHistory();

  const modalityStats = stats.filter((s) => s.modality !== 'Overall');

  return (
    <div className="p-4 space-y-4 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-profit" />
          <h1 className="text-lg font-bold">Statistics & Performance</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{history.length} trades recorded</span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="h-8 text-xs border-border"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      {overallStats && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-warning" />
            <h2 className="text-sm font-semibold">Overall Performance</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <StatCard
              label="Total Trades"
              value={overallStats.totalTrades}
              neutral
            />
            <StatCard
              label="Win Rate"
              value={`${overallStats.winRate.toFixed(1)}%`}
              positive={overallStats.winRate >= 50}
              negative={overallStats.winRate < 50}
            />
            <StatCard
              label="Avg R:R"
              value={`1:${overallStats.avgRR.toFixed(2)}`}
              positive={overallStats.avgRR >= 2}
              negative={overallStats.avgRR < 1}
            />
            <StatCard
              label="Total P&L"
              value={`${overallStats.totalPnl >= 0 ? '+' : ''}${overallStats.totalPnl.toFixed(2)}`}
              subValue="USDT"
              positive={overallStats.totalPnl > 0}
              negative={overallStats.totalPnl < 0}
            />
            <StatCard
              label="Best Trade"
              value={`+${overallStats.bestTrade.toFixed(2)}`}
              subValue="USDT"
              positive
            />
            <StatCard
              label="Worst Trade"
              value={overallStats.worstTrade.toFixed(2)}
              subValue="USDT"
              negative
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard
              label="Win Streak"
              value={overallStats.currentStreak > 0 ? `+${overallStats.currentStreak}` : overallStats.currentStreak}
              positive={overallStats.currentStreak > 0}
              negative={overallStats.currentStreak < 0}
            />
            <StatCard
              label="TP1 Hits"
              value={overallStats.tp1Hits}
              subValue={`of ${overallStats.totalTrades}`}
              positive
            />
            <StatCard
              label="SL Hits"
              value={overallStats.slHits}
              subValue={`of ${overallStats.totalTrades}`}
              negative
            />
            <StatCard
              label="Avg Hold"
              value={formatDuration(overallStats.avgHoldDuration)}
              neutral
            />
          </div>
        </div>
      )}

      {/* Per Modality Stats */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-neutral-trade" />
          <h2 className="text-sm font-semibold">Per Modality Breakdown</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {modalityStats.map((stat) => (
            <div key={stat.modality} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className={`text-xs font-bold tracking-widest ${MODALITY_COLORS[stat.modality]}`}>
                {stat.modality.toString().toUpperCase()}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  label="Trades"
                  value={stat.totalTrades}
                  neutral
                  className="border-0 p-0 bg-transparent"
                />
                <StatCard
                  label="Win Rate"
                  value={`${stat.winRate.toFixed(1)}%`}
                  positive={stat.winRate >= 50}
                  negative={stat.winRate < 50}
                  className="border-0 p-0 bg-transparent"
                />
                <StatCard
                  label="Avg R:R"
                  value={`1:${stat.avgRR.toFixed(2)}`}
                  positive={stat.avgRR >= 2}
                  negative={stat.avgRR < 1}
                  className="border-0 p-0 bg-transparent"
                />
                <StatCard
                  label="P&L"
                  value={`${stat.totalPnl >= 0 ? '+' : ''}${stat.totalPnl.toFixed(2)}`}
                  positive={stat.totalPnl > 0}
                  negative={stat.totalPnl < 0}
                  className="border-0 p-0 bg-transparent"
                />
              </div>
              <div className="border-t border-border pt-2 grid grid-cols-3 gap-1 text-xs">
                <div className="text-center">
                  <div className="text-profit font-bold terminal-text">{stat.tp1Hits}</div>
                  <div className="text-muted-foreground">TP1</div>
                </div>
                <div className="text-center">
                  <div className="text-profit font-bold terminal-text">{stat.tp2Hits}</div>
                  <div className="text-muted-foreground">TP2</div>
                </div>
                <div className="text-center">
                  <div className="text-loss font-bold terminal-text">{stat.slHits}</div>
                  <div className="text-muted-foreground">SL</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {history.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No trade history yet.</p>
          <p className="text-xs mt-1">Statistics will appear after your first trade closes.</p>
        </div>
      )}
    </div>
  );
}
