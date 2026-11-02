/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar» / «La señal»
 * Pixel dibujado a mano para la secuencia de cama y el viajero del futuro.
 *
 * IMPORTANTE: todas las poses comparten la densidad y las proporciones del
 * sprite caminable de RPG Maker VX Ace (18 × 33 px, cabeza chibi, pies en el
 * origen). No existe una segunda versión de Pixel: de pie siempre se dibuja
 * con `renderPixelVxAce4Dir`; las poses de cama son variantes construidas con
 * exactamente la misma escala, paleta y anclaje.
 */

import { clamp01 } from './bedroomData';

type Ctx = CanvasRenderingContext2D;

export const BEDROOM_PIXEL_COLORS = {
  skin: '#f2c49c',
  skinLight: '#ffd9b4',
  skinShade: '#cf9a70',
  hair: '#5c3524',
  hairLight: '#8a5334',
  hairDark: '#392014',
  hood: '#bf3a30',
  hoodLight: '#e05a48',
  hoodDark: '#86231f',
  hoodDeep: '#5f1717',
  jeans: '#31425f',
  jeansLight: '#465c80',
  jeansDark: '#1f2c42',
  shoe: '#e3dfd2',
  shoeDark: '#a9a596',
  outline: '#1a1220',
  outlineSoft: 'rgba(20,12,24,0.55)',
} as const;

export type BedPixelPalette = {
  [K in keyof typeof BEDROOM_PIXEL_COLORS]: string;
};

/** Mezcla un color hexadecimal con blanco (amount > 0) o negro (amount < 0). */
function shadeHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((part) => part + part)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return hex;
  const target = amount >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(amount));
  const channel = (shift: number): number => {
    const value = (num >> shift) & 0xff;
    return Math.round(value + (target - value) * k);
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Paleta de cama derivada del avatar real. La silueta, densidad y proporciones
 * no cambian: sólo se trasladan los colores elegidos por el jugador.
 */
export function bedPixelPaletteFor(
  skinColor?: string,
  hairColor?: string,
  shirtColor?: string
): BedPixelPalette {
  const skin = skinColor || BEDROOM_PIXEL_COLORS.skin;
  const hair = hairColor || BEDROOM_PIXEL_COLORS.hair;
  const hood = shirtColor || BEDROOM_PIXEL_COLORS.hood;
  return {
    ...BEDROOM_PIXEL_COLORS,
    skin,
    skinLight: shadeHex(skin, 0.2),
    skinShade: shadeHex(skin, -0.24),
    hair,
    hairLight: shadeHex(hair, 0.26),
    hairDark: shadeHex(hair, -0.42),
    hood,
    hoodLight: shadeHex(hood, 0.22),
    hoodDark: shadeHex(hood, -0.32),
    hoodDeep: shadeHex(hood, -0.55),
  };
}

export const BEDROOM_TRAVELER_COLORS = {
  coat: '#263441',
  coatMid: '#354b5c',
  coatLight: '#4d6b7c',
  coatDeep: '#16212b',
  lining: '#2f6f72',
  liningLight: '#5bbfc2',
  leather: '#3a2c28',
  metal: '#9fb0bb',
  metalLight: '#d7e3ea',
  skin: '#d8b28f',
  skinShade: '#ad8568',
  hair: '#c7d2d6',
  hairShade: '#8d9ba2',
  lens: '#f0b35a',
  lensGlow: '#ffe3a3',
  device: '#6fe3e6',
  outline: '#0f161f',
} as const;

const T = BEDROOM_TRAVELER_COLORS;

const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
};

export interface BedPixelPose {
  time: number;
  headX: number;
  headY: number;
  /** 0 acostado · 1 sentado con el torso erguido. */
  upright: number;
  eyesOpen: number;
  /** -1 mira a la ventana (izquierda) · 1 mira al escritorio (derecha). */
  look: number;
  startle: number;
  /** 0 piernas recogidas · 1 piernas colgando fuera de la cama. */
  legsOut: number;
  legsVisible: boolean;
  /** 0 sentado al borde · 1 ya de pie sobre el suelo (piernas recogidas). */
  rise?: number;
  alpha?: number;
  shadowScale?: number;
  /** Paleta derivada del avatar seleccionado. */
  palette?: BedPixelPalette;
}

function drawShadow(ctx: Ctx, x: number, y: number, w: number, h: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0a0a12';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* =========================================================
   CABEZA CHIBI (18 × 16, la misma silueta que el sprite VX)
   ========================================================= */
function drawHead(
  ctx: Ctx,
  cx: number,
  cy: number,
  eyesOpen: number,
  look: number,
  startle: number,
  blink: boolean,
  palette: BedPixelPalette = BEDROOM_PIXEL_COLORS
): void {
  const C = palette;
  const x = Math.round(cx);
  const y = Math.round(cy);
  const lx = Math.round(look * 1.2);

  // Sombra del pelo sobre la almohada / cuello.
  px(ctx, x - 9, y + 7, 18, 2, 'rgba(30,24,34,0.3)');

  // Melena trasera.
  px(ctx, x - 9, y - 8, 18, 15, C.outline);
  px(ctx, x - 8, y - 7, 16, 13, C.hairDark);
  px(ctx, x - 7, y - 6, 14, 12, C.hair);

  // Cara.
  px(ctx, x - 7, y - 4, 14, 10, C.outline);
  px(ctx, x - 6, y - 3, 12, 8, C.skin);
  px(ctx, x - 6, y + 3, 12, 2, C.skinShade);
  px(ctx, x + 4, y - 2, 2, 7, 'rgba(190,132,94,0.5)');
  px(ctx, x - 5, y - 2, 4, 2, C.skinLight);

  // Orejas.
  px(ctx, x - 8, y + 1, 2, 2, C.skinShade);
  px(ctx, x + 7, y + 1, 2, 2, C.skinShade);

  // Flequillo y mechones.
  px(ctx, x - 9, y - 8, 18, 6, C.hair);
  px(ctx, x - 9, y - 4, 2, 8, C.hair);
  px(ctx, x + 7, y - 4, 2, 8, C.hair);
  px(ctx, x - 7, y - 7, 6, 2, C.hairLight);
  px(ctx, x - 2, y - 7, 3, 1, C.hairLight);
  px(ctx, x + 3, y - 6, 3, 2, C.hair);
  px(ctx, x - 8, y - 1, 2, 2, C.hairDark);
  px(ctx, x + 6, y - 1, 2, 2, C.hairDark);

  // Cejas.
  const browLift = Math.round(startle);
  if (eyesOpen > 0.45) {
    px(ctx, x - 5 + lx, y - 2 - browLift, 3, 1, C.hairDark);
    px(ctx, x + 2 + lx, y - 2 - browLift, 3, 1, C.hairDark);
  }

  // Ojos abiertos o cerrados.
  const closed = eyesOpen < 0.45 || blink;
  if (closed) {
    px(ctx, x - 6, y + 1, 3, 1, C.outline);
    px(ctx, x + 2, y + 1, 3, 1, C.outline);
  } else {
    px(ctx, x - 6 + lx, y + 1, 3, 2, '#f7f2ea');
    px(ctx, x + 2 + lx, y + 1, 3, 2, '#f7f2ea');
    px(ctx, x - 5 + lx, y + 1, 1, 2, '#2a2233');
    px(ctx, x + 3 + lx, y + 1, 1, 2, '#2a2233');
    px(ctx, x - 5 + lx, y + 1, 1, 1, '#ffffff');
    px(ctx, x + 3 + lx, y + 1, 1, 1, '#ffffff');
  }

  // Nariz y boca.
  px(ctx, x + lx, y + 4, 1, 1, C.skinShade);
  if (startle > 0.4) {
    px(ctx, x - 1 + lx, y + 5, 2, 2, '#5a2a2c');
  } else {
    px(ctx, x - 1 + lx, y + 5, 3, 1, '#a8695c');
  }
}

function drawTorso(
  ctx: Ctx,
  cx: number,
  top: number,
  height: number,
  upright: number,
  palette: BedPixelPalette = BEDROOM_PIXEL_COLORS
): number {
  const C = palette;
  const x = Math.round(cx);
  const shoulderW = 12 + Math.round(upright * 2);
  const waistW = 11 + Math.round(upright * 2);

  // Capucha detrás del cuello.
  px(ctx, x - 7, top - 5, 14, 7, C.hoodDeep);
  px(ctx, x - 6, top - 5, 12, 2, C.hoodDark);

  // Cuello.
  px(ctx, x - 3, top - 2, 6, 3, C.skinShade);
  px(ctx, x - 2, top - 2, 4, 2, C.skin);

  // Torso de la sudadera en tres franjas.
  const rows = 3;
  for (let i = 0; i < rows; i += 1) {
    const k = i / (rows - 1);
    const w = Math.round(shoulderW + (waistW - shoulderW) * k);
    px(ctx, x - w / 2, top + (height * i) / rows, w, height / rows + 1, C.hood);
  }
  px(ctx, x - shoulderW / 2, top, shoulderW, 1, C.hoodLight);
  px(ctx, x - shoulderW / 2, top, 1, height, C.hoodLight);
  px(ctx, x + shoulderW / 2 - 1, top, 1, height, C.hoodDark);
  px(ctx, x - waistW / 2, top + height - 2, waistW, 2, C.hoodDeep);

  // Cremallera y cordones.
  px(ctx, x, top + 2, 1, height - 4, C.hoodDeep);
  px(ctx, x - 2, top + 2, 1, 4, '#d9c9a8');
  px(ctx, x + 2, top + 2, 1, 4, '#d9c9a8');
  px(ctx, x - 2, top + 5, 2, 1, '#b8a88a');
  px(ctx, x + 1, top + 5, 2, 1, '#b8a88a');

  // Bolsillo canguro.
  if (upright > 0.45) {
    px(ctx, x - 5, top + height - 5, 10, 4, C.hoodDark);
    px(ctx, x - 4, top + height - 4, 8, 3, C.hood);
    px(ctx, x - 3, top + height - 4, 6, 1, 'rgba(224,90,72,0.55)');
  }

  return shoulderW;
}

function drawSittingLegs(
  ctx: Ctx,
  cx: number,
  hipsY: number,
  legsOut: number,
  tuckedOnly: boolean,
  rise = 0,
  palette: BedPixelPalette = BEDROOM_PIXEL_COLORS
): number {
  const C = palette;
  const x = Math.round(cx);
  const k = clamp01(legsOut);
  const up = clamp01(rise);
  const thighLen = Math.round(6 - up);
  const shinLen = Math.round(9 + k * 8 - up * 5);
  const jeansTop = hipsY;

  // Muslos.
  px(ctx, x - 6, jeansTop, 5, thighLen + 1, C.jeansDark);
  px(ctx, x + 1, jeansTop, 5, thighLen + 1, C.jeansDark);
  px(ctx, x - 5, jeansTop, 4, thighLen, C.jeans);
  px(ctx, x + 2, jeansTop, 4, thighLen, C.jeans);
  px(ctx, x - 5, jeansTop, 1, thighLen, C.jeansLight);
  px(ctx, x + 2, jeansTop, 1, thighLen, C.jeansLight);

  if (tuckedOnly || k < 0.02 || up > 0.9) {
    // Rodillas recogidas sobre el colchón.
    px(ctx, x - 6, jeansTop + thighLen, 6, 4, C.jeans);
    px(ctx, x + 1, jeansTop + thighLen, 6, 4, C.jeans);
    px(ctx, x - 6, jeansTop + thighLen + 3, 5, 1, C.jeansDark);
    px(ctx, x + 1, jeansTop + thighLen + 3, 5, 1, C.jeansDark);
    px(ctx, x - 4, jeansTop + thighLen + 4, 3, 1, C.jeansLight);
    px(ctx, x + 2, jeansTop + thighLen + 4, 3, 1, C.jeansLight);
    return jeansTop + thighLen + 5;
  }

  // Pantorrillas colgando.
  const kneeY = jeansTop + thighLen;
  px(ctx, x - 6, kneeY, 5, shinLen, C.jeans);
  px(ctx, x + 1, kneeY, 5, shinLen, C.jeans);
  px(ctx, x - 6, kneeY, 1, shinLen, C.jeansLight);
  px(ctx, x + 1, kneeY, 1, shinLen, C.jeansLight);
  px(ctx, x - 6, kneeY + shinLen - 1, 5, 1, C.jeansDark);
  px(ctx, x + 1, kneeY + shinLen - 1, 5, 1, C.jeansDark);

  const footY = kneeY + shinLen;
  // Zapatillas.
  px(ctx, x - 7, footY, 8, 4, C.shoe);
  px(ctx, x + 1, footY, 8, 4, C.shoe);
  px(ctx, x - 7, footY + 2, 8, 2, C.shoeDark);
  px(ctx, x + 1, footY + 2, 8, 2, C.shoeDark);
  px(ctx, x - 6, footY, 5, 1, '#f4f1e8');
  px(ctx, x + 2, footY, 5, 1, '#f4f1e8');

  return footY + 4;
}

/**
 * Pixel en la cama. La posición de la cabeza ya incluye respiración, impulso
 * de sobresalto, incorporación y deslizamiento hacia el borde del colchón.
 */
export function drawPixelOnBed(ctx: Ctx, pose: BedPixelPose): void {
  const C = pose.palette ?? BEDROOM_PIXEL_COLORS;
  const alpha = pose.alpha ?? 1;
  const upright = clamp01(pose.upright);
  const headY = Math.round(pose.headY);
  const cx = Math.round(pose.headX);
  const breath = Math.sin(pose.time * 1.45) * (upright < 0.35 ? 0.5 : 0.25);
  const torsoTop = headY + 9 + Math.round(upright * 1);
  const torsoH = 9 + Math.round(upright * 2);
  const hipsY = torsoTop + torsoH;

  // Sombra del cuerpo sobre el colchón.
  drawShadow(
    ctx,
    cx,
    hipsY - 2,
    24 + upright * 4,
    14 + pose.legsOut * 8,
    0.22 * alpha * (pose.shadowScale ?? 1)
  );

  ctx.save();
  ctx.globalAlpha = alpha;

  // Piernas visibles (sólo cuando la manta ya se retiró).
  if (pose.legsVisible && upright > 0.45) {
    drawSittingLegs(
      ctx,
      cx,
      hipsY,
      pose.legsOut,
      pose.legsOut < 0.02,
      pose.rise ?? 0,
      C
    );
  }

  // Torso.
  const shoulderW = drawTorso(ctx, cx, torsoTop + breath * 0.2, torsoH, upright, C);

  // Brazos: se apoyan en el colchón al incorporarse.
  if (upright > 0.25) {
    const armTop = torsoTop + 2;
    const armLen = 7 + Math.round(upright * 2);
    px(ctx, cx - shoulderW / 2 - 3, armTop, 3, armLen, C.hoodDark);
    px(ctx, cx - shoulderW / 2 - 3, armTop, 2, armLen - 1, C.hood);
    px(ctx, cx + shoulderW / 2, armTop, 3, armLen, C.hoodDark);
    px(ctx, cx + shoulderW / 2, armTop, 2, armLen - 1, C.hood);
    px(ctx, cx - shoulderW / 2 - 3, armTop + armLen, 3, 2, C.skinShade);
    px(ctx, cx + shoulderW / 2, armTop + armLen, 3, 2, C.skinShade);
    px(ctx, cx - shoulderW / 2 - 2, armTop + armLen - 1, 2, 1, C.skin);
    px(ctx, cx + shoulderW / 2 + 1, armTop + armLen - 1, 2, 1, C.skin);
  } else {
    // Manos asomando sobre la manta.
    px(ctx, cx - 12, torsoTop + 10, 3, 2, C.skinShade);
    px(ctx, cx + 9, torsoTop + 10, 3, 2, C.skinShade);
  }

  // Cabeza y expresión.
  const blink = upright < 0.2 && Math.sin(pose.time * 0.37) > 0.982;
  drawHead(
    ctx,
    cx,
    headY + breath,
    pose.eyesOpen,
    pose.look,
    pose.startle,
    blink,
    C
  );

  // Brillo frío de la ventana sobre el hombro izquierdo.
  px(ctx, cx - shoulderW / 2, torsoTop + 1, 1, Math.min(7, torsoH - 2), 'rgba(120,170,235,0.3)');
  px(ctx, cx - 8, headY - 7, 2, 4, 'rgba(150,195,245,0.35)');

  ctx.restore();
}

/* =========================================================
   VIAJERO DEL FUTURO
   Misma densidad chibi que Pixel, silueta y paleta propias.
   ========================================================= */
export function drawTraveler(
  ctx: Ctx,
  x: number,
  feetY: number,
  time: number,
  alpha = 1,
  fade = 1
): void {
  const cx = Math.round(x);
  const feet = Math.round(feetY);
  const breathe = Math.sin(time * 1.7) * 0.4;
  const sway = Math.sin(time * 2.1) * 0.8;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawShadow(ctx, cx, feet + 1, 22, 6, 0.34 * alpha);

  // Halo temporal detrás del cuerpo.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const aura = ctx.createRadialGradient(cx, feet - 18, 2, cx, feet - 18, 26);
  aura.addColorStop(0, `rgba(111,227,230,${0.16 * alpha * fade})`);
  aura.addColorStop(0.55, `rgba(72,140,170,${0.08 * alpha * fade})`);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(cx - 30, feet - 48, 60, 56);
  ctx.restore();

  // Botas.
  px(ctx, cx - 7, feet - 3, 6, 3, T.leather);
  px(ctx, cx + 1, feet - 3, 6, 3, T.leather);
  px(ctx, cx - 7, feet - 1, 6, 1, '#120e0c');
  px(ctx, cx + 1, feet - 1, 6, 1, '#120e0c');
  px(ctx, cx - 6, feet - 3, 4, 1, '#5b4740');
  px(ctx, cx + 2, feet - 3, 4, 1, '#5b4740');

  // Abrigo largo con faldón y forro interior.
  px(ctx, cx - 8, feet - 20, 16, 18, T.outline);
  px(ctx, cx - 7, feet - 20, 14, 17, T.coat);
  px(ctx, cx - 6, feet - 19, 12, 15, T.coatMid);
  px(ctx, cx - 6, feet - 19, 3, 14, T.coatLight);
  px(ctx, cx + 4, feet - 19, 2, 14, T.coatDeep);
  px(ctx, cx - 5, feet - 8, 10, 4, T.coat);
  px(ctx, cx - 5, feet - 4, 2, 3, T.coatMid);
  px(ctx, cx + 2, feet - 4, 3, 3, T.coatMid);
  px(ctx, cx + 4, feet - 6, 1 + Math.round(sway * 0.4), 4, T.coatDeep);
  // Forro teal visible en el faldón.
  px(ctx, cx - 4, feet - 5, 1, 2, T.lining);
  px(ctx, cx + 2, feet - 5, 1, 2, T.lining);
  // Cinturón y hebilla.
  px(ctx, cx - 7, feet - 12, 14, 2, T.leather);
  px(ctx, cx - 1, feet - 12, 3, 2, T.metal);
  px(ctx, cx, feet - 12, 1, 1, T.metalLight);

  // Pliegue frontal del abrigo y correa del pecho.
  px(ctx, cx, feet - 19, 1, 8, T.coatDeep);
  px(ctx, cx - 6, feet - 16, 12, 1, T.leather);
  px(ctx, cx + 4, feet - 17, 2, 2, T.metal);

  // Brazo derecho (el más cercano) con dispositivo temporal.
  px(ctx, cx + 5, feet - 18, 4, 9, T.coatMid);
  px(ctx, cx + 5, feet - 18, 1, 8, T.coatLight);
  px(ctx, cx + 5, feet - 9, 4, 2, T.skinShade);
  px(ctx, cx + 4, feet - 12, 6, 2, T.leather);
  px(ctx, cx + 5, feet - 11, 4, 1, T.liningLight);
  px(ctx, cx + 6, feet - 10, 2, 1, T.device);
  // Brillo del dispositivo.
  px(ctx, cx + 7, feet - 11, 1, 1, '#e9ffff');

  // Brazo izquierdo.
  px(ctx, cx - 8, feet - 18, 3, 8, T.coatDeep);
  px(ctx, cx - 8, feet - 10, 3, 2, T.skinShade);

  // Cuello alto.
  px(ctx, cx - 5, feet - 22, 10, 3, T.coatDeep);
  px(ctx, cx - 4, feet - 22, 8, 2, T.lining);
  px(ctx, cx - 3, feet - 21, 6, 1, T.liningLight);

  // Cabeza: pelo plateado, gafas de aviador y rostro pálido.
  px(ctx, cx - 8, feet - 32 + Math.round(breathe), 16, 12, T.outline);
  px(ctx, cx - 7, feet - 31 + Math.round(breathe), 14, 10, T.hairShade);
  px(ctx, cx - 6, feet - 30 + Math.round(breathe), 12, 8, T.hair);
  px(ctx, cx - 6, feet - 25 + Math.round(breathe), 12, 7, T.outline);
  px(ctx, cx - 5, feet - 24 + Math.round(breathe), 10, 6, T.skin);
  px(ctx, cx - 4, feet - 19 + Math.round(breathe), 8, 1, T.skinShade);
  px(ctx, cx + 3, feet - 24 + Math.round(breathe), 1, 5, T.skinShade);
  // Flequillo.
  px(ctx, cx - 8, feet - 32 + Math.round(breathe), 16, 4, T.hair);
  px(ctx, cx - 8, feet - 28 + Math.round(breathe), 2, 3, T.hair);
  px(ctx, cx + 6, feet - 28 + Math.round(breathe), 2, 3, T.hair);
  px(ctx, cx - 5, feet - 32 + Math.round(breathe), 5, 1, '#eef4f6');
  // Gafas sobre la frente con lentes ámbar.
  px(ctx, cx - 6, feet - 28 + Math.round(breathe), 12, 3, T.leather);
  px(ctx, cx - 5, feet - 28 + Math.round(breathe), 4, 2, T.lens);
  px(ctx, cx + 2, feet - 28 + Math.round(breathe), 4, 2, T.lens);
  px(ctx, cx - 4, feet - 28 + Math.round(breathe), 1, 1, T.lensGlow);
  px(ctx, cx + 3, feet - 28 + Math.round(breathe), 1, 1, T.lensGlow);
  px(ctx, cx - 1, feet - 27 + Math.round(breathe), 2, 1, T.leather);
  // Ojos claros.
  px(ctx, cx - 4, feet - 23 + Math.round(breathe), 2, 1, T.lensGlow);
  px(ctx, cx + 2, feet - 23 + Math.round(breathe), 2, 1, T.lensGlow);

  // Rim light frío del pasillo sobre el lado izquierdo.
  px(ctx, cx - 8, feet - 20, 1, 12, 'rgba(140,220,235,0.35)');
  px(ctx, cx - 8, feet - 31, 1, 8, 'rgba(180,240,250,0.3)');

  ctx.restore();
}

/**
 * Silueta iluminada por el relámpago, a la misma escala que el sprite VX
 * (18 × 33 px). Sólo acentúa el contraluz; no sustituye al personaje.
 */
export function drawPixelSilhouette(
  ctx: Ctx,
  x: number,
  feetY: number,
  alpha: number
): void {
  const cx = Math.round(x);
  const feet = Math.round(feetY);
  ctx.save();
  ctx.globalAlpha = alpha;
  px(ctx, cx - 8, feet - 32, 16, 16, '#0d1020');
  px(ctx, cx - 7, feet - 13, 14, 7, '#0d1020');
  px(ctx, cx - 6, feet - 6, 5, 6, '#0d1020');
  px(ctx, cx + 1, feet - 6, 5, 6, '#0d1020');
  px(ctx, cx - 8, feet - 31, 1, 10, 'rgba(150,195,245,0.55)');
  px(ctx, cx - 8, feet - 16, 1, 7, 'rgba(150,195,245,0.4)');
  ctx.restore();
}
