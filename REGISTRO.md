# Registro — Caso práctico 7

**Reglas de permiso, escritas antes del trabajo de cierre.** `deny` sobre `.github/workflows/**`, `verificar.sh` y `git push --force`: debilitar o esquivar la puerta de calidad nunca es legítimo en este repositorio. `ask` sobre `pruebas/**`: quitar una marca de fallo esperado y ablandar una aserción son la misma llamada de herramienta — la regla no puede distinguirlas por contenido, así que detiene y una persona decide.

**Agrupación (verificada leyendo `server.js`).** Grupo A = hallazgos #2 y #3: comparten sitio exacto, el bloque de validación de `POST /reservas`; una sola validación de teléfono cierra ambos. Grupo B = #4: el conteo de frecuente, otro paso del mismo handler. Grupo C = #5: la regla de 24 horas, en `POST /reservas/:id/cancelar`. Los tres tocan `server.js`, así que los encargos fueron en serie —una propuesta de cambio por grupo, cada una sobre la anterior fusionada— en vez de en paralelo, para no fabricar conflictos de fusión entre agentes.

**Qué detuvo al agente.** (se completa durante el trabajo)

**Qué reportó como hecho que al revisar no lo estaba.** (se completa durante el trabajo)
