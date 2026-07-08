import { create } from 'zustand';
import type { ExerciseCatalogItem } from '../data/reportTypes';

interface ExerciseStore {
  catalog: ExerciseCatalogItem[];
  addItem: (item: ExerciseCatalogItem) => void;
  updateItem: (id: string, item: Partial<ExerciseCatalogItem>) => void;
  removeItem: (id: string) => void;
}

const initialCatalog: ExerciseCatalogItem[] = [
  { id: 'cat-01', name: 'Pinza con resistencia', domain: 'proximal-grip', description: 'Ejercitar la pinza pulgar-índice con banda elástica progresiva.', suggestedIntensity: 'medium', reps: '3x10' },
  { id: 'cat-02', name: 'Apertura progresiva', domain: 'proximal-grip', description: 'Extensión digital activa contra resistencia leve.', suggestedIntensity: 'low', reps: '3x12' },
  { id: 'cat-03', name: 'Prensión con masa', domain: 'proximal-grip', description: 'Amasar plastilina terapéutica trabajando fuerza de agarre.', suggestedIntensity: 'medium', reps: '5 min' },
  { id: 'cat-04', name: 'Flexión con banda', domain: 'distal-flex-ext', description: 'Cierre de puño contra banda elástica calibrada.', suggestedIntensity: 'medium', reps: '3x15' },
  { id: 'cat-05', name: 'Extensión activa', domain: 'distal-flex-ext', description: 'Apertura completa de mano desde puño cerrado sin resistencia.', suggestedIntensity: 'low', reps: '3x20' },
  { id: 'cat-06', name: 'Puño-abierto repetido', domain: 'distal-flex-ext', description: 'Alternar cierre-apertura rápida para activación voluntaria.', suggestedIntensity: 'high', reps: '4x15' },
  { id: 'cat-07', name: 'Coordinación bimanual', domain: 'distal-flex-ext', description: 'Ejercicios de coordinación usando ambas manos simultáneamente.', suggestedIntensity: 'medium', reps: '3x10' },
  { id: 'cat-08', name: 'Giros con pesa', domain: 'prono-supination', description: 'Rotación de antebrazo con mancuerna ligera (0.5-1kg).', suggestedIntensity: 'medium', reps: '3x12' },
  { id: 'cat-09', name: 'Prono-supinación libre', domain: 'prono-supination', description: 'Rotación completa sin carga, enfocando rango máximo.', suggestedIntensity: 'low', reps: '3x20' },
  { id: 'cat-10', name: 'Vertido controlado', domain: 'prono-supination', description: 'Simular vertido de jarra con control de velocidad y precisión.', suggestedIntensity: 'medium', reps: '10 vertidos' },
  { id: 'cat-11', name: 'Rotación con pelota', domain: 'prono-supination', description: 'Girar pelota sobre mesa usando solo rotación del antebrazo.', suggestedIntensity: 'low', reps: '3x15' },
  { id: 'cat-12', name: 'Agarre funcional objetos', domain: 'proximal-grip', description: 'Tomar y soltar objetos cotidianos de distintos tamaños.', suggestedIntensity: 'low', reps: '10 objetos' },
];

export const useExerciseStore = create<ExerciseStore>((set) => ({
  catalog: initialCatalog,
  addItem: (item) => set(s => ({ catalog: [...s.catalog, item] })),
  updateItem: (id, updates) => set(s => ({
    catalog: s.catalog.map(i => i.id === id ? { ...i, ...updates } : i),
  })),
  removeItem: (id) => set(s => ({ catalog: s.catalog.filter(i => i.id !== id) })),
}));
