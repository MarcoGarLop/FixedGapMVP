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

  const tremorFlag = (sm ? sm.pullTremor > 3 : false) || (wm ? wm.smoothnessJerk > 3 : false);
  const spasticityFlag = fm ? fm.smoothnessJerk > 3 : false;
  const fatigueFlag = fm ? fm.fatigueIndex < -15 : false;
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
