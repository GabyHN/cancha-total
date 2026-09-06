#!/usr/bin/env bash
# Puerta de calidad de Cancha Total F5. 0 = se puede cerrar. 2 = algo falló.
# Corre la suite completa; los hallazgos abiertos están marcados como fallo
# esperado (ver HALLAZGOS.md) y no rompen la puerta.
set -u
cd "$(dirname "$0")"
node --test "pruebas/*.test.js" || { echo "La suite falló." >&2; exit 2; }
echo "Verificación completa."
