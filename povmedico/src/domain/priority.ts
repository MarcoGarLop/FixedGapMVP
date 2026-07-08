import type { Session, DerivedClinical } from '../data/types';

/**
 * priorityScore = 2.0 * nFlags + 1.5 * max(0, -slope) + 1.0 * adherenceDeficit7d
 *
 * - nFlags: number of active clinical flags in the most recent session
 * - slope: linear regression slope of globalMotorScore over last 5 sessions (negative = regression)
 * - adherenceDeficit7d: (expected sessions in last 7 days - actual) / expected, clamped 0-1
 */
export function computePriorityScore(
  recentDerived: DerivedClinical,
  last5GlobalScores: number[],
  adherenceDeficit7d: number
): number {
  const nFlags = [
    recentDerived.tremorFlag,
    recentDerived.spasticityFlag,
    recentDerived.fatigueFlag,
    recentDerived.impulseControlFlag,
  ].filter(Boolean).length;

  const slope = linearSlope(last5GlobalScores);
  const regressionPenalty = Math.max(0, -slope);

  return 2.0 * nFlags + 1.5 * regressionPenalty + 1.0 * adherenceDeficit7d;
}

export function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function computeAdherenceDeficit7d(
  sessions: Session[],
  expectedPerWeek: number,
  referenceDate: Date
): number {
  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessionsInWindow = sessions.filter(s => {
    const d = new Date(s.date);
    return d >= sevenDaysAgo && d <= referenceDate;
  });

  if (expectedPerWeek <= 0) return 0;
  const deficit = Math.max(0, expectedPerWeek - sessionsInWindow.length) / expectedPerWeek;
  return Math.min(1, deficit);
}
