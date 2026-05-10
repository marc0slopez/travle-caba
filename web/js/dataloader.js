import { PATHS } from './constants.js';

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error('No se pudo cargar ' + path + ' (HTTP ' + response.status + ')');
  }
  return response.json();
}

export async function loadAllData() {
  const [relaciones, pistas, barrios] = await Promise.all([
    fetchJson(PATHS.RELACIONES),
    fetchJson(PATHS.PISTAS),
    fetchJson(PATHS.BARRIOS)
  ]);

  return { relaciones, pistas, barrios };
}
