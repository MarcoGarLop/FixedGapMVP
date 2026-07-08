import { generatePrescription, buildTray, computeTotalPills } from './prescription.js';

export function createGameState() {
  const prescription = generatePrescription();
  const trayPills = buildTray(prescription);
  const totalPills = computeTotalPills(prescription);

  const compartments = [];
  for (let i = 0; i < 7; i++) {
    const dayPrescription = prescription.find(p => p.day === i);
    const needs = {};
    for (const med of dayPrescription.meds) {
      needs[med.type] = med.qty;
    }
    compartments.push({ index: i, needs: { ...needs }, filled: {}, complete: false });
  }

  return {
    trayPills,
    compartments,
    totalPills,
    placed: 0,
    errors: 0,
    startTime: Date.now(),
    elapsed: 0,
    complete: false,
  };
}

export function tryPlace(state, pillId, compartmentIndex) {
  const pill = state.trayPills.find(p => p.id === pillId);
  if (!pill) return { accepted: false };

  const comp = state.compartments[compartmentIndex];
  const needed = (comp.needs[pill.type] || 0) - (comp.filled[pill.type] || 0);

  if (needed > 0) {
    comp.filled[pill.type] = (comp.filled[pill.type] || 0) + 1;
    state.trayPills = state.trayPills.filter(p => p.id !== pillId);
    state.placed++;

    let dayComplete = true;
    for (const [type, qty] of Object.entries(comp.needs)) {
      if ((comp.filled[type] || 0) < qty) { dayComplete = false; break; }
    }
    comp.complete = dayComplete;

    if (state.placed === state.totalPills) state.complete = true;

    return { accepted: true, dayComplete };
  } else {
    state.errors++;
    return { accepted: false };
  }
}
