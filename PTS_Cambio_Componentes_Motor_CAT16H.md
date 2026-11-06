# Procedimiento de Trabajo Seguro
## Cambio de Componentes de Motor o Mantención Mayor — Motoniveladora Caterpillar 16H (Motor Cat 3196 ATAAC)

| Campo | Detalle |
|---|---|
| **Empresa ejecutora** | SOLDESP |
| **Mandante** | Compañía Minera Zaldívar (CMZ) |
| **Lugar** | Truck Shop |
| **Equipo** | Motoniveladora Cat 16H, motor Cat 3196 ATAAC |
| **Código / Revisión** | PTS-SOLDESP-___ / Rev. 0 (borrador para validación) |
| **Elaboró / Revisó / Aprobó** | ________ / ________ / ________ |

> [!IMPORTANT]
> Este procedimiento es un **borrador técnico**. Antes de emitirlo se deben validar los valores marcados con ⚠️ contra el **Manual de Operación y Mantenimiento SEBU7478 (Cat 16H)** y el **Manual de Servicio en Cat SIS**, según el número de serie del equipo (prefijo ATS u otro).

---

## 1. Objetivo
Establecer la secuencia segura para el desmontaje, cambio y montaje de componentes mayores del motor (motor completo, culata, turbo, enfriador, radiador u otros) en la motoniveladora Cat 16H. Se busca controlar los riesgos de fatalidad según las Estrategias de Control de CMZ.

## 2. Alcance
Aplica a todo el personal de SOLDESP que intervenga motoniveladoras Cat 16H en el Truck Shop de CMZ: mantenedores, riggers, operadores de puente grúa y supervisores.

## 3. Documentos de Referencia
- ARTP Cambio de Motor Motoniveladora (SOLDESP).
- Estrategias de Control CMZ (EdC): **2, 3, 4, 5, 8, 9, 12, 13** y **Salud III (Hipoacusia)**.
- Tarjeta de Controles Críticos de Bolsillo CMZ.
- Cat 16H Motor Grader, especificaciones técnicas HEHG5518.
- Cat Operation and Maintenance Manual SEBU7478 (16H) ⚠️ *(no disponible públicamente, debe obtenerse en Cat SIS o con el distribuidor)*.
- Mensajes de seguridad estándar de Cat para motoniveladoras (SEBU7881, serie M, usado como referencia análoga).

---

## 4. Datos Técnicos de Seguridad — Cat 16H

| Sistema | Especificación del fabricante | Implicancia de seguridad |
|---|---|---|
| **Motor** | Cat 3196 ATAAC, 6 cilindros, 11,9 L, 198 kW (265 hp) a 2000 rpm | Superficies y fluidos calientes; peso del motor ⚠️ a confirmar en SIS para el plan de izaje |
| **Sistema hidráulico** | Centro cerrado con sensado de carga; bomba de pistones axiales de caudal variable; **presión máx. 24.150 kPa (~3.500 psi)**; standby 3.100 kPa | La presión puede quedar **atrapada** con el motor detenido; riesgo de inyección de fluido |
| **Acumuladores** | Acumuladores de levante de hoja (*blade lift accumulators*) | **Energía almacenada** (gas nitrógeno + aceite). No desconectar líneas sin descargarlos |
| **Frenos** | Servicio y secundario **accionados por aire**, multidisco en aceite; tanques de aire duales | **Energía neumática almacenada**: drenar tanques de aire antes de intervenir |
| **Freno de estacionamiento** | Aplicado por resorte y liberado por aire (en transmisión) | Resorte altamente comprimido en la carcasa; no desarmar sin el procedimiento de SIS |
| **Sistema eléctrico** | 24 V, 2 baterías de 1.300 CCA, alternador de 75 A | Desconexión con cortacorriente y bloqueo |
| **Refrigeración** | 46,5 L | Sistema presurizado y caliente: abrir la tapa solo con el motor frío y lentamente |
| **Aceite de motor** | 35 L | Bandejas y contención para el drenaje |
| **Sistema hidráulico** | Estanque 55 L / sistema 129 L | Contención y kit antiderrames |
| **Combustible** | 492 L | Riesgo de incendio; sin fuentes de ignición |
| **Bastidor** | Articulado (20°) con **traba de articulación** estándar | Riesgo de atrapamiento en la zona de articulación |
| **Peso operativo** | 24.740 kg (base) | Apoyo en cuñas y bloques |
| **Cabina** | ROPS ISO 3471 / FOPS ISO 3449 Nivel II | **No soldar ni perforar** la estructura ROPS/FOPS |
| **Ruido** | Potencia sonora exterior de 109 dB(A) | Protección auditiva durante las pruebas con el motor en marcha |

### 4.1 Advertencias del fabricante (mensajes de seguridad Cat)
- "La presión puede quedar atrapada en el circuito hidráulico mucho tiempo después de que la máquina se ha detenido."
- "NO desconecte líneas ni desarme componentes de un acumulador presurizado."
- "Conecte la traba del bastidor de dirección (articulación) antes de levantar, transportar o dar servicio en el área de articulación."
- "No dependa de los cilindros hidráulicos para sostener el equipo."
- "Afloje lentamente la tapa de presión del sistema de enfriamiento para aliviar la presión."
- "Use un cartón o tabla al buscar fugas", nunca la mano.
- "Instale la tarjeta *No Operar* en el interruptor de arranque o en los controles antes del servicio."

---

## 5. Responsabilidades

| Cargo | Responsabilidad |
|---|---|
| **Supervisor SOLDESP** | Validar ARTP, plan de izaje y checklist pre-maniobra; autorizar el inicio; aplicar el *YO DIGO NO* ante desviaciones; reportar en SAP EHS |
| **Mantenedor líder** | Coordinar la secuencia, el bloqueo general y la comunicación con el rigger y el operador |
| **Mantenedores acreditados** | Ejecutar los pasos con su bloqueo personal; verificar controles |
| **Rigger / Operador de puente grúa** | Ejecutar el izaje según el plan; mantener la comunicación bidireccional |
| **Prevencionista** | Verificar en terreno los Controles Críticos y el cumplimiento de las EdC |

---

## 6. EPP y Herramientas Esenciales
- **EPP básico:** casco, lentes, zapatos de seguridad, ropa de alta visibilidad, guantes, protección auditiva.
- **EPP específico:** guantes de nitrilo (fluidos), careta facial (drenajes y presión), SPDC con TAG (altura).
- **Bloqueo:** estación de bloqueo, pinzas, candados y tarjetas personales según el estándar CMZ, tarjeta *No Operar* y libro de bloqueo.
- **Mecánicas:** llave de torque calibrada, llave de impacto inalámbrica, tecles, caballetes y soporte de motor, cuñas y bloques.
- **Izaje:** puente grúa autorizado, eslingas, grilletes, cáncamos y barra separadora (*spreader*) si el plan lo requiere, vientos.
- **Contención:** bandejas, kit antiderrames, tapones y etiquetas de identificación.

---

## 7. Tabla de Riesgos y Controles

| Evento no deseado | EdC | Control de Ingeniería | Control Administrativo |
|---|---|---|---|
| **Pérdida de control en maniobra de izaje** | 3 | **Elementos, puntos y tiros de izaje aptos para su uso (C.C.)** · **Equipos de izaje aptos para su uso (C.C.)** · Cáncamos de izaje del motor según el fabricante · Caballetes con capacidad certificada | **Ejecutar el plan de izaje según lo planificado (C.C.)** · **Segregación y control de acceso en el área de influencia de la carga (C.C.)** · **Operador, riggers y supervisor calificados de acuerdo al tonelaje o equipo a operar (C.C.)** · **Sistema de comunicación bidireccional (C.C.)** · Uso de vientos, sin personas bajo la carga |
| **Exposición no controlada a partes móviles** (articulación, ventilador, correas) | 5 | **Bloqueo y desenergización del sistema de control y/o traba mecánica de partes móviles (C.C.)** (traba de articulación instalada) · **Protecciones en buen estado y/o operativas (C.C.)** | **Señalización de distancia de seguridad y control de acceso a las áreas (C.C.)** · Ropa ajustada · Tarjeta *No Operar* |
| **Liberación de energía hidráulica** (presión atrapada, acumuladores de hoja) | 9 | **Aislar, bloquear y comprobar la energía cero en todas las fuentes de energía hidráulica (C.C.)** · **Cadenas, fijaciones u otro sistema que eviten la proyección de componentes ante un desacople (C.C.)** · Hoja y ripper apoyados en el piso | Secuencia de despresurización y descarga de acumuladores según SIS · Búsqueda de fugas con cartón |
| **Liberación de energía neumática** (tanques de aire de freno) | 12 | **Aislar, bloquear y comprobar la energía cero en todas las fuentes de energía neumática (C.C.)** · Purga de tanques de aire | Verificar el manómetro de aire en cero antes de desconectar líneas |
| **Exposición no controlada a energía eléctrica** (24 V) | 8 | **Aislar, bloquear y comprobar energía cero (C.C.)** · Cortacorriente con bloqueo | Mapa de energías actualizado · Desconectar baterías antes de soldar |
| **Caída desde altura** (acceso a compartimiento de motor) | 4 | **SPDC certificado, en óptimas condiciones y con TAG/código de identificación (C.C.)** · **Anclaje a puntos de sujeción identificados, aprobados y certificados (C.C.)** | **Superficies de trabajo temporales certificadas con tarjeta de aprobación (C.C.)** · Escala o plataforma certificada |
| **Pérdida de control del equipo / aplastamiento** | 2 | Cuñas en ambos lados · Bloques y soportes (no depender de los cilindros) | No bajar del equipo con el motor encendido · Zonas segregadas y demarcadas |
| **Contacto con fluidos calientes o presurizados** (refrigerante, aceite) | 9 / 13 | Tapa de presión con alivio · Bandejas de contención | Esperar el enfriamiento del motor · Abrir la tapa lentamente · Careta facial |
| **Exposición a sustancias peligrosas** (diésel, aceite, refrigerante) | 13 | Kit antiderrames · Recipientes rotulados | HDS disponible · Guantes de nitrilo |
| **Incendio** (diésel 492 L) | 21 | Extintor operativo en el área | Sin fuentes de ignición · Limpieza de derrames · Tapar líneas de combustible |
| **Exposición a ruido** (pruebas de motor) | Salud III | — | **Uso correcto de equipo de protección auditiva (EPA) de acuerdo al riesgo residual (C.C.)** |

---

## 8. Procedimiento Paso a Paso

### Etapa A — Preparación y estacionamiento
1. El supervisor realiza la charla de inicio, revisa la **ARTP**, la gestión del cambio y el **plan de izaje**. La cuadrilla firma.
2. El operador acreditado estaciona la 16H en una posición nivelada del Truck Shop, con la transmisión en neutro y el freno de estacionamiento aplicado.
3. Baja **la hoja y el ripper al piso** y alivia la presión hacia abajo.
4. Detiene el motor y **no baja del equipo con el motor encendido**. Se instalan **cuñas en ambos lados**.
5. Se instala la **traba de articulación** entre los bastidores delantero y trasero: **Bloqueo y desenergización del sistema de control y/o traba mecánica de partes móviles (C.C.)**.
6. Se segrega el perímetro del equipo: **Señalización de distancia de seguridad y control de acceso a las áreas (C.C.)**.

### Etapa B — Aislamiento de energías
7. Con el motor detenido y la llave en ON, se mueven las palancas de control hidráulico en todas las direcciones para aliviar la presión residual. ⚠️ Confirmar la secuencia en SIS.
8. Se **descargan los acumuladores de levante de hoja** según el procedimiento del Manual de Servicio. ⚠️ No desconectar líneas hasta confirmar la presión cero.
9. Se **purgan los tanques de aire** del sistema de frenos y se verifica el manómetro en cero: **Aislar, bloquear y comprobar la energía cero en todas las fuentes de energía neumática (C.C.)**.
10. Se retira la llave, se abre el **cortacorriente** y se instalan pinza, candado y tarjeta personal de cada trabajador. Se instala la tarjeta *No Operar* en los controles.
11. Se comprueba la energía cero (intento de arranque controlado y verificación de manómetros): **Bloqueo, desenergización y comprobación de energía cero (C.C.)** y **Aislar, bloquear y comprobar la energía cero en todas las fuentes de energía hidráulica (C.C.)**.

### Etapa C — Drenaje y desconexión
12. Se espera el **enfriamiento del motor**. Se afloja **lentamente** la tapa del radiador y se drena el refrigerante (46,5 L).
13. Se drena el aceite de motor (35 L) y se cierra o tapona el combustible. Se usan bandejas de contención y se dispone de la HDS.
14. Se accede a la parte superior con plataforma o escala certificada: **Superficies de trabajo temporales certificadas con tarjeta de aprobación (C.C.)** y **SPDC certificado con TAG (C.C.)** anclado a un **punto de sujeción certificado (C.C.)**.
15. Se retiran el capó y las protecciones del compartimiento con apoyo de tecle (manipulación de carga).
16. Se desconectan y **etiquetan** arneses, mangueras y cañerías. Todas las aberturas se **taponan**.
17. Se retira la pernería de acople a la transmisión y de los soportes del motor. Se usa protección auditiva al trabajar con la llave de impacto.

### Etapa D — Izaje y extracción ⛔ *Checklist pre-maniobra obligatorio (sección 9)*
18. El rigger instala los elementos de izaje en los **cáncamos del motor especificados por el fabricante**: **Elementos, puntos y tiros de izaje aptos para su uso (C.C.)**.
19. Se confirman la segregación de la zona de la carga y la radio: **Segregación y control de acceso en el área de influencia de la carga (C.C.)** y **Sistema de comunicación bidireccional (C.C.)**.
20. Se realiza el **izaje de prueba** (pocos centímetros), se verifica el equilibrio y que no queden conexiones pendientes.
21. Se extrae el motor guiándolo con vientos, **sin personas bajo la carga ni en la línea de fuego**, y se deposita sobre caballetes o soporte certificado.

### Etapa E — Cambio de componente y montaje
22. Se realiza el cambio del componente en el banco o soporte según el Manual de Servicio.
23. Se **repite el checklist pre-maniobra** y se iza el motor nuevo o reparado. Se posiciona, alinea y acopla a la transmisión **sin introducir manos ni dedos** en los puntos de acople.
24. Se instala la pernería de los soportes y del acople con **llave de torque calibrada** según la especificación del fabricante ⚠️ (SIS).

### Etapa F — Reconexión, desbloqueo y pruebas
25. Se reconectan arneses, mangueras y líneas según las etiquetas. Se instalan las protecciones y el capó: **Protecciones en buen estado y/o operativas (C.C.)**.
26. Se rellenan los fluidos con los tipos y volúmenes especificados y se verifica que no haya fugas (usando cartón).
27. Se retira la herramienta, se ordena el área y cada trabajador **retira su propio bloqueo personal**. Se retira la traba de articulación y se asegura en su posición de almacenamiento.
28. El operador acreditado realiza las pruebas operacionales: arranque, presiones, temperaturas, fugas, frenos y dirección. Se mantienen la segregación y las cuñas hasta confirmar la operatividad.
29. El supervisor registra el término de la tarea y entrega el equipo.

---

## 9. Checklist Interactivo Pre-Maniobra (Izaje)

> Un solo **NO** detiene la maniobra. Completar antes del **paso 18** (extracción) y repetir antes del **paso 23** (montaje).

### 9.1 Documentación y personal
- [ ] ARTP y gestión del cambio completas y firmadas.
- [ ] **Plan de izaje disponible y ejecutado según lo planificado (C.C.)**, con el peso del motor confirmado en SIS ⚠️.
- [ ] **Operador, riggers y supervisor calificados de acuerdo al tonelaje o equipo a operar (C.C.)**.
- [ ] Personal en condiciones aptas; misma cuadrilla planificada.

### 9.2 Estado del equipo
- [ ] Hoja y ripper en el piso; cuñas instaladas en ambos lados.
- [ ] Traba de articulación instalada: **Bloqueo y desenergización del sistema de control y/o traba mecánica de partes móviles (C.C.)**.
- [ ] Presión hidráulica aliviada y acumuladores de hoja descargados: **Aislar, bloquear y comprobar la energía cero en todas las fuentes de energía hidráulica (C.C.)**.
- [ ] Tanques de aire de freno purgados y con manómetro en cero: **Aislar, bloquear y comprobar la energía cero en todas las fuentes de energía neumática (C.C.)**.
- [ ] Cortacorriente abierto y bloqueo personal de cada trabajador: **Bloqueo, desenergización y comprobación de energía cero (C.C.)**.
- [ ] Motor frío, fluidos drenados, líneas desconectadas y taponadas.
- [ ] Pernería de acople y soportes completamente retirada.

### 9.3 Izaje
- [ ] **Equipos de izaje aptos para su uso (C.C.)**, con checklist de pre-uso del puente grúa.
- [ ] **Elementos, puntos y tiros de izaje aptos para su uso (C.C.)**, en los cáncamos del fabricante.
- [ ] Vientos disponibles; caballetes o soporte en posición y certificados.

### 9.4 Área y comunicación
- [ ] **Segregación y control de acceso en el área de influencia de la carga (C.C.)**.
- [ ] Posiciones fuera de la línea de fuego definidas.
- [ ] **Sistema de comunicación bidireccional operativo (C.C.)**.
- [ ] Trabajos cruzados coordinados; iluminación adecuada; extintor disponible.

**Supervisor:** ____________________ **Firma:** ________ **Fecha / Hora:** ________

---

## 10. Restricciones y YO DIGO NO
> [!CAUTION]
> - **Prohibido** trabajar bajo una carga suspendida o bajo componentes sostenidos solo por cilindros hidráulicos.
> - **Prohibido** desconectar líneas hidráulicas o neumáticas sin comprobar la presión cero.
> - **Prohibido** soldar o perforar la estructura ROPS/FOPS. Para soldar en el equipo, desconectar las baterías y seguir la indicación del fabricante.
> - **Prohibido** abrir la tapa del radiador con el motor caliente.
> - Ante condiciones inseguras o controles ausentes, se aplica **YO DIGO NO** y el supervisor reporta en **SAP EHS**.

---

## 11. Pendientes de Validación ⚠️
- [ ] Peso del motor 3196 y del conjunto a izar, con los puntos de izaje oficiales (SIS).
- [ ] Secuencia oficial de alivio hidráulico y descarga de acumuladores para la 16H (SEBU7478 / Manual de Servicio).
- [ ] Torques de pernos de soportes y del acople motor–transmisión.
- [ ] Tipos de fluidos y capacidades según el número de serie.
- [ ] Redacción final de los C.C. contra los PDF de Controles y Preguntas de CMZ.

*Fuentes técnicas: Cat 16H Specifications HEHG5518; Construction Equipment Guide; RitchieSpecs; Cat Motor Grader OMM SEBU7881 (mensajes de seguridad análogos). Estándares: Estrategias de Control y Controles Críticos de Compañía Minera Zaldívar.*
