import type { Patient, Session, GameResult, PrescribedExercise, EventMarker, GameId } from './types';
import { computeDerivedClinical } from '../domain/scores';

// Maps a row from the `subjects` table in Supabase to the `Patient` interface
export function mapSupabaseSubject(subject: any): Patient {
  // Use patient_data jsonb or defaults for missing fields
  const patientData = subject.patient_data || {};
  
  // Real subjects from DB will not have prescribed exercises or events yet
  const prescribedExercises: PrescribedExercise[] = [];
  const eventMarkers: EventMarker[] = [];

  const age = subject.birth_year ? new Date().getFullYear() - subject.birth_year : 60;
  
  return {
    id: subject.id,
    pseudonym: subject.display_name || 'Desconocido',
    age,
    sex: subject.sex || 'other',
    strokeType: patientData.strokeType || 'ischemic',
    strokeDate: patientData.strokeDate || new Date().toISOString().split('T')[0],
    affectedSide: patientData.affectedSide || (subject.dominant_hand === 'right' ? 'left' : 'right'),
    mobility: patientData.mobility || 'moderate',
    clinicianIds: subject.operator_id ? [subject.operator_id] : ['clin-001'],
    baselineSessionId: '', // To be filled later if needed, or left empty
    prescribedExercises,
    eventMarkers,
  };
}

// Maps rows from the `sessions` and `game_results` tables in Supabase to the `Session` interface
export function mapSupabaseSession(sessionRow: any, gameResultRows: any[]): Session {
  const games: GameResult[] = gameResultRows.map((gr: any) => {
    let gameId: GameId = 'slingshot';
    if (gr.game_key === 'pastillero') gameId = 'slingshot';
    if (gr.game_key === 'interruptores') gameId = 'flappy';
    if (gr.game_key === 'jarra') gameId = 'water';

    return {
      game: gameId,
      durationMs: gr.duration_ms || 0,
      metrics: gr.metrics_display || {},
      // In Supabase we don't store the 300 telemetry frames to save space in game_results, 
      // they are usually discarded after the game unless recorded elsewhere.
      frames: [] 
    };
  });

  return {
    id: sessionRow.id,
    patientId: sessionRow.subject_id,
    date: sessionRow.started_at ? sessionRow.started_at.split('T')[0] : new Date().toISOString().split('T')[0],
    handUsed: sessionRow.device?.handUsed || 'right',
    games,
    derived: computeDerivedClinical(games), // Calculate metrics based on the mapped games
  };
}
