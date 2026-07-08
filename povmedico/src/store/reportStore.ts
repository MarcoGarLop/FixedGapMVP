import { create } from 'zustand';
import type { ReportTemplate, GeneratedReport, ScheduledReport } from '../data/reportTypes';

interface ReportStore {
  templates: ReportTemplate[];
  history: GeneratedReport[];
  scheduled: ScheduledReport[];

  addTemplate: (t: ReportTemplate) => void;
  updateTemplate: (id: string, t: Partial<ReportTemplate>) => void;
  removeTemplate: (id: string) => void;

  addReport: (r: GeneratedReport) => void;

  addScheduled: (s: ScheduledReport) => void;
  updateScheduled: (id: string, s: Partial<ScheduledReport>) => void;
  removeScheduled: (id: string) => void;
  toggleScheduled: (id: string) => void;
}

const defaultTemplates: ReportTemplate[] = [
  { id: 'tpl-01', name: 'Seguimiento semanal', sections: ['summary', 'domain-scores', 'clinical-flags'] },
  { id: 'tpl-02', name: 'Informe de alta', sections: ['summary', 'domain-scores', 'clinical-flags', 'rehab-correlation', 'predictions'] },
  { id: 'tpl-03', name: 'Resumen para fisioterapeuta', sections: ['summary', 'domain-scores', 'rehab-correlation', 'telemetry'] },
  { id: 'tpl-04', name: 'Informe completo', sections: ['summary', 'domain-scores', 'clinical-flags', 'rehab-correlation', 'predictions', 'telemetry'] },
];

const seedHistory: GeneratedReport[] = [
  { id: 'rep-01', patientId: 'pat-001', date: '2026-05-27', templateId: 'tpl-01', language: 'es', sections: ['summary', 'domain-scores', 'clinical-flags'], sizeKb: 245 },
  { id: 'rep-02', patientId: 'pat-003', date: '2026-05-26', templateId: 'tpl-04', language: 'es', sections: ['summary', 'domain-scores', 'clinical-flags', 'rehab-correlation', 'predictions', 'telemetry'], sizeKb: 512 },
  { id: 'rep-03', patientId: 'pat-005', date: '2026-05-25', templateId: 'tpl-02', language: 'en', sections: ['summary', 'domain-scores', 'clinical-flags', 'rehab-correlation', 'predictions'], sizeKb: 380 },
  { id: 'rep-04', patientId: 'pat-002', date: '2026-05-24', templateId: 'tpl-03', language: 'es', sections: ['summary', 'domain-scores', 'rehab-correlation', 'telemetry'], sizeKb: 298 },
  { id: 'rep-05', patientId: 'pat-008', date: '2026-05-23', templateId: 'tpl-01', language: 'es', sections: ['summary', 'domain-scores', 'clinical-flags'], sizeKb: 189 },
  { id: 'rep-06', patientId: 'pat-010', date: '2026-05-22', templateId: 'tpl-04', language: 'es', sections: ['summary', 'domain-scores', 'clinical-flags', 'rehab-correlation', 'predictions', 'telemetry'], sizeKb: 520 },
  { id: 'rep-07', patientId: 'pat-004', date: '2026-05-21', templateId: 'tpl-01', language: 'es', sections: ['summary', 'domain-scores', 'clinical-flags'], sizeKb: 210 },
  { id: 'rep-08', patientId: 'pat-012', date: '2026-05-20', templateId: 'tpl-02', language: 'en', sections: ['summary', 'domain-scores', 'clinical-flags', 'rehab-correlation', 'predictions'], sizeKb: 405 },
  { id: 'rep-09', patientId: 'pat-006', date: '2026-05-19', templateId: 'tpl-03', language: 'es', sections: ['summary', 'domain-scores', 'rehab-correlation', 'telemetry'], sizeKb: 275 },
  { id: 'rep-10', patientId: 'pat-015', date: '2026-05-18', templateId: 'tpl-01', language: 'es', sections: ['summary', 'domain-scores', 'clinical-flags'], sizeKb: 198 },
];

const seedScheduled: ScheduledReport[] = [
  { id: 'sch-01', patientId: 'pat-001', frequency: 'weekly', recipient: 'dr.lopez@clinica.es', templateId: 'tpl-01', active: true },
  { id: 'sch-02', patientId: null, frequency: 'monthly', recipient: 'equipo@clinica.es', templateId: 'tpl-04', active: true },
  { id: 'sch-03', patientId: 'pat-005', frequency: 'biweekly', recipient: 'fisio@clinica.es', templateId: 'tpl-03', active: false },
];

export const useReportStore = create<ReportStore>((set) => ({
  templates: defaultTemplates,
  history: seedHistory,
  scheduled: seedScheduled,

  addTemplate: (t) => set(s => ({ templates: [...s.templates, t] })),
  updateTemplate: (id, updates) => set(s => ({
    templates: s.templates.map(t => t.id === id ? { ...t, ...updates } as ReportTemplate : t),
  })),
  removeTemplate: (id) => set(s => ({ templates: s.templates.filter(t => t.id !== id) })),

  addReport: (r) => set(s => ({ history: [r, ...s.history] })),

  addScheduled: (sc) => set(s => ({ scheduled: [...s.scheduled, sc] })),
  updateScheduled: (id, updates) => set(s => ({
    scheduled: s.scheduled.map(sc => sc.id === id ? { ...sc, ...updates } as ScheduledReport : sc),
  })),
  removeScheduled: (id) => set(s => ({ scheduled: s.scheduled.filter(sc => sc.id !== id) })),
  toggleScheduled: (id) => set(s => ({
    scheduled: s.scheduled.map(sc => sc.id === id ? { ...sc, active: !sc.active } : sc),
  })),
}));
