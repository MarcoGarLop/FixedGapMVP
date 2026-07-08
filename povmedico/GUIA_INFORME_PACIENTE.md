# Guia para explicar la pagina de Informe de paciente

## Que es esta pagina

La pagina de **Informe de evolucion** es una vista exportable del estado de un paciente.

La idea clave:

> "Resume la evolucion del paciente en un formato que puede imprimirse o compartirse."

## Cabecera del informe

Incluye:

- titulo del informe;
- pseudonimo del paciente;
- fecha de generacion;
- indicacion de datos pseudonimizados;
- marca FixedGap Platform.

Como explicarlo:

> "El informe esta pensado para contexto clinico y mantiene pseudonimizacion."

## Resumen del paciente

Incluye:

- edad;
- movilidad;
- lado afecto;
- tipo de ictus;
- fecha del ictus;
- numero de sesiones;
- periodo cubierto.

Como explicarlo:

> "Antes de ver datos, el lector entiende a que paciente y periodo corresponde el informe."

## Scores actuales vs baseline

Compara baseline frente al estado actual en:

- Global Motor;
- agarre proximal;
- flex-extension distal;
- prono-supinacion.

Incluye delta.

Como explicarlo:

> "El informe muestra si el paciente mejora o empeora respecto al inicio."

## Alertas clinicas actuales

Resume si estan activas:

- temblor / ataxia;
- espasticidad;
- fatiga;
- control de impulsos.

Como explicarlo:

> "No solo se ve el score, tambien senales clinicas que pueden condicionar la rehabilitacion."

## Ejercicios prescritos

Muestra:

- nombre del ejercicio;
- dominio;
- intensidad;
- adherencia.

Como explicarlo:

> "Conecta evolucion motora con la pauta que esta siguiendo el paciente."

## Eventos relevantes

Lista cambios o hitos:

- medicacion;
- cambio de pauta;
- botox;
- nota clinica;
- otros eventos.

Como explicarlo:

> "Permite interpretar los cambios de score en contexto."

## Exportar PDF

La vista permite imprimir/exportar.

Como explicarlo:

> "El objetivo es que los datos no se queden solo en dashboard, sino que puedan entrar en flujos clinicos habituales."

## Aviso final

El informe deja claro:

> "No constituye diagnostico medico."

Esto es importante para evitar sobreprometer.

## Mensaje fuerte para demo

> "El dashboard ayuda a decidir; el informe ayuda a documentar y comunicar."
