# FixedGap - Métricas Clínicas: Tabla de Referencia Completa

* **Módulo:** Módulo 1: Cinemática de Mano
* **Tecnología:** MediaPipe Hands (21 keypoints 3D, 30fps, sin hardware adicional)

---

## 1. Tabla de Métricas Clínicas

| Métrica | Constructo clínico (proxy) | Instrumento validado | Referencia | Evidencia |
| :--- | :--- | :--- | :--- | :--- |
| **Suavidad (SPARC / Jerk)** | Calidad del control motor. Deterioro = movimiento fragmentado. | Spectral Arc Length (SPARC); complementa Log Dimensionless Jerk | Balasubramanian et al. 2012 [1]<br>Saes et al. 2021 [2] ($n=40$, 26 sem, FMA-UE) | **ROBUSTA** |
| **Velocidad (peak / mean velocity)** | Bradicinesia. Indicador más sensible de mejora motora temprana post-ictus. | Cinemática estándar de *reaching* | Wagh et al. 2025 [3] ($n=7$, MediaPipe Pose) | **SÓLIDA** |
| **ROM muñeca y dedos** | ROM activo predice función UE a 3 meses. Proxy de integridad corticoespinal. | Goniómetro (proxy digital por ángulo entre keypoints) | Beebe & Lang 2009 [4] ($n=33$, 71% de varianza a 3 meses) | **SÓLIDA** |
| **Individuación digital** | Movimiento independiente de cada dedo. Marcador directo de integridad corticoespinal. | Índice de individuación (correlación inter-keypoint MediaPipe) | Schieber & Santello 2004 [5]<br>Lang et al. 2013 [6] | **SÓLIDA** |
| **Precisión / Accuracy** | Error motor espacial; proxy de control visuo-motor fino. *[Operacionalizar: desviación de trayectoria (cm) o % targets en tolerancia]* | ARAT subtask; Wolf Motor Function Test (WMFT) | Winstein et al. 2016 [7] (AHA/ASA Guidelines)<br>Lang et al. 2013 [6] | **SÓLIDA** |
| **Tiempo de reacción** | Latencia neuromuscular; componente cognitivo-motor. | Protocolos estándar de tiempo de reacción | Laver et al. 2017 [9]<br>Wagh et al. 2025 [3] | **SÓLIDA** |
| **Temblor (frecuencia y amplitud)** | Temblor post-ictus cerebeloso (3-5 Hz).<br><br>*LÍMITE: Nyquist a 30fps $\rightarrow$ techo ~15 Hz.* | Tremor Rating Scale (proxy) | Beck et al. 2018 [8]<br>Heldman et al. 2014 [13] | **EMERGENTE** |
| **Variabilidad inter-repetición** | Consistencia motora. Alta variabilidad = menor control. *[CV de SPARC o velocity]* | Análisis de variabilidad motora (CV) | Slifkin & Newell 1999 [12] (J Exp Psychol no Psych Bull) | **SÓLIDA** |
| **Fatiga intra-sesión** | Fatiga neuromuscular central. Métrica exploratoria. *[Degradación SPARC a lo largo de la sesión]* | Sin instrumento validado vía webcam (constructo derivado) | Citación con matiz sin referencia directa en ictus+webcam | **EXPLORATORIA** |
| **Extensión activa de dedos** | **[AÑADIR]** Predictor independiente de recuperación funcional. Presencia en <72h predice recuperación a 6 meses. | FMA-UE items extensión digital; ARAT | Nijland et al. 2010 [10] (EPOS cohort, $n=188$) | **ALTA RELEVANCIA** |
| **Pinch distance** | **[AÑADIR]** Función de pinza fina. Proxy directo de items FMA-UE 7-11. *[Keypoints 4-8: pulgar-índice]* | FMA-UE ítems 7-11 (pinch subtasks) | Lang et al. 2013 [6] | **SÓLIDA** |
| **Tiempo de ejecución por movimiento** | Bradicinesia; velocidad de procesamiento motor. | WMFT (componente temporal) | Winstein et al. 2016 [7], Appendix 2 | **SÓLIDA** |
| **Asimetría bilateral** | Control interno individualizado. Elimina variabilidad interpersonal y aprendizaje. *[Mano afectada vs. sana]* | Protocolo bilateral estándar | Lang et al. 2013 [6]<br>Protocolos robot-asistido (MIT-Manus) | **SÓLIDA** |

---

## 2. Elementos Eliminados / Limitaciones

> ❌ **ELIMINAR - Índice de compensación proximal:** No medible con MediaPipe Hands. Requeriría MediaPipe Pose Landmarker (33 keypoints corporales) o IMU. Declarar explícitamente como limitación estructural de la versión actual.