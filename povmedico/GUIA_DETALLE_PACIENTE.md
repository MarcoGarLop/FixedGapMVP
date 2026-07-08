# Guia para explicar la pagina de Detalle de paciente

## Que es esta pagina

La pagina de **Detalle de paciente** permite profundizar en un paciente concreto despues de seleccionarlo desde triaje.

La idea clave:

> "El triaje dice a quien mirar; el detalle explica por que."

## Cabecera del paciente

Arriba se muestra:

- pseudonimo;
- edad y sexo;
- movilidad;
- lado afectado;
- tipo de ictus;
- dias desde el ictus;
- score motor global;
- cambio frente a baseline;
- cambio frente a la sesion anterior.

Como explicarlo:

> "Esta cabecera da contexto clinico rapido antes de entrar en graficas."

## Indicadores clinicos

Aparecen cuatro indicadores:

- temblor / ataxia;
- espasticidad;
- fatiga neuromuscular;
- desinhibicion motora.

Cada indicador puede estar normal o activo.

Como explicarlo:

> "Estas alertas traducen datos de juego en señales que el medico entiende: fatiga, temblor, espasticidad o control motor alterado."

## Scores principales

Hay tres tarjetas de dominio:

- **Precision de pinza**: relacionada con `M1` y el juego de organizar pastillas.
- **Extension del indice**: relacionada con `index_extension_acc` y el juego de apagar lampara.
- **Rango de rotacion**: relacionada con `M4` y el juego de rotar la jarra.

Como explicarlo:

> "Son las tres familias motoras principales que FixedGap mide de forma repetida en casa."

## Metricas de escalas configuradas

Este panel muestra las metricas del catalogo clinico:

- ID tecnico: por ejemplo `M1`, `M11`, `M4`, `pronosup_speed`.
- nombre de la metrica;
- juego del que sale;
- valor;
- definicion;
- trazabilidad con FMA-UE o DASH.

Como explicarlo:

> "Aqui conectamos lo que mide el juego con escalas clinicas conocidas. No son etiquetas inventadas: cada metrica tiene nombre, definicion y trazabilidad."

Ejemplos:

- `M1 Precision de pinza`: vinculado a pinza pulgar-indice y manipulacion fina.
- `M11 Suavidad (SPARC)`: mide calidad de movimiento.
- `M4 Rango de rotacion`: mide rotacion en la tarea de jarra.
- `pronosup_speed`: velocidad de pronosupinacion.

## Panel temporal

El panel temporal permite ver la evolucion de una metrica a lo largo de las sesiones.

Se puede cambiar entre dominios:

- distal mano;
- extension/coordinacion;
- pronosupinacion.

Y dentro de cada dominio se puede elegir una metrica concreta.

Como explicarlo:

> "Esto permite ver si una habilidad mejora, cae o se estanca a lo largo del tiempo."

## Tabla de sesiones

Muestra todas las sesiones del paciente:

- fecha;
- score global;
- scores por dominio;
- flags clinicos.

Al hacer click en una sesion se abre el desglose.

Como explicarlo:

> "El medico puede bajar del resumen al dato de sesion concreta cuando algo llama la atencion."

## Detalle de sesion

El detalle de sesion muestra:

- metricas por juego;
- resultados normalizados del catalogo FixedGap;
- telemetria frame-by-frame si esta disponible.

Como explicarlo:

> "Aqui ya no vemos solo el resultado final, sino las senales que lo construyen."

## Posicion en cohorte emparejada

Compara al paciente con otros similares:

- movilidad similar;
- edad parecida;
- mismo tipo de ictus.

Muestra un percentil.

Como explicarlo:

> "El medico ve si la evolucion de este paciente esta por encima o por debajo de pacientes comparables."

## Botones inferiores

Si el usuario es medico aparecen acciones:

- ver predicciones;
- ver correlacion rehabilitacion;
- generar informe.

Como explicarlo:

> "Desde el detalle se puede saltar a las capas de decision: futuro probable, respuesta a rehabilitacion e informe clinico."

## Mensaje fuerte para demo

> "Esta pagina convierte el juego en evidencia clinica navegable: resumen, alertas, metricas trazables, evolucion temporal y comparacion con cohorte."
