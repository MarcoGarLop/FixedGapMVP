export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/8 border border-warning/15 text-[12px] text-txt-secondary ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span>Apoyo a la visualización, no diagnóstico.</span>
    </div>
  );
}

export function CorrelationDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/8 border border-warning/15 text-[12px] text-txt-secondary ${className}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span>Correlación exploratoria, no implica causalidad. Apoyo a la visualización, no diagnóstico.</span>
    </div>
  );
}
