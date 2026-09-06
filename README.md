# Cancha Total F5 — Sistema de reservas

Sistema de reservas para las dos canchas techadas de fútbol 5 de Cancha Total F5.
Permite ver la disponibilidad del día, registrar reservas y cancelarlas.

- **Aplicación en producción:** https://cancha-total-zeta.vercel.app
- **Repositorio:** https://github.com/GabyHN/cancha-total

## Arrancar en local

```
npm install
npm run datos   # opcional: recrea la base local con reservas de ejemplo
npm start
```

El servidor queda escuchando en el puerto 3000: http://localhost:3000

En local (y en CI) el almacenamiento es un archivo SQLite (`reservas.db`) creado
automáticamente. No se necesita ninguna credencial ni servicio externo.

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

### La misma verificación en CI

La verificación corre sola en GitHub Actions
(`.github/workflows/verificacion.yml`) en cada push y en cada pull request hacia
`main`, sin credenciales de ningún servicio externo. La rama `main` no acepta
commits directos: todo entra por pull request y la fusión se bloquea mientras el
job `verificar` no esté en verde (la política aplica también a administradores).
En el propio workflow queda escrito qué impide la fusión y qué únicamente
informa.

## Ambiente de producción

La aplicación está publicada en Vercel como función serverless. Ahí el sistema
de archivos es de solo lectura y efímero, así que el almacenamiento usa una base
de datos gestionada (Turso, libSQL).

Variables que necesita el ambiente de producción:

| Variable             | Qué es                                              |
| -------------------- | --------------------------------------------------- |
| `TURSO_DATABASE_URL` | Dirección de la base gestionada (`libsql://…`)      |
| `TURSO_AUTH_TOKEN`   | Credencial de acceso a esa base                     |

**Dónde se cargan:** en la configuración del proyecto en Vercel — por CLI con
`vercel env add TURSO_DATABASE_URL production` (y lo mismo para el token), o en
el dashboard: *Project → Settings → Environment Variables*. Nunca en el
repositorio ni en el historial de commits.

Sin esas variables el servidor usa `file:reservas.db` local: por eso la suite y
el CI corren sin credenciales.
