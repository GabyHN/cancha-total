# Registro — Caso práctico 7

**Reglas de permiso, escritas antes del cierre.** `deny` sobre `.github/workflows/**`, `verificar.sh` y `git push --force` (debilitar o esquivar la puerta nunca es legítimo aquí). `ask` sobre `pruebas/**`: quitar una marca de fallo esperado y ablandar una aserción son la misma llamada de herramienta, así que la regla no puede distinguirlas por contenido — detiene y una persona decide.

**Agrupación, verificada leyendo `server.js`.** Grupo A = #2+#3 (validación de teléfono, mismo bloque de `POST /reservas`). Grupo B = #4 (conteo de frecuente, otro paso del mismo handler). Grupo C = #5 (regla de 24 horas, en `POST /reservas/:id/cancelar`). Los tres tocan `server.js`: encargos en serie, una PR por grupo sobre la anterior ya fusionada, no en paralelo.

**Qué detuvo al agente.** En los tres grupos, la regla `ask` sobre `pruebas/**` bloqueó al subagente `cerrador-hallazgos` cuando intentó quitar la marca `falloEsperado(n, …)`: en modo no interactivo la acción se deniega sola por falta de aprobación humana. El subagente corrigió `server.js` correctamente las tres veces; la marca la retiré yo, después de revisar que el diff no tocaba ninguna aserción.

**Qué reportó como hecho que al revisar no lo estaba.** En el grupo B, el propio flujo marcó el hallazgo #4 como "cerrado" en `HALLAZGOS.md` sin haber podido tocar la prueba: corrí `verificar.sh` y la suite dio **roja** (`falloEsperado` revienta a propósito cuando el fallo ya no ocurre). En el grupo C el subagente fue más allá y avisó él mismo, antes de que yo revisara nada, que `HALLAZGOS.md` ya afirmaba "la prueba pasa" y "verificar.sh termina en 0" sin haberse corrido ninguna de las dos cosas.
