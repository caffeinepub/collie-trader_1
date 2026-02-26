import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import type { ReversalSignal } from '../../types/trade';
import type { TradeModality } from '../../types/trade';

interface ReversalAlertDialogProps {
  signal: ReversalSignal | null;
  onClose: (modality: TradeModality) => void;
  onReverse: (modality: TradeModality) => void;
  onDismiss: () => void;
  getModalityForTrade: (tradeId: string) => TradeModality | null;
}

export function ReversalAlertDialog({
  signal,
  onClose,
  onReverse,
  onDismiss,
  getModalityForTrade,
}: ReversalAlertDialogProps) {
  if (!signal) return null;

  const modality = getModalityForTrade(signal.tradeId);

  return (
    <AlertDialog open={!!signal}>
      <AlertDialogContent className="bg-card border-warning/40 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            Reversal Signal: {signal.type}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/80 text-sm">
            {signal.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-1 py-2 bg-muted/30 rounded border border-border text-xs terminal-text space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Symbol</span>
            <span className="font-bold">{signal.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Signal Type</span>
            <span className={signal.direction === 'bullish' ? 'text-profit' : 'text-loss'}>
              {signal.direction.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Level</span>
            <span>{signal.price.toFixed(4)}</span>
          </div>
        </div>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={onDismiss}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Dismiss
          </AlertDialogCancel>
          {modality && (
            <>
              <AlertDialogAction
                onClick={() => onClose(modality)}
                className="bg-warning/20 border border-warning/40 text-warning hover:bg-warning/30"
              >
                Close Early
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => onReverse(modality)}
                className="bg-primary/20 border border-primary/40 text-profit hover:bg-primary/30"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reverse Position
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
