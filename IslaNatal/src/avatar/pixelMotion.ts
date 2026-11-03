/**
 * SISTEMA ÚNICO DE MOVIMIENTO Y ANIMACIÓN DE PIXEL
 *
 * Todas las islas y zonas comparten estas constantes y esta fase de marcha:
 * - Velocidad caminando / corriendo idéntica en cualquier mapa.
 * - La animación de pasos avanza con la distancia real recorrida, no con el reloj,
 *   de modo que los pies coinciden con el desplazamiento incluso al chocar con
 *   paredes, al cambiar de zona o al correr.
 * - Los pasos de audio se disparan en el mismo instante que cada apoyo.
 *
 * El diseño del sprite no vive acá: sigue en `pixelVxAceSprite.ts`. Este módulo
 * sólo define el ritmo compartido de la marcha.
 */

/** Velocidad de caminata normal (px de mundo por segundo). */
export const PIXEL_WALK_SPEED = 200;

/** Velocidad al correr con Shift (px de mundo por segundo). */
export const PIXEL_SPRINT_SPEED = 300;

/**
 * Distancia de un ciclo completo de marcha (los 4 tiempos de `WALK_SEQUENCE`).
 * A 200 px/s equivale a 7,5 tiempos por segundo, la cadencia histórica del sprite.
 */
export const PIXEL_WALK_CYCLE_DISTANCE = 320 / 3;

/** Distancia entre apoyos: dos apoyos por ciclo, uno por cada pierna. */
export const PIXEL_STEP_DISTANCE = PIXEL_WALK_CYCLE_DISTANCE / 2;

/** Distancia entre tiempos de animación (un cuarto de ciclo). */
export const PIXEL_WALK_FRAME_DISTANCE = PIXEL_WALK_CYCLE_DISTANCE / 4;

export interface PixelWalkCycle {
  /** Distancia recorrida desde que empezó la marcha actual. */
  distance: number;
  /** Apoyos acumulados, para alternar el sonido de pisada. */
  steps: number;
}

export function createPixelWalkCycle(): PixelWalkCycle {
  return { distance: 0, steps: 0 };
}

/** Al detenerse vuelve al tiempo neutro: transición limpia caminar → reposo. */
export function resetPixelWalkCycle(cycle: PixelWalkCycle): void {
  cycle.distance = 0;
  cycle.steps = 0;
}

/**
 * Avanza la fase con el desplazamiento real. Devuelve cuántos apoyos nuevos se
 * cruzaron (0, 1 o más) para disparar el audio exactamente al pisar.
 */
export function advancePixelWalkCycle(cycle: PixelWalkCycle, movedDistance: number): number {
  if (!(movedDistance > 0)) return 0;
  cycle.distance += movedDistance;
  const steps = Math.floor(cycle.distance / PIXEL_STEP_DISTANCE);
  const newSteps = steps - cycle.steps;
  if (newSteps > 0) cycle.steps = steps;
  return newSteps > 0 ? newSteps : 0;
}

/**
 * Tiempo de animación (0..3) para `WALK_SEQUENCE` según la distancia recorrida.
 * Es estable aunque cambie el framerate o la velocidad.
 */
export function pixelWalkFrame(cycle: PixelWalkCycle): number {
  const index = Math.floor(cycle.distance / PIXEL_WALK_FRAME_DISTANCE) % 4;
  return index < 0 ? index + 4 : index;
}

/** Número de paso actual (para alternar banco de sonido 1/2). */
export function pixelStepParity(cycle: PixelWalkCycle): number {
  return cycle.steps % 2;
}
