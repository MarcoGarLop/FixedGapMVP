# Guia para explicar la pagina de Triaje

## Que es esta pagina

La pagina de **Triaje remoto post-ictus** es la vista principal del medico. Sirve para ver, de un vistazo, que pacientes monitorizados necesitan mas atencion entre visitas.

La idea clave:

> "Esta pantalla convierte las sesiones domiciliarias y la adherencia en una lista priorizada de pacientes."

## Que debe entender el inversor

No es una lista pasiva de pacientes. Es una herramienta para priorizar:

- quien tiene alertas activas;
- quien esta empeorando;
- quien tiene baja adherencia;
- quien necesita revision antes de la siguiente consulta presencial.

## Parte superior

Arriba aparece:

- numero de pacientes monitorizados;
- pacientes con alertas activas;
- pacientes con deterioro en los ultimos 7 dias;
- adherencia media;
- fecha de ultima sincronizacion.

Como explicarlo:

> "El medico no entra paciente por paciente a ciegas. Primero ve la situacion global y donde hay riesgo operativo."

## Filtros

Los filtros permiten acotar la cohorte:

- buscar paciente por pseudonimo;
- filtrar por movilidad;
- filtrar por lado afectado;
- filtrar por tipo de ictus;
- ver solo pacientes con alertas.

Como explicarlo:

> "El medico puede pasar de una cohorte completa a un subconjunto clinicamente relevante en segundos."

## Seccion Requieren atencion

Esta seccion muestra los pacientes con mayor prioridad.

La prioridad se calcula usando:

- alertas clinicas activas;
- deterioro reciente del score motor;
- adherencia a la pauta;
- tendencia de las ultimas sesiones.

Como explicarlo:

> "Estos son los pacientes que FixedGap sugiere mirar primero, no porque diagnostique, sino porque detecta señales de seguimiento que merecen revision."

## Tarjetas de paciente

Cada tarjeta muestra:

- pseudonimo;
- movilidad;
- lado afectado;
- score motor global;
- delta reciente;
- alertas activas;
- adherencia;
- metricas del catalogo clinico.

Al desplegar la tarjeta aparecen metricas mas concretas:

- agarre;
- coordinacion;
- rotacion;
- evidencia de alertas;
- metricas CORE como M1, M11, M4 o `pronosup_speed`.

Como explicarlo:

> "La tarjeta no solo dice que hay alerta. Tambien muestra que metrica concreta la sostiene."

## Vista tabla

La vista tabla es una version mas densa para medicos que prefieren revisar muchos pacientes rapidamente.

Incluye:

- paciente;
- score;
- delta 7 dias;
- tendencia;
- alertas;
- adherencia;
- prioridad.

Como explicarlo:

> "La tabla es el modo cockpit: menos visual, mas rapido para revisar volumen."

## Mensaje fuerte para demo

> "La propuesta de valor aqui es reducir la ceguera entre visitas. El medico sabe quien esta estable, quien cumple, quien empeora y a quien conviene revisar antes."

## Preguntas posibles

### "Esto diagnostica?"

No. Es apoyo a seguimiento y priorizacion. Las decisiones siguen siendo clinicas.

### "Por que pseudonimos?"

Para mostrar que el sistema esta pensado para datos sensibles y minimizacion de identificacion.

### "Que es el score?"

Es una agregacion de habilidades motoras medidas por juegos: agarre, coordinacion y rotacion. No sustituye escalas clinicas; ayuda a monitorizar evolucion.
