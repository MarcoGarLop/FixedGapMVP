import { create } from 'zustand';
import type { Patient, Session, Clinician } from '../data/types';
import { getPatients, getClinicians, getAllSessions } from '../data/api';
import { computePriorityScore, computeAdherenceDeficit7d } from '../domain/priority';

export type ViewMode = 'list' | 'cards';
export type ClinicianRole = 'physician' | 'physiotherapist' | 'occupational-therapist';

interface Filters {
  mobility: string | null;
  affectedSide: string | null;
  strokeType: string | null;
  ageRange: [number, number] | null;
  onlyAlerts: boolean;
  clinicianId: string | null;
  search: string;
}

interface AppState {
  patients: Patient[];
  sessions: Session[];
  clinicians: Clinician[];
  activeClinicianId: string;
  activeRole: ClinicianRole;
  viewMode: ViewMode;
  filters: Filters;
  patientPriorities: Map<string, number>;
  loaded: boolean;

  load: () => Promise<void>;
  setActiveClinician: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  getFilteredPatients: () => (Patient & { priorityScore: number; lastSession?: Session })[];
}

const defaultFilters: Filters = {
  mobility: null,
  affectedSide: null,
  strokeType: null,
  ageRange: null,
  onlyAlerts: false,
  clinicianId: null,
  search: '',
};

export const useStore = create<AppState>((set, get) => ({
  patients: [],
  sessions: [],
  clinicians: [],
  activeClinicianId: 'clin-001',
  activeRole: 'physician',
  viewMode: 'list',
  filters: { ...defaultFilters },
  patientPriorities: new Map(),
  loaded: false,

  load: async () => {
    const [patients, clinicians, sessions] = await Promise.all([
      getPatients(),
      getClinicians(),
      getAllSessions(),
    ]);

    const priorities = new Map<string, number>();
    const referenceDate = new Date('2026-05-28');

    for (const patient of patients) {
      const patientSessions = sessions
        .filter(s => s.patientId === patient.id)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (patientSessions.length === 0) continue;

      const lastDerived = patientSessions[patientSessions.length - 1].derived;
      const last5Scores = patientSessions.slice(-5).map(s => s.derived.globalMotorScore);
      const expectedPerWeek = patient.prescribedExercises.reduce((sum, e) => sum + e.frequencyPerWeek, 0) / Math.max(1, patient.prescribedExercises.length);
      const adherenceDeficit = computeAdherenceDeficit7d(patientSessions, expectedPerWeek, referenceDate);

      priorities.set(patient.id, computePriorityScore(lastDerived, last5Scores, adherenceDeficit));
    }

    set({ patients, clinicians, sessions, patientPriorities: priorities, loaded: true });
  },

  setActiveClinician: (id) => {
    const clinician = get().clinicians.find(c => c.id === id);
    set({ activeClinicianId: id, activeRole: clinician?.role ?? 'physician' });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setFilter: (key, value) => set(state => ({
    filters: { ...state.filters, [key]: value },
  })),

  resetFilters: () => set({ filters: { ...defaultFilters } }),

  getFilteredPatients: () => {
    const { patients, sessions, filters, patientPriorities, activeClinicianId } = get();

    let filtered = patients.filter(p => p.clinicianIds.includes(activeClinicianId));

    if (filters.mobility) filtered = filtered.filter(p => p.mobility === filters.mobility);
    if (filters.affectedSide) filtered = filtered.filter(p => p.affectedSide === filters.affectedSide);
    if (filters.strokeType) filtered = filtered.filter(p => p.strokeType === filters.strokeType);
    if (filters.ageRange) filtered = filtered.filter(p => p.age >= filters.ageRange![0] && p.age <= filters.ageRange![1]);
    if (filters.clinicianId) filtered = filtered.filter(p => p.clinicianIds.includes(filters.clinicianId!));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(p => p.pseudonym.toLowerCase().includes(q));
    }
    if (filters.onlyAlerts) {
      filtered = filtered.filter(p => {
        const ps = sessions.filter(s => s.patientId === p.id);
        const last = ps[ps.length - 1];
        return last && (last.derived.tremorFlag || last.derived.spasticityFlag || last.derived.fatigueFlag || last.derived.impulseControlFlag);
      });
    }

    return filtered
      .map(p => {
        const patientSessions = sessions.filter(s => s.patientId === p.id).sort((a, b) => a.date.localeCompare(b.date));
        return {
          ...p,
          priorityScore: patientPriorities.get(p.id) ?? 0,
          lastSession: patientSessions[patientSessions.length - 1],
        };
      })
      .sort((a, b) => {
        // Alpha (the real gameplay patient) always shows first.
        if (a.id === 'pat-alpha') return -1;
        if (b.id === 'pat-alpha') return 1;
        return b.priorityScore - a.priorityScore;
      });
  },
}));
