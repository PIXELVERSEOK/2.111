/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SILUETA COMPARTIDA DE ISLA NATAL
 *
 * Este módulo centraliza el contorno exterior de la isla para que el renderizado,
 * la vegetación y las colisiones usen exactamente la misma forma. Evita duplicar
 * el perímetro (y por lo tanto que el agua cubra zonas caminables o queden
 * escalones invisibles lejos de la orilla).
 */

export type Vec2 = readonly [number, number];

function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Subdivide un polígono cerrado de control en una curva orgánica suave sin esquinas duras. */
export function subdivideClosedCatmullRom(
  control: readonly Vec2[],
  samplesPerSegment = 9
): [number, number][] {
  const n = control.length;
  if (n < 3) return control.map((p) => [p[0], p[1]]);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = control[(i - 1 + n) % n];
    const p1 = control[i];
    const p2 = control[(i + 1) % n];
    const p3 = control[(i + 2) % n];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      out.push([
        catmullRom1D(p0[0], p1[0], p2[0], p3[0], t),
        catmullRom1D(p0[1], p1[1], p2[1], p3[1], t),
      ]);
    }
  }
  return out;
}

export function pointInPolygonRing(x: number, y: number, ring: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Silueta exterior artesanal de Isla Natal (2352 × 1736). El perímetro no sigue
 * una forma cuadrada ni un óvalo regular: ensenada del Puerto al norte, cabo boscoso
 * al noreste, bahía del Mirador al este, punta arenosa al sureste, playa del Aurora
 * con cúspides al sur, cala de la casa al suroeste y promontorio rocoso al noroeste.
 * Todos los rectángulos caminables quedan holgadamente dentro de la masa terrestre.
 */
export const NATAL_ISLAND_CONTROL_POINTS: readonly Vec2[] = [
  // Norte — ensenada del Puerto entre dos cabos
  [1052, 606],
  [1176, 618],
  [1298, 608],
  // Noreste — cabo de la Arboleda
  [1390, 598],
  [1500, 584],
  [1620, 572],
  [1740, 566],
  [1850, 584],
  [1942, 626],
  // Este — bahía amplia y península del Mirador
  [2002, 696],
  [2016, 786],
  [1992, 870],
  [1950, 944],
  [1930, 1020],
  [1948, 1104],
  [1990, 1182],
  [2012, 1258],
  // Sureste — punta y pequeña ensenada
  [1966, 1332],
  [1888, 1386],
  [1778, 1404],
  [1660, 1390],
  [1608, 1436],
  [1560, 1478],
  // Sur — playa del Aurora con cúspides y una punta baja
  [1476, 1498],
  [1376, 1510],
  [1264, 1518],
  [1176, 1526],
  [1076, 1518],
  [982, 1502],
  [896, 1486],
  [824, 1470],
  // Suroeste — cala de la casa
  [742, 1440],
  [684, 1396],
  [620, 1370],
  [560, 1356],
  [500, 1312],
  [462, 1242],
  [436, 1170],
  // Oeste — costa de la pradera con una cala somera
  [414, 1090],
  [432, 1012],
  [456, 932],
  [458, 862],
  [428, 796],
  [372, 772],
  // Noroeste — promontorio rocoso irregular
  [346, 706],
  [320, 624],
  [300, 540],
  [316, 456],
  [352, 386],
  [406, 336],
  [480, 306],
  [560, 296],
  [646, 306],
  [716, 330],
  [772, 340],
  [820, 334],
  [872, 348],
  [912, 386],
  [956, 424],
  [976, 486],
  [982, 556],
  [1002, 598],
];

export const NATAL_ISLAND_RING: [number, number][] = subdivideClosedCatmullRom(
  NATAL_ISLAND_CONTROL_POINTS,
  9
);

/** Distancia mínima (en píxeles) de un punto interior a la línea de costa de la isla. */
export function distanceToIslandCoast(x: number, y: number): number {
  const ring = NATAL_ISLAND_RING;
  let minSq = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) continue;
    let t = ((x - p1[0]) * dx + (y - p1[1]) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const cx = p1[0] + t * dx;
    const cy = p1[1] + t * dy;
    const dsq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
    if (dsq < minSq) minSq = dsq;
  }
  return Math.sqrt(minSq);
}

/**
 * Comprueba si un punto está sobre la masa terrestre principal, opcionalmente
 * con un margen interior para que el cuerpo de Pixel no pise el agua.
 */
export function isPointInsideIslandCoast(x: number, y: number, inset = 0): boolean {
  if (x < 236 || x > 2036 || y < 276 || y > 1546) return false;
  if (!pointInPolygonRing(x, y, NATAL_ISLAND_RING)) return false;
  if (inset <= 0) return true;
  return distanceToIslandCoast(x, y) >= inset;
}
