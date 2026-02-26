import { useState } from 'react';
import { getLeverageBracket } from '../../services/binance/binancePublicApi';
import type { LeverageBracketInfo } from '../../types/binance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';

const COMMON_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT'];

export function LeverageBracketTable() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [data, setData] = useState<LeverageBracketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLeverageBracket(symbol);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold">Leverage Brackets</h3>
      <div className="flex gap-2">
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="h-8 text-xs bg-muted/30 border-border flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {COMMON_SYMBOLS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={fetch}
          disabled={loading}
          className="h-8 text-xs border-border"
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Load'}
        </Button>
      </div>

      {error && (
        <div className="text-xs text-loss bg-loss/10 border border-loss/20 rounded p-2">{error}</div>
      )}

      {data && data.brackets && (
        <div className="overflow-auto max-h-48 scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground h-7">Bracket</TableHead>
                <TableHead className="text-xs text-muted-foreground h-7">Max Lev</TableHead>
                <TableHead className="text-xs text-muted-foreground h-7">Notional Cap</TableHead>
                <TableHead className="text-xs text-muted-foreground h-7">Maint Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.brackets.map((b) => (
                <TableRow key={b.bracket} className="border-border hover:bg-muted/20">
                  <TableCell className="text-xs terminal-text py-1.5">{b.bracket}</TableCell>
                  <TableCell className="text-xs terminal-text py-1.5 text-profit">{b.initialLeverage}x</TableCell>
                  <TableCell className="text-xs terminal-text py-1.5">
                    ${b.notionalCap.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs terminal-text py-1.5 text-warning">
                    {(b.maintMarginRatio * 100).toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
