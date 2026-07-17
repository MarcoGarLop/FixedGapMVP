import { generateMockData } from './mockGenerator';
import type { Patient, Session, Clinician, PatientPrediction } from './types';
import { generatePrediction } from '../domain/predictions';

const data = generateMockData();

function delay<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

export async function getPatients(): Promise<Patient[]> {
  return delay(data.patients);
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  return delay(data.patients.find(p => p.id === id));
}

export async function getSessions(patientId: string): Promise<Session[]> {
  return delay(data.sessions.filter(s => s.patientId === patientId));
}

export async function getSession(sessionId: string): Promise<Session | undefined> {
  return delay(data.sessions.find(s => s.id === sessionId));
}

export async function getAllSessions(): Promise<Session[]> {
  return delay(data.sessions);
}

export async function getClinicians(): Promise<Clinician[]> {
  return delay(data.clinicians);
}

export async function getClinician(id: string): Promise<Clinician | undefined> {
  return delay(data.clinicians.find(c => c.id === id));
}

export async function getPrediction(
  patientId: string,
  metric: string = 'globalMotorScore'
): Promise<PatientPrediction> {
  const sessions = data.sessions.filter(s => s.patientId === patientId);
  return delay(generatePrediction(patientId, sessions, metric));
}

export async function getCohorteStats(mobility?: string, strokeType?: string): Promise<{
  avgGlobalScore: number;
  flagPercentages: { tremor: number; spasticity: number; fatigue: number; impulse: number };
  avgAdherence: number;
  scoreDistribution: { range: string; count: number }[];
}> {
  let relevantPatients = data.patients;
  if (mobility) relevantPatients = relevantPatients.filter(p => p.mobility === mobility);
  if (strokeType) relevantPatients = relevantPatients.filter(p => p.strokeType === strokeType);

  const patientIds = new Set(relevantPatients.map(p => p.id));
  const relevantSessions = data.sessions.filter(s => patientIds.has(s.patientId));

  const latestByPatient = new Map<string, Session>();
  for (const s of relevantSessions) {
    const existing = latestByPatient.get(s.patientId);
    if (!existing || s.date > existing.date) {
      latestByPatient.set(s.patientId, s);
    }
  }

  const latestSessions = Array.from(latestByPatient.values());
  const scores = latestSessions.map(s => s.derived.globalMotorScore);
  const avgGlobalScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const flagPercentages = {
    tremor: latestSessions.filter(s => s.derived.tremorFlag).length / Math.max(1, latestSessions.length) * 100,
    spasticity: latestSessions.filter(s => s.derived.spasticityFlag).length / Math.max(1, latestSessions.length) * 100,
    fatigue: latestSessions.filter(s => s.derived.fatigueFlag).length / Math.max(1, latestSessions.length) * 100,
    impulse: latestSessions.filter(s => s.derived.impulseControlFlag).length / Math.max(1, latestSessions.length) * 100,
  };

  const totalAdherence = relevantPatients.reduce((sum, p) => {
    const logs = p.prescribedExercises.flatMap(e => e.adherenceLog);
    const completed = logs.filter(l => l.completed).length;
    return sum + (logs.length ? completed / logs.length : 0);
  }, 0);
  const avgAdherence = relevantPatients.length ? (totalAdherence / relevantPatients.length) * 100 : 0;

  const ranges = ['0-20', '20-40', '40-60', '60-80', '80-100'];
  const scoreDistribution = ranges.map(range => {
    const [min, max] = range.split('-').map(Number);
    return { range, count: scores.filter(s => s >= min && s < (max === 100 ? 101 : max)).length };
  });

  return delay({ avgGlobalScore: Math.round(avgGlobalScore * 10) / 10, flagPercentages, avgAdherence: Math.round(avgAdherence * 10) / 10, scoreDistribution });
}
