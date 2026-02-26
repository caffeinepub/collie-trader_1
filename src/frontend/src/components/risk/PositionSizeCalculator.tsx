import { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export function PositionSizeCalculator() {
  const [balance, setBalance] = useState(() => localStorage.getItem('total_capital') || '10000');
  const [riskPercent, setRiskPercent] = useState(2);
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');

  useEffect(() => {
    localStorage.setItem('total_capital', balance);
  }, [balance]);

  const entryNum = parseFloat(entry);
  const slNum = parseFloat(stopLoss);
  const balanceNum = parseFloat(balance);
  const riskAmount = balanceNum * (riskPercent / 100);
  const riskPerUnit = Math.abs(entryNum - slNum);
  const positionSize = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;
  const positionUsdt = positionSize * entryNum;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-profit" />
        <h3 className="text-sm font-semibold">Position Size Calculator</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Account Balance (USDT)</Label>
          <Input
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="h-8 text-xs terminal-text bg-muted/30 border-border"
            placeholder="10000"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Risk: {riskPercent}%</Label>
          <Slider
            value={[riskPercent]}
            onValueChange={([v]) => setRiskPercent(v)}
            min={0.5}
            max={5}
            step={0.5}
            className="mt-2"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Entry Price</Label>
          <Input
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="h-8 text-xs terminal-text bg-muted/30 border-border"
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Stop Loss Price</Label>
          <Input
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="h-8 text-xs terminal-text bg-muted/30 border-border"
            placeholder="0.00"
          />
        </div>
      </div>

      {positionSize > 0 && (
        <div className="bg-muted/30 rounded border border-border p-3 space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Results</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Risk Amount</div>
              <div className="text-sm font-bold terminal-text text-warning">
                ${riskAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Position Size</div>
              <div className="text-sm font-bold terminal-text text-profit">
                {positionSize.toFixed(4)} contracts
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Position Value</div>
              <div className="text-sm font-bold terminal-text text-foreground">
                ${positionUsdt.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Risk/Unit</div>
              <div className="text-sm font-bold terminal-text text-foreground">
                ${riskPerUnit.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
