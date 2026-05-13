let svg = null;
let pathsLayer = null;
let decorationsLayer = null;
let labelsLayer = null;
let mapReady = false;
let idToElement = new Map();
let featureById = new Map();
let activeSilhouetteId = null;

const SVG_NS = 'http://www.w3.org/2000/svg';

function normalizeName(value) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');

  if (normalized === 'la_boca') return 'boca';
  if (normalized === 'villa_general_mitre') return 'villa_gral_mitre';
  return normalized;
}

function createSvgElement(tagName, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tagName);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function walkCoordinates(geometry, callback) {
  const coordinates = geometry?.coordinates || [];
  const type = geometry?.type;

  if (type === 'Polygon') {
    for (const ring of coordinates) {
      for (const point of ring) callback(point);
    }
  }

  if (type === 'MultiPolygon') {
    for (const polygon of coordinates) {
      for (const ring of polygon) {
        for (const point of ring) callback(point);
      }
    }
  }
}

function getBounds(features) {
  const bounds = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity
  };

  for (const feature of features) {
    walkCoordinates(feature.geometry, ([lon, lat]) => {
      bounds.minLon = Math.min(bounds.minLon, lon);
      bounds.maxLon = Math.max(bounds.maxLon, lon);
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
    });
  }

  return bounds;
}

function makeProjector(bounds, width, height, padding) {
  const lonSpan = bounds.maxLon - bounds.minLon;
  const latSpan = bounds.maxLat - bounds.minLat;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const scale = Math.min(innerWidth / lonSpan, innerHeight / latSpan);
  const usedWidth = lonSpan * scale;
  const usedHeight = latSpan * scale;
  const xOffset = padding + (innerWidth - usedWidth) / 2;
  const yOffset = padding + (innerHeight - usedHeight) / 2;

  return ([lon, lat]) => {
    const x = xOffset + (lon - bounds.minLon) * scale;
    const y = yOffset + (bounds.maxLat - lat) * scale;
    return [x, y];
  };
}

function ringToPath(ring, project) {
  return ring.map((point, index) => {
    const [x, y] = project(point);
    return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
  }).join(' ') + ' Z';
}

function geometryToPath(geometry, project) {
  if (geometry?.type === 'Polygon') {
    return geometry.coordinates.map((ring) => ringToPath(ring, project)).join(' ');
  }

  if (geometry?.type === 'MultiPolygon') {
    return geometry.coordinates
      .flatMap((polygon) => polygon.map((ring) => ringToPath(ring, project)))
      .join(' ');
  }

  return '';
}

function projectedFeatureBounds(feature, project) {
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  };

  walkCoordinates(feature.geometry, (point) => {
    const [x, y] = project(point);
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
  });

  if (!Number.isFinite(bounds.minX)) return null;

  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2
  };
}

function assetHref(src) {
  const value = String(src || '');
  const publicPath = value.startsWith('data/') && !location.pathname.includes('/web/')
    ? 'web/' + value
    : value;

  try {
    return new URL(publicPath, document.baseURI).href;
  } catch {
    return publicPath.replaceAll(' ', '%20');
  }
}

function addDecorativeRegion(feature, decoration, project) {
  const images = decoration?.images || [];
  if (!decorationsLayer || !images.length) return;

  const bounds = projectedFeatureBounds(feature, project);
  if (!bounds) return;

  const base = Math.max(bounds.width, bounds.height);
  const size = Math.max(122, Math.min(205, base * 1.65));
  const group = createSvgElement('g', {
    class: 'map-region-decoration',
    'data-region-id': normalizeName(feature.properties?.id || feature.properties?.name)
  });

  const glow = createSvgElement('ellipse', {
    class: 'map-region-glow',
    cx: bounds.centerX,
    cy: bounds.centerY,
    rx: Math.max(size * 0.74, bounds.width * 1.08),
    ry: Math.max(size * 0.48, bounds.height * 0.98)
  });
  group.appendChild(glow);

  const slots = [
    { dx: -0.46, dy: -0.12, width: 0.34, height: 1.08, rotate: -4 },
    { dx: 0.18, dy: -0.36, width: 0.46, height: 0.44, rotate: 8 },
    { dx: -0.28, dy: 0.28, width: 0.54, height: 0.68, rotate: -5 },
    { dx: 0.26, dy: 0.2, width: 0.92, height: 0.46, rotate: 4 }
  ];

  images.slice(0, slots.length).forEach((src, index) => {
    const slot = slots[index];
    const width = size * slot.width;
    const height = size * slot.height;
    const x = bounds.centerX + size * slot.dx - width / 2;
    const y = bounds.centerY + size * slot.dy - height / 2;
    const item = createSvgElement('g', {
      class: 'map-region-sprite',
      style: '--sprite-index: ' + index
    });
    item.setAttribute('transform', 'rotate(' + slot.rotate + ' ' + (x + width / 2).toFixed(2) + ' ' + (y + height / 2).toFixed(2) + ')');

    const image = createSvgElement('image', {
      href: assetHref(src),
      x: x.toFixed(2),
      y: y.toFixed(2),
      width: width.toFixed(2),
      height: height.toFixed(2),
      preserveAspectRatio: 'xMidYMid meet'
    });

    const float = createSvgElement('animateTransform', {
      attributeName: 'transform',
      additive: 'sum',
      type: 'translate',
      values: '0 0; 0 ' + (index % 2 === 0 ? -4 : 4) + '; 0 0',
      dur: (4.8 + index * 0.45).toFixed(2) + 's',
      begin: (index * 0.35).toFixed(2) + 's',
      repeatCount: 'indefinite'
    });

    item.append(image, float);
    group.appendChild(item);
  });

  decorationsLayer.appendChild(group);
}

function featureCenter(feature, project) {
  const points = [];
  walkCoordinates(feature.geometry, (point) => points.push(point));
  if (!points.length) return [0, 0];

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const [lon, lat] of points) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return project([(minLon + maxLon) / 2, (minLat + maxLat) / 2]);
}

function getElement(idOrName) {
  return idToElement.get(normalizeName(idOrName));
}

function clearLabels() {
  if (labelsLayer) labelsLayer.replaceChildren();
}

function labelFor(id, className = '') {
  const feature = featureById.get(normalizeName(id));
  if (!feature || !labelsLayer) return;

  const label = createSvgElement('text', {
    x: feature._center[0],
    y: feature._center[1],
    class: 'map-label ' + className,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle'
  });
  label.textContent = feature.properties?.displayName || feature.properties?.name || id;
  labelsLayer.appendChild(label);
}

function setState(element, stateClass) {
  element.classList.remove('is-start', 'is-end', 'is-correct', 'is-wrong');
  if (stateClass) element.classList.add(stateClass);
}

export function renderMap(containerElement, _svgTextIgnored, barriosGeoJSON, onReady, options = {}) {
  const mapDiv = document.getElementById('mapa') || containerElement;
  if (!mapDiv || !barriosGeoJSON?.features?.length) return;

  mapDiv.replaceChildren();
  idToElement = new Map();
  featureById = new Map();
  activeSilhouetteId = null;

  const width = 1000;
  const height = 820;
  const padding = 24;
  const bounds = getBounds(barriosGeoJSON.features);
  const project = makeProjector(bounds, width, height, padding);

  svg = createSvgElement('svg', {
    id: 'caba-map',
    viewBox: '0 0 ' + width + ' ' + height,
    role: 'img',
    'aria-label': barriosGeoJSON.metadata?.ariaLabel || 'Mapa de YENDLE',
    preserveAspectRatio: 'xMidYMid meet'
  });

  pathsLayer = createSvgElement('g', { class: 'map-paths' });
  decorationsLayer = createSvgElement('g', { class: 'map-decorations', 'aria-hidden': 'true' });
  labelsLayer = createSvgElement('g', { class: 'map-labels' });
  svg.append(pathsLayer, decorationsLayer, labelsLayer);

  const decorativeRegions = options.decorativeRegions || {};

  for (const feature of barriosGeoJSON.features) {
    const id = normalizeName(feature.properties?.id || feature.properties?.name || feature.properties?.BARRIO);
    const name = feature.properties?.displayName || feature.properties?.name || id;
    feature._center = featureCenter(feature, project);
    feature.properties.displayName = name;

    featureById.set(id, feature);

    if (decorativeRegions[id]) {
      addDecorativeRegion(feature, decorativeRegions[id], project);
      continue;
    }

    const path = createSvgElement('path', {
      d: geometryToPath(feature.geometry, project),
      class: 'barrio-path',
      'data-id': id
    });

    idToElement.set(id, path);
    pathsLayer.appendChild(path);
  }

  mapDiv.appendChild(svg);
  mapReady = true;
  if (onReady) window.setTimeout(onReady, 0);
}

export function clearHighlights() {
  for (const element of idToElement.values()) {
    element.classList.remove('is-start', 'is-end', 'is-correct', 'is-wrong', 'is-silhouette', 'anim-pulse');
  }
  clearLabels();
  activeSilhouetteId = null;
}

export function isMapReady() {
  return mapReady;
}

export function highlightRoute(route = []) {
  if (!Array.isArray(route) || route.length < 2) return;

  const start = getElement(route[0]);
  const end = getElement(route[route.length - 1]);

  if (start) {
    setState(start, 'is-start');
    labelFor(route[0], 'start-label');
  }

  if (end) {
    setState(end, 'is-end');
    labelFor(route[route.length - 1], 'end-label');
  }
}

export function showSilhouette(id) {
  if (activeSilhouetteId) {
    getElement(activeSilhouetteId)?.classList.remove('is-silhouette');
  }

  const element = getElement(id);
  if (!element) return;

  element.classList.add('is-silhouette');
  activeSilhouetteId = normalizeName(id);
}

export function highlightNode(id, isCorrect = true) {
  const element = getElement(id);
  if (!element) return;

  setState(element, isCorrect ? 'is-correct' : 'is-wrong');

  if (isCorrect) {
    labelFor(id, 'correct-label');
    element.classList.add('anim-pulse');
    window.setTimeout(() => element.classList.remove('anim-pulse'), 800);
  } else {
    triggerErrorAnimation();
  }
}

export function toggleHighlight(id, isCorrect = true) {
  const element = getElement(id);
  if (!element) return;

  if (element.classList.contains('is-correct') || element.classList.contains('is-wrong')) {
    setState(element, '');
    return;
  }

  highlightNode(id, isCorrect);
}

export function triggerErrorAnimation() {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;
  mapContainer.classList.add('anim-shake');
  window.setTimeout(() => mapContainer.classList.remove('anim-shake'), 400);
}

