import { useState } from 'react';
import { TrendingUp, TrendingDown, Copy, ExternalLink, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Trade } from '../../types/trade';
import { copyPrice, copyTradeSetup } from '../../utils/copySetup';
import { openBinanceTrade } from '../../utils/binanceDeepLink';

interface QuickEntryModalProps {
  trade: Trade | null;
  currentPrice: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

export function QuickEntryModal({ trade, currentPrice, open, onOpenChange }: QuickEntryModalProps) {
  const [accountBalance, setAccountBalance] = useState('10000');
  const [riskPercent, setRiskPercent] = useState('1');

  if (!trade) return null;

  const isLong = trade.direction === 'LONG';

  // Calculate R:R ratios
  const riskAmount = Math.abs(trade.entry - trade.stopLoss);
  const rewardTP1 = Math.abs(trade.tp1 - trade.entry);
  const rewardTP2 = Math.abs(trade.tp2 - trade.entry);
  const rewardTP3 = Math.abs(trade.tp3 - trade.entry);
  const rrTP1 = (rewardTP1 / riskAmount).toFixed(1);
  const rrTP2 = (rewardTP2 / riskAmount).toFixed(1);
  const rrTP3 = (rewardTP3 / riskAmount).toFixed(1);

  // Calculate position size
  const balance = parseFloat(accountBalance) || 0;
  const risk = parseFloat(riskPercent) || 0;
  const riskInUSDT = (balance * risk) / 100;
  const stopDistancePercent = (riskAmount / trade.entry) * 100;
  const positionSize = riskInUSDT / (stopDistancePercent / 100);
  const quantity = positionSize / trade.entry;

  const handleCopyPrice = async (price: number, label: string) => {
    try {
      await copyPrice(price);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error('Failed to copy price');
    }
  };

  const handleCopySetup = async () => {
    try {
      const setupText = copyTradeSetup(trade, currentPrice);
      await navigator.clipboard.writeText(setupText);
      toast.success('Setup copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy setup');
    }
  };

  const handleOpenBinance = () => {
    toast.info('Opening Binance...', {
      description: `${trade.symbol} ${trade.direction}`,
    });
    openBinanceTrade(trade.symbol, isLong ? 'BUY' : 'SELL', quantity);
  };

  const PriceRow = ({ label, price, color, rr }: { label: string; price: number; color: string; rr?: string }) => (
    <div className="flex items-center justify-between p-3 rounded-md bg-background/50 border border-border/50">
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        {rr && <span className="text-xs text-muted-foreground">1:{rr}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-mono font-bold terminal-text">{formatPrice(price)}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => handleCopyPrice(price, label)}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="terminal-text text-xl font-bold">{trade.symbol}</span>
              <Badge
                variant="outline"
                className={`${
                  isLong
                    ? 'border-profit/50 text-profit bg-profit/10'
                    : 'border-loss/50 text-loss bg-loss/10'
                }`}
              >
                {isLong ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                )}
                {trade.direction}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {currentPrice && (
            <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <span className="text-xl font-mono font-bold text-primary terminal-text">
                  {formatPrice(currentPrice)}
                </span>
              </div>
            </div>
          )}

          {trade.entryReason && (
            <div className="p-3 rounded-md bg-background/50 border border-border/50">
              <p className="text-xs text-muted-foreground leading-relaxed">{trade.entryReason}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Price Levels</h3>
            <PriceRow label="Entry" price={trade.entry} color="text-foreground" />
            <PriceRow label="TP1" price={trade.tp1} color="text-profit" rr={rrTP1} />
            <PriceRow label="TP2" price={trade.tp2} color="text-profit" rr={rrTP2} />
            <PriceRow label="TP3" price={trade.tp3} color="text-profit" rr={rrTP3} />
            <PriceRow label="Stop Loss" price={trade.stopLoss} color="text-loss" />
          </div>

          <div className="space-y-3 p-4 rounded-lg bg-background/50 border border-border/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="w-4 h-4 text-primary" />
              <span>Position Size Calculator</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="account-balance" className="text-xs">
                  Account Balance
                </Label>
                <Input
                  id="account-balance"
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="risk-percent" className="text-xs">
                  Risk %
                </Label>
                <Input
                  id="risk-percent"
                  type="number"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="h-8 text-sm"
                  step="0.1"
                  min="0.1"
                  max="5"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Risk Amount:</span>
                <span className="font-mono font-medium terminal-text">${riskInUSDT.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Position Size:</span>
                <span className="font-mono font-medium terminal-text">${positionSize.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-mono font-medium text-primary terminal-text">
                  {quantity.toFixed(4)} {trade.symbol.replace('USDT', '')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopySetup}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Setup
            </Button>
            <Button
              className="flex-1"
              onClick={handleOpenBinance}
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Binance
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
