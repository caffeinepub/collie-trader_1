interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  positive?: boolean;
  negative?: boolean;
  neutral?: boolean;
  className?: string;
}

export function StatCard({ label, value, subValue, positive, negative, neutral, className = '' }: StatCardProps) {
  const valueColor = positive
    ? 'text-profit'
    : negative
    ? 'text-loss'
    : neutral
    ? 'text-warning'
    : 'text-foreground';

  return (
    <div className={`bg-card border border-border rounded-lg p-3 space-y-1 ${className}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold terminal-text ${valueColor}`}>{value}</div>
      {subValue && <div className="text-xs text-muted-foreground terminal-text">{subValue}</div>}
    </div>
  );
}
