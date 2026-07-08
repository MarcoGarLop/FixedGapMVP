# Demo Gregorio — FixedGap

Demo de telemonitorización de rehabilitación motora post-ictus para la
presentación en el Hospital Gregorio Marañón.

El repositorio contiene **dos proyectos** que funcionan juntos:

```
demo/        # Juego 3D (Vanilla JS + Three.js + MediaPipe). El producto jugable.
povmedico/   # Panel médico (React + TS + Vite). Código fuente del dashboard clínico.
```

## Cómo funciona el flujo completo

1. El paciente juega la secuencia de 3 ejercicios en `demo/`:
   **Pastillero → Jarra → Interruptores**.
   Se avanza con el botón "Siguiente juego" (o al completar cada ejercicio).
2. Durante el juego se capturan biomarcadores en vivo desde los landmarks de
   MediaPipe (pinza, extensión, apertura, rotación de muñeca, temblor,
   suavidad, fatiga...).
3. Al terminar, la sesión se guarda en `localStorage` como histórico del
   paciente real **ALPHA-001**.
4. Se redirige al **Panel Médico** (`/dashboard`), donde ALPHA-001 aparece el
   primero, con sus biomarcadores reales y su evolución sesión a sesión.
   El resto de pacientes son datos sintéticos de ejemplo.

> El panel médico compilado ya está incluido en `demo/public/dashboard/`, así
> que para la demo basta con arrancar `demo`.

## Arrancar la demo (lo habitual)

```bash
cd demo
npm install
npm run dev
```

Abre `http://localhost:5173`. El panel médico se sirve bajo `/dashboard` desde
el mismo servidor (mismo origen → comparte el `localStorage` con el juego).

Requiere webcam y un contexto seguro (localhost o HTTPS). El puerto está fijado
a 5173 para que el histórico de ALPHA-001 persista entre sesiones.

## Modificar el panel médico

El dashboard servido en `demo/public/dashboard/` es el **build** de `povmedico`.
Para cambiarlo:

```bash
cd povmedico
npm install
npm run dev        # desarrollo en http://localhost:4000 (datos sintéticos)
npm run build      # genera dist/ con base /dashboard/
```

Después copia el contenido de `povmedico/dist/` a `demo/public/dashboard/`
(reemplazando el anterior) para que la demo lo use.

> Nota: en `npm run dev` de `povmedico` (puerto 4000) NO se ve el histórico de
> ALPHA-001, porque el `localStorage` lo escribe el juego en el origen del
> `demo` (5173). ALPHA-001 solo aparece con datos cuando el dashboard se sirve
> desde el mismo origen que el juego.

## Notas

- No es una herramienta diagnóstica. Produce visualización y análisis de apoyo
  para revisión clínica.
- Los pacientes distintos de ALPHA-001 son sintéticos (generador con semilla).
