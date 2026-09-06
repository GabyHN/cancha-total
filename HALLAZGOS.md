# Hallazgos

Lo que la suite descubrió y la fase de pruebas no corrige. Cada hallazgo de comportamiento
tiene su prueba escrita en `pruebas/suite.test.js`, marcada como **fallo esperado** con su
número (la marca `falloEsperado(n, …)`). Se cierran en el turno de refactorización quitando
la marca; el avance se mide contando marcas quitadas.

Las condiciones citadas son de `ESPECIFICACION.md`.

## Comportamiento — el código contradice la especificación

| # | Condición | Qué hace hoy | Clase | Prueba | Estado |
|---|---|---|---|---|---|
| 1 | 2.1 — El bloque de las 17:00 ya se cobra con luz: ₡20.000 | Cobraba la tarifa con luz recién desde las 18:00; el bloque de las 17:00 salía a ₡15.000. La administradora: «la luz se enciende a las 5 de la tarde: el partido de las 5 ya va con luz». | comportamiento | `pruebas/suite.test.js::el bloque de las 17:00 ya se cobra con luz: ₡20.000` | **cerrado** — commit «Comportamiento: la tarifa con luz arranca a las 17:00»; la prueba pasa sin la marca de fallo esperado y sin haberla modificado |
| 2 | 1.3 — El teléfono es obligatorio | Acepta y guarda reservas con el teléfono vacío (el formulario manda el campo vacío y nadie lo valida). | comportamiento | `pruebas/suite.test.js::no se crea una reserva con el teléfono vacío` | **cerrado** — commit «Comportamiento: teléfono obligatorio y de 8 dígitos exactos»; la prueba pasa sin la marca de fallo esperado y sin haberla modificado |
| 3 | 1.3 — El teléfono son exactamente 8 dígitos | Acepta cualquier texto como teléfono: corto, largo o con letras. | comportamiento | `pruebas/suite.test.js::no se crea una reserva con un teléfono que no sea de 8 dígitos` | **cerrado** — commit «Comportamiento: teléfono obligatorio y de 8 dígitos exactos»; la prueba pasa sin la marca de fallo esperado y sin haberla modificado |
| 4 | 2.3 — Las canceladas no cuentan para el descuento de frecuente | El conteo de reservas del mes no filtra por estado: una reserva cancelada empuja al cliente a «frecuente» y regala el 10 %. «Frecuente es el que juega, no el que aparta.» | comportamiento | `pruebas/suite.test.js::las reservas canceladas no cuentan para el descuento de frecuente` | **cerrado** — commit «Comportamiento: las canceladas no cuentan para el descuento de frecuente»; la prueba pasa sin la marca de fallo esperado y sin haberla modificado |
| 5 | 3.1 — Se cancela hasta 24 horas antes de la hora del partido | Compara solo fechas: cualquier reserva de mañana se puede cancelar aunque falten menos de 24 horas (mañana 8:00 se cancela hoy a las 23:00), y ninguna de hoy se puede cancelar nunca. | comportamiento | `pruebas/suite.test.js::con menos de 24 horas de anticipación ya no se puede cancelar` | **abierto** |

> Nota al hallazgo #5: por el hallazgo #8 (reloj no inyectable), su prueba solo puede
> construir el caso «mañana a menos de 24 horas» cuando la corrida ocurre de 09:00 en
> adelante; antes de esa hora se omite con aviso.

## Estructura — no se puede probar (o cambiar con seguridad) sin tocar el código

| # | Qué pasa | Clase | Dónde se ve |
|---|---|---|---|
| 6 | La lógica con reglas propias —tarifa, descuento de frecuente, plazo de cancelación— no vive en ninguna función: está incrustada en los manejadores de rutas, y la tarifa además duplicada en tres lugares (portada, creación de reserva y cotizador). No hay unidad que probar, y el arreglo del hallazgo #1 habría que hacerlo tres veces. **Pagado lo que estaba en el camino del hallazgo #1:** la tarifa quedó en una sola función (`tarifaBloque`), con la suite idéntica antes y después del cambio. El descuento y el plazo siguen incrustados: quedan anotados, no estaban en el camino. | estructura | Encabezado de `pruebas/suite.test.js` (por qué la suite es 100 % integración) |
| 7 | La base de datos (`reservas.db`) y el puerto (3000) están fijos en el código: no se puede correr contra una base o puerto de prueba. La suite tiene que respaldar y restaurar la base real y exigir el puerto libre. | estructura | Arnés de `pruebas/suite.test.js` (bloques `before`/`after`) |
| 8 | El reloj no es inyectable (`new Date()` directo): la regla de las 24 horas solo se puede probar contra la hora real, y el caso límite no siempre existe. | estructura | Prueba del hallazgo #5 (se omite entre 00:00 y 08:59) |
| 9 | `server.js` arranca el servidor al importarse y no exporta nada: la única forma de probarlo es como proceso hijo. | estructura | Arnés de `pruebas/suite.test.js` |
| 10 | Código muerto: la función de feriados que nadie llama y el plan de temporada alta comentado (§5 de la especificación). No afecta el comportamiento; estorba la lectura. | estructura | `server.js` (bloque marcado como «función vieja» y precios comentados) |

## Estado de la puerta

`verificar.sh` termina en **0**. Los hallazgos #1, #2, #3 y #4 están cerrados: sus pruebas
pasan sin marca. El hallazgo #5 sigue abierto, marcado como fallo esperado con su número, y
su prueba se omite sola cuando el reloj no permite construir el caso (de 09:00 en adelante
corre, y mientras el hallazgo siga abierto cae en su marca de fallo esperado).
