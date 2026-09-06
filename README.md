# Cancha Total F5 — Sistema de reservas

Sistema de reservas para las dos canchas techadas de fútbol 5 de Cancha Total F5.
Permite ver la disponibilidad del día, registrar reservas y cancelarlas.

## Instalación

```
npm install
```

## Datos de prueba

Borra `reservas.db` (si existe) y la recrea con reservas de ejemplo:

```
npm run datos
```

## Arrancar el servidor

```
npm start
```

El servidor queda escuchando en el puerto 3000: http://localhost:3000

## Correr la verificación

La puerta de calidad corre toda la suite de pruebas con un solo comando y termina
en 0 (todo en orden) o en 2 (algo falló):

```
bash verificar.sh
```

También se puede correr la suite directa con `npm test`. Requisitos: el puerto
3000 libre (la suite arranca su propio servidor). La suite respalda `reservas.db`
antes de correr y la restaura al terminar; cada prueba crea sus propios datos.

Los fallos conocidos están documentados en `HALLAZGOS.md` y sus pruebas marcadas
como fallo esperado: no rompen la puerta. La especificación de la que sale cada
prueba está en `ESPECIFICACION.md`.
