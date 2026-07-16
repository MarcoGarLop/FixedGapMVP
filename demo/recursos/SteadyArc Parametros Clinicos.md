# SteadyArc - Parametrización Clínica

* **Dispositivo:** Único dispositivo (portátil o móvil con cámara)
* **Fecha de referencia:** Mayo 2026

---

## 1. Tabla de Parámetros Clínicos

| Parámetro clínico | Ya se captura | Requiere impl. | Implementaciones específicas | No implementable |
| :--- | :--- | :--- | :--- | :--- |
| **A. Motricidad de la mano** | | | | |
| Motricidad 3 primeros dedos | Parcial (M9 `finger_individuation`) | **Sí** | **M15** `tripod_quality`: ángulo landmarks 4-8-12 + distancia entre tips de pulgar, índice y corazón. | |
| Posición y separación del pulgar | | **Sí** | `thumb_opposition_index`: ángulo CMC (L1-L4) respecto al plano palmar; distancia normalizada L4-L20. | |
| Apertura y cierre de mano | M2 `hand_opening_speed` + M10 `grip_aperture_variability` | | | |
| Flexión dorsal de muñeca | Parcial (M4 `range_of_motion` general) | **Sí** *(Condicionado)* | `wrist_extension_angle`: requiere MediaPipe Pose + codo visible en cámara. Exige instrucción de encuadre en *onboarding*. | Imposible si solo la mano está en cuadro. |
| Pronosupinación | | **Proxy cualitativo** | Ratio de visibilidad landmarks palmares vs. dorsales al rotar. Baja precisión - presentar al clínico como estimación cualitativa. | Medición angular directa: imposible en 2D sin IMU ni sensor de profundidad. |
| **B. Tareas funcionales (AVDs)** | | | | |
| Agarre de bolígrafo (pinza trípode) | Parcial (M1 `pinch_precision` - pinza lateral) | **Sí** | **M15** `tripod_quality` + ángulo de orientación del eje dedo medio-muñeca. | |
| Escritura (trazado continuo) | | **Sí** | `path_deviation_index`: desviación acumulada de trayectoria respecto a camino objetivo. Captura temblor, dismetría y control motor fino. | |
| Teclear | | **Sí** | Tarea de pulsaciones secuenciales: tiempo inter-dígito, *individuation* y precisión por dedo. | |
| Cortar comida (bimanual) | | **Sí** *(Condicionado)* | Asimetría de velocidad mano afectada / mano sana si ambas manos están en cuadro. | Imposible si la cámara no encuadra ambas manos simultáneamente. |
| Coger objeto pequeño y colocarlo | Parcial (M1 `pinch` + M3 `palm_speed`) | **Sí** | `reach_precision_score`: distancia *endpoint* al *target* + tiempo de tránsito. Tarea de alcance lateral (no frontal). | Alcance en profundidad hacia la cámara: no medible en 2D. |
| Apagar interruptor | | **Sí** | `index_extension_accuracy`: extensión del índice hacia punto objetivo en pantalla; ángulo en articulación MCF. | |
| **C. Calidad del movimiento** | | | | |
| Suavidad / coordinación | M11 `movement_smoothness` (SPARC) | | | |
| Velocidad de movimiento | M3 `palm_speed_mean` | | | |
| Variabilidad / inconsistencia | M3 `BVE` (bivariate variable error) | | | |
| Temblor en reposo y en acción | Parcial (varianza de M3) | **Sí** | `tremor_index`: varianza de alta frecuencia de *landmarks* en ventana de 2s. Límite real: 30fps detecta <15Hz (Parkinson 4-6Hz, cerebeloso 3-5Hz). | Temblor >15Hz indetectable a 30fps. |
| Dismetría | | **Sí** | `endpoint_overshoot`: distancia del punto de parada respecto al *target* en tarea de alcance. Signo directo de disfunción cerebelosa. | |
| **D. Escalas de validación** | | | | |
| FMA-UE distales (muñeca/mano, ítems 23-33) | Parcial (M1, M2, M4, M9, M10, M11) | **Sí** | Ampliar cobertura con tarea de flexión/extensión activa de muñeca. Requiere MediaPipe Pose + brazo completo en cuadro. | |
| FMA-UE proximales (hombro/codo, ítems 1-22) | No incluido | **Solo parcial** | Requiere MediaPipe Pose + brazo completo visible. Reencuadrar como "índice distal funcional", no proxy FMA-UE completo. | Imposible sin encuadre de brazo completo o IMU de muñeca. |
| DASH (actividades diarias, PRO) | | **Sí** | Formulario DASH de 30 ítems integrado en app, completado 1 vez por semana. Datos PRO para correlacionar con métricas objetivas en piloto. | |
| **E. Plataforma y experiencia** | | | | |
| Dificultad adaptativa | Parcial (IA-1 baseline adaptativo) | **Sí** | 3 niveles por tarea: target más pequeño, tiempo reducido, precisión exigida mayor. Transición automática según *score* de sesión. | |
| Feedback de evolución al paciente | Parcial (informe al clínico vía IA-3) | **Sí** | Dashboard simplificado para el paciente: tendencia personal en lenguaje no clínico. Separado del dashboard del profesional. | |
| UX adaptada a personas mayores | | **Sí** | Targets grandes, instrucciones de voz, contraste alto, sesión $\le 60\text{ s}$, sin presión de tiempo visible. Validar en piloto con usuarios reales. | |
| Modelo predictivo longitudinal | Parcial (IA-2 state classifier - 4 estados) | **Sí** *(Post-piloto)* | Requiere datos del piloto (220 pacientes, 23 meses) para entrenar correlación con DASH y FMA-UE. | |
| Seguimiento longitudinal | Arquitectura IA-1 + IA-2 + Resend completa | | | |

---

## 2. Resumen Ejecutivo de Parámetros

| Categoría | Nº Parámetros |
| :--- | :---: |
| **Capturado (total o parcial)** — *M1–M14 activos* | **10** |
| **Implementable con desarrollo adicional** | **18** |
| **No implementable con cámara única 2D** | **3** |

### Notas sobre los 3 parámetros no implementables:
1.  **Pronosupinación angular directa:** La rotación axial del antebrazo es invisible en 2D sin sensor de profundidad ni IMU. Se puede ofrecer un proxy cualitativo (ratio de visibilidad de *landmarks* palmares vs. dorsales), pero con precisión insuficiente para uso clínico primario.
2.  **Alcance en profundidad (hacia la cámara):** Sin profundidad 3D, el movimiento de acercamiento de la mano a la pantalla no es cuantificable. Las tareas de alcance deben diseñarse en el plano lateral.
3.  **FMA-UE proximal (hombro/codo, ítems 1-22):** MediaPipe Hands solo captura la mano y la muñeca. La función proximal requiere MediaPipe Pose con el brazo completo visible o la adición de un IMU de muñeca (~8 €).

---

## 3. Glosario de Métricas Actuales (M1-M14)

### [CORE] Prioridad MVP - Evidencia Alta

#### **M1: `pinch_precision`**
* **Dominio:** Mano fina
* **Descripción clínica:** Distancia euclidiana entre la punta del pulgar (landmark 4) y la punta del índice (landmark 8), normalizada por la longitud de la palma. Mide la precisión de la pinza bidigital.
* **Software / Dispositivo:** MediaPipe Hands (21 keypoints), webcam estándar, 30fps.
* **Referencia clínica:** 9-Hole Peg Test - FMA-UE (ítems 23-33).

#### **M2: `hand_opening_speed`**
* **Dominio:** Mano fina
* **Descripción clínica:** Velocidad media de separación de los landmarks de los 5 dedos respecto al centroide palmar durante la fase de apertura. Proxy de la extensión activa de dedos.
* **Software / Dispositivo:** MediaPipe Hands (21 keypoints), webcam estándar, 30fps.
* **Referencia clínica:** FMA-UE ítems de extensión (Nijland et al. 2010).

#### **M3: `palm_speed_mean` + `BVE`**
* **Dominio:** Mano fina
* **Descripción clínica:** Velocidad media *framewise* del centroide palmar (media de L5, L9, L13, L0). **BVE (Bivariate Variable Error):** varianza 2D del centroide en tareas de alcance repetidas. Índice de consistencia motora.
* **Software / Dispositivo:** MediaPipe Hands (21 keypoints), webcam estándar, 30fps.
* **Referencia clínica:** J. NeuroEng Rehabil 2025 Wagh et al. (UBC).

#### **M4: `range_of_motion`**
* **Dominio:** Mano fina
* **Descripción clínica:** Ángulo máximo de apertura de la mano: ángulo entre el eje pulgar-muñeca y el eje meñique-muñeca. Normalizado por sesión (calibración automática del máximo del paciente).
* **Software / Dispositivo:** MediaPipe Hands (21 keypoints), webcam estándar, 30fps.
* **Referencia clínica:** npj Digital Medicine 2026, $\rho = 0.92$ FMA-UE.

---

### [SECUNDARIO] Evidencia Media-Alta (v2)

#### **M9: `finger_individuation`**
* **Dominio:** Mano fina
* **Descripción clínica:** Grado de independencia de movimiento de cada dedo: correlación entre las velocidades angulares de cada dígito. Valores bajos = co-activación patológica (sincinesias flexoras frecuentes post-ictus).
* **Software / Dispositivo:** MediaPipe Hands (21 keypoints), webcam estándar, 30fps.
* **Referencia clínica:** FMA-UE ítems de individualización (Schieber & Santello 2004).

#### **M10: `grip_aperture_variability`**
* **Dominio:** Mano fina
* **Descripción clínica:** Varianza de la apertura de agarre (distancia L4-L8) entre intentos sucesivos de la misma tarea. Proxy indirecto de espasticidad: alta variabilidad sugiere control motor inconsistente.
* **Software / Dispositivo:** MediaPipe Hands (21 keypoints), webcam estándar, 30fps.
* **Referencia clínica:** Modified Ashworth Scale proxy FMA-UE.

#### **M11: `movement_smoothness` (SPARC)**
* **Dominio:** Mano fina
* **Descripción clínica:** Índice SPARC (Spectral Arc Length): longitud del arco en el espectro de velocidad normalizado. Valores más negativos = movimiento más fragmentado. Es el índice de suavidad cinemática con mayor evidencia publicada en ictus.
* **Software / Dispositivo:** MediaPipe Hands (21 keypoints), webcam estándar, 30fps.
* **Referencia clínica:** Balasubramanian 2012, Melendez-Calderon 2021, Gor-García-Fogeda 2021 ($n=40$).

---

## 4. Notas de Arquitectura y Riesgos

### ⚠️ Nota sobre EyeDid SDK (M7, M8)
* **Situación:** EyeDid es un SDK propietario con autenticación online obligatoria en cada inicialización, pricing por cotización y plugin Flutter sin licencia clarificada.
* **Riesgo:** Alta dependencia de proveedor antes de escalar.
* **Alternativa identificada:** MediaPipe Face Landmarker (licencia Apache 2.0) con capa de calibración y *gaze mapping* propia.
* **Ruta recomendada:** Utilizar licencia *Ambassador/researcher* de EyeDid durante el piloto; migración hacia un *pipeline* MediaPipe-nativo para la versión v2.

### 🧪 Nota sobre M14 (`facial_motor_coupling`)
* **Situación:** Biomarcador sin precedente publicado.
* **Indicación:** Presentar siempre como hipótesis de investigación activa, no como métrica de grado clínico validado.