import { useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPositionRisk } from '../../services/binance/binanceAccountService';
import { hasCredentials } from '../../services/binance/binanceAuth';
import type { PositionRisk } from '../../types/binance';

export function BinancePositionsList() {
  const [positions, setPositions] = useState<PositionRisk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchPositions = async () => {
    if (!hasCredentials()) {
      setError('Configure API credentials in Settings first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPositionRisk();
      setPositions(data);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Binance Positions</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPositions}
          disabled={loading}
          className="h-7 text-xs border-border"
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {loaded ? 'Refresh' : 'Load'}
        </Button>
      </div>

      {error && (
        <div className="text-xs text-loss bg-loss/10 border border-loss/20 rounded p-2 mb-3">
          {error}
        </div>
      )}

      {!loaded && !error && (
        <div className="text-xs text-muted-foreground text-center py-4">
          Click Load to fetch your Binance positions
        </div>
      )}

      {loaded && positions.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">
          No open positions found
        </div>
      )}

      {positions.length > 0 && (
        <div className="space-y-2">
          {positions.map((pos) => {
            const pnl = parseFloat(pos.unRealizedProfit);
            const isLong = parseFloat(pos.positionAmt) > 0;
            const isProfitable = pnl >= 0;

            return (
              <div
                key={`${pos.symbol}_${pos.positionSide}`}
                className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 py-0 h-5 ${
                      isLong
                        ? 'border-profit/50 text-profit'
                        : 'border-loss/50 text-loss'
                    }`}
                  >
                    {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </Badge>
                  <div>
                    <div className="text-xs font-bold terminal-text">{pos.symbol}</div>
                    <div className="text-xs text-muted-foreground terminal-text">
                      Entry: {parseFloat(pos.entryPrice).toFixed(4)} · {pos.leverage}x
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xs font-bold terminal-text ${
                      isProfitable ? 'text-profit' : 'text-loss'
                    }`}
                  >
                    {isProfitable ? '+' : ''}
                    {pnl.toFixed(2)} USDT
                  </div>
                  <div className="text-xs text-muted-foreground terminal-text">
                    {parseFloat(pos.markPrice).toFixed(4)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
