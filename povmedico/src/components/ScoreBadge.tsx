interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreStyle(score: number): { bg: string; text: string; border: string } {
  if (score >= 70) return { bg: 'bg-ok/10', text: 'text-ok', border: 'border-ok/30' };
  if (score >= 40) return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' };
  return { bg: 'bg-alert/10', text: 'text-alert', border: 'border-alert/30' };
}

export function ScoreBadge({ score, label, size = 'md' }: ScoreBadgeProps) {
  const c = getScoreStyle(score);

  if (size === 'lg') {
    return (
      <div className={`inline-flex flex-col items-center justify-center w-14 h-14 rounded-2xl border-[2.5px] ${c.border} ${c.bg} shadow-clay-inset animate-countUp`}>
        <span className={`text-[18px] font-extrabold tabular-nums font-display ${c.text}`}>{Math.round(score)}</span>
        {label && <span className="text-[8px] text-txt-muted font-semibold">{label}</span>}
      </div>
    );
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-[13px] px-2.5 py-1',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border-[2px] tabular-nums font-bold font-display ${c.bg} ${c.text} ${c.border} ${sizeClasses[size]} shadow-clay-inset`}>
      {label && <span className="text-txt-muted text-[9px] font-medium">{label}</span>}
      {Math.round(score)}
    </span>
  );
}
