/**
 * Seguimiento de cámara compartido por todas las islas.
 *
 * La interpolación tradicional `min(1, dt * velocidad)` avanza más rápido a
 * 144 Hz que a 30 Hz y produce tirones cuando el fotograma se alarga. La curva
 * exponencial `1 - e^(-v * dt)` recorre exactamente la misma fracción del
 * trayecto por segundo en cualquier frecuencia, así que Pixel se mantiene
 * centrado con la misma suavidad en todos los equipos.
 */

/** Velocidad de seguimiento de la cámara en exploración (1/s). */
export const CAMERA_FOLLOW_SPEED = 6.5;

/** Velocidad algo más ágil para cámaras guionadas (surf, salidas de puerto). */
export const CAMERA_FOLLOW_SPEED_ACTION = 9;

/**
 * Devuelve la fracción del trayecto que la cámara debe cubrir en este
 * fotograma. `dt` se acota para que un cambio de pestaña o un parón del hilo
 * no provoque un salto brusco al volver.
 */
export function cameraFollowFactor(dt: number, speed: number = CAMERA_FOLLOW_SPEED): number {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(speed) || speed <= 0) return 0;
  return 1 - Math.exp(-speed * Math.min(dt, 0.25));
}
