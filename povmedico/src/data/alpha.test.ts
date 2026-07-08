import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildAlpha, ALPHA_ID } from './alpha';

// Sessions in the exact shape the game writes to localStorage.
const sample = [
  {
    date: '2026-06-01',
    handUsed: 'right',
    games: [
      { game: 'slingshot', durationMs: 45000, metrics: { maxPinchOpen: 0.82, maxPullDistance: 210, pullTremor: 1.4, accuracyRatio: 0.88, totalShots: 17 } },
      { game: 'flappy', durationMs: 38000, metrics: { maxExtension: 0.79, maxFlexion: 0.7, activationCount: 24, fatigueIndex: -8, smoothnessJerk: 2.1 } },
      { game: 'water', durationMs: 52000, metrics: { maxSupination: 62, maxPronation: 58, smoothnessJerk: 1.9, waterAccuracy: 85, poisonError: 3, averagePouringTime: 1800 } },
    ],
  },
  {
    date: '2026-06-03',
    handUsed: 'right',
    games: [
      { game: 'slingshot', durationMs: 40000, metrics: { maxPinchOpen: 0.9, maxPullDistance: 260, pullTremor: 1.1, accuracyRatio: 0.93, totalShots: 18 } },
      { game: 'flappy', durationMs: 36000, metrics: { maxExtension: 0.85, maxFlexion: 0.8, activationCount: 30, fatigueIndex: -5, smoothnessJerk: 1.5 } },
      { game: 'water', durationMs: 50000, metrics: { maxSupination: 70, maxPronation: 66, smoothnessJerk: 1.4, waterAccuracy: 92, poisonError: 1, averagePouringTime: 1500 } },
    ],
  },
];

describe('buildAlpha', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });

  it('returns null when no sessions stored', () => {
    expect(buildAlpha()).toBeNull();
  });

  it('builds Alpha patient + sessions with valid derived metrics', () => {
    localStorage.setItem('fixedgap_alpha_sessions', JSON.stringify(sample));
    const alpha = buildAlpha('clin-001');
    expect(alpha).not.toBeNull();
    expect(alpha!.patient.id).toBe(ALPHA_ID);
    expect(alpha!.patient.pseudonym).toBe('ALPHA-001');
    expect(alpha!.patient.clinicianIds).toContain('clin-001');
    expect(alpha!.sessions).toHaveLength(2);

    for (const s of alpha!.sessions) {
      expect(s.patientId).toBe(ALPHA_ID);
      const d = s.derived;
      for (const v of [d.proximalGripScore, d.distalFlexExtScore, d.pronoSupScore, d.globalMotorScore]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(Array.isArray(d.scaleMetrics)).toBe(true);
    }

    // sessions sorted ascending by date; baseline is the first
    expect(alpha!.patient.baselineSessionId).toBe(alpha!.sessions[0].id);
  });

  it('tolerates malformed storage', () => {
    localStorage.setItem('fixedgap_alpha_sessions', 'not json');
    expect(buildAlpha()).toBeNull();
  });
});
