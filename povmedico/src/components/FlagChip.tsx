interface FlagChipProps {
  active: boolean;
  label: string;
  tooltip: string;
  variant: 'tremor' | 'spasticity' | 'fatigue' | 'impulse';
}

function FlagIcon({ variant }: { variant: string }) {
  const props = { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (variant) {
    case 'tremor':
      return <svg {...props}><path d="M2 12h4l3-9 4 18 3-9h6"/></svg>;
    case 'spasticity':
      return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
    case 'fatigue':
      return <svg {...props}><path d="M22 12h-4l-3 9-4-18-3 9H2"/></svg>;
    case 'impulse':
      return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    default:
      return null;
  }
}

export function FlagChip({ active, label, tooltip, variant }: FlagChipProps) {
  if (!active) return null;

  return (
    <span
      title={tooltip}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-alert/10 text-alert border-[2px] border-alert/20 shadow-clay-inset font-display"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse-dot" />
      <FlagIcon variant={variant} />
      {label}
    </span>
  );
}
