/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar»
 * Datos de la habitación de Pixel, guion temporal, cámara y puntos de interés.
 *
 * La habitación es un mundo de 480 × 320 px, la misma densidad de píxel que
 * la cabaña de Isla Natal, para que el salto entre escenas no rompa la escala.
 */

export const BEDROOM_W = 480;
export const BEDROOM_H = 320;
export const BEDROOM_WALL_BOTTOM = 78;

/* =========================================================
   GUION TEMPORAL (segundos desde el fundido de entrada)
   ========================================================= */
export const BEDROOM_TIMELINE = {
  fadeInEnd: 2.1,
  flashWeak: 5.0,
  thunderWeak: 5.9,
  flashStrong: 8.0,
  stir: 9.2,
  startle: 10.35,
  eyesOpen: 11.0,
  lookAround: 12.2,
  riseStart: 13.6,
  riseEnd: 16.5,
  windowShot: 17.0,
  windowShotEnd: 19.4,
  flashWindow: 17.55,
  blanketOff: 20.4,
  scootStart: 20.75,
  scootEnd: 22.35,
  legsStart: 22.4,
  legsEnd: 23.4,
  feetDown: 23.65,
  standStart: 23.9,
  standEnd: 25.7,
  flashSilhouette: 27.15,
  deskFocus: 29.4,
  dialogueStart: 30.55,
  dialogueEnd: 34.0,
  handoff: 34.4,
  stormTail: 36.4,
} as const;

export const BEDROOM_DIALOGUE_LINE = '¿Qué fue eso...?';

/**
 * Bloques narrativos del prólogo para el botón «Siguiente escena».
 * Cada salto cae sobre un cambio real de puesta en escena (relámpago,
 * plano de la ventana, incorporación, silueta, escritorio, diálogo) y el
 * último entrega el control al jugador.
 */
export const BEDROOM_SCENE_CUES: number[] = [
  BEDROOM_TIMELINE.startle,
  BEDROOM_TIMELINE.windowShot,
  BEDROOM_TIMELINE.blanketOff,
  BEDROOM_TIMELINE.standStart,
  BEDROOM_TIMELINE.flashSilhouette,
  BEDROOM_TIMELINE.deskFocus,
  BEDROOM_TIMELINE.dialogueStart,
  BEDROOM_TIMELINE.handoff,
];

/* =========================================================
   FONDOS DE PANTALLA COMPLETA Y CÁMARA
   ========================================================= */
export interface BedroomCameraKey {
  at: number;
  x: number;
  y: number;
  zoom: number;
}

/** Zoom 1 = encuadre que cubre la pantalla completa con el mundo de 480 × 320. */
export const BEDROOM_CUTSCENE_CAMERA: BedroomCameraKey[] = [
  { at: 0.0, x: 241, y: 42, zoom: 1.62 },
  { at: 2.2, x: 241, y: 44, zoom: 1.56 },
  { at: 4.4, x: 296, y: 100, zoom: 1.34 },
  { at: 6.4, x: 398, y: 148, zoom: 1.3 },
  { at: 9.0, x: 420, y: 138, zoom: 1.48 },
  { at: 13.4, x: 424, y: 140, zoom: 1.54 },
  { at: 16.7, x: 424, y: 148, zoom: 1.48 },
  { at: 17.15, x: 242, y: 43, zoom: 1.68 },
  { at: 19.35, x: 242, y: 45, zoom: 1.74 },
  { at: 20.2, x: 424, y: 172, zoom: 1.5 },
  { at: 22.5, x: 426, y: 180, zoom: 1.46 },
  { at: 25.8, x: 424, y: 192, zoom: 1.36 },
  { at: 27.9, x: 424, y: 192, zoom: 1.42 },
  { at: 29.5, x: 276, y: 112, zoom: 1.5 },
  { at: 31.1, x: 352, y: 172, zoom: 1.44 },
  { at: 34.4, x: 414, y: 206, zoom: 1.3 },
];

export const BEDROOM_PLAY_ZOOM = 1.12;
export const BEDROOM_PLAY_SPEED = 82;

/* =========================================================
   CONTINUACIÓN NARRATIVA · LA SEÑAL Y EL VIAJERO
   ========================================================= */
export const RADIO_TRANSMISSION: string[] = [
  '...Atención... ¿Hay alguien ahí?...',
  'Estamos perdiendo las comunicaciones...',
  'El Reinicio... no debería haber llegado tan lejos...',
  'Si alguien recibe este mensaje, no salga de su casa...',
  'Repito... no salga de su casa...',
];

export const RADIO_REACTION = '¿El Reinicio...? ¿Qué está pasando?';

export const OBJECTIVE_DOOR = 'La puerta de la habitación da al comedor.';
export const OBJECTIVE_CHEST = 'Encuentra el cofre que dejó tu abuelo.';

export interface BedroomScriptLine {
  speaker: string;
  text: string;
}

export const TRAVELER_SCRIPT: BedroomScriptLine[] = [
  { speaker: 'VIAJERO', text: 'Por fin... Pensé que no iba a encontrarte.' },
  { speaker: 'PIXEL', text: '¿Quién eres? ¿Cómo sabes mi nombre?' },
  { speaker: 'VIAJERO', text: 'No tenemos mucho tiempo. Tu abuelo me envió.' },
  { speaker: 'PIXEL', text: '¿Mi abuelo?' },
  {
    speaker: 'VIAJERO',
    text: 'Él sabía que esta noche llegaría. Me pidió que te entregara un mensaje y que te dijera dónde encontrar algo que dejó preparado.',
  },
  { speaker: 'PIXEL', text: '¿Qué está pasando?' },
  {
    speaker: 'VIAJERO',
    text: 'Busca el cofre que dejó tu abuelo. Tiene una cerradura de tres cifras. El código es 287.',
  },
  {
    speaker: 'VIAJERO',
    text: 'No abras el cofre sin estar preparado. Lo que contiene es más importante de lo que imaginas.',
  },
  { speaker: 'VIAJERO', text: 'Tengo que irme. No confíes en todo lo que escuches por la radio.' },
];

/** Momento del guion en el que la máquina temporal del viajero se activa. */
export const TRAVELER_MACHINE_LINE = 8;

/* =========================================================
   SOLIDOS DE COLISIÓN (pies del personaje)
   ========================================================= */
export interface BedroomRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const BEDROOM_SOLIDS: BedroomRect[] = [
  { x: 18, y: 10, w: 78, h: 143 }, // armario
  { x: 174, y: 74, w: 132, h: 50 }, // escritorio
  { x: 382, y: 78, w: 90, h: 124 }, // cama
  { x: 348, y: 90, w: 38, h: 48 }, // mesa de noche
  { x: 10, y: 160, w: 46, h: 72 }, // estantería izquierda
  { x: 448, y: 214, w: 30, h: 72 }, // estantería derecha
  { x: 448, y: 286, w: 26, h: 30 }, // planta
  { x: 320, y: 128, w: 26, h: 26 }, // mochila en el suelo
];

export const BEDROOM_WALK_BOUNDS = { x1: 10, y1: 82, x2: 470, y2: 312 };

/* =========================================================
   INTERACCIÓN
   ========================================================= */
export interface BedroomInteractable {
  id: string;
  label: string;
  action: string;
  x: number;
  y: number;
  radius: number;
  lines: string[];
}

export const BEDROOM_INTERACTABLES: BedroomInteractable[] = [
  {
    id: 'bed',
    label: 'Cama',
    action: 'Mirar la cama',
    x: 427,
    y: 194,
    radius: 46,
    lines: ['Las sábanas todavía guardan el calor.', 'No pienso volver a dormirme.'],
  },
  {
    id: 'window',
    label: 'Ventana',
    action: 'Mirar la tormenta',
    x: 241,
    y: 76,
    radius: 76,
    lines: ['La tormenta no se mueve del horizonte.', 'Es como si estuviera esperando algo.'],
  },
  {
    id: 'desk',
    label: 'Escritorio',
    action: 'Revisar el escritorio',
    x: 246,
    y: 122,
    radius: 56,
    lines: ['La computadora está apagada.', 'Anoche la dejé encendida... ¿o no?'],
  },
  {
    id: 'radio',
    label: 'Radio',
    action: 'Escuchar la radio',
    x: 198,
    y: 102,
    radius: 36,
    lines: ['Sólo hay estática.', 'Una voz lejana parece repetir mi nombre, pero no alcanzo a entenderla.'],
  },
  {
    id: 'wardrobe',
    label: 'Armario',
    action: 'Abrir el armario',
    x: 56,
    y: 94,
    radius: 48,
    lines: ['Ropa de siempre. Nada fuera de lugar.'],
  },
  {
    id: 'shelf',
    label: 'Estantería',
    action: 'Mirar los libros',
    x: 34,
    y: 198,
    radius: 40,
    lines: ['Manuales, cartuchos y una foto de la familia.', 'Nada que explique el trueno.'],
  },
  {
    id: 'poster',
    label: 'Póster',
    action: 'Mirar el póster',
    x: 145,
    y: 62,
    radius: 30,
    lines: ['GAME ON. El mismo póster desde que tengo memoria.'],
  },
  {
    id: 'door',
    label: 'Puerta',
    action: 'Probar la puerta',
    x: 28,
    y: 268,
    radius: 38,
    lines: ['La puerta cruje con el viento.', 'El comedor queda del otro lado.'],
  },
];

/* =========================================================
   RELÁMPAGOS DEL PRÓLOGO
   ========================================================= */
export interface BedroomFlashCue {
  at: number;
  power: number;
}

export const BEDROOM_FLASHES: BedroomFlashCue[] = [
  { at: BEDROOM_TIMELINE.flashWeak, power: 0.46 },
  { at: BEDROOM_TIMELINE.flashStrong, power: 1.0 },
  { at: BEDROOM_TIMELINE.flashWindow, power: 0.66 },
  { at: BEDROOM_TIMELINE.flashSilhouette, power: 0.94 },
];

export function bedroomFlashAt(t: number, extraAt: number | null = null, extraPower = 0): number {
  let value = 0;
  for (const cue of BEDROOM_FLASHES) {
    value = Math.max(value, flashEnvelope(t - cue.at) * cue.power);
  }
  if (extraAt !== null) {
    value = Math.max(value, flashEnvelope(t - extraAt) * extraPower);
  }
  return value;
}

function flashEnvelope(d: number): number {
  if (d < 0 || d > 1.6) return 0;
  if (d < 0.045) return 1;
  if (d < 0.1) return 0.16;
  if (d < 0.16) return 0.88;
  if (d < 0.23) return 0.26;
  if (d < 0.31) return 0.52;
  return Math.max(0, 0.4 * Math.exp(-(d - 0.31) * 5.4));
}

/* =========================================================
   AYUDA MATEMÁTICA
   ========================================================= */
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function smooth01(value: number): number {
  const c = clamp01(value);
  return c * c * (3 - 2 * c);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOut(value: number): number {
  return smooth01(value);
}

export function rampBetween(t: number, start: number, end: number): number {
  return smooth01((t - start) / Math.max(0.0001, end - start));
}

export function getBedroomCamera(t: number): { x: number; y: number; zoom: number } {
  const keys = BEDROOM_CUTSCENE_CAMERA;
  if (t <= keys[0].at) return { x: keys[0].x, y: keys[0].y, zoom: keys[0].zoom };
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.at) {
      const k = smooth01((t - a.at) / Math.max(0.0001, b.at - a.at));
      return {
        x: lerp(a.x, b.x, k),
        y: lerp(a.y, b.y, k),
        zoom: lerp(a.zoom, b.zoom, k),
      };
    }
  }
  const last = keys[keys.length - 1];
  return { x: last.x, y: last.y, zoom: last.zoom };
}

export function nearestBedroomInteractable(
  x: number,
  y: number
): { item: BedroomInteractable; distance: number } | null {
  let best: { item: BedroomInteractable; distance: number } | null = null;
  for (const item of BEDROOM_INTERACTABLES) {
    const distance = Math.hypot(x - item.x, y - item.y);
    if (distance <= item.radius && (!best || distance < best.distance)) {
      best = { item, distance };
    }
  }
  return best;
}
