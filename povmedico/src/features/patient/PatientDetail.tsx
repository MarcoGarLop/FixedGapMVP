import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import type { Patient, ScaleMetricResult, Session } from '../../data/types';
import { getPatient, getSessions } from '../../data/api';
import { Card } from '../../components/Card';
import { ScoreBadge } from '../../components/ScoreBadge';
import { FlagChip } from '../../components/FlagChip';
import { Disclaimer } from '../../components/Disclaimer';
import { TimeSeriesPanel } from './TimeSeriesPanel';
import { SessionDrilldown } from './SessionDrilldown';
import { PatientCohortComparison } from '../analytics/AnalyticsView';
import { differenceInDays } from 'date-fns';

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { activeRole } = useStore();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getPatient(id).then(p => setPatient(p ?? null));
    getSessions(id).then(s => setSessions(s.sort((a, b) => a.date.localeCompare(b.date))));
  }, [id]);

  if (!patient) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-lg animate-shimmer" />)}
        </div>
      </div>
    );
  }

  const lastSession = sessions[sessions.length - 1];
  const baselineSession = sessions[0];
  const daysSinceStroke = differenceInDays(new Date('2026-05-28'), new Date(patient.strokeDate));
  const deltaVsBaseline = lastSession && baselineSession
    ? lastSession.derived.globalMotorScore - baselineSession.derived.globalMotorScore
    : 0;
  const prevSession = sessions.length > 1 ? sessions[sessions.length - 2] : null;
  const deltaVsPrev = lastSession && prevSession
    ? lastSession.derived.globalMotorScore - prevSession.derived.globalMotorScore
    : 0;

  return (
    <div>
      <div className="mb-4">
        <Link to="/" className="text-[13px] text-accent hover:text-accent/80 transition-colors no-underline flex items-center gap-1 w-fit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Volver al triaje
        </Link>
      </div>

      {/* Header */}
      <Card className="mb-6 animate-fadeInUp !bg-gradient-to-br !from-clay-surface !to-clay-surface-elevated">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-txt tracking-tight">{patient.pseudonym}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <InfoPill>{patient.age} años · {patient.sex}</InfoPill>
              <InfoPill className="capitalize">{{ agile: 'Ágil', moderate: 'Moderado', reduced: 'Reducido' }[patient.mobility]}</InfoPill>
              <InfoPill>{patient.affectedSide === 'left' ? 'Lado izquierdo' : 'Lado derecho'}</InfoPill>
              <InfoPill>{patient.strokeType === 'ischemic' ? 'Isquémico' : 'Hemorrágico'}</InfoPill>
              <InfoPill>{daysSinceStroke} días desde el ictus</InfoPill>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastSession && (
              <div className="text-center">
                <div className="text-[10px] text-txt-muted uppercase tracking-wider font-medium mb-2">Motor global</div>
                <ScoreBadge score={lastSession.derived.globalMotorScore} size="lg" />
                <div className="flex gap-3 mt-2 text-[11px] tabular-nums">
                  <span className={`flex items-center gap-1 ${deltaVsBaseline >= 0 ? 'text-ok' : 'text-alert'}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      {deltaVsBaseline >= 0 ? <path d="M12 19V5M5 12l7-7 7 7"/> : <path d="M12 5v14M19 12l-7 7-7-7"/>}
                    </svg>
                    base: {deltaVsBaseline >= 0 ? '+' : ''}{deltaVsBaseline.toFixed(1)}
                  </span>
                  <span className={`flex items-center gap-1 ${deltaVsPrev >= 0 ? 'text-ok' : 'text-alert'}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      {deltaVsPrev >= 0 ? <path d="M12 19V5M5 12l7-7 7 7"/> : <path d="M12 5v14M19 12l-7 7-7-7"/>}
                    </svg>
                    previa: {deltaVsPrev >= 0 ? '+' : ''}{deltaVsPrev.toFixed(1)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Clinical Indicators */}
      {lastSession && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger-children">
          <IndicatorCard
            label="Temblor / Ataxia"
            active={lastSession.derived.tremorFlag}
            tooltip="Inestabilidad durante el agarre o la rotación activos. Signo de temblor cerebeloso o disfunción extrapiramidal post-ictus."
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12h4l3-9 4 18 3-9h6"/></svg>}
          />
          <IndicatorCard
            label="Espasticidad"
            active={lastSession.derived.spasticityFlag}
            tooltip="Rigidez en flexoextensión. Movimiento fragmentado compatible con espasticidad — secuela limitante difícil de cuantificar fuera de consulta."
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
          />
          <IndicatorCard
            label="Fatiga neuromuscular"
            active={lastSession.derived.fatigueFlag}
            tooltip="Caída >15% de la fuerza máxima entre el inicio y el final de la sesión. Fatiga neuromuscular central — dato no observable en consulta."
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9-4-18-3 9H2"/></svg>}
          />
          <IndicatorCard
            label="Desinhibición motora"
            active={lastSession.derived.impulseControlFlag}
            tooltip="Movimientos involuntarios o excesivos durante la rotación. Dificultad para inhibir el movimiento — desinhibición motora o falta de control fino."
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          />
        </div>
      )}

      {/* Domain Scores */}
      {lastSession && (
        <div className="grid grid-cols-3 gap-3 mb-6 stagger-children">
          <DomainCard
            color="#D4695C"
            label="Precisión de pinza"
            game="Organizar pastillas · M1"
            score={lastSession.derived.proximalGripScore}
          />
          <DomainCard
            color="#3D9B8F"
            label="Extensión del índice"
            game="Apagar lámpara · index_extension_acc"
            score={lastSession.derived.distalFlexExtScore}
          />
          <DomainCard
            color="#5B8EC4"
            label="Rango de rotación"
            game="Girar jarra · M4"
            score={lastSession.derived.pronoSupScore}
          />
        </div>
      )}

      {lastSession && (
        <ScaleMetricsPanel metrics={lastSession.derived.scaleMetrics} />
      )}

      <Disclaimer className="mb-6" />

      {/* Time Series */}
      <TimeSeriesPanel sessions={sessions} patient={patient} />

      {/* Session Drilldown */}
      <Card className="mt-6 animate-fadeInUp">
        <h2 className="text-[15px] font-semibold text-txt mb-4 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-txt-muted"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Sesiones ({sessions.length})
        </h2>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-clay-surface-solid">
              <tr className="text-left text-[11px] text-txt-muted uppercase tracking-wider border-b border-clay-border">
                <th className="py-2.5 px-2 font-medium">Fecha</th>
                <th className="py-2.5 px-2 font-medium">Global</th>
                <th className="py-2.5 px-2 font-medium">Proximal</th>
                <th className="py-2.5 px-2 font-medium">Distal</th>
                <th className="py-2.5 px-2 font-medium">Prono-Sup</th>
                <th className="py-2.5 px-2 font-medium">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {[...sessions].reverse().map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id === selectedSessionId ? null : s.id)}
                  className={`border-b border-clay-border/50 cursor-pointer transition-all ${s.id === selectedSessionId ? 'bg-accent/8 border-l-2 border-l-accent' : `hover:bg-clay-surface-hover ${i % 2 === 0 ? '' : 'bg-clay-surface-elevated/30'}`}`}
                >
                  <td className="py-2.5 px-2 tabular-nums text-[13px]">{s.date}</td>
                  <td className="py-2.5 px-2"><ScoreBadge score={s.derived.globalMotorScore} size="sm" /></td>
                  <td className="py-2.5 px-2 tabular-nums text-[13px]">{s.derived.proximalGripScore.toFixed(1)}</td>
                  <td className="py-2.5 px-2 tabular-nums text-[13px]">{s.derived.distalFlexExtScore.toFixed(1)}</td>
                  <td className="py-2.5 px-2 tabular-nums text-[13px]">{s.derived.pronoSupScore.toFixed(1)}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex gap-1">
                      <FlagChip active={s.derived.tremorFlag} label="T" tooltip="Temblor" variant="tremor" />
                      <FlagChip active={s.derived.spasticityFlag} label="S" tooltip="Espasticidad" variant="spasticity" />
                      <FlagChip active={s.derived.fatigueFlag} label="F" tooltip="Fatiga" variant="fatigue" />
                      <FlagChip active={s.derived.impulseControlFlag} label="I" tooltip="Impulso" variant="impulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedSessionId && (
        <SessionDrilldown sessionId={selectedSessionId} />
      )}

      {/* Cohort comparison */}
      <PatientCohortComparison />

      {/* RBAC gating: therapists don't see predictions link */}
      {activeRole === 'physician' && (
        <div className="mt-6 flex gap-3 stagger-children">
          <ActionButton to={`/patient/${patient.id}/predictions`} color="accent" label="Ver predicciones" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <ActionButton to={`/patient/${patient.id}/rehab`} color="dom-proximal" label="Correlación de rehabilitación" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9-4-18-3 9H2"/></svg>} />
          <ActionButton to={`/patient/${patient.id}/report`} color="dom-pronosup" label="Generar informe" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} />
        </div>
      )}
    </div>
  );
}

function InfoPill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[11px] px-2 py-1 rounded-sm bg-clay-surface-elevated border border-clay-border text-txt-secondary font-medium ${className}`}>
      {children}
    </span>
  );
}

function ActionButton({ to, color, label, icon }: { to: string; color: string; label: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className={`px-4 py-2.5 rounded-md bg-${color}/15 border border-${color}/25 text-${color} text-[13px] font-medium hover:bg-${color}/25 no-underline transition-all flex items-center gap-2`}>
      {icon}
      {label}
    </Link>
  );
}

function IndicatorCard({ label, active, tooltip, icon }: { label: string; active: boolean; tooltip: string; icon: React.ReactNode }) {
  return (
    <Card className={`border ${active ? '!border-alert/30 !bg-alert/5' : '!border-clay-border'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${active ? 'bg-alert/15 text-alert' : 'bg-clay-surface-elevated text-txt-muted'}`}>
          {icon}
        </div>
        <div>
          <div className="text-[13px] font-medium text-txt">{label}</div>
          <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${active ? 'text-alert' : 'text-ok'}`}>
            {active && <span className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse-dot" />}
            {active ? 'ACTIVO' : 'Normal'}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-txt-muted">{tooltip}</div>
    </Card>
  );
}

function DomainCard({ color, label, game, score }: { color: string; label: string; game: string; score: number }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: `linear-gradient(to bottom, ${color}, ${color}80)` }} />
      <div className="pl-3">
        <div className="text-[10px] text-txt-muted uppercase tracking-wider font-medium mb-1">{label}</div>
        <div className="text-2xl font-bold tabular-nums text-txt animate-countUp">{score.toFixed(1)}</div>
        <div className="text-[11px] text-txt-secondary mt-0.5">{game}</div>
      </div>
    </Card>
  );
}

function ScaleMetricsPanel({ metrics }: { metrics: ScaleMetricResult[] }) {
  const coreMetrics = metrics.filter(metric => metric.priority === 'CORE').slice(0, 8);

  return (
    <Card className="mb-6 animate-fadeInUp">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-txt">Métricas de escala configuradas</h2>
          <p className="text-[12px] text-txt-secondary mt-1 max-w-[760px]">
            Resultados de sesión mapeados al catálogo de métricas clínicas: trazabilidad FMA-UE/DASH, métrica FixedGap e ID técnico.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {coreMetrics.map(metric => (
          <ScaleMetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </Card>
  );
}

function ScaleMetricCard({ metric }: { metric: ScaleMetricResult }) {
  const isGoodDirection = metric.direction === 'higher-is-better'
    ? metric.value >= 60
    : metric.value <= 30;
  const valueColor = isGoodDirection ? 'text-ok' : 'text-warning';

  return (
    <div className="rounded-xl border border-clay-border bg-clay-surface-elevated p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-clay-surface-solid border border-clay-border text-txt-muted font-bold">
              {metric.technicalId}
            </span>
            <span className="text-[11px] text-txt-muted">{metric.game}</span>
          </div>
          <div className="text-[13px] font-semibold text-txt mt-1">{metric.label}</div>
        </div>
        <div className={`text-lg font-display font-bold tabular-nums ${valueColor}`}>
          {metric.value.toFixed(1)}
          {metric.unit && <span className="text-[10px] text-txt-muted ml-0.5">{metric.unit}</span>}
        </div>
      </div>
      <p className="text-[10px] text-txt-muted mt-2">{metric.definition}</p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {metric.scaleLinks.map(link => (
          <span key={`${link.scale}-${link.item}`} className="text-[9px] px-1.5 py-0.5 rounded-md bg-accent/8 text-accent border border-accent/15">
            {link.scale}: {link.item}
          </span>
        ))}
      </div>
    </div>
  );
}
