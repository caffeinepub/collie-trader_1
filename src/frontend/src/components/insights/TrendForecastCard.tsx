import type { TrendForecast } from '../../services/ai/trendForecaster';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface TrendForecastCardProps {
  forecast: TrendForecast;
  modality?: string;
}

export function TrendForecastCard({ forecast, modality }: TrendForecastCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold terminal-text text-foreground">{forecast.symbol}</span>
          {modality && (
            <span className="text-xs text-muted-foreground ml-2">({modality})</span>
          )}
        </div>
        <Badge
          variant="outline"
          className={`text-xs ${
            forecast.confidence === 'high'
              ? 'border-profit/50 text-profit'
              : forecast.confidence === 'medium'
              ? 'border-warning/50 text-warning'
              : 'border-muted-foreground/50 text-muted-foreground'
          }`}
        >
          {forecast.confidence.toUpperCase()} CONF
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-profit">Continuation</span>
          <span className="terminal-text font-bold text-profit">
            {forecast.continuationProbability}%
          </span>
        </div>
        <Progress value={forecast.continuationProbability} className="h-2" />

        <div className="flex items-center justify-between text-xs">
          <span className="text-loss">Reversal</span>
          <span className="terminal-text font-bold text-loss">
            {forecast.reversalProbability}%
          </span>
        </div>
        <Progress value={forecast.reversalProbability} className="h-2" />
      </div>

      {forecast.factors.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground font-medium">Key Factors</div>
          {forecast.factors.map((factor, i) => (
            <div key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
              <span className="text-profit mt-0.5">›</span>
              {factor}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
