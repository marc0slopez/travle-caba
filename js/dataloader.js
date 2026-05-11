import { DEFAULT_PACK, PACKS, resolvePackId } from './constants.js';

async function fetchJson(path) {
  if (typeof window === 'undefined') {
    const { readFile } = await import('node:fs/promises');
    const fileUrl = new URL('../' + path, import.meta.url);
    return JSON.parse(await readFile(fileUrl, 'utf8'));
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error('No se pudo cargar ' + path + ' (HTTP ' + response.status + ')');
  }
  return response.json();
}

export async function loadAllData(packId = DEFAULT_PACK) {
  const resolvedPackId = resolvePackId(packId);
  const pack = PACKS[resolvedPackId];
  const base = pack.dataPath;
  const [relaciones, pistas, barrios, metadata] = await Promise.all([
    fetchJson(base + '/relaciones.json'),
    fetchJson(base + '/pistas.json'),
    fetchJson(base + '/map.geojson'),
    fetchJson(base + '/pack.json')
  ]);

  return {
    relaciones,
    pistas,
    barrios: {
      ...barrios,
      metadata: {
        ...(barrios.metadata || {}),
        packId: resolvedPackId,
        ariaLabel: metadata.mapAriaLabel || pack.mapAriaLabel
      }
    },
    pack: { ...pack, ...metadata, id: resolvedPackId }
  };
}
