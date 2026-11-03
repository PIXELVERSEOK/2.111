/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar»
 * Pixel dibujado a mano para la secuencia de sueño: acostado, sobresaltado,
 * incorporándose, sentado, girando las piernas y de pie.
 *
 * Las poses comparten la misma identidad visual que la cinemática: sudadera
 * roja, pelo castaño, piel cálida y zapatillas claras. No se deforma ni se
 * traslada una imagen estática: cada fase tiene su propia construcción.
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

const C = BEDROOM_PIXEL_COLORS;

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

function drawHead(
  ctx: Ctx,
  cx: number,
  cy: number,
  eyesOpen: number,
  look: number,
  startle: number,
  blink: boolean
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  const lx = Math.round(look * 1.5);

  // Sombra del pelo sobre la almohada / cuello.
  px(ctx, x - 10, y + 8, 20, 3, 'rgba(30,24,34,0.35)');

  // Melena trasera.
  px(ctx, x - 10, y - 10, 20, 19, C.outline);
  px(ctx, x - 9, y - 9, 18, 17, C.hairDark);
  px(ctx, x - 8, y - 9, 16, 15, C.hair);

  // Cara.
  px(ctx, x - 7, y - 4, 14, 13, C.outline);
  px(ctx, x - 6, y - 3, 12, 11, C.skin);
  px(ctx, x - 6, y + 5, 12, 3, C.skinShade);
  px(ctx, x + 4, y - 2, 2, 9, 'rgba(190,132,94,0.5)');
  px(ctx, x - 5, y - 2, 4, 2, C.skinLight);

  // Orejas.
  px(ctx, x - 8, y + 1, 2, 3, C.skinShade);
  px(ctx, x + 7, y + 1, 2, 3, C.skinShade);

  // Flequillo y mechones.
  px(ctx, x - 9, y - 9, 18, 7, C.hair);
  px(ctx, x - 9, y - 4, 3, 9, C.hair);
  px(ctx, x + 6, y - 4, 3, 9, C.hair);
  px(ctx, x - 7, y - 8, 7, 2, C.hairLight);
  px(ctx, x - 2, y - 8, 4, 1, C.hairLight);
  px(ctx, x + 3, y - 7, 4, 3, C.hair);
  px(ctx, x - 8, y - 1, 2, 3, C.hairDark);
  px(ctx, x + 6, y - 1, 2, 3, C.hairDark);

  // Cejas.
  const browLift = Math.round(startle * 1.2);
  if (eyesOpen > 0.45) {
    px(ctx, x - 6 + lx, y - 2 - browLift, 4, 1, C.hairDark);
    px(ctx, x + 2 + lx, y - 2 - browLift, 4, 1, C.hairDark);
  }

  // Ojos abiertos o cerrados.
  const closed = eyesOpen < 0.45 || blink;
  if (closed) {
    px(ctx, x - 6, y + 1, 4, 1, C.outline);
    px(ctx, x + 2, y + 1, 4, 1, C.outline);
    px(ctx, x - 6, y + 2, 1, 1, C.skinShade);
    px(ctx, x + 5, y + 2, 1, 1, C.skinShade);
  } else {
    px(ctx, x - 6 + lx, y, 4, 3, '#f7f2ea');
    px(ctx, x + 2 + lx, y, 4, 3, '#f7f2ea');
    px(ctx, x - 5 + lx, y + 1, 2, 2, '#2a2233');
    px(ctx, x + 3 + lx, y + 1, 2, 2, '#2a2233');
    px(ctx, x - 5 + lx, y + 1, 1, 1, '#ffffff');
    px(ctx, x + 3 + lx, y + 1, 1, 1, '#ffffff');
  }

  // Nariz.
  px(ctx, x + lx, y + 4, 2, 2, C.skinShade);

  // Boca.
  if (startle > 0.4) {
    px(ctx, x - 1 + lx, y + 8, 3, 2, '#5a2a2c');
    px(ctx, x, y + 8, 1, 1, '#2a1418');
  } else {
    px(ctx, x - 2 + lx, y + 8, 4, 1, '#a8695c');
  }
}

function drawTorso(ctx: Ctx, cx: number, top: number, height: number, upright: number): number {
  const x = Math.round(cx);
  const shoulderW = 18 + Math.round(upright * 8);
  const waistW = 16 + Math.round(upright * 8);

  // Capucha detrás del cuello.
  px(ctx, x - 9, top - 6, 18, 9, C.hoodDeep);
  px(ctx, x - 8, top - 6, 16, 3, C.hoodDark);

  // Cuello.
  px(ctx, x - 4, top - 3, 8, 5, C.skinShade);
  px(ctx, x - 3, top - 3, 6, 3, C.skin);

  // Torso de la sudadera.
  const rows = 4;
  for (let i = 0; i < rows; i += 1) {
    const k = i / (rows - 1);
    const w = Math.round(shoulderW + (waistW - shoulderW) * k);
    px(ctx, x - w / 2, top + (height * i) / rows, w, height / rows + 1, C.hood);
  }
  px(ctx, x - shoulderW / 2, top, shoulderW, 2, C.hoodLight);
  px(ctx, x - shoulderW / 2, top, 2, height, C.hoodLight);
  px(ctx, x + shoulderW / 2 - 2, top, 2, height, C.hoodDark);
  px(ctx, x - waistW / 2, top + height - 3, waistW, 3, C.hoodDeep);

  // Cremallera y cordones.
  px(ctx, x, top + 4, 1, height - 7, C.hoodDeep);
  px(ctx, x - 3, top + 2, 1, 6, '#d9c9a8');
  px(ctx, x + 2, top + 2, 1, 6, '#d9c9a8');
  px(ctx, x - 3, top + 7, 2, 1, '#b8a88a');
  px(ctx, x + 1, top + 7, 2, 1, '#b8a88a');

  // Bolsillo canguro.
  if (upright > 0.45) {
    px(ctx, x - 7, top + height - 13, 14, 7, C.hoodDark);
    px(ctx, x - 6, top + height - 12, 12, 5, C.hood);
    px(ctx, x - 5, top + height - 12, 10, 1, 'rgba(224,90,72,0.55)');
  }

  return shoulderW;
}

function drawSittingLegs(
  ctx: Ctx,
  cx: number,
  hipsY: number,
  legsOut: number,
  tuckedOnly: boolean,
  rise = 0
): number {
  const x = Math.round(cx);
  const k = clamp01(legsOut);
  const up = clamp01(rise);
  const thighLen = Math.round(8 - up * 2);
  const shinLen = Math.round(12 + k * 8 - up * 6);
  const jeansTop = hipsY;

  // Muslos.
  px(ctx, x - 10, jeansTop, 8, thighLen + 2, C.jeansDark);
  px(ctx, x + 3, jeansTop, 8, thighLen + 2, C.jeansDark);
  px(ctx, x - 9, jeansTop, 6, thighLen, C.jeans);
  px(ctx, x + 4, jeansTop, 6, thighLen, C.jeans);
  px(ctx, x - 9, jeansTop, 2, thighLen, C.jeansLight);
  px(ctx, x + 4, jeansTop, 2, thighLen, C.jeansLight);

  if (tuckedOnly || k < 0.02) {
    // Rodillas recogidas sobre el colchón.
    px(ctx, x - 10, jeansTop + thighLen - 1, 9, 6, C.jeans);
    px(ctx, x + 2, jeansTop + thighLen - 1, 9, 6, C.jeans);
    px(ctx, x - 10, jeansTop + thighLen + 3, 8, 2, C.jeansDark);
    px(ctx, x + 2, jeansTop + thighLen + 3, 8, 2, C.jeansDark);
    px(ctx, x - 7, jeansTop + thighLen + 5, 4, 1, C.jeansLight);
    px(ctx, x + 5, jeansTop + thighLen + 5, 4, 1, C.jeansLight);
    return jeansTop + thighLen + 6;
  }

  // Pantorrillas colgando.
  const kneeY = jeansTop + thighLen;
  px(ctx, x - 10, kneeY, 8, shinLen, C.jeans);
  px(ctx, x + 2, kneeY, 8, shinLen, C.jeans);
  px(ctx, x - 10, kneeY, 2, shinLen, C.jeansLight);
  px(ctx, x + 2, kneeY, 2, shinLen, C.jeansLight);
  px(ctx, x - 10, kneeY + shinLen - 2, 8, 2, C.jeansDark);
  px(ctx, x + 2, kneeY + shinLen - 2, 8, 2, C.jeansDark);

  const footY = kneeY + shinLen;
  // Zapatillas.
  px(ctx, x - 11, footY, 10, 5, C.shoe);
  px(ctx, x + 1, footY, 10, 5, C.shoe);
  px(ctx, x - 11, footY + 3, 10, 2, C.shoeDark);
  px(ctx, x + 1, footY + 3, 10, 2, C.shoeDark);
  px(ctx, x - 10, footY, 7, 1, '#f4f1e8');
  px(ctx, x + 2, footY, 7, 1, '#f4f1e8');
  px(ctx, x - 9, footY + 1, 2, 1, '#c9c5b7');
  px(ctx, x + 3, footY + 1, 2, 1, '#c9c5b7');

  return footY + 5;
}

/**
 * Pixel en la cama. La posición de la cabeza ya incluye respiración, impulso
 * de sobresalto, incorporación y deslizamiento hacia el borde del colchón.
 */
export function drawPixelOnBed(ctx: Ctx, pose: BedPixelPose): void {
  const alpha = pose.alpha ?? 1;
  const upright = clamp01(pose.upright);
  const headY = Math.round(pose.headY);
  const cx = Math.round(pose.headX);
  const breath = Math.sin(pose.time * 1.45) * (upright < 0.35 ? 0.6 : 0.3);
  const torsoTop = headY + 8 + Math.round(upright * 3);
  const torsoH = 16 + Math.round(upright * 8);
  const hipsY = torsoTop + torsoH;

  // Sombra del cuerpo sobre el colchón.
  drawShadow(
    ctx,
    cx,
    hipsY - 2,
    34 + upright * 8,
    20 + pose.legsOut * 12,
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
      pose.rise ?? 0
    );
  }

  // Torso.
  const shoulderW = drawTorso(ctx, cx + (upright > 0.4 ? 0 : 0), torsoTop + breath * 0.2, torsoH, upright);

  // Brazos: se apoyan en el colchón al incorporarse.
  if (upright > 0.25) {
    const armTop = torsoTop + 5;
    const armLen = 10 + Math.round(upright * 8);
    px(ctx, cx - shoulderW / 2 - 4, armTop, 5, armLen, C.hoodDark);
    px(ctx, cx - shoulderW / 2 - 4, armTop, 4, armLen - 2, C.hood);
    px(ctx, cx + shoulderW / 2 - 1, armTop, 5, armLen, C.hoodDark);
    px(ctx, cx + shoulderW / 2 - 1, armTop, 4, armLen - 2, C.hood);
    px(ctx, cx - shoulderW / 2 - 4, armTop + armLen, 5, 3, C.skinShade);
    px(ctx, cx + shoulderW / 2 - 1, armTop + armLen, 5, 3, C.skinShade);
    px(ctx, cx - shoulderW / 2 - 3, armTop + armLen - 1, 3, 2, C.skin);
    px(ctx, cx + shoulderW / 2, armTop + armLen - 1, 3, 2, C.skin);
  } else {
    // Manos asomando sobre la manta.
    px(ctx, cx - 18, torsoTop + 12, 4, 3, C.skinShade);
    px(ctx, cx + 14, torsoTop + 12, 4, 3, C.skinShade);
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
    blink
  );

  // Brillo frío de la ventana sobre el hombro izquierdo.
  px(ctx, cx - shoulderW / 2 - 1, torsoTop + 1, 2, Math.min(10, torsoH - 2), 'rgba(120,170,235,0.3)');
  px(ctx, cx - 9, headY - 8, 2, 5, 'rgba(150,195,245,0.35)');

  ctx.restore();
}

/** Pixel de pie, dibujado con el mismo lenguaje de píxeles que las poses de cama. */
export function drawPixelStandingCustom(
  ctx: Ctx,
  x: number,
  feetY: number,
  time: number,
  alpha = 1,
  look = 0,
  lean = 0
): void {
  const pxX = Math.round(x);
  const feet = Math.round(feetY);
  const breathe = Math.sin(time * 1.8) * 0.4;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawShadow(ctx, pxX, feet + 1, 24, 7, 0.3 * alpha);

  if (alpha < 0.99) {
    ctx.globalAlpha = alpha;
  }

  // Piernas.
  px(ctx, pxX - 8, feet - 16, 7, 14, C.jeansDark);
  px(ctx, pxX + 1, feet - 16, 7, 14, C.jeansDark);
  px(ctx, pxX - 7, feet - 15, 5, 12, C.jeans);
  px(ctx, pxX + 2, feet - 15, 5, 12, C.jeans);
  px(ctx, pxX - 7, feet - 15, 1, 10, C.jeansLight);
  px(ctx, pxX + 2, feet - 15, 1, 10, C.jeansLight);

  // Zapatillas.
  px(ctx, pxX - 9, feet - 4, 9, 5, C.shoe);
  px(ctx, pxX + 1, feet - 4, 9, 5, C.shoe);
  px(ctx, pxX - 9, feet - 1, 9, 2, C.shoeDark);
  px(ctx, pxX + 1, feet - 1, 9, 2, C.shoeDark);
  px(ctx, pxX - 8, feet - 4, 6, 1, '#f4f1e8');
  px(ctx, pxX + 2, feet - 4, 6, 1, '#f4f1e8');

  // Torso con inclinación de despertar.
  const leanX = Math.round(lean * 2);
  const torsoTop = feet - 38 + breathe;
  const torsoH = 22;
  for (let i = 0; i < 4; i += 1) {
    const w = i === 0 ? 20 : i === 1 ? 22 : i === 2 ? 23 : 21;
    px(ctx, pxX - w / 2 + Math.round(leanX * (i / 4)), torsoTop + (torsoH * i) / 4, w, torsoH / 4 + 1, C.hood);
  }
  px(ctx, pxX - 10, torsoTop, 20, 2, C.hoodLight);
  px(ctx, pxX - 10, torsoTop, 2, torsoH, C.hoodLight);
  px(ctx, pxX + 9, torsoTop, 2, torsoH, C.hoodDark);
  px(ctx, pxX, torsoTop + 4, 1, torsoH - 8, C.hoodDeep);
  px(ctx, pxX - 3 + leanX, torsoTop + 2, 1, 6, '#d9c9a8');
  px(ctx, pxX + 2 + leanX, torsoTop + 2, 1, 6, '#d9c9a8');
  px(ctx, pxX - 7 + leanX, torsoTop + torsoH - 9, 14, 7, C.hoodDark);
  px(ctx, pxX - 6 + leanX, torsoTop + torsoH - 8, 12, 5, C.hood);
  px(ctx, pxX - 5 + leanX, torsoTop + torsoH - 8, 10, 1, 'rgba(224,90,72,0.55)');

  // Brazos.
  px(ctx, pxX - 13, torsoTop + 3, 5, 17, C.hood);
  px(ctx, pxX + 8, torsoTop + 3, 5, 17, C.hoodDark);
  px(ctx, pxX - 13, torsoTop + 3, 1, 14, C.hoodLight);
  px(ctx, pxX - 13, torsoTop + 19, 5, 3, C.skinShade);
  px(ctx, pxX + 8, torsoTop + 19, 5, 3, C.skinShade);

  // Cuello, capucha y cabeza.
  px(ctx, pxX - 4, torsoTop - 4, 8, 5, C.skinShade);
  px(ctx, pxX - 9, torsoTop - 5, 18, 5, C.hoodDeep);
  drawHead(ctx, pxX, torsoTop - 14 + breathe * 0.4, 1, look, 0, false);

  // Luz fría del ventanal.
  px(ctx, pxX - 10, torsoTop + 1, 2, 13, 'rgba(120,170,235,0.26)');
  px(ctx, pxX - 9, torsoTop - 22, 2, 5, 'rgba(150,195,245,0.32)');

  ctx.restore();
}

/** Silueta iluminada por el relámpago, útil para acentuar el contraluz. */
export function drawPixelSilhouette(
  ctx: Ctx,
  x: number,
  feetY: number,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  px(ctx, x - 9, feetY - 33, 18, 18, '#0d1020');
  px(ctx, x - 11, feetY - 16, 22, 14, '#0d1020');
  px(ctx, x - 9, feetY - 3, 8, 3, '#0d1020');
  px(ctx, x + 1, feetY - 3, 8, 3, '#0d1020');
  px(ctx, x - 10, feetY - 33, 2, 6, 'rgba(150,195,245,0.5)');
  px(ctx, x - 12, feetY - 14, 2, 8, 'rgba(150,195,245,0.4)');
  ctx.restore();
}
