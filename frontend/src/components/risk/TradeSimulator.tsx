import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play } from 'lucide-react';

interface SimResult {
  pnlAtTP1: number;
  pnlAtTP2: number;
  pnlAtTP3: number;
  pnlAtSL: number;
  rrRatio: number;
}

export function TradeSimulator() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp1, setTp1] = useState('');
  const [tp2, setTp2] = useState('');
  const [tp3, setTp3] = useState('');
  const [size, setSize] = useState('100');
  const [result, setResult] = useState<SimResult | null>(null);

  const simulate = () => {
    const e = parseFloat(entry);
    const s = parseFloat(sl);
    const t1 = parseFloat(tp1);
    const t2 = parseFloat(tp2);
    const t3 = parseFloat(tp3);
    const sz = parseFloat(size);

    if (!e || !s || !t1 || !sz) return;

    const isLong = direction === 'LONG';
    const risk = Math.abs(e - s);
    const reward1 = Math.abs(t1 - e);

    const calc = (target: number) => {
      const diff = isLong ? target - e : e - target;
      return (diff / e) * sz;
    };

    setResult({
      pnlAtTP1: t1 ? calc(t1) : 0,
      pnlAtTP2: t2 ? calc(t2) : 0,
      pnlAtTP3: t3 ? calc(t3) : 0,
      pnlAtSL: calc(s),
      rrRatio: risk > 0 ? reward1 / risk : 0,
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold">Trade Simulator</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Symbol</Label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="h-8 text-xs terminal-text bg-muted/30 border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as 'LONG' | 'SHORT')}>
            <SelectTrigger className="h-8 text-xs bg-muted/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="LONG" className="text-xs text-profit">LONG</SelectItem>
              <SelectItem value="SHORT" className="text-xs text-loss">SHORT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Entry</Label>
          <Input value={entry} onChange={(e) => setEntry(e.target.value)} className="h-8 text-xs terminal-text bg-muted/30 border-border" placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Stop Loss</Label>
          <Input value={sl} onChange={(e) => setSl(e.target.value)} className="h-8 text-xs terminal-text bg-muted/30 border-border" placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">TP1</Label>
          <Input value={tp1} onChange={(e) => setTp1(e.target.value)} className="h-8 text-xs terminal-text bg-muted/30 border-border" placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">TP2</Label>
          <Input value={tp2} onChange={(e) => setTp2(e.target.value)} className="h-8 text-xs terminal-text bg-muted/30 border-border" placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">TP3</Label>
          <Input value={tp3} onChange={(e) => setTp3(e.target.value)} className="h-8 text-xs terminal-text bg-muted/30 border-border" placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Position Size (USDT)</Label>
          <Input value={size} onChange={(e) => setSize(e.target.value)} className="h-8 text-xs terminal-text bg-muted/30 border-border" placeholder="100" />
        </div>
      </div>

      <Button onClick={simulate} size="sm" className="w-full h-8 text-xs bg-primary/20 border border-primary/40 text-profit hover:bg-primary/30">
        <Play className="w-3 h-3 mr-1" />
        Simulate
      </Button>

      {result && (
        <div className="bg-muted/30 rounded border border-border p-3 space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Simulation Results</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">R:R Ratio</span>
              <span className={`terminal-text font-bold ${result.rrRatio >= 2 ? 'text-profit' : 'text-warning'}`}>
                1:{result.rrRatio.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">At SL</span>
              <span className="terminal-text font-bold text-loss">{result.pnlAtSL.toFixed(2)} USDT</span>
            </div>
            {result.pnlAtTP1 !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">At TP1</span>
                <span className="terminal-text font-bold text-profit">+{result.pnlAtTP1.toFixed(2)} USDT</span>
              </div>
            )}
            {result.pnlAtTP2 !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">At TP2</span>
                <span className="terminal-text font-bold text-profit">+{result.pnlAtTP2.toFixed(2)} USDT</span>
              </div>
            )}
            {result.pnlAtTP3 !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">At TP3</span>
                <span className="terminal-text font-bold text-profit">+{result.pnlAtTP3.toFixed(2)} USDT</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
