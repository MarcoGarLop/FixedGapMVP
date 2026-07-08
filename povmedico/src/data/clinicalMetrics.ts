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
