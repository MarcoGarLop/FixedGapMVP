# Snapshot Dashboard Clínico — v1 (pre-mejoras)

Fecha de captura: 2026-07-19
Propósito: Permitir revertir los cambios al estado exacto anterior si es necesario.

---

## Archivos afectados por las mejoras

### 1. `src/domain/scores.ts`

```typescript
import type { SlingshotMetrics, FlappyMetrics, WaterMetrics, DerivedClinical, GameResult } from '../data/types';
import { computeScaleMetricResults } from '../data/clinicalMetrics';

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100);
}

function normalizeInverse(value: number, min: number, max: number): number {
  return 100 - normalize(value, min, max);
}

export function computeProximalGripScore(m: SlingshotMetrics): number {
  const accuracy = normalize(m.accuracyRatio, 0, 1);
  const pinch = normalize(m.maxPinchOpen, 0, 1);
  const pull = normalize(m.maxPullDistance, 0, 500);
  const tremor = normalizeInverse(m.pullTremor, 0, 6);
  return clamp((accuracy + pinch + pull + tremor) / 4);
}

export function computeDistalFlexExtScore(m: FlappyMetrics): number {
  const flexion = normalize(m.maxFlexion, 0, 1);
  const extension = normalize(m.maxExtension, 0, 1);
  const activation = normalize(m.activationCount, 0, 60);
  const fatigue = normalizeInverse(Math.abs(m.fatigueIndex), 0, 30);
  const jerk = normalizeInverse(m.smoothnessJerk, 0, 6);
  return clamp((flexion + extension + activation + fatigue + jerk) / 5);
}

export function computePronoSupScore(m: WaterMetrics): number {
  const sup = normalize(m.maxSupination, 0, 90);
  const pro = normalize(m.maxPronation, 0, 90);
  const accuracy = normalize(m.waterAccuracy, 0, 100);
  const poison = normalizeInverse(m.poisonError, 0, 50);
  const jerk = normalizeInverse(m.smoothnessJerk, 0, 6);
  const time = normalizeInverse(m.averagePouringTime, 500, 5000);
  return clamp((sup + pro + accuracy + poison + jerk + time) / 6);
}

export function computeDerivedClinical(
  games: GameResult[],
  poisonThreshold = 25
): DerivedClinical {
  const slingshot = games.find(g => g.game === 'slingshot');
  const flappy = games.find(g => g.game === 'flappy');
  const water = games.find(g => g.game === 'water');

  const sm = slingshot?.metrics as SlingshotMetrics | undefined;
  const fm = flappy?.metrics as FlappyMetrics | undefined;
  const wm = water?.metrics as WaterMetrics | undefined;

  const tremorFlag = (sm ? sm.pullTremor > 3.5 : false) || (wm ? wm.smoothnessJerk > 4 : false);
  const spasticityFlag = fm ? fm.smoothnessJerk > 4 : false;
  const fatigueFlag = fm ? fm.fatigueIndex < -20 : false;
  const impulseControlFlag = wm ? wm.poisonError > poisonThreshold : false;

  const proximalGripScore = sm ? computeProximalGripScore(sm) : 50;
  const distalFlexExtScore = fm ? computeDistalFlexExtScore(fm) : 50;
  const pronoSupScore = wm ? computePronoSupScore(wm) : 50;
  const globalMotorScore = (proximalGripScore + distalFlexExtScore + pronoSupScore) / 3;

  return {
    tremorFlag,
    spasticityFlag,
    fatigueFlag,
    impulseControlFlag,
    proximalGripScore: Math.round(proximalGripScore * 10) / 10,
    distalFlexExtScore: Math.round(distalFlexExtScore * 10) / 10,
    pronoSupScore: Math.round(pronoSupScore * 10) / 10,
    globalMotorScore: Math.round(globalMotorScore * 10) / 10,
    scaleMetrics: computeScaleMetricResults(games),
  };
}
```

### 2. `src/data/types.ts`

```typescript
export type AffectedSide = 'left' | 'right';
export type Hand = 'left' | 'right';
export type MobilityLevel = 'agile' | 'moderate' | 'reduced';
export type StrokeType = 'ischemic' | 'hemorrhagic';
export type GameId = 'slingshot' | 'flappy' | 'water';

export interface SlingshotMetrics {
  maxPinchOpen: number;
  maxPullDistance: number;
  pullTremor: number;
  accuracyRatio: number;
  totalShots: number;
}

export interface FlappyMetrics {
  maxExtension: number;
  maxFlexion: number;
  activationCount: number;
  fatigueIndex: number;
  smoothnessJerk: number;
}

export interface WaterMetrics {
  maxSupination: number;
  maxPronation: number;
  smoothnessJerk: number;
  waterAccuracy: number;
  poisonError: number;
  averagePouringTime: number;
}

export interface TelemetryFrame {
  timestamp: number;
  phase: string;
  fistStrength?: number;
  pitcherRotationZ?: number;
  glassCurrentVolume?: number;
  glassTargetVolume?: number;
  glassPoisonVolume?: number;
  round?: number;
  pullX?: number;
  pullY?: number;
  isPinching?: boolean;
  pinchRatio?: number;
  score?: number;
  birdsLeft?: number;
}

export interface GameResult {
  game: GameId;
  durationMs: number;
  metrics: SlingshotMetrics | FlappyMetrics | WaterMetrics;
  frames?: TelemetryFrame[];
}

export interface DerivedClinical {
  tremorFlag: boolean;
  spasticityFlag: boolean;
  fatigueFlag: boolean;
  impulseControlFlag: boolean;
  proximalGripScore: number;
  distalFlexExtScore: number;
  pronoSupScore: number;
  globalMotorScore: number;
  scaleMetrics: ScaleMetricResult[];
}

export type ScaleName = 'FMA-UE' | 'DASH';

export interface ScaleMetricResult {
  id: string;
  technicalId: string;
  label: string;
  game: string;
  value: number;
  unit?: string;
  priority: 'CORE' | 'V2' | 'EXPL';
  status: 'Captured' | 'To be implemented' | 'Proxy';
  direction: 'higher-is-better' | 'lower-is-better';
  definition: string;
  scaleLinks: {
    scale: ScaleName;
    item: string;
    coverage?: 'Yes' | 'Partial' | 'Proxy' | 'Analogous' | 'No';
  }[];
}

export interface Session {
  id: string;
  patientId: string;
  date: string;
  handUsed: Hand;
  games: GameResult[];
  derived: DerivedClinical;
}

export interface PrescribedExercise {
  id: string;
  name: string;
  targetDomain: 'proximal-grip' | 'distal-flex-ext' | 'prono-supination';
  frequencyPerWeek: number;
  intensity: 'low' | 'medium' | 'high';
  startDate: string;
  endDate?: string;
  adherenceLog: { date: string; completed: boolean }[];
}

export interface EventMarker {
  id: string;
  date: string;
  type: 'medication' | 'exercise-change' | 'botox' | 'clinical-note' | 'other';
  label: string;
}

export interface Patient {
  id: string;
  pseudonym: string;
  age: number;
  sex: 'M' | 'F' | 'other';
  strokeType: StrokeType;
  strokeDate: string;
  affectedSide: AffectedSide;
  mobility: MobilityLevel;
  clinicianIds: string[];
  baselineSessionId: string;
  prescribedExercises: PrescribedExercise[];
  eventMarkers: EventMarker[];
}

export interface Clinician {
  id: string;
  name: string;
  role: 'physician' | 'physiotherapist' | 'occupational-therapist';
}

export interface PatientPrediction {
  patientId: string;
  metric: string;
  trajectory: { date: string; predicted: number; ciLow: number; ciHigh: number }[];
  milestoneProbability: { milestone: string; byWeek: { week: number; p: number }[] }[];
  plateauRisk: number;
  dropoutRisk: number;
  drivers: { feature: string; weight: number }[];
}
```

### 3. `src/data/clinicalMetrics.ts`

```typescript
import type {
  FlappyMetrics,
  GameResult,
  ScaleMetricResult,
  SlingshotMetrics,
  WaterMetrics,
} from './types';

type MetricBlueprint = Omit<ScaleMetricResult, 'value'> & {
  sourceGame: GameResult['game'];
  compute: (games: GameResult[]) => number | null;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function inverseScale(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(100 - ((value - min) / (max - min)) * 100);
}

function getMetrics<T>(games: GameResult[], gameId: GameResult['game']): T | null {
  return (games.find(game => game.game === gameId)?.metrics as T | undefined) ?? null;
}

export const CLINICAL_METRIC_BLUEPRINTS: MetricBlueprint[] = [
  {
    id: 'slingshot-m1-pinch-precision',
    technicalId: 'M1',
    label: 'Precisión de pinza',
    game: 'Organizar pastillas',
    sourceGame: 'slingshot',
    unit: '%',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Distancia pulgar(L4)-índice(L8) normalizada por la palma.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Pinza pulgar-índice', coverage: 'Yes' },
      { scale: 'DASH', item: 'Manipular objetos pequeños', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<SlingshotMetrics>(games, 'slingshot');
      return metrics ? metrics.accuracyRatio * 100 : null;
    },
  },
  {
    id: 'slingshot-reach-precision',
    technicalId: 'reach_precision',
    label: 'Precisión de alcance/colocación',
    game: 'Organizar pastillas',
    sourceGame: 'slingshot',
    unit: '%',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Distancia punto final-objetivo + tiempo de tránsito en el plano lateral.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Dedo-nariz (coordinación)', coverage: 'Analogous' },
      { scale: 'DASH', item: 'Transportar un objeto y colocarlo en un sitio', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<SlingshotMetrics>(games, 'slingshot');
      return metrics ? metrics.accuracyRatio * 100 : null;
    },
  },
  {
    id: 'slingshot-endpoint-overshoot',
    technicalId: 'endpoint_overshoot',
    label: 'Sobrepaso del objetivo (dismetría)',
    game: 'Organizar pastillas',
    sourceGame: 'slingshot',
    unit: '%',
    priority: 'CORE',
    status: 'Captured',
    direction: 'lower-is-better',
    definition: 'Distancia de parada respecto al objetivo.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Dedo-nariz (coordinación)', coverage: 'Analogous' },
      { scale: 'DASH', item: 'Realizar tareas de motricidad fina con la mano', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<SlingshotMetrics>(games, 'slingshot');
      return metrics ? (1 - metrics.accuracyRatio) * 100 : null;
    },
  },
  {
    id: 'slingshot-m11-sparc',
    technicalId: 'M11',
    label: 'Suavidad (SPARC)',
    game: 'Organizar pastillas',
    sourceGame: 'slingshot',
    unit: '/100',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Longitud de arco espectral del perfil de velocidad.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Suavidad / calidad del movimiento', coverage: 'Yes' },
      { scale: 'DASH', item: 'Realizar tareas de motricidad fina con la mano', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<SlingshotMetrics>(games, 'slingshot');
      return metrics ? inverseScale(metrics.pullTremor, 0, 6) : null;
    },
  },
  {
    id: 'lamp-index-extension',
    technicalId: 'index_extension_acc',
    label: 'Precisión de extensión del índice',
    game: 'Apagar lámpara',
    sourceGame: 'flappy',
    unit: '%',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Extensión del índice hasta el objetivo; ángulo MCF.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Extensión de dedos', coverage: 'Yes' },
      { scale: 'DASH', item: 'Girar una llave / interruptor', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<FlappyMetrics>(games, 'flappy');
      return metrics ? metrics.maxExtension * 100 : null;
    },
  },
  {
    id: 'lamp-m2-hand-opening',
    technicalId: 'M2',
    label: 'Velocidad de apertura de la mano',
    game: 'Apagar lámpara',
    sourceGame: 'flappy',
    unit: '/100',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Velocidad de separación de los 5 dedos respecto al centroide palmar.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Cierre de dedos (puño)', coverage: 'Partial' },
      { scale: 'FMA-UE', item: 'Extensión de dedos', coverage: 'Yes' },
    ],
    compute: games => {
      const metrics = getMetrics<FlappyMetrics>(games, 'flappy');
      return metrics ? (metrics.activationCount / 60) * 100 : null;
    },
  },
  {
    id: 'lamp-m11-sparc',
    technicalId: 'M11',
    label: 'Suavidad (SPARC)',
    game: 'Apagar lámpara',
    sourceGame: 'flappy',
    unit: '/100',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Suavidad cinemática del gesto de alcance.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Suavidad / calidad del movimiento', coverage: 'Yes' },
      { scale: 'DASH', item: 'Realizar tareas de motricidad fina con la mano', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<FlappyMetrics>(games, 'flappy');
      return metrics ? inverseScale(metrics.smoothnessJerk, 0, 6) : null;
    },
  },
  {
    id: 'jar-m4-rom',
    technicalId: 'M4',
    label: 'Rango de rotación',
    game: 'Girar jarra',
    sourceGame: 'water',
    unit: '/100',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Ángulo de rotación máximo, normalizado por el máximo del paciente.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Rango de movimiento (mano)', coverage: 'Yes' },
      { scale: 'DASH', item: 'Abrir un tarro apretado', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<WaterMetrics>(games, 'water');
      return metrics ? ((metrics.maxSupination + metrics.maxPronation) / 180) * 100 : null;
    },
  },
  {
    id: 'jar-pronosup-speed',
    technicalId: 'pronosup_speed',
    label: 'Velocidad de pronosupinación',
    game: 'Girar jarra',
    sourceGame: 'water',
    unit: '/100',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Velocidad angular media del giro repetido.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Velocidad de pronosupinación', coverage: 'Yes' },
      { scale: 'DASH', item: 'Abrir una botella con tapón de rosca', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<WaterMetrics>(games, 'water');
      return metrics ? inverseScale(metrics.averagePouringTime, 500, 5000) : null;
    },
  },
  {
    id: 'jar-pronosup-ratio',
    technicalId: 'pronosup_ratio',
    label: 'Proxy de pronosupinación',
    game: 'Girar jarra',
    sourceGame: 'water',
    unit: '/100',
    priority: 'EXPL',
    status: 'Proxy',
    direction: 'higher-is-better',
    definition: 'Ratio de visibilidad de landmarks palmares vs. dorsales (cualitativo).',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Pronación del antebrazo', coverage: 'Proxy' },
      { scale: 'FMA-UE', item: 'Supinación del antebrazo', coverage: 'Proxy' },
    ],
    compute: games => {
      const metrics = getMetrics<WaterMetrics>(games, 'water');
      if (!metrics) return null;
      const balance = 100 - Math.abs(metrics.maxSupination - metrics.maxPronation);
      return clamp(balance);
    },
  },
  {
    id: 'jar-m11-sparc',
    technicalId: 'M11',
    label: 'Suavidad de rotación (SPARC)',
    game: 'Girar jarra',
    sourceGame: 'water',
    unit: '/100',
    priority: 'CORE',
    status: 'Captured',
    direction: 'higher-is-better',
    definition: 'Suavidad del perfil de velocidad angular.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Suavidad / calidad del movimiento', coverage: 'Yes' },
      { scale: 'DASH', item: 'Realizar tareas de motricidad fina con la mano', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<WaterMetrics>(games, 'water');
      return metrics ? inverseScale(metrics.smoothnessJerk, 0, 6) : null;
    },
  },
  {
    id: 'jar-grip-cylindrical',
    technicalId: 'grip_cylindrical',
    label: 'Calidad del agarre cilíndrico',
    game: 'Girar jarra',
    sourceGame: 'water',
    unit: '%',
    priority: 'V2',
    status: 'To be implemented',
    direction: 'higher-is-better',
    definition: 'Estabilidad de apertura y puntos de contacto en rotación sostenida.',
    scaleLinks: [
      { scale: 'FMA-UE', item: 'Agarre cilíndrico', coverage: 'Yes' },
      { scale: 'DASH', item: 'Realizar tareas con la firmeza/fuerza habitual', coverage: 'Analogous' },
    ],
    compute: games => {
      const metrics = getMetrics<WaterMetrics>(games, 'water');
      return metrics ? metrics.waterAccuracy : null;
    },
  },
];

export function computeScaleMetricResults(games: GameResult[]): ScaleMetricResult[] {
  return CLINICAL_METRIC_BLUEPRINTS
    .map(({ compute, sourceGame: _sourceGame, ...metric }) => {
      const value = compute(games);
      if (value === null) return null;
      return { ...metric, value: round(value) };
    })
    .filter((metric): metric is ScaleMetricResult => metric !== null);
}
```

### 4. `src/features/patient/PatientDetail.tsx`

Los 4 indicadores clínicos usan estos labels y tooltips:
- "Temblor / Ataxia" — tooltip: "Inestabilidad durante el agarre o la rotación activos..."
- "Espasticidad" — tooltip: "Rigidez en flexoextensión..."
- "Fatiga neuromuscular" — tooltip: "Caída >15% de la fuerza máxima..."
- "Desinhibición motora" — tooltip: "Movimientos involuntarios o excesivos..."

Los 3 domain cards:
- "Precisión de pinza" — game: "Organizar pastillas · M1"
- "Extensión del índice" — game: "Apagar lámpara · index_extension_acc"
- "Rango de rotación" — game: "Girar jarra · M4"

### 5. `src/features/patient/TimeSeriesPanel.tsx`

Metrics by domain (keys used for chart data):
- proximal: accuracyRatio, maxPinchOpen, maxPullDistance, pullTremor(threshold:3)
- distal: maxExtension, maxFlexion, activationCount, fatigueIndex(threshold:-15), smoothnessJerk(threshold:3)
- pronosup: maxSupination, maxPronation, waterAccuracy, poisonError, smoothnessJerk(threshold:3), averagePouringTime

### 6. `src/features/patient/SessionDrilldown.tsx`

Per-game summaries show:
- Slingshot: Precisión de pinza, Apertura pulgar-índice, reach_precision, tremor_index, Lanzamientos
- Flappy: Flexión máxima, index_extension_acc, Apertura de mano M2, Fatiga, Suavidad M11 (SPARC)
- Water: Supinación, Pronación, Rango de rotación M4, pronosup_speed, grip_cylindrical

---

## Para revertir

1. Copiar el contenido de cada sección de este archivo al archivo correspondiente.
2. Ejecutar `npx tsc --noEmit` en povmedico para verificar que compila.
3. Los cambios en `demo/src/clinical/sessionMetrics.js` (motor de métricas) son independientes y no necesitan revertirse para restaurar solo el dashboard.
