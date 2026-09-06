# Especificación — Cancha Total F5

Especificación reconstruida el 2026-09-06. El repositorio del proveedor no traía documentos;
este documento se armó contrastando el comportamiento observable del sistema con la
descripción de la administradora, punto por punto.

**Desde este momento, este documento es la fuente de verdad.** Una prueba responde a lo que
dice acá, nunca a lo que el código devuelve.

## Fuentes

Cada afirmación declara de dónde salió:

- **[A] Administradora** — su descripción del negocio es la especificación.
- **[S] Sistema** — comportamiento actual; donde la administradora no dice nada, se considera correcto.

Donde la administradora y el sistema hablan del mismo punto y no coinciden, **queda lo que
dice la administradora** y la diferencia es un hallazgo (ver `HALLAZGOS.md`).

---

## 1. Reservas

- **1.1** Se alquila por bloques de una hora, todos los días. El primer bloque empieza a las
  **8:00** y el último a las **21:00** (termina a las 22:00), en cualquiera de las **dos**
  canchas. Una hora de inicio fuera de ese rango se rechaza. **[A]**
- **1.2** Una reserva lleva cancha (1 o 2), fecha, hora de inicio, nombre del cliente y
  teléfono. **[A]**
- **1.3** El teléfono es **obligatorio** y son exactamente **8 dígitos**: es la forma de
  ubicar al cliente y de reconocerlo como frecuente. Sin teléfono válido no se crea la
  reserva. **[A]**
- **1.4** Un bloque ocupado por una reserva **activa** no se vuelve a vender. Si la reserva
  se cancela a tiempo, ese bloque queda libre otra vez. **[A]**
- **1.5** Si falta o es inválido cualquiera de los campos (cancha, fecha, hora, nombre,
  teléfono), el sistema muestra los errores y **no crea** la reserva. **[S]** (extendido al
  teléfono por 1.3 **[A]**)

## 2. Precios

- **2.1** La hora diurna cuesta **₡15.000**. Desde que se enciende la luz cuesta
  **₡20.000**, y la luz se enciende a las **17:00**: el bloque de las 17:00 **ya se cobra
  con luz**. Es decir: bloques de 8:00 a 16:00 → ₡15.000; bloques de 17:00 a 21:00 →
  ₡20.000. **[A]**
  > Nota: el sistema entregado cobra la tarifa nocturna recién desde las 18:00 — discrepancia
  > registrada como hallazgo.
- **2.2** El **cliente frecuente** —el mismo teléfono con **cuatro o más** reservas en el
  mismo mes, **contando la que está haciendo**— recibe **10 % de descuento** sobre la tarifa
  del bloque. **[A]**
- **2.3** Las reservas **canceladas no cuentan** para el conteo de frecuente: frecuente es el
  que juega, no el que aparta. **[A]**
  > Nota: el sistema entregado cuenta también las canceladas — discrepancia registrada como
  > hallazgo.
- **2.4** El mes que se cuenta para el descuento es el **mes de la fecha del partido** que se
  está reservando (no el mes en que se hace el trámite). **[S]** (la administradora no lo
  precisa)
- **2.5** El precio queda **fijado al crear la reserva** y es el que se muestra en la lista
  del día. **[S]**
- **2.6** El "precio estimado" del formulario de la portada es una cotización por bloque
  **sin** el descuento de frecuente. **[S]**

## 3. Cancelaciones

- **3.1** Se puede cancelar hasta **24 horas antes de la hora del partido** (hora del bloque,
  no solo la fecha). Con menos de 24 horas **no hay cancelación** y se cobra completo: si el
  partido es mañana a las 8:00 y ya son las 23:00 de hoy, no hay marcha atrás. **[A]**
  > Nota: el sistema entregado compara solo fechas (cualquier partido de mañana se puede
  > cancelar, ninguno de hoy) — discrepancia registrada como hallazgo.
- **3.2** No hay devoluciones: una cancelación fuera de plazo deja la reserva activa con su
  precio cobrado tal cual. **[A]**
- **3.3** Cancelar una reserva inexistente o ya cancelada produce un error y no cambia
  nada. **[S]**

## 4. Consultas

- **4.1** Para cada día se ve qué bloques están **libres u ocupados en cada cancha**, con la
  tarifa de cada bloque en la portada. **[A]** (tarifa por bloque en la vista: **[S]**)
- **4.2** Para cada día se ve la **lista de reservas con lo que se cobró en cada una**; las
  canceladas se muestran tachadas y sin botón de cancelar. **[A]** (presentación: **[S]**)
- **4.3** Si el día no tiene reservas, la lista lo dice explícitamente. **[S]**

## 5. Código presente pero inactivo

El sistema trae una regla de feriados que nadie llama y un plan de precios de temporada alta
comentado. **No tienen efecto observable y así deben seguir**: no son parte del
comportamiento del negocio. **[S]** Se anotan como deuda de estructura, no como
funcionalidad.

## 6. Lo que el sistema no hace (fuera de alcance)

- No se puede editar una reserva; solo crear y cancelar. **[S]**
- No valida que la fecha del partido no sea pasada. **[S]**
- No hay usuarios ni control de acceso. **[S]**
