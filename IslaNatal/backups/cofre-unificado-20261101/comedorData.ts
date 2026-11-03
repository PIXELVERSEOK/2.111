/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · EL COMEDOR DE LA CASA DE PIXEL
 *
 * La habitación comparte la escala de 480 × 320 px con el dormitorio y la
 * cabaña de Isla Natal. Cada mueble vive en su propia capa: el comedor no es
 * una imagen de fondo, sino un espacio transitable con colisiones, luz y
 * profundidad independientes.
 */

import { ISLA_NATAL_FLAGS } from '../../island/islaNatalData';

export const COMEDOR_W = 480;
export const COMEDOR_H = 320;
export const COMEDOR_WALL_BOTTOM = 96;
export const COMEDOR_PLAY_SPEED = 82;
export const COMEDOR_PLAY_ZOOM = 1.12;

/** Combinación grabada en la cerradura de tres discos. */
export const COMEDOR_CHEST_CODE = '287';

/** La puerta de salida de la casa, en el muro derecho. */
export const COMEDOR_MAIN_DOOR = { x: 436, y: 224, w: 40, h: 76, standX: 408, standY: 264 };
/** La puerta por la que se llega desde el dormitorio, en el muro izquierdo. */
export const COMEDOR_BEDROOM_DOOR = { x: 6, y: 224, w: 40, h: 76, standX: 84, standY: 264 };

export const COMEDOR_ENTRY_SPOT = { x: 84, y: 268 };
export const COMEDOR_RETURN_SPOT = { x: 396, y: 268 };
export const COMEDOR_WALK_BOUNDS = { x1: 58, y1: 140, x2: 422, y2: 304 };

export interface ComedorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Huellas de colisión de los muebles (los pies del personaje). */
export const COMEDOR_SOLIDS: ComedorRect[] = [
  { x: 62, y: 98, w: 102, h: 44 }, // aparador
  { x: 326, y: 98, w: 86, h: 44 }, // vitrina
  { x: 72, y: 150, w: 48, h: 30 }, // cofre del abuelo
  { x: 126, y: 154, w: 24, h: 22 }, // mochila
  { x: 208, y: 182, w: 142, h: 60 }, // mesa de comedor
  { x: 224, y: 166, w: 26, h: 20 }, // silla norte izquierda
  { x: 302, y: 166, w: 26, h: 20 }, // silla norte derecha
  { x: 224, y: 246, w: 26, h: 20 }, // silla sur izquierda
  { x: 302, y: 246, w: 26, h: 20 }, // silla sur derecha
  { x: 186, y: 204, w: 22, h: 26 }, // silla oeste
  { x: 350, y: 204, w: 22, h: 26 }, // silla este
  { x: 384, y: 286, w: 30, h: 26 }, // maceta
  { x: 56, y: 210, w: 18, h: 56 }, // perchero junto a la puerta del dormitorio
];

export function isComedorWalkable(x: number, y: number): boolean {
  if (
    x < COMEDOR_WALK_BOUNDS.x1 ||
    x > COMEDOR_WALK_BOUNDS.x2 ||
    y < COMEDOR_WALK_BOUNDS.y1 ||
    y > COMEDOR_WALK_BOUNDS.y2
  ) {
    return false;
  }
  for (const solid of COMEDOR_SOLIDS) {
    if (
      x + 7 > solid.x &&
      x - 7 < solid.x + solid.w &&
      y + 1 > solid.y &&
      y - 8 < solid.y + solid.h
    ) {
      return false;
    }
  }
  return true;
}

/* =========================================================
   INTERACCIONES
   ========================================================= */

export interface ComedorInteractable {
  id: 'table' | 'photo' | 'sideboard' | 'clock' | 'window' | 'chest' | 'backpack' | 'cardoor';
  label: string;
  action: string;
  x: number;
  y: number;
  radius: number;
  lines: string[];
}

export const COMEDOR_INTERACTABLES: ComedorInteractable[] = [
  {
    id: 'table',
    label: 'Mesa del comedor',
    action: 'Mirar la mesa',
    x: 279,
    y: 214,
    radius: 82,
    lines: [
      'La mesa sigue puesta, como si alguien hubiera salido a mitad de la cena.',
      'Los platos están limpios. La jarra, todavía tibia.',
    ],
  },
  {
    id: 'photo',
    label: 'Fotografía familiar',
    action: 'Mirar la fotografía',
    x: 350,
    y: 48,
    radius: 66,
    lines: [
      'Una fotografía familiar. Todo parecía diferente antes de esta noche.',
      'El abuelo sonríe con la mano apoyada en el respaldo de esta misma silla.',
    ],
  },
  {
    id: 'sideboard',
    label: 'Aparador',
    action: 'Abrir el aparador',
    x: 112,
    y: 120,
    radius: 70,
    lines: [
      'Cubiertos de diario, servilletas dobladas y una botella de vidrio verde.',
      'Todo ordenado con el cuidado de quien espera visita.',
    ],
  },
  {
    id: 'clock',
    label: 'Reloj de pared',
    action: 'Mirar el reloj',
    x: 118,
    y: 38,
    radius: 52,
    lines: [
      'El reloj sigue funcionando, aunque por momentos parece detenerse.',
      'La última vez que lo miré, las agujas estaban en otro sitio.',
    ],
  },
  {
    id: 'window',
    label: 'Ventana',
    action: 'Mirar la tormenta',
    x: 227,
    y: 62,
    radius: 92,
    lines: [
      'La tormenta es mucho más fuerte de lo habitual.',
      'La lluvia golpea el cristal como si quisiera entrar.',
    ],
  },
  {
    id: 'chest',
    label: 'Cofre del abuelo',
    action: 'Examinar el cofre',
    x: 96,
    y: 166,
    radius: 54,
    lines: [
      'Un cofre de madera oscura, con herrajes de latón y una cerradura de tres discos.',
      'Está cerrado. El abuelo nunca me dijo qué guardaba.',
    ],
  },
  {
    id: 'backpack',
    label: 'Mochila',
    action: 'Recoger la mochila',
    x: 138,
    y: 166,
    radius: 46,
    lines: [
      'La mochila de lona del abuelo, apoyada junto al cofre.',
      'Parece preparada desde hace tiempo, como si él hubiera sabido que la necesitaría.',
    ],
  },
  {
    id: 'cardoor',
    label: 'Puerta principal',
    action: 'Abrir la puerta',
    x: 410,
    y: 262,
    radius: 62,
    lines: ['El viento empuja la madera desde fuera.', 'La tormenta no va a esperar.'],
  },
];

export function nearestComedorInteractable(
  x: number,
  y: number
): { item: ComedorInteractable; distance: number } | null {
  let best: { item: ComedorInteractable; distance: number } | null = null;
  for (const item of COMEDOR_INTERACTABLES) {
    const distance = Math.hypot(x - item.x, y - item.y);
    if (distance <= item.radius && (!best || distance < best.distance)) {
      best = { item, distance };
    }
  }
  return best;
}

/* =========================================================
   MARCAS NARRATIVAS
   ========================================================= */

export const COMEDOR_FLAGS = {
  /** El enviado ya dictó el código: la cerradura acepta la combinación. */
  codeKnown: ISLA_NATAL_FLAGS.travelerWarning,
  backpack: ISLA_NATAL_FLAGS.backpack,
  /** Escena de entrada al comedor ya vista (no se repite). */
  introSeen: 'prologo-comedor-intro',
  /** El cofre fue abierto; su contenido queda para el siguiente bloque. */
  chestOpened: 'prologo-comedor-cofre-abierto',
} as const;

/* =========================================================
   DIÁLOGOS
   ========================================================= */

export const COMEDOR_STORM_LINE_1 = '¿Qué fue eso...?';
export const COMEDOR_STORM_LINE_2 = 'Está pasando algo afuera...';
export const COMEDOR_OBJECTIVE = 'Investiga qué está ocurriendo afuera.';
export const COMEDOR_CHEST_OBJECTIVE = 'Regresa a la casa y abre el cofre de tu abuelo.';
export const COMEDOR_CHEST_READY = 'Abre el cofre del abuelo con el código que te dio el enviado.';

export const COMEDOR_CHEST_LOCKED_TITLE = 'Cerradura de latón';
export const COMEDOR_CHEST_LOCKED_LINES = [
  'Tres discos numerados giran con un chasquido seco.',
  'Hace falta una combinación. El abuelo no dejó ninguna nota a la vista.',
];

export const COMEDOR_CHEST_OPEN_LINES = [
  'Los tres discos se alinean. La tapa cede con un golpe de latón.',
  'Algo descansa dentro, envuelto en un paño oscuro. Todavía no es momento de mirarlo.',
];

export const COMEDOR_BACKPACK_LINES = [
  'La mochila conserva el olor a madera y a sal.',
  'Dentro hay una bitácora, una brújula y una cantimplora. Todo lo necesario para no volver con las manos vacías.',
];

/** Ritmo de la tormenta: cada cuánto cae un rayo durante la exploración. */
export function nextComedorStrike(after: number): number {
  return after + 9 + Math.random() * 8;
}

/** Envolvente visual de un relámpago (dos golpes y una cola larga). */
export function comedorFlashEnvelope(age: number): number {
  if (age < 0 || age > 1.4) return 0;
  if (age < 0.04) return 1;
  if (age < 0.09) return 0.18;
  if (age < 0.15) return 0.86;
  if (age < 0.22) return 0.24;
  if (age < 0.3) return 0.5;
  return Math.max(0, 0.38 * Math.exp(-(age - 0.3) * 5.6));
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function smooth01(value: number): number {
  const c = clamp01(value);
  return c * c * (3 - 2 * c);
}
