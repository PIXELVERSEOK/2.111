/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guion de la cinemática ilustrada de PIXELVERSE: «El reinicio del universo».
 *
 * Siete escenas construidas sobre las ilustraciones entregadas. La narración
 * es sólo texto en pantalla (sin voces sintéticas) y no revela la identidad
 * del antagonista, el origen del abuelo ni el del viajero.
 */

export const CINEMATIC_IMAGE_DURATION_SEC = 104.0;

export type CinematicImageTone = 'warm' | 'villain' | 'epic' | 'cold';

export interface CinematicImageScene {
  id: string;
  index: number;
  label: string;
  startSec: number;
  endSec: number;
}

export const CINEMATIC_IMAGE_SCENES: CinematicImageScene[] = [
  {
    id: 'golden-age',
    index: 1,
    label: 'LA ÉPOCA DORADA',
    startSec: 0,
    endSec: 16,
  },
  {
    id: 'antagonist',
    index: 2,
    label: 'EL ANTAGONISTA',
    startSec: 16,
    endSec: 32,
  },
  {
    id: 'red-button',
    index: 3,
    label: 'EL BOTÓN ROJO',
    startSec: 32,
    endSec: 44,
  },
  {
    id: 'destruction',
    index: 4,
    label: 'LA DESTRUCCIÓN DEL UNIVERSO',
    startSec: 44,
    endSec: 60,
  },
  {
    id: 'altered-universe',
    index: 5,
    label: 'EL UNIVERSO ALTERADO',
    startSec: 60,
    endSec: 74,
  },
  {
    id: 'pixel-room',
    index: 6,
    label: 'PIXEL EN SU HABITACIÓN',
    startSec: 74,
    endSec: 92,
  },
  {
    id: 'transition',
    index: 7,
    label: 'EL COMIENZO',
    startSec: 92,
    endSec: CINEMATIC_IMAGE_DURATION_SEC,
  },
];

export function getImageSceneAt(elapsedSec: number): CinematicImageScene {
  const t = Math.max(0, Math.min(CINEMATIC_IMAGE_DURATION_SEC - 0.001, elapsedSec));
  for (const scene of CINEMATIC_IMAGE_SCENES) {
    if (t >= scene.startSec && t < scene.endSec) return scene;
  }
  return CINEMATIC_IMAGE_SCENES[CINEMATIC_IMAGE_SCENES.length - 1];
}

export interface CinematicImageBeat {
  id: string;
  startSec: number;
  endSec: number;
  subtitle: string;
  tone: CinematicImageTone;
}

export const CINEMATIC_IMAGE_BEATS: CinematicImageBeat[] = [
  /* 01 · La época dorada */
  {
    id: 'golden-1',
    startSec: 2.0,
    endSec: 5.8,
    subtitle: 'Antes del silencio, el mundo era una sala llena de luces.',
    tone: 'warm',
  },
  {
    id: 'golden-2',
    startSec: 7.0,
    endSec: 10.6,
    subtitle: 'Cada partida era una promesa. Cada moneda, una pequeña victoria.',
    tone: 'warm',
  },
  {
    id: 'golden-3',
    startSec: 11.4,
    endSec: 14.6,
    subtitle: 'Nadie imaginaba que esa alegría estaba a punto de apagarse.',
    tone: 'warm',
  },
  /* 02 · El antagonista */
  {
    id: 'villain-1',
    startSec: 17.0,
    endSec: 20.8,
    subtitle: 'Alguien observaba desde la oscuridad.',
    tone: 'villain',
  },
  {
    id: 'villain-2',
    startSec: 21.4,
    endSec: 25.4,
    subtitle: 'Contaba cada derrota. Esperaba el momento exacto.',
    tone: 'villain',
  },
  {
    id: 'villain-3',
    startSec: 26.2,
    endSec: 30.6,
    subtitle: 'Y sonrió cuando encontró la puerta que nadie vigilaba.',
    tone: 'villain',
  },
  /* 03 · El botón rojo */
  {
    id: 'button-1',
    startSec: 33.0,
    endSec: 36.6,
    subtitle: 'Un solo botón podía borrar todos los mundos.',
    tone: 'epic',
  },
  {
    id: 'button-2',
    startSec: 37.2,
    endSec: 40.2,
    subtitle: 'El Reinicio Cero.',
    tone: 'epic',
  },
  {
    id: 'button-3',
    startSec: 40.8,
    endSec: 43.2,
    subtitle: 'La mano descendió.',
    tone: 'epic',
  },
  /* 04 · La destrucción del universo */
  {
    id: 'destruction-1',
    startSec: 45.0,
    endSec: 48.6,
    subtitle: 'El universo se rompió en fragmentos.',
    tone: 'epic',
  },
  {
    id: 'destruction-2',
    startSec: 49.2,
    endSec: 52.8,
    subtitle: 'La luz se volvió grieta. La memoria, estática.',
    tone: 'epic',
  },
  {
    id: 'destruction-3',
    startSec: 53.6,
    endSec: 57.6,
    subtitle: 'Y todo lo que había sido dejó de ser.',
    tone: 'epic',
  },
  /* 05 · El universo alterado */
  {
    id: 'altered-1',
    startSec: 61.0,
    endSec: 64.8,
    subtitle: 'Cuando el silencio cayó, el mundo ya no era el mismo.',
    tone: 'cold',
  },
  {
    id: 'altered-2',
    startSec: 65.4,
    endSec: 69.2,
    subtitle: 'Sólo quedaron ruinas, ecos y una pregunta.',
    tone: 'cold',
  },
  {
    id: 'altered-3',
    startSec: 70.0,
    endSec: 73.4,
    subtitle: '23 de octubre de 2026. El universo había cambiado…',
    tone: 'cold',
  },
  /* 06 · Pixel en su habitación */
  {
    id: 'room-1',
    startSec: 75.2,
    endSec: 79.2,
    subtitle: 'Muy lejos de allí, en una isla apartada de todo…',
    tone: 'warm',
  },
  {
    id: 'room-2',
    startSec: 80.0,
    endSec: 84.2,
    subtitle: 'Pixel miraba la tormenta desde su habitación.',
    tone: 'warm',
  },
  {
    id: 'room-3',
    startSec: 85.2,
    endSec: 90.0,
    subtitle: 'No sabía que alguien, en algún lugar, acababa de abrir el camino.',
    tone: 'warm',
  },
  /* 07 · El comienzo */
  {
    id: 'start-1',
    startSec: 92.8,
    endSec: 96.4,
    subtitle: '…y el misterio apenas comenzaba.',
    tone: 'cold',
  },
  {
    id: 'start-2',
    startSec: 97.2,
    endSec: 101.2,
    subtitle: 'El viaje estaba por empezar.',
    tone: 'warm',
  },
];

export function getActiveImageBeatAtTime(
  elapsedSec: number
): CinematicImageBeat | null {
  for (const beat of CINEMATIC_IMAGE_BEATS) {
    if (elapsedSec >= beat.startSec && elapsedSec <= beat.endSec) {
      return beat;
    }
  }
  return null;
}
