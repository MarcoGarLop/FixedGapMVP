# Guia para explicar la pestana de Ejercicios

## Idea principal

La pestana de **Ejercicios y respuesta motora** sirve para explicar una relacion muy concreta:

1. El rehabilitador prescribe ejercicios clinicos al paciente.
2. El paciente realiza esos ejercicios en casa.
3. El paciente tambien juega a los juegos de telemonitorizacion de FixedGap.
4. El medico observa si la pauta rehabilitadora se refleja en mejores habilidades motoras dentro del juego.

La frase clave para explicarlo es:

> "Los ejercicios son la intervencion terapeutica; el juego no es el ejercicio, es la herramienta que mide si esa intervencion se esta reflejando en la funcion motora del paciente."

## Que problema resuelve

En rehabilitacion post-ictus, el medico o rehabilitador suele tener poca visibilidad entre consulta y consulta. Puede saber que ejercicios ha pautado, pero no siempre sabe:

- si el paciente los esta haciendo;
- si los hace con suficiente frecuencia;
- si esa pauta se traduce en mejora funcional;
- que dominio motor esta cambiando: agarre, coordinacion o rotacion;
- si hay estancamiento pese a buena adherencia.

Esta pestana intenta conectar esas dos capas:

- **Pauta de rehabilitacion:** ejercicios prescritos por el profesional.
- **Telemonitorizacion:** resultados medidos por los juegos de FixedGap.

## Como contar la pantalla en 30 segundos

"Aqui el medico no solo ve una lista de ejercicios. Ve que ejercicio de rehabilitacion tiene pautado cada paciente, cuanto lo esta cumpliendo y si eso se refleja en las metricas objetivas del juego. Por ejemplo, si se pautan ejercicios de pinza y prension, deberiamos ver mejora en el juego de agarre y precision. Si se pautan ejercicios de rotacion, deberiamos ver mejora en el juego de vertido y rotacion. No decimos que sea causalidad automatica, pero damos al medico una forma de ver si la pauta y la evolucion motora van alineadas."

## Beneficio para el hospital

La banda superior resume el valor operativo:

> "Permite priorizar revisiones entre visitas y detectar falta de respuesta antes de la siguiente consulta presencial."

Esto es importante porque traduce la tecnologia a impacto hospitalario. No solo ensena datos; ayuda a ordenar la agenda clinica.

### Revisiones priorizables

Cuenta pacientes que pueden necesitar revision antes de la siguiente visita programada.

En la demo se interpreta como:

- baja adherencia a la pauta;
- caida del score motor;
- posible necesidad de revisar intensidad, pauta o seguimiento.

Frase para explicarlo:

> "Aqui el medico ve a que pacientes conviene mirar antes, sin esperar a que lleguen a consulta."

### Falta de respuesta

Cuenta pacientes con buena adherencia pero sin mejora observable en el juego.

Esta metrica es muy potente porque separa dos problemas distintos:

- el paciente no mejora porque no hace la pauta;
- el paciente hace la pauta, pero la habilidad medida por el juego no esta mejorando.

Frase para explicarlo:

> "Si un paciente cumple la pauta pero no mejora en las metricas del juego, el equipo puede revisar la estrategia antes de perder varias semanas."

## Pestana Correlacion

Esta es la vista mas importante para la demo. Por eso se abre por defecto.

### Flujo superior

El bloque superior explica el proceso:

1. **Pauta de rehabilitacion:** el profesional prescribe ejercicios como pinza, apertura, flexo-extension o rotacion.
2. **Adherencia del paciente:** se registra si el paciente realiza esa pauta.
3. **Juego de FixedGap:** el paciente juega en casa y el sistema mide movimiento.
4. **Evolucion observable:** el medico ve si hay cambios en las habilidades motoras.

Esto ayuda a evitar la confusion de pensar que el juego y el ejercicio son lo mismo.

### Selectores

Hay dos selectores:

- **Paciente:** permite elegir de quien se quiere revisar la evolucion.
- **Dominio motor:** permite elegir que habilidad mirar.

Los dominios son:

- **Agarre:** relacionado con pinza, prension, apertura y estabilidad.
- **Coordinacion:** relacionado con flexo-extension, activaciones repetidas, fatiga y suavidad.
- **Rotacion:** relacionado con prono-supinacion, control de vertido y precision.

## Metricas superiores

Dentro de correlacion aparecen tres bloques de resumen.

### Ejercicios prescritos

Muestra cuantos ejercicios de rehabilitacion tiene el paciente para el dominio seleccionado.

Ejemplo:

> Si selecciono "Rotacion", aqui veo los ejercicios de rotacion que el rehabilitador ha pautado a ese paciente.

### Adherencia a la pauta

Muestra que porcentaje de esos ejercicios ha realizado el paciente.

Interpretacion:

- Alta adherencia y mejora en juego: la pauta parece alineada con la evolucion.
- Alta adherencia y sin mejora: puede haber meseta, pauta insuficiente o necesidad de revisar intensidad.
- Baja adherencia y sin mejora: el problema puede estar en cumplimiento, no necesariamente en la pauta.
- Baja adherencia y mejora: puede haber otros factores, efecto de terapia presencial o variabilidad.

### Cambio en el juego

Muestra cuanto ha cambiado el score del juego de telemonitorizacion en ese dominio.

Importante:

> Este numero viene del juego, no del ejercicio de rehabilitacion.

Sirve para decir:

> "Despues de la pauta, el juego nos permite ver si la habilidad motora relacionada esta subiendo, bajando o estable."

## Lectura clinica por dominio

Debajo de las metricas hay un texto que traduce el dominio a lenguaje clinico.

### Agarre

Conecta ejercicios de pinza y prension con:

- apertura;
- fuerza;
- estabilidad del agarre;
- precision durante el juego.

Como explicarlo:

> "Si el rehabilitador pauta ejercicios de pinza, esperamos que el juego de agarre muestre mejor apertura, mas estabilidad y mejor precision."

### Coordinacion

Conecta ejercicios de cierre-apertura y flexo-extension con:

- activaciones mas completas;
- menor fatiga;
- movimiento mas suave;
- mejor control repetitivo.

Como explicarlo:

> "Si el paciente trabaja flexo-extension, FixedGap mira si en el juego aparecen movimientos mas completos y menos fatigabilidad."

### Rotacion

Conecta ejercicios de prono-supinacion con:

- rango de rotacion;
- precision de vertido;
- control fino;
- menor error.

Como explicarlo:

> "Si el paciente hace ejercicios de rotacion, lo que buscamos es que el juego de vertido muestre mas rango y menos error."

## Grafica izquierda

La grafica izquierda muestra:

- la evolucion del score del juego en el dominio seleccionado;
- las franjas temporales en las que habia ejercicios prescritos para ese dominio.

Como explicarla:

> "La linea es lo que mide el juego. Las zonas sombreadas indican cuando habia una pauta de rehabilitacion activa. Asi el medico puede ver si, durante esa pauta, la habilidad medida por el juego mejora, empeora o se mantiene."

Que mirar:

- Si la linea sube durante una pauta activa.
- Si la linea cae pese a que habia ejercicios.
- Si hay meseta tras varias sesiones.
- Si el cambio coincide con inicio o ajuste de pauta.

## Grafica derecha

La grafica derecha muestra una relacion de dosis-respuesta:

- eje X: adherencia semanal al ejercicio;
- eje Y: cambio semanal en el score del juego.

Como explicarla:

> "Cada punto resume una semana. Cuanto mas a la derecha, mas ejercicios hizo el paciente. Cuanto mas arriba, mas mejoro el score del juego esa semana."

Lecturas posibles:

- Puntos arriba a la derecha: buena adherencia y mejora.
- Puntos abajo a la derecha: hace los ejercicios, pero no se refleja en mejora.
- Puntos abajo a la izquierda: baja adherencia y poca mejora.
- Puntos dispersos: la relacion no es clara y el medico debe interpretarlo con contexto clinico.

## Aviso importante

La pantalla incluye un aviso:

> "Correlacion exploratoria: ayuda a ver si la pauta de rehabilitacion se acompana de cambios en las metricas del juego. No implica causalidad ni diagnostico automatico."

Esto es importante para explicarlo bien ante inversores o clinicos.

La forma correcta de decirlo:

> "No estamos diciendo que el sistema diagnostique ni que demuestre causalidad. Estamos dando visibilidad objetiva para que el medico entienda si la pauta, la adherencia y la evolucion motora van en la misma direccion."

## Pestana Prescripciones

Esta pestana responde a:

> "Que ejercicios tiene asignados cada paciente?"

Muestra:

- paciente;
- ejercicio prescrito;
- dominio motor;
- frecuencia semanal;
- intensidad;
- fechas de inicio y fin;
- adherencia de los ultimos 14 dias.

Como explicarla:

> "Aqui el medico ve la parte terapeutica: que pauta tiene cada paciente y si la esta cumpliendo."

No es la parte de medicion del juego. Es la capa de intervencion.

## Pestana Catalogo

Esta pestana contiene las pautas rehabilitadoras disponibles.

Sirve para:

- ver que ejercicios puede prescribir el rehabilitador;
- asociar cada ejercicio a un dominio motor;
- definir intensidad sugerida;
- definir repeticiones.

Ejemplos:

- Pinza con resistencia: dominio de agarre.
- Flexion con banda: dominio de coordinacion.
- Giros con pesa: dominio de rotacion.

Como explicarla:

> "Este es el catalogo clinico de ejercicios. Cada ejercicio se mapea a una habilidad motora que luego medimos con el juego."

## Pestana Adherencia

Esta pestana resume cumplimiento.

Muestra:

- porcentaje de pacientes que cumplen la meta;
- cuantos pacientes tienen al menos 70% de adherencia;
- adherencia promedio por dominio;
- pacientes con menor adherencia.

Como explicarla:

> "Esto ayuda a diferenciar si un paciente no mejora porque la pauta no funciona o porque no la esta haciendo."

## Diferencia entre ejercicio y juego

Esta es la distincion mas importante:

### Ejercicio de rehabilitacion

Es una pauta clinica prescrita por el profesional.

Ejemplos:

- pinza con resistencia;
- apertura progresiva;
- flexion con banda;
- giros con pesa;
- vertido controlado.

### Juego de monitorizacion

Es la herramienta de FixedGap que mide funcion motora mientras el paciente juega.

Ejemplos:

- juego de agarre y precision;
- juego de flexo-extension;
- juego de vertido y rotacion.

### Relacion entre ambos

El ejercicio busca entrenar una habilidad. El juego mide si esa habilidad cambia.

Frase para demo:

> "La rehabilitacion ocurre en la pauta. La medicion ocurre en el juego. El valor de FixedGap esta en conectar ambas cosas para que el medico vea evolucion entre visitas."

## Preguntas que pueden hacerte

### "Esto demuestra que el ejercicio funciona?"

Respuesta:

> "No de forma causal automatica. Muestra una correlacion temporal entre pauta, adherencia y evolucion motora. Sirve para apoyar la decision clinica y detectar si la pauta va alineada con la recuperacion."

### "Que pasa si el paciente hace ejercicios pero no mejora?"

Respuesta:

> "Eso tambien es informacion valiosa. Puede indicar meseta, intensidad insuficiente, mala ejecucion, fatiga, espasticidad o necesidad de revisar la pauta."

### "Que pasa si mejora pero no hace los ejercicios?"

Respuesta:

> "Puede deberse a terapia presencial, recuperacion espontanea, variabilidad o ejercicios no registrados. Por eso lo presentamos como apoyo a la interpretacion, no como conclusion automatica."

### "Por que usar juegos?"

Respuesta:

> "Porque permiten capturar datos motores frecuentes en casa: rango, precision, suavidad, fatiga y control. No sustituyen al clinico, pero reducen la ceguera entre consultas."

### "Que ve el medico que antes no veia?"

Respuesta:

> "Ve si el paciente esta siguiendo la pauta y si las habilidades que esa pauta pretende entrenar se mueven en la direccion esperada dentro de las mediciones del juego."

## Guion corto para presentarlo

Puedes usar este guion:

> "Esta pestana conecta rehabilitacion y telemonitorizacion. A la izquierda tenemos las pautas que el rehabilitador prescribe: ejercicios de agarre, coordinacion o rotacion. Por separado, el paciente juega en casa a FixedGap, y el juego mide esas mismas habilidades motoras con datos objetivos. Lo interesante es que el medico puede ver si un paciente que esta haciendo ejercicios de, por ejemplo, rotacion, empieza a mejorar en el juego de vertido y rotacion. No afirmamos causalidad automatica ni diagnostico, pero si damos visibilidad continua entre visitas para ajustar la pauta con mas informacion."

## Mensaje final

La pestana no va de "hacer juegos para rehabilitar". Va de:

> "Prescribo rehabilitacion, mido funcion motora con el juego y comparo ambas capas para entender mejor la evolucion del paciente."
