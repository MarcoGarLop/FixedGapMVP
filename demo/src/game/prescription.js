export const MED_TYPES = {
  CARDIO: { id: 'cardio', label: 'Cardio', color: '#d94f4f' },
  VITAMINA: { id: 'vitamina', label: 'Vitamina', color: '#e8a838' },
  OMEGA: { id: 'omega', label: 'Omega', color: '#d4a843' },
  CALCIO: { id: 'calcio', label: 'Calcio', color: '#f0ebe3' },
};

export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function generatePrescription() {
  return [
    { day: 0, meds: [{ type: 'cardio', qty: 1 }, { type: 'omega', qty: 1 }, { type: 'vitamina', qty: 1 }] },
    { day: 1, meds: [{ type: 'cardio', qty: 1 }, { type: 'calcio', qty: 1 }] },
    { day: 2, meds: [{ type: 'cardio', qty: 1 }, { type: 'omega', qty: 1 }, { type: 'vitamina', qty: 1 }] },
    { day: 3, meds: [{ type: 'cardio', qty: 1 }, { type: 'calcio', qty: 1 }] },
    { day: 4, meds: [{ type: 'cardio', qty: 1 }, { type: 'omega', qty: 1 }, { type: 'vitamina', qty: 1 }] },
    { day: 5, meds: [{ type: 'calcio', qty: 1 }, { type: 'omega', qty: 1 }] },
    { day: 6, meds: [{ type: 'vitamina', qty: 1 }, { type: 'calcio', qty: 1 }] },
  ];
}

export function computeTotalPills(prescription) {
  let total = 0;
  for (const day of prescription) {
    for (const med of day.meds) total += med.qty;
  }
  return total;
}

export function buildTray(prescription) {
  const pills = [];
  let id = 0;
  for (const day of prescription) {
    for (const med of day.meds) {
      for (let q = 0; q < med.qty; q++) {
        pills.push({ id: id++, type: med.type });
      }
    }
  }
  for (let i = pills.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pills[i], pills[j]] = [pills[j], pills[i]];
  }
  return pills;
}
