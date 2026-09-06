// Suite de integración — Cancha Total F5
//
// Cada prueba responde a una condición de ESPECIFICACION.md, nunca al código:
// ningún valor esperado salió de correr el sistema.
//
// NIVEL: todas las pruebas son de integración (entran por HTTP, como entra la
// persona, y verifican el efecto observable: el dato guardado o la respuesta).
// No hay pruebas de unidad porque las reglas con lógica propia (tarifa,
// descuento, plazo de cancelación) no viven en ninguna función propia del
// sistema: están incrustadas en los manejadores de rutas. Eso es el hallazgo
// de estructura #6 de HALLAZGOS.md.
//
// ARNÉS: la base de datos y el puerto están fijos en el código del proveedor
// (hallazgo #7), así que la suite respalda reservas.db, arranca server.js como
// proceso hijo en el puerto 3000 (hallazgo #9: el servidor arranca al
// importarse y no exporta nada) y restaura todo al terminar. Los datos de cada
// prueba los crea la prueba, en fechas y teléfonos propios que no chocan con
// los de las demás.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const RAIZ = path.join(__dirname, '..');
const RUTA_DB = path.join(RAIZ, 'reservas.db');
const RUTA_RESPALDO = path.join(RAIZ, 'reservas.db.respaldo-pruebas');
const BASE = 'http://127.0.0.1:3000';

let servidor;

// --- acceso de solo lectura a la base, para verificar el dato guardado ------

function filas(sql, ...params) {
  const db = new Database(RUTA_DB, { readonly: true });
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}

function reservasDe(fecha) {
  return filas('SELECT * FROM reservas WHERE fecha = ? ORDER BY id', fecha);
}

// --- helpers HTTP: el mismo camino que recorre la persona -------------------

async function post(ruta, campos) {
  const respuesta = await fetch(BASE + ruta, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos).toString(),
  });
  return respuesta.text();
}

// El formulario real siempre manda todos los campos (vacíos si no se llenan).
function reservar(campos) {
  return post('/reservas', campos);
}

function cancelar(id) {
  return post(`/reservas/${id}/cancelar`, {});
}

// --- marca de fallo esperado ------------------------------------------------
// La aserción queda escrita tal cual; esta marca solo registra que el fallo es
// un hallazgo conocido (HALLAZGOS.md). Si el hallazgo se corrige y la prueba
// pasa, la marca misma falla pidiendo que la quiten: así se mide el avance.

async function falloEsperado(numeroHallazgo, fn) {
  try {
    await fn();
  } catch (e) {
    const motivo = String(e.message).split('\n')[0];
    console.log(`    ↳ fallo esperado — hallazgo #${numeroHallazgo} sigue abierto (${motivo})`);
    return;
  }
  throw new Error(
    `Esta prueba ya pasa: el hallazgo #${numeroHallazgo} parece corregido. ` +
    'Quite la marca de fallo esperado y cierre el hallazgo en HALLAZGOS.md.'
  );
}

// --- arranque y limpieza ------------------------------------------------------

before(async () => {
  // El puerto 3000 está fijo en el código: si ya hay algo escuchando, no es
  // nuestro servidor de prueba y la suite no puede correr.
  let puertoOcupado = false;
  try {
    await fetch(BASE + '/', { signal: AbortSignal.timeout(1000) });
    puertoOcupado = true;
  } catch { /* nadie escucha: perfecto */ }
  if (puertoOcupado) {
    throw new Error('Ya hay un servidor en el puerto 3000. Deténgalo antes de correr la suite.');
  }

  // Respaldar la base real. Si quedó un respaldo de una corrida interrumpida,
  // ese respaldo es la base real: se conserva y se descarta la de la corrida rota.
  if (fs.existsSync(RUTA_RESPALDO)) {
    if (fs.existsSync(RUTA_DB)) fs.rmSync(RUTA_DB);
  } else if (fs.existsSync(RUTA_DB)) {
    fs.renameSync(RUTA_DB, RUTA_RESPALDO);
  }

  servidor = spawn(process.execPath, ['server.js'], { cwd: RAIZ, stdio: ['ignore', 'ignore', 'pipe'] });
  let errores = '';
  servidor.stderr.on('data', d => { errores += d.toString(); });

  const limite = Date.now() + 15000;
  for (;;) {
    try {
      await fetch(BASE + '/', { signal: AbortSignal.timeout(500) });
      break;
    } catch {
      if (servidor.exitCode !== null) {
        throw new Error(`El servidor terminó al arrancar (código ${servidor.exitCode}).\n${errores}`);
      }
      if (Date.now() > limite) {
        throw new Error(`El servidor no arrancó en 15 segundos.\n${errores}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }
});

after(async () => {
  if (servidor && servidor.exitCode === null) {
    const salida = new Promise(r => servidor.once('exit', r));
    servidor.kill();
    await salida;
  }
  if (fs.existsSync(RUTA_DB)) fs.rmSync(RUTA_DB);
  if (fs.existsSync(RUTA_RESPALDO)) fs.renameSync(RUTA_RESPALDO, RUTA_DB);
});

// ============================================================================
// 1. Reservas
// ============================================================================

// Condición 1.1 — integración (recorrido de crear reserva).
// Falla si: el rango de horas aceptado deja por fuera el bloque de las 8:00 o
// el de las 21:00.
test('se puede reservar el primer bloque del día (8:00) y el último (21:00)', async () => {
  await reservar({ cancha: '1', fecha: '2030-01-05', hora: '8', cliente: 'Borde Bajo', telefono: '88000101' });
  await reservar({ cancha: '1', fecha: '2030-01-05', hora: '21', cliente: 'Borde Alto', telefono: '88000102' });

  const guardadas = reservasDe('2030-01-05');
  assert.equal(guardadas.length, 2, 'debían quedar guardadas las dos reservas de los bordes');
  assert.deepEqual(guardadas.map(r => r.hora), [8, 21]);
  assert.ok(guardadas.every(r => r.estado === 'activa'));
});

// Condición 1.1 — integración.
// Falla si: el sistema empieza a aceptar bloques antes de las 8:00 o después
// de las 21:00.
test('no se puede reservar antes de las 8:00 ni después de las 21:00', async () => {
  await reservar({ cancha: '1', fecha: '2030-01-06', hora: '7', cliente: 'Madrugador', telefono: '88000103' });
  await reservar({ cancha: '1', fecha: '2030-01-06', hora: '22', cliente: 'Trasnochado', telefono: '88000104' });

  assert.equal(reservasDe('2030-01-06').length, 0, 'no debía guardarse ninguna reserva fuera de horario');
});

// Condición 1.3 — integración.
// Falla si: se puede crear una reserva con el teléfono vacío.
test('no se crea una reserva con el teléfono vacío', async () => {
  await falloEsperado(2, async () => {
    // El formulario real manda el campo vacío cuando no se llena.
    await reservar({ cancha: '1', fecha: '2030-01-07', hora: '10', cliente: 'Sin Teléfono', telefono: '' });
    assert.equal(reservasDe('2030-01-07').length, 0, 'la reserva sin teléfono no debía guardarse');
  });
});

// Condición 1.3 — integración.
// Falla si: se acepta un teléfono que no sea exactamente 8 dígitos.
test('no se crea una reserva con un teléfono que no sea de 8 dígitos', async () => {
  await falloEsperado(3, async () => {
    await reservar({ cancha: '1', fecha: '2030-01-08', hora: '10', cliente: 'Tel Corto', telefono: '123' });
    await reservar({ cancha: '1', fecha: '2030-01-08', hora: '11', cliente: 'Tel Largo', telefono: '123456789' });
    await reservar({ cancha: '1', fecha: '2030-01-08', hora: '12', cliente: 'Tel Letras', telefono: '8811AA22' });
    assert.equal(reservasDe('2030-01-08').length, 0, 'ningún teléfono inválido debía producir una reserva');
  });
});

// Condición 1.4 — integración.
// Falla si: la verificación de disponibilidad deja de filtrar por cancha,
// fecha, hora o estado, y un bloque ocupado se vende dos veces.
test('un bloque ocupado no se vuelve a vender', async () => {
  await reservar({ cancha: '1', fecha: '2030-01-09', hora: '10', cliente: 'Primero', telefono: '88000105' });
  await reservar({ cancha: '1', fecha: '2030-01-09', hora: '10', cliente: 'Colado', telefono: '88000106' });

  const guardadas = reservasDe('2030-01-09');
  assert.equal(guardadas.length, 1, 'el mismo bloque no debía venderse dos veces');
  assert.equal(guardadas[0].cliente, 'Primero');
});

// Condición 1.4 — integración.
// Falla si: cancelar una reserva no libera su bloque.
test('el bloque de una reserva cancelada queda libre otra vez', async () => {
  await reservar({ cancha: '2', fecha: '2030-09-10', hora: '10', cliente: 'Se Arrepintió', telefono: '88000107' });
  const [original] = reservasDe('2030-09-10');
  await cancelar(original.id);

  await reservar({ cancha: '2', fecha: '2030-09-10', hora: '10', cliente: 'Aprovechó', telefono: '88000108' });

  const guardadas = reservasDe('2030-09-10');
  assert.equal(guardadas.filter(r => r.estado === 'cancelada').length, 1);
  assert.equal(guardadas.filter(r => r.estado === 'activa').length, 1, 'el bloque liberado debía poder venderse de nuevo');
  assert.equal(guardadas.find(r => r.estado === 'activa').cliente, 'Aprovechó');
});

// Condición 1.5 — integración (agrupa los rechazos de datos inválidos).
// Falla si: una reserva sin nombre, con cancha inexistente o con hora que no
// es número llega a guardarse.
test('una reserva con datos incompletos o inválidos no se crea', async () => {
  await reservar({ cancha: '1', fecha: '2030-01-11', hora: '10', cliente: '', telefono: '88000109' });
  await reservar({ cancha: '3', fecha: '2030-01-11', hora: '11', cliente: 'Cancha Fantasma', telefono: '88000110' });
  await reservar({ cancha: '1', fecha: '2030-01-11', hora: 'abc', cliente: 'Hora Rota', telefono: '88000111' });

  assert.equal(reservasDe('2030-01-11').length, 0, 'ningún dato inválido debía producir una reserva');
});

// ============================================================================
// 2. Precios
// ============================================================================

// Condición 2.1 — integración (la tarifa no tiene función propia que probar
// por unidad: hallazgo de estructura #6).
// Falla si: la tarifa diurna deja de ser ₡15.000 o se corre su borde.
test('el bloque de las 16:00 se cobra a tarifa diurna: ₡15.000', async () => {
  await reservar({ cancha: '1', fecha: '2030-01-12', hora: '16', cliente: 'Vespertino', telefono: '88000112' });
  const [guardada] = reservasDe('2030-01-12');
  assert.equal(guardada.precio, 15000);
});

// Condición 2.1 — integración. La administradora: «la luz se enciende a las 5
// de la tarde: el partido de las 5 ya va con luz».
// Falla si: el corte de la tarifa con luz no está en las 17:00.
test('el bloque de las 17:00 ya se cobra con luz: ₡20.000', async () => {
  await falloEsperado(1, async () => {
    await reservar({ cancha: '1', fecha: '2030-01-13', hora: '17', cliente: 'Con Luz', telefono: '88000113' });
    const [guardada] = reservasDe('2030-01-13');
    assert.equal(guardada.precio, 20000, 'el partido de las 17:00 ya va con luz y se cobra ₡20.000');
  });
});

// Condición 2.1 — integración.
// Falla si: la tarifa con luz deja de ser ₡20.000 a las 18:00.
test('el bloque de las 18:00 se cobra con luz: ₡20.000', async () => {
  await reservar({ cancha: '1', fecha: '2030-01-14', hora: '18', cliente: 'Nocturno', telefono: '88000114' });
  const [guardada] = reservasDe('2030-01-14');
  assert.equal(guardada.precio, 20000);
});

// Condición 2.2 — integración.
// Falla si: el descuento de frecuente deja de aplicarse en la cuarta reserva
// del mes (contando la que se hace), o deja de ser el 10 %.
test('la cuarta reserva del mes del mismo teléfono sale con 10 % de descuento', async () => {
  const tel = '88000311';
  await reservar({ cancha: '1', fecha: '2030-03-01', hora: '10', cliente: 'Frecuente', telefono: tel });
  await reservar({ cancha: '1', fecha: '2030-03-02', hora: '10', cliente: 'Frecuente', telefono: tel });
  await reservar({ cancha: '1', fecha: '2030-03-03', hora: '10', cliente: 'Frecuente', telefono: tel });
  await reservar({ cancha: '1', fecha: '2030-03-04', hora: '10', cliente: 'Frecuente', telefono: tel });

  const [tercera] = reservasDe('2030-03-03');
  const [cuarta] = reservasDe('2030-03-04');
  assert.equal(tercera.precio, 15000, 'la tercera del mes todavía no lleva descuento');
  assert.equal(cuarta.precio, 13500, 'la cuarta del mes lleva el 10 % de descuento: ₡13.500');
});

// Condición 2.3 — integración. «Frecuente es el que juega, no el que aparta.»
// Falla si: las reservas canceladas cuentan para llegar a las cuatro del mes.
test('las reservas canceladas no cuentan para el descuento de frecuente', async () => {
  await falloEsperado(4, async () => {
    const tel = '88000412';
    await reservar({ cancha: '1', fecha: '2030-04-01', hora: '10', cliente: 'Apartador', telefono: tel });
    const [apartada] = reservasDe('2030-04-01');
    await cancelar(apartada.id);

    await reservar({ cancha: '1', fecha: '2030-04-02', hora: '10', cliente: 'Apartador', telefono: tel });
    await reservar({ cancha: '1', fecha: '2030-04-03', hora: '10', cliente: 'Apartador', telefono: tel });
    // Con la cancelada fuera del conteo, esta es apenas la tercera que juega.
    await reservar({ cancha: '1', fecha: '2030-04-04', hora: '10', cliente: 'Apartador', telefono: tel });

    const [cuartaAparente] = reservasDe('2030-04-04');
    assert.equal(cuartaAparente.precio, 15000, 'con la cancelada excluida no llega a cuatro: sin descuento');
  });
});

// Condición 2.4 — integración.
// Falla si: el conteo de frecuente deja de mirar el mes de la fecha del
// partido y mezcla reservas de meses distintos.
test('el descuento cuenta las reservas del mes del partido, no las de otros meses', async () => {
  const tel = '88000513';
  await reservar({ cancha: '1', fecha: '2030-06-01', hora: '10', cliente: 'Juniero', telefono: tel });
  await reservar({ cancha: '1', fecha: '2030-06-02', hora: '10', cliente: 'Juniero', telefono: tel });
  await reservar({ cancha: '1', fecha: '2030-06-03', hora: '10', cliente: 'Juniero', telefono: tel });
  // Cuarta reserva del teléfono, pero primera con partido en julio.
  await reservar({ cancha: '1', fecha: '2030-07-01', hora: '10', cliente: 'Juniero', telefono: tel });

  const [julio] = reservasDe('2030-07-01');
  assert.equal(julio.precio, 15000, 'en julio apenas lleva una: sin descuento');
});

// Condición 2.6 — integración.
// Falla si: el cotizador de la portada deja de dar la tarifa del bloque.
test('el cotizador da la tarifa del bloque, sin descuento de frecuente', async () => {
  const diurno = await (await fetch(BASE + '/api/cotizar?hora=10')).json();
  const nocturno = await (await fetch(BASE + '/api/cotizar?hora=18')).json();
  assert.equal(diurno.precio, 15000);
  assert.equal(nocturno.precio, 20000);
});

// ============================================================================
// 3. Cancelaciones
// ============================================================================

// Condición 3.1 — integración.
// Falla si: una reserva con más de 24 horas de anticipación deja de poder
// cancelarse.
test('una reserva se puede cancelar con más de 24 horas de anticipación', async () => {
  await reservar({ cancha: '1', fecha: '2030-09-15', hora: '10', cliente: 'Previsor', telefono: '88000115' });
  const [guardada] = reservasDe('2030-09-15');
  await cancelar(guardada.id);

  const [despues] = reservasDe('2030-09-15');
  assert.equal(despues.estado, 'cancelada');
});

// Condición 3.1 — integración. «Si el partido es mañana a las 8 de la mañana y
// ya son las 11 de la noche, no hay marcha atrás.»
// Falla si: el plazo se mide por fecha y no por las 24 horas exactas.
// NOTA (hallazgo de estructura #8): el reloj del sistema no es inyectable, así
// que el caso «mañana a menos de 24 horas» solo se puede construir cuando la
// hora actual lo permite (de 09:00 en adelante). Antes de esa hora se omite.
test('con menos de 24 horas de anticipación ya no se puede cancelar', async (t) => {
  const ahora = new Date();
  if (ahora.getHours() < 9) {
    t.skip('entre 00:00 y 08:59 no existe un bloque de mañana a menos de 24 horas (reloj no inyectable, hallazgo #8)');
    return;
  }
  // Un bloque de mañana que ya está a menos de 24 horas de distancia.
  const hora = Math.min(21, ahora.getHours() - 1);
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  const fecha = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`;

  await falloEsperado(5, async () => {
    await reservar({ cancha: '2', fecha, hora: String(hora), cliente: 'Tardío', telefono: '88000116' });
    const guardada = reservasDe(fecha).find(r => r.cliente === 'Tardío');
    await cancelar(guardada.id);

    const despues = reservasDe(fecha).find(r => r.id === guardada.id);
    assert.equal(despues.estado, 'activa', 'a menos de 24 horas no hay cancelación: la reserva sigue activa y cobrada');
  });
});

// Condición 3.3 — integración.
// Falla si: cancelar una reserva inexistente o repetir una cancelación deja de
// dar error o altera datos.
test('cancelar una reserva inexistente o ya cancelada da error y no cambia nada', async () => {
  const paginaInexistente = await cancelar(999999);
  assert.match(paginaInexistente, /No existe la reserva/);

  await reservar({ cancha: '1', fecha: '2030-09-16', hora: '10', cliente: 'Doble Clic', telefono: '88000117' });
  const [guardada] = reservasDe('2030-09-16');
  await cancelar(guardada.id);
  const paginaRepetida = await cancelar(guardada.id);

  assert.match(paginaRepetida, /ya estaba cancelada/);
  const despues = reservasDe('2030-09-16');
  assert.equal(despues.length, 1);
  assert.equal(despues[0].estado, 'cancelada');
});

// ============================================================================
// 4. Consultas
// ============================================================================

// Condiciones 4.2 y 4.3 — integración (recorrido de la lista del día).
// Falla si: la lista del día deja de mostrar las reservas con lo cobrado, o un
// día sin reservas deja de decirlo.
test('la lista del día muestra las reservas con su precio, y un día sin reservas lo dice', async () => {
  await reservar({ cancha: '1', fecha: '2030-01-20', hora: '9', cliente: 'Madruga FC', telefono: '88000118' });
  await reservar({ cancha: '2', fecha: '2030-01-20', hora: '18', cliente: 'Luna FC', telefono: '88000119' });

  const pagina = await (await fetch(BASE + '/dia/2030-01-20')).text();
  assert.match(pagina, /Madruga FC/);
  assert.match(pagina, /Luna FC/);
  assert.match(pagina, /₡15\.000/);
  assert.match(pagina, /₡20\.000/);

  const paginaVacia = await (await fetch(BASE + '/dia/2031-02-02')).text();
  assert.match(paginaVacia, /No hay reservas para esta fecha/);
});
