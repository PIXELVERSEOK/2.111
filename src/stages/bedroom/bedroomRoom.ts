/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar» / «La señal»
 * Renderizador procedural de la habitación de Pixel.
 *
 * Todo se dibuja en capas independientes a 1 px de resolución nativa:
 * suelo, muro, ventana, cortinas, muebles, alfombra, cama, manta y puerta.
 * No se usa ninguna imagen de fondo: cada objeto mantiene su propio volumen,
 * sombra de contacto y lectura espacial coherente con la luz del ventanal.
 */

import { BEDROOM_W, BEDROOM_H, BEDROOM_WALL_BOTTOM } from './bedroomData';

export interface BedroomRoomState {
  time: number;
  flash: number;
  curtainSway: number;
  blanketTop: number;
  blanketPull: number;
  /** 0 cerrada · 1 abierta de par en par. */
  doorOpen?: number;
  /** Sacudida de la hoja al recibir los golpes (0..1). */
  knockJolt?: number;
  /** La radio encendida ilumina el escritorio con un ámbar cálido. */
  radioActive?: boolean;
}

type Ctx = CanvasRenderingContext2D;

const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
};

const line = (
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1
): void => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
  ctx.stroke();
};

const FLOOR_PLANKS = ['#3b2b23', '#422f26', '#34251f', '#473429', '#39271f', '#4b382c'];

/** Veta corta y irregular, repetible, para cualquier superficie de madera. */
function grain(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  dark = 'rgba(20,12,8,0.22)',
  light = 'rgba(255,214,168,0.055)'
): void {
  for (let i = 0; i < 5; i += 1) {
    const gx = x + 2 + ((seed * 13 + i * 7) % Math.max(2, w - 4));
    const gy = y + 3 + ((seed * 29 + i * 17) % Math.max(2, h - 6));
    px(ctx, gx, gy, 1, 2 + ((seed + i) % 4), i % 2 === 0 ? dark : light);
  }
}

/* =========================================================
   SUELO Y MURO
   ========================================================= */
function drawFloor(ctx: Ctx, time: number): void {
  px(ctx, 0, 0, BEDROOM_W, BEDROOM_H, '#171a26');

  for (let i = 0; i < 21; i += 1) {
    const x = i * 24;
    px(ctx, x, BEDROOM_WALL_BOTTOM, 24, BEDROOM_H - BEDROOM_WALL_BOTTOM, FLOOR_PLANKS[i % FLOOR_PLANKS.length]);
    // Bisel de cada tabla.
    px(ctx, x, BEDROOM_WALL_BOTTOM, 1, BEDROOM_H - BEDROOM_WALL_BOTTOM, 'rgba(255,205,160,0.045)');
    px(ctx, x + 1, BEDROOM_WALL_BOTTOM, 1, BEDROOM_H - BEDROOM_WALL_BOTTOM, 'rgba(255,220,180,0.018)');
    px(ctx, x + 22, BEDROOM_WALL_BOTTOM, 1, BEDROOM_H - BEDROOM_WALL_BOTTOM, 'rgba(10,6,4,0.35)');
    px(ctx, x + 23, BEDROOM_WALL_BOTTOM, 1, BEDROOM_H - BEDROOM_WALL_BOTTOM, '#1c120d');

    // Juntas transversales alternadas.
    const offset = (i * 43) % 96;
    for (let y = BEDROOM_WALL_BOTTOM + offset; y < BEDROOM_H; y += 96) {
      px(ctx, x + 1, y, 22, 1, '#241812');
      px(ctx, x + 2, y + 1, 20, 1, 'rgba(255,210,170,0.03)');
      px(ctx, x + 2, y - 1, 9, 1, 'rgba(255,210,170,0.06)');
    }

    // Vetas, nudos y marcas de uso.
    grain(ctx, x, BEDROOM_WALL_BOTTOM, 24, 236, i + 3);
    if (i % 4 === 1) {
      const kx = x + 7 + (i % 5) * 3;
      const ky = BEDROOM_WALL_BOTTOM + 46 + ((i * 31) % 150);
      ctx.save();
      ctx.fillStyle = 'rgba(24,14,10,0.4)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 2.5, 1.4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,180,0.05)';
      ctx.fillRect(kx - 2, ky - 1, 5, 1);
      ctx.restore();
    }
    if (i % 6 === 2) {
      const sx = x + 6 + ((i * 17) % 12);
      const sy = BEDROOM_WALL_BOTTOM + 60 + ((i * 37) % 140);
      px(ctx, sx, sy, 1, 6, 'rgba(255,225,185,0.035)');
      px(ctx, sx + 1, sy + 4, 2, 1, 'rgba(255,225,185,0.03)');
    }
  }

  // Sombra de contacto con el muro.
  const wallShade = ctx.createLinearGradient(0, BEDROOM_WALL_BOTTOM, 0, BEDROOM_WALL_BOTTOM + 22);
  wallShade.addColorStop(0, 'rgba(4,6,12,0.55)');
  wallShade.addColorStop(0.5, 'rgba(4,6,12,0.22)');
  wallShade.addColorStop(1, 'rgba(4,6,12,0)');
  ctx.fillStyle = wallShade;
  ctx.fillRect(0, BEDROOM_WALL_BOTTOM, BEDROOM_W, 22);
  px(ctx, 0, BEDROOM_WALL_BOTTOM + 2, BEDROOM_W, 1, 'rgba(3,5,10,0.4)');

  // Charco de luz fría que entra por la ventana.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const pool = ctx.createRadialGradient(241, 116, 8, 241, 128, 168);
  pool.addColorStop(0, 'rgba(78,128,196,0.22)');
  pool.addColorStop(0.45, 'rgba(54,96,160,0.11)');
  pool.addColorStop(1, 'rgba(20,40,80,0)');
  ctx.fillStyle = pool;
  ctx.fillRect(90, 78, 300, 230);
  ctx.restore();

  // Reflejo húmedo del ventanal sobre la madera.
  ctx.save();
  ctx.globalAlpha = 0.1 + Math.sin(time * 0.35) * 0.015;
  px(ctx, 214, 150, 3, 58, '#9dc7f2');
  px(ctx, 258, 144, 2, 72, '#8bb8ea');
  px(ctx, 232, 158, 2, 40, '#b4d6f7');
  px(ctx, 246, 168, 1, 50, '#7da9d8');
  ctx.globalAlpha = 0.05;
  px(ctx, 206, 176, 24, 1, '#bcd7f6');
  px(ctx, 226, 206, 32, 1, '#bcd7f6');
  ctx.restore();
}

function drawWall(ctx: Ctx): void {
  px(ctx, 0, 0, BEDROOM_W, BEDROOM_WALL_BOTTOM, '#242c44');

  const shade = ctx.createLinearGradient(0, 0, 0, BEDROOM_WALL_BOTTOM);
  shade.addColorStop(0, 'rgba(4,7,16,0.5)');
  shade.addColorStop(0.5, 'rgba(6,10,22,0.14)');
  shade.addColorStop(1, 'rgba(10,15,28,0.32)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, BEDROOM_W, BEDROOM_WALL_BOTTOM);

  // Papel de pared: damasco discreto.
  for (let y = 10; y < BEDROOM_WALL_BOTTOM - 8; y += 18) {
    for (let x = 14 + ((y / 18) % 2) * 9; x < BEDROOM_W - 8; x += 18) {
      px(ctx, x, y, 1, 1, 'rgba(190,210,245,0.06)');
      px(ctx, x + 2, y + 1, 1, 1, 'rgba(190,210,245,0.03)');
      px(ctx, x - 1, y + 2, 1, 1, 'rgba(190,210,245,0.022)');
      px(ctx, x + 1, y - 1, 1, 1, 'rgba(190,210,245,0.02)');
    }
  }

  // Textura de yeso y pequeñas imperfecciones.
  for (let i = 0; i < 90; i += 1) {
    const x = 8 + ((i * 61) % (BEDROOM_W - 16));
    const y = 6 + ((i * 37) % 58);
    px(ctx, x, y, 1, 1, i % 3 === 0 ? 'rgba(255,245,225,0.028)' : 'rgba(10,14,26,0.06)');
  }
  for (let i = 0; i < 4; i += 1) {
    px(ctx, 30 + i * 108, 18 + (i % 2) * 26, 10, 1, 'rgba(6,10,20,0.08)');
    px(ctx, 32 + i * 108, 19 + (i % 2) * 26, 5, 1, 'rgba(255,245,225,0.025)');
  }

  // Cornisa superior.
  px(ctx, 0, 0, BEDROOM_W, 4, '#313a55');
  px(ctx, 0, 4, BEDROOM_W, 1, '#151a2a');
  px(ctx, 0, 0, BEDROOM_W, 1, 'rgba(196,214,246,0.16)');

  // Zócalo con doble moldura.
  px(ctx, 0, 69, BEDROOM_W, 2, '#151b2b');
  px(ctx, 0, 71, BEDROOM_W, 1, 'rgba(178,198,238,0.2)');
  px(ctx, 0, 72, BEDROOM_W, 4, '#1b2132');
  px(ctx, 0, 76, BEDROOM_W, 2, '#101522');
  px(ctx, 0, 77, BEDROOM_W, 1, '#080c14');

  // Esquinas de la habitación.
  px(ctx, 0, 0, 7, BEDROOM_H, '#151726');
  px(ctx, BEDROOM_W - 7, 0, 7, BEDROOM_H, '#141625');
  px(ctx, 6, 0, 1, BEDROOM_H, 'rgba(160,185,230,0.1)');
  px(ctx, BEDROOM_W - 8, 0, 1, BEDROOM_H, 'rgba(160,185,230,0.07)');

  // Toma de corriente junto al escritorio.
  px(ctx, 160, 58, 8, 10, '#1a2030');
  px(ctx, 161, 59, 6, 8, '#2c3750');
  px(ctx, 163, 61, 2, 2, '#0c101a');
  px(ctx, 163, 65, 2, 2, '#0c101a');
}

/* =========================================================
   VENTANA Y TORMENTA
   ========================================================= */
function drawWindow(ctx: Ctx, state: BedroomRoomState): void {
  const gx = 189;
  const gy = 14;
  const gw = 104;
  const gh = 54;

  // Marco exterior, sombra proyectada y moldura escalonada.
  px(ctx, 178, 6, 128, 70, 'rgba(3,5,12,0.55)');
  px(ctx, 181, 8, 122, 68, '#241e2c');
  px(ctx, 183, 10, 118, 64, '#2b2434');
  px(ctx, 181, 10, 2, 64, '#1b1926');
  px(ctx, 301, 10, 2, 64, '#1b1926');
  px(ctx, 184, 11, 116, 1, 'rgba(196,214,246,0.28)');
  px(ctx, 184, 11, 1, 61, 'rgba(196,214,246,0.16)');
  px(ctx, 300, 12, 1, 60, 'rgba(10,8,16,0.55)');
  px(ctx, 184, 72, 116, 1, '#120f1a');

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip();

  // Cielo tormentoso.
  const sky = ctx.createLinearGradient(0, gy, 0, gy + gh);
  sky.addColorStop(0, '#243a63');
  sky.addColorStop(0.55, '#162644');
  sky.addColorStop(1, '#0a1224');
  ctx.fillStyle = sky;
  ctx.fillRect(gx, gy, gw, gh);

  // Nubes y resplandor lejano.
  ctx.globalAlpha = 0.5;
  px(ctx, gx + 2, gy + 6, 42, 9, '#314a75');
  px(ctx, gx + 12, gy + 3, 34, 7, '#3a547f');
  px(ctx, gx + 64, gy + 12, 30, 7, '#2d4269');
  px(ctx, gx + 72, gy + 8, 16, 5, '#425d89');
  ctx.globalAlpha = 1;
  px(ctx, gx + 76, gy + 34, 10, 1, 'rgba(140,170,210,0.32)');
  px(ctx, gx + 88, gy + 34, 6, 1, 'rgba(140,170,210,0.18)');

  // Isla lejana y mar.
  ctx.fillStyle = '#0a1428';
  ctx.beginPath();
  ctx.moveTo(gx, gy + 43);
  ctx.lineTo(gx + 14, gy + 37);
  ctx.lineTo(gx + 26, gy + 40);
  ctx.lineTo(gx + 42, gy + 33);
  ctx.lineTo(gx + 55, gy + 39);
  ctx.lineTo(gx + 66, gy + 35);
  ctx.lineTo(gx + 82, gy + 41);
  ctx.lineTo(gx + 104, gy + 36);
  ctx.lineTo(gx + 104, gy + 54);
  ctx.lineTo(gx, gy + 54);
  ctx.closePath();
  ctx.fill();
  px(ctx, gx, gy + 45, gw, 1, 'rgba(108,146,196,0.22)');
  px(ctx, gx, gy + 49, gw, 1, 'rgba(96,132,180,0.12)');
  px(ctx, gx + 72, gy + 46, 22, 1, 'rgba(150,190,235,0.16)');
  px(ctx, gx + 12, gy + 50, 30, 1, 'rgba(120,160,210,0.1)');

  // Lluvia sobre el cristal.
  const rainCount = 58;
  for (let i = 0; i < rainCount; i += 1) {
    const speed = 46 + (i % 7) * 9;
    const x = gx + ((i * 37 + ((i * i) % 19)) % gw);
    const y = gy + ((i * 23 + state.time * speed) % (gh + 8)) - 6;
    const len = 4 + (i % 4) * 2;
    ctx.globalAlpha = 0.14 + (i % 5) * 0.035;
    px(ctx, x, y, 1, len, '#b9d6ff');
    if (i % 5 === 0) px(ctx, x - 1, y + len, 1, 1, '#d8e9ff');
  }
  ctx.globalAlpha = 1;

  // Gotas adheridas y regueros.
  for (let i = 0; i < 18; i += 1) {
    const x = gx + 5 + ((i * 29) % (gw - 10));
    const y = gy + 8 + ((i * 17) % (gh - 16));
    px(ctx, x, y, 1, 1, 'rgba(205,230,255,0.34)');
    if (i % 4 === 0) px(ctx, x, y + 1, 1, 2, 'rgba(205,230,255,0.16)');
  }
  for (let i = 0; i < 5; i += 1) {
    const drift = (state.time * (3 + i) + i * 17) % 38;
    const x = gx + 20 + i * 18;
    const y = gy + 6 + drift;
    ctx.globalAlpha = 0.16;
    px(ctx, x, y, 1, 6, '#c6e0ff');
    px(ctx, x + 1, y + 6, 1, 2, '#c6e0ff');
    ctx.globalAlpha = 1;
  }

  // Condensación en los bordes del cristal.
  ctx.globalAlpha = 0.1;
  px(ctx, gx, gy, gw, 3, '#cfe4ff');
  px(ctx, gx, gy, 3, gh, '#cfe4ff');
  px(ctx, gx, gy + gh - 4, gw, 4, 'rgba(207,228,255,0.7)');
  ctx.globalAlpha = 1;

  // Relámpago dentro del cristal.
  if (state.flash > 0.12) {
    const boltAlpha = Math.min(1, state.flash * 1.3);
    ctx.globalAlpha = boltAlpha;
    ctx.strokeStyle = '#eaf4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx + 61, gy + 4);
    ctx.lineTo(gx + 56, gy + 17);
    ctx.lineTo(gx + 62, gy + 20);
    ctx.lineTo(gx + 54, gy + 34);
    ctx.lineTo(gx + 59, gy + 36);
    ctx.lineTo(gx + 50, gy + 48);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,210,255,0.7)';
    ctx.lineWidth = 4;
    ctx.globalAlpha = boltAlpha * 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (state.flash > 0.02) {
    ctx.fillStyle = `rgba(196,224,255,${state.flash * 0.42})`;
    ctx.fillRect(gx, gy, gw, gh);
  }

  // Reflejos diagonales del cristal.
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#dbeaff';
  ctx.beginPath();
  ctx.moveTo(gx + 8, gy + gh);
  ctx.lineTo(gx + 30, gy);
  ctx.lineTo(gx + 38, gy);
  ctx.lineTo(gx + 16, gy + gh);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();

  // Travesaños con bisel.
  px(ctx, gx + 51, gy, 2, gh, '#2c2536');
  px(ctx, gx + 51, gy, 1, gh, 'rgba(196,214,246,0.2)');
  px(ctx, gx, gy + 27, gw, 2, '#2c2536');
  px(ctx, gx, gy + 27, gw, 1, 'rgba(196,214,246,0.14)');
  px(ctx, gx + 52, gy, 1, gh, 'rgba(10,8,16,0.4)');
  px(ctx, gx, gy + 28, gw, 1, 'rgba(10,8,16,0.35)');

  // Luz que desborda el marco durante el relámpago.
  if (state.flash > 0.03) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(241, 42, 6, 241, 48, 104);
    glow.addColorStop(0, `rgba(178,214,255,${0.34 * state.flash})`);
    glow.addColorStop(1, 'rgba(80,130,210,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(120, 0, 244, 160);
    ctx.restore();
  }

  // Alféizar de madera con canto.
  px(ctx, 178, 69, 128, 4, '#493427');
  px(ctx, 178, 69, 128, 1, '#75553b');
  px(ctx, 178, 70, 128, 1, '#5c412e');
  px(ctx, 178, 73, 128, 2, '#221711');
  px(ctx, 183, 72, 118, 1, '#1a110c');
  // Ménsulas.
  px(ctx, 180, 66, 5, 6, '#2c2019');
  px(ctx, 299, 66, 5, 6, '#2c2019');

  drawCurtains(ctx, state);
}

function drawCurtains(ctx: Ctx, state: BedroomRoomState): void {
  const sway = state.curtainSway;
  const time = state.time;

  // Barra y anillas.
  px(ctx, 176, 6, 130, 3, '#33251c');
  px(ctx, 176, 6, 130, 1, '#5d4330');
  px(ctx, 176, 8, 130, 1, 'rgba(8,6,4,0.5)');
  px(ctx, 173, 4, 3, 7, '#7a5a3a');
  px(ctx, 306, 4, 3, 7, '#7a5a3a');
  px(ctx, 172, 4, 2, 1, '#9d7750');
  px(ctx, 307, 4, 2, 1, '#9d7750');
  for (let i = 0; i < 7; i += 1) {
    px(ctx, 186 + i * 18, 5, 2, 3, '#4a3423');
    px(ctx, 186 + i * 18, 5, 1, 1, '#8a6744');
  }

  const drawPanel = (side: 'left' | 'right'): void => {
    const baseX = side === 'left' ? 185 : 279;
    const dir = side === 'left' ? 1 : -1;
    const wave = sway * dir * 2.4 + Math.sin(time * 1.7 + (side === 'left' ? 0 : 2)) * 0.7;
    const inner = baseX + dir * 15 + wave;
    const bottomWave = Math.sin(time * 1.2 + (side === 'left' ? 1.2 : 3.4)) * 1.4;

    ctx.beginPath();
    ctx.moveTo(baseX, 9);
    ctx.lineTo(baseX + dir * 17, 9);
    ctx.quadraticCurveTo(inner + dir * 2, 34, inner, 74);
    ctx.quadraticCurveTo(inner - dir * 6, 80 + bottomWave, baseX + dir * 1, 78 + bottomWave);
    ctx.closePath();
    const fabric = ctx.createLinearGradient(baseX, 0, baseX + dir * 18, 0);
    fabric.addColorStop(0, '#1a2237');
    fabric.addColorStop(0.42, '#2b3654');
    fabric.addColorStop(0.62, '#232c46');
    fabric.addColorStop(1, '#171e30');
    ctx.fillStyle = fabric;
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,10,18,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pliegues con luz y sombra.
    ctx.globalAlpha = 0.32;
    for (let i = 0; i < 4; i += 1) {
      const fx = baseX + dir * (3 + i * 3.6) + wave * i * 0.24;
      ctx.strokeStyle = i % 2 === 0 ? '#3d4d72' : '#121828';
      ctx.beginPath();
      ctx.moveTo(fx, 12);
      ctx.quadraticCurveTo(fx + dir * 2, 40, fx + wave * 0.6, 74);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Borde interior iluminado por la tormenta.
    px(ctx, inner - dir, 30, 1, 40, 'rgba(150,186,240,0.16)');
    // Dobladillo.
    px(ctx, baseX + dir * 2, 74 + Math.round(bottomWave), dir * 14, 1, 'rgba(10,12,22,0.55)');
  };

  drawPanel('left');
  drawPanel('right');

  // Velo traslúcido en el borde inferior.
  ctx.globalAlpha = 0.07;
  px(ctx, 187, 63, 12, 11, '#bcd6ff');
  px(ctx, 283, 63, 12, 11, '#bcd6ff');
  ctx.globalAlpha = 1;
}

/* =========================================================
   PÓSTERES, RELOJ Y DECORACIÓN DE PARED
   ========================================================= */
const PIXEL_GLYPHS: Record<string, string[]> = {
  G: ['111', '100', '101', '101', '111'],
  A: ['010', '101', '111', '101', '101'],
  M: ['101', '111', '111', '101', '101'],
  E: ['111', '100', '110', '100', '111'],
  O: ['111', '101', '101', '101', '111'],
  N: ['101', '111', '111', '101', '101'],
  P: ['111', '101', '111', '100', '100'],
  X: ['101', '101', '010', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
};

function drawPixelWord(
  ctx: Ctx,
  word: string,
  x: number,
  y: number,
  scale: number,
  color: string
): number {
  let cursor = x;
  for (const ch of word) {
    const glyph = PIXEL_GLYPHS[ch];
    if (!glyph) {
      cursor += scale * 2;
      continue;
    }
    glyph.forEach((row, ry) => {
      row.split('').forEach((cell, rx) => {
        if (cell === '1') px(ctx, cursor + rx * scale, y + ry * scale, scale, scale, color);
      });
    });
    cursor += scale * 4;
  }
  return cursor - x;
}

function drawWallDecor(ctx: Ctx, state: BedroomRoomState): void {
  const t = state.time;

  // Póster «GAME ON» con marco, cinta y reflejo.
  px(ctx, 118, 19, 54, 56, 'rgba(3,5,12,0.5)');
  px(ctx, 120, 20, 50, 54, '#c9b389');
  px(ctx, 121, 21, 48, 1, '#e2cfa5');
  px(ctx, 121, 21, 1, 52, 'rgba(255,244,214,0.35)');
  px(ctx, 122, 22, 46, 50, '#1e263c');
  px(ctx, 124, 24, 42, 46, '#262f49');
  // Retícula arcade.
  for (let y = 25; y < 69; y += 4) {
    px(ctx, 124, y, 42, 1, 'rgba(120,155,225,0.05)');
  }
  drawPixelWord(ctx, 'GAME', 127, 28, 2, '#e8d7ac');
  drawPixelWord(ctx, 'ON', 136, 40, 2, '#e05a48');
  // Control con botones y cruceta.
  px(ctx, 132, 53, 26, 9, '#101522');
  px(ctx, 134, 55, 7, 5, '#38415c');
  px(ctx, 149, 55, 7, 5, '#38415c');
  px(ctx, 141, 57, 8, 2, '#8a93ac');
  px(ctx, 137, 55, 2, 2, '#e05a48');
  px(ctx, 151, 58, 2, 2, '#7fd3e0');
  px(ctx, 133, 54, 1, 7, 'rgba(255,255,255,0.08)');
  // Cinta adhesiva en las esquinas.
  px(ctx, 118, 18, 7, 3, 'rgba(228,214,184,0.5)');
  px(ctx, 163, 70, 7, 3, 'rgba(228,214,184,0.42)');
  px(ctx, 120, 20, 50, 1, 'rgba(255,244,214,0.5)');

  // Marco pequeño con arte arcade.
  px(ctx, 296, 17, 42, 38, 'rgba(3,5,12,0.42)');
  px(ctx, 297, 18, 40, 1, '#9a7650');
  px(ctx, 298, 18, 38, 36, '#7d5c3d');
  px(ctx, 300, 20, 34, 32, '#101829');
  px(ctx, 302, 22, 30, 28, '#17233c');
  px(ctx, 306, 27, 3, 8, '#66d9e8');
  px(ctx, 311, 31, 3, 4, '#66d9e8');
  px(ctx, 314, 28, 3, 7, '#e05a48');
  px(ctx, 318, 33, 3, 2, '#e05a48');
  px(ctx, 323, 26, 2, 9, '#d9c388');
  px(ctx, 327, 30, 2, 5, '#d9c388');
  for (let i = 0; i < 5; i += 1) {
    px(ctx, 305 + i * 5, 42 + (i % 2), 2, 2, 'rgba(190,220,255,0.5)');
  }
  // Paspartú y tornillos del marco.
  px(ctx, 299, 19, 36, 1, 'rgba(255,240,206,0.4)');
  px(ctx, 298, 18, 2, 2, '#c9a35a');
  px(ctx, 334, 18, 2, 2, '#c9a35a');
  px(ctx, 298, 52, 2, 2, '#c9a35a');
  px(ctx, 334, 52, 2, 2, '#c9a35a');

  // Reloj de pared con marcas y péndulo.
  px(ctx, 356, 22, 22, 22, '#20283c');
  px(ctx, 358, 23, 18, 20, '#8e9ab2');
  px(ctx, 360, 25, 14, 16, '#1a2132');
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    px(ctx, 367 + Math.round(Math.cos(a) * 6), 33 + Math.round(Math.sin(a) * 6), 1, 1, 'rgba(201,215,239,0.5)');
  }
  px(ctx, 366, 27, 1, 7, '#c9d7ef');
  px(ctx, 367, 33, 5, 1, '#c9d7ef');
  px(ctx, 367, 33, 2, 2, '#e05a48');
  px(ctx, 358, 23, 18, 1, 'rgba(255,255,255,0.25)');
  line(ctx, 367, 42, 367, 46, '#8e9ab2');
  px(ctx, 366, 46, 3, 3, '#c9a35a');

  // Cadenas con plantas colgantes junto a la ventana.
  drawHangingPlant(ctx, 172, 6, t, 0.8);
  drawHangingPlant(ctx, 313, 8, t, 1.1);

  // Cuadro familiar sobre la mesa de noche.
  px(ctx, 358, 79, 18, 1, 'rgba(3,5,12,0.35)');
  px(ctx, 358, 80, 18, 14, '#1a1f30');
  px(ctx, 359, 81, 16, 12, '#88684a');
  px(ctx, 360, 82, 14, 10, '#2b3a52');
  px(ctx, 363, 85, 3, 5, '#d9b28a');
  px(ctx, 368, 86, 4, 4, '#8f5c3f');
  px(ctx, 360, 82, 14, 1, 'rgba(240,220,180,0.25)');
}

function drawHangingPlant(ctx: Ctx, x: number, y: number, time: number, scale: number): void {
  const sway = Math.sin(time * 0.9 + x) * 1.6 * scale;
  line(ctx, x, y, x + sway * 0.35, y + 18 * scale, 'rgba(200,205,215,0.3)');
  line(ctx, x + 3, y, x + 3 + sway * 0.3, y + 14 * scale, 'rgba(180,190,205,0.22)');
  px(ctx, x - 5 * scale, y + 17 * scale, 12 * scale, 5 * scale, '#7a5038');
  px(ctx, x - 5 * scale, y + 17 * scale, 12 * scale, 1, '#9c6c48');
  px(ctx, x - 4 * scale, y + 21 * scale, 10 * scale, 1, 'rgba(30,20,14,0.4)');
  for (let i = 0; i < 9; i += 1) {
    const lx = x - 6 * scale + i * 2 * scale + sway * (i % 2 === 0 ? 0.5 : -0.4);
    const ly = y + 20 * scale + (i % 3) * 3 * scale;
    px(ctx, lx, ly, 2 * scale, 3 * scale, i % 2 === 0 ? '#2f5a44' : '#244736');
    px(ctx, lx + 1, ly, 1, 1, 'rgba(140,210,165,0.35)');
  }
  for (let i = 0; i < 3; i += 1) {
    const vx = x - 4 + i * 4 + sway * (0.4 + i * 0.2);
    line(ctx, vx, y + 22 * scale, vx + 1, y + (34 + i * 5) * scale, '#264a39');
    px(ctx, vx, y + (33 + i * 5) * scale, 2, 2, '#2f5a44');
  }
}

/* =========================================================
   MUEBLES
   ========================================================= */
function drawWardrobe(ctx: Ctx): void {
  // Sombra y volumen.
  px(ctx, 20, 15, 76, 132, 'rgba(3,5,10,0.48)');
  px(ctx, 18, 12, 76, 132, '#3a271d');
  px(ctx, 16, 10, 80, 6, '#4d3323');
  px(ctx, 16, 8, 80, 2, '#63452f');
  px(ctx, 16, 10, 80, 1, '#745437');
  px(ctx, 18, 16, 76, 124, '#452d21');
  px(ctx, 18, 16, 76, 2, '#5c3d2a');
  px(ctx, 17, 17, 1, 123, 'rgba(255,220,175,0.12)');
  px(ctx, 94, 18, 1, 120, 'rgba(10,6,4,0.5)');

  // Pilastras.
  px(ctx, 20, 20, 3, 114, '#4b3123');
  px(ctx, 90, 20, 3, 114, '#3b261a');
  px(ctx, 22, 21, 1, 112, 'rgba(255,220,175,0.09)');

  // Puertas y molduras con bisel.
  px(ctx, 24, 20, 30, 114, '#4f3426');
  px(ctx, 59, 20, 30, 114, '#4f3426');
  px(ctx, 54, 20, 4, 114, '#2b1c14');
  px(ctx, 55, 21, 1, 112, '#5e3f2b');
  const panel = (x: number, y: number, w: number, h: number, seed: number): void => {
    px(ctx, x, y, w, h, '#3f291e');
    px(ctx, x, y, w, 1, 'rgba(245,205,160,0.13)');
    px(ctx, x, y, 1, h, 'rgba(245,205,160,0.06)');
    px(ctx, x, y + h - 1, w, 1, 'rgba(12,7,4,0.4)');
    px(ctx, x + w - 1, y, 1, h, 'rgba(12,7,4,0.35)');
    grain(ctx, x, y, w, h, seed);
  };
  panel(28, 26, 22, 48, 2);
  panel(28, 80, 22, 48, 7);
  panel(63, 26, 22, 48, 11);
  panel(63, 80, 22, 48, 17);

  // Herrajes: bisagras, tiradores y cerradura.
  px(ctx, 22, 33, 3, 8, '#8a6b3c');
  px(ctx, 22, 108, 3, 8, '#8a6b3c');
  px(ctx, 88, 33, 3, 8, '#8a6b3c');
  px(ctx, 88, 108, 3, 8, '#8a6b3c');
  px(ctx, 22, 33, 3, 1, '#c9a35a');
  px(ctx, 22, 108, 3, 1, '#c9a35a');
  px(ctx, 88, 33, 3, 1, '#c9a35a');
  px(ctx, 88, 108, 3, 1, '#c9a35a');
  px(ctx, 50, 72, 2, 7, '#b28a4e');
  px(ctx, 60, 72, 2, 7, '#b28a4e');
  px(ctx, 49, 73, 4, 2, '#d9b26a');
  px(ctx, 59, 73, 4, 2, '#d9b26a');
  px(ctx, 49, 73, 1, 1, '#f0d090');
  px(ctx, 59, 73, 1, 1, '#f0d090');
  px(ctx, 57, 52, 2, 3, '#20150f');
  px(ctx, 57, 52, 1, 1, '#c9a35a');

  // Base y moldura superior.
  px(ctx, 16, 140, 80, 4, '#2a1c14');
  px(ctx, 18, 140, 76, 1, '#4a3122');
  px(ctx, 20, 144, 76, 2, 'rgba(3,5,10,0.5)');

  // Caja y zapatillas apoyadas.
  px(ctx, 106, 128, 22, 13, '#3c2a20');
  px(ctx, 106, 128, 22, 1, '#5a3e2c');
  px(ctx, 108, 132, 18, 1, 'rgba(255,220,175,0.06)');
  px(ctx, 110, 134, 14, 1, '#241812');
  px(ctx, 116, 130, 4, 1, '#8a6744');
  px(ctx, 100, 142, 12, 5, '#c7c3b5');
  px(ctx, 100, 145, 12, 2, '#8e8b80');
  px(ctx, 114, 141, 11, 5, '#bdb9ab');
  px(ctx, 114, 144, 11, 2, '#86837a');
  px(ctx, 102, 142, 5, 1, '#e6e2d4');
  px(ctx, 116, 141, 5, 1, '#d6d2c4');
}

function drawDesk(ctx: Ctx, state: BedroomRoomState): void {
  const radio = state.radioActive ? 1 : 0;

  // Sombra.
  px(ctx, 180, 118, 132, 7, 'rgba(3,5,10,0.46)');
  px(ctx, 178, 76, 132, 1, 'rgba(3,5,10,0.35)');

  // Cuerpo con vetas.
  px(ctx, 176, 82, 130, 38, '#38251b');
  px(ctx, 176, 82, 130, 1, 'rgba(255,220,170,0.08)');
  px(ctx, 176, 118, 130, 2, '#22160f');
  px(ctx, 178, 84, 126, 34, '#4a3022');
  grain(ctx, 178, 84, 126, 34, 5, 'rgba(20,12,8,0.18)', 'rgba(255,214,168,0.035)');

  // Cajones con tiradores y cerradura.
  px(ctx, 182, 88, 50, 12, '#412a1d');
  px(ctx, 182, 102, 50, 12, '#3b251a');
  px(ctx, 184, 90, 46, 8, '#4c3323');
  px(ctx, 184, 104, 46, 8, '#453022');
  px(ctx, 184, 90, 46, 1, 'rgba(255,225,180,0.08)');
  px(ctx, 184, 104, 46, 1, 'rgba(255,225,180,0.06)');
  px(ctx, 204, 93, 6, 2, '#b28a4e');
  px(ctx, 204, 107, 6, 2, '#b28a4e');
  px(ctx, 204, 93, 6, 1, '#d9b26a');
  px(ctx, 204, 107, 6, 1, '#d9b26a');
  px(ctx, 207, 95, 1, 2, '#20150f');
  px(ctx, 207, 109, 1, 2, '#20150f');

  // Tapa con canto biselado.
  px(ctx, 174, 76, 134, 8, '#5b3c28');
  px(ctx, 174, 76, 134, 2, '#7a5537');
  px(ctx, 174, 78, 134, 1, '#69462e');
  px(ctx, 174, 83, 134, 1, '#2a1a12');
  px(ctx, 176, 82, 130, 1, 'rgba(255,225,180,0.1)');

  // Patas ocultas.
  px(ctx, 180, 120, 5, 6, '#2a1a12');
  px(ctx, 300, 120, 5, 6, '#2a1a12');
  px(ctx, 180, 120, 5, 1, '#4a3022');
  px(ctx, 300, 120, 5, 1, '#4a3022');

  // Radio antigua: dial, rejilla, perillas y antena.
  px(ctx, 184, 84, 30, 24, '#2a1b14');
  px(ctx, 185, 84, 28, 1, '#7b5436');
  px(ctx, 185, 85, 28, 22, '#5a3b27');
  px(ctx, 186, 86, 26, 2, '#7b5436');
  px(ctx, 188, 89, 15, 12, '#2a1c16');
  for (let i = 0; i < 6; i += 1) {
    px(ctx, 189, 90 + i * 2, 13, 1, '#6b4a30');
    px(ctx, 189, 90 + i * 2, 13, 1, i === 0 ? '#84603d' : '#6b4a30');
  }
  // Dial con marcas y aguja.
  px(ctx, 204, 88, 8, 7, '#b99256');
  px(ctx, 205, 89, 6, 5, '#e3c17f');
  px(ctx, 205, 89, 6, 1, '#f6e3b6');
  for (let i = 0; i < 4; i += 1) {
    px(ctx, 206 + i, 90, 1, 1, '#3a2a18');
  }
  px(ctx, 205 + (radio ? 3 : 1), 90, 1, 4, radio ? '#c22b20' : '#2a1c16');
  px(ctx, 205, 98, 6, 2, '#1d130e');
  px(ctx, 206, 98, 1, 2, '#8c6b3f');
  px(ctx, 210, 98, 1, 2, '#8c6b3f');
  // Piloto encendido.
  px(ctx, 228, 86, 2, 2, radio ? '#ff9b4a' : '#3a2a20');
  if (radio) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const led = ctx.createRadialGradient(229, 87, 1, 229, 87, 12);
    led.addColorStop(0, 'rgba(255,170,90,0.38)');
    led.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = led;
    ctx.fillRect(215, 74, 30, 28);
    ctx.restore();
  }
  // Antena.
  line(ctx, 211, 85, 216, 76, '#8e7a5d');
  px(ctx, 216, 75, 1, 1, '#d9b974');

  // Monitor apagado con bisel y reflejo.
  px(ctx, 221, 78, 56, 29, '#141a28');
  px(ctx, 222, 79, 54, 26, '#1b2232');
  px(ctx, 222, 79, 54, 1, '#2d3850');
  px(ctx, 225, 82, 48, 20, '#080c15');
  px(ctx, 226, 83, 46, 17, '#0b1220');
  px(ctx, 226, 83, 46, 1, 'rgba(120,160,220,0.12)');
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = '#a9c8ec';
  ctx.beginPath();
  ctx.moveTo(228, 100);
  ctx.lineTo(248, 83);
  ctx.lineTo(258, 83);
  ctx.lineTo(238, 100);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  px(ctx, 270, 99, 2, 1, '#2a3346');
  px(ctx, 246, 106, 7, 5, '#1b2232');
  px(ctx, 245, 106, 9, 1, '#2b3448');
  px(ctx, 240, 110, 19, 3, '#141a28');
  px(ctx, 240, 110, 19, 1, '#2b3448');

  // Torre con rejillas y patas.
  px(ctx, 282, 82, 17, 31, '#161c29');
  px(ctx, 283, 82, 15, 1, '#2b3448');
  px(ctx, 283, 83, 15, 29, '#232b3c');
  for (let i = 0; i < 4; i += 1) px(ctx, 285, 86 + i * 4, 11, 1, '#111622');
  px(ctx, 285, 104, 5, 1, '#0e131e');
  px(ctx, 294, 104, 2, 2, '#3a2430');
  px(ctx, 283, 111, 3, 1, '#0e131e');
  px(ctx, 295, 111, 3, 1, '#0e131e');

  // Teclado con teclas individuales.
  px(ctx, 224, 111, 47, 9, '#1b202c');
  px(ctx, 224, 111, 47, 1, 'rgba(190,215,255,0.12)');
  px(ctx, 225, 112, 45, 7, '#2a3143');
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 11; c += 1) {
      px(ctx, 227 + c * 4, 113 + r * 2, 3, 1, r === 0 ? '#404a62' : '#3c455c');
      if ((r * 11 + c) % 5 === 0) px(ctx, 227 + c * 4, 113 + r * 2, 3, 1, '#4a5570');
    }
  }
  px(ctx, 225, 117, 9, 1, '#202634');
  px(ctx, 273, 111, 8, 7, '#1b202c');
  px(ctx, 274, 112, 6, 5, '#2c3345');
  px(ctx, 276, 111, 2, 1, '#4a556d');
  px(ctx, 280, 116, 7, 1, 'rgba(16,20,30,0.5)');

  // Cuaderno abierto, taza y lápiz.
  px(ctx, 276, 120, 22, 4, '#844b3d');
  px(ctx, 277, 120, 20, 1, '#a66351');
  px(ctx, 288, 117, 12, 4, '#7c463a');
  px(ctx, 288, 117, 12, 1, '#a66351');
  px(ctx, 298, 120, 2, 1, '#c58c79');
  px(ctx, 277, 121, 4, 1, 'rgba(40,20,16,0.4)');

  px(ctx, 216, 108, 9, 10, '#6e4434');
  px(ctx, 217, 109, 7, 8, '#8e5a45');
  px(ctx, 217, 109, 7, 1, '#b77c62');
  px(ctx, 217, 112, 5, 1, 'rgba(255,230,210,0.2)');
  px(ctx, 225, 111, 2, 3, '#6e4434');
  px(ctx, 218, 114, 5, 1, 'rgba(255,230,210,0.14)');

  px(ctx, 290, 111, 12, 3, '#141822');
  px(ctx, 291, 108, 10, 4, '#1d2433');
  px(ctx, 292, 108, 8, 1, '#4c5a74');
  px(ctx, 290, 113, 3, 2, '#141822');
  px(ctx, 299, 113, 3, 2, '#141822');
  px(ctx, 293, 111, 6, 1, '#2c3650');

  px(ctx, 240, 86, 5, 2, '#c9a35a');
  px(ctx, 251, 85, 1, 2, '#8a7a5c');

  // Cuaderno y lápiz.
  px(ctx, 286, 122, 16, 5, '#b9b2a0');
  px(ctx, 287, 122, 14, 1, '#d8d2c2');
  px(ctx, 289, 124, 9, 1, '#78746a');
  px(ctx, 288, 125, 11, 1, '#9a9486');
  // Fibra del papel y renglones escritos a lápiz.
  px(ctx, 289, 123, 10, 1, 'rgba(92,106,124,0.34)');
  px(ctx, 289, 125, 6, 1, 'rgba(92,106,124,0.2)');
  px(ctx, 300, 123, 1, 1, 'rgba(255,255,255,0.5)');
  px(ctx, 268, 122, 2, 5, '#c9a35a');
  px(ctx, 270, 126, 2, 1, '#e8d7ac');

  // Lámpara de escritorio apagada.
  px(ctx, 296, 91, 2, 13, '#3a3f4e');
  px(ctx, 292, 104, 10, 2, '#2a2f3c');
  px(ctx, 291, 84, 9, 8, '#2f3648');
  px(ctx, 292, 85, 7, 6, '#3b4358');
  px(ctx, 292, 85, 7, 1, '#4c5570');

  // Cables: torre al muro y al teclado.
  line(ctx, 289, 113, 292, 120, 'rgba(10,12,18,0.7)');
  line(ctx, 292, 120, 304, 121, 'rgba(10,12,18,0.6)');
  line(ctx, 270, 118, 272, 122, 'rgba(10,12,18,0.5)');

  // Polvo iluminado sobre la superficie.
  const dust = 0.12 + state.flash * 0.3;
  for (let i = 0; i < 7; i += 1) {
    px(ctx, 200 + i * 15, 80 + ((i * 7) % 10), 1, 1, `rgba(200,220,255,${dust})`);
  }
}

function drawNightstand(ctx: Ctx): void {
  px(ctx, 350, 96, 36, 36, 'rgba(3,5,10,0.42)');
  px(ctx, 348, 94, 36, 38, '#38251b');
  px(ctx, 346, 92, 40, 5, '#5b3c28');
  px(ctx, 346, 92, 40, 1, '#795537');
  px(ctx, 348, 94, 36, 1, 'rgba(255,225,180,0.07)');
  px(ctx, 350, 97, 32, 13, '#4a3122');
  px(ctx, 350, 111, 32, 17, '#422b1e');
  px(ctx, 350, 97, 32, 1, 'rgba(255,225,180,0.08)');
  px(ctx, 350, 111, 32, 1, 'rgba(255,225,180,0.05)');
  px(ctx, 357, 101, 18, 2, '#b28a4e');
  px(ctx, 357, 101, 18, 1, '#d9b26a');
  px(ctx, 367, 113, 8, 1, '#20150f');
  px(ctx, 367, 113, 8, 1, '#20150f');
  px(ctx, 366, 112, 10, 1, '#5b3c28');
  px(ctx, 367, 114, 1, 2, 'rgba(201,163,90,0.5)');
  grain(ctx, 350, 97, 32, 30, 9, 'rgba(20,12,8,0.2)', 'rgba(255,225,180,0.03)');

  // Reloj despertador apagado.
  px(ctx, 353, 92, 10, 4, '#1a1f2e');
  px(ctx, 354, 91, 8, 1, '#3d465c');
  px(ctx, 355, 92, 6, 3, '#20283a');
  px(ctx, 356, 93, 3, 1, '#4a566e');
  px(ctx, 357, 94, 1, 1, '#2a3448');

  // Lámpara de mesita encendida: pantalla de tela cálida, bombilla y aro.
  px(ctx, 360, 128, 16, 3, '#5a4428');
  px(ctx, 360, 128, 16, 1, '#8b6c40');
  px(ctx, 363, 118, 2, 10, '#5b4529');
  px(ctx, 363, 118, 1, 10, '#8a6c3f');
  // Pantalla: costura central, pliegues y borde inferior iluminado.
  px(ctx, 358, 109, 20, 10, '#4a2e1c');
  px(ctx, 359, 110, 18, 7, '#a9703c');
  px(ctx, 359, 110, 18, 1, '#c9965a');
  px(ctx, 359, 113, 18, 1, 'rgba(255,222,168,0.28)');
  px(ctx, 358, 109, 20, 1, '#d9a45c');
  px(ctx, 357, 118, 22, 2, '#7a4a26');
  px(ctx, 358, 118, 20, 1, '#f0b86c');
  for (let i = 0; i < 5; i += 1) {
    px(ctx, 359 + i * 4, 110, 1, 7, 'rgba(72,40,20,0.3)');
    px(ctx, 360 + i * 4, 111, 1, 5, 'rgba(255,226,170,0.13)');
  }
  // Bombilla encendida bajo la pantalla y remate superior.
  px(ctx, 364, 118, 4, 3, '#ffd995');
  px(ctx, 365, 118, 2, 2, '#fff4cf');
  px(ctx, 365, 107, 1, 2, '#6e5532');
  px(ctx, 362, 112, 3, 4, '#b8814a');
  px(ctx, 362, 112, 1, 4, '#e0b070');

  // Libro y vaso.
  px(ctx, 350, 125, 9, 3, '#4a5f7c');
  px(ctx, 350, 125, 9, 1, '#6d84a4');
  px(ctx, 350, 128, 9, 1, '#2b3a4e');
  px(ctx, 374, 122, 4, 7, 'rgba(150,190,230,0.18)');
  px(ctx, 375, 123, 2, 5, 'rgba(190,220,250,0.12)');
}

function drawShelves(ctx: Ctx): void {
  // Estantería izquierda. Queda separada del dintel de la puerta para que
  // ambos objetos se lean como piezas distintas y no como un mueble apilado.
  px(ctx, 16, 156, 40, 68, 'rgba(3,5,10,0.44)');
  px(ctx, 14, 154, 38, 66, '#3a271d');
  px(ctx, 14, 154, 38, 1, '#5a3e2b');
  px(ctx, 16, 157, 34, 60, '#241811');
  px(ctx, 16, 160, 34, 2, '#5b3d2b');
  px(ctx, 16, 184, 34, 2, '#5b3d2b');
  px(ctx, 16, 208, 34, 2, '#5b3d2b');
  px(ctx, 16, 160, 34, 1, '#7a5539');
  px(ctx, 16, 184, 34, 1, '#7a5539');
  px(ctx, 16, 208, 34, 1, '#7a5539');
  const books = [
    ['#8c3f3b', '#c9a35a', '#3f5a7a', '#6a4a7c', '#4f6b4a'],
    ['#7c5a3a', '#9b4444', '#3b5e70', '#c9a35a', '#5a3f66'],
    ['#4a6b53', '#8c3f3b', '#6b5a86', '#b98c4e', '#3f4f70'],
  ];
  books.forEach((row, r) => {
    row.forEach((color, i) => {
      const bh = 10 + ((i + r) % 3) * 2;
      px(ctx, 18 + i * 6, 179 + r * 24 - bh, 4, bh, color);
      px(ctx, 18 + i * 6, 179 + r * 24 - bh, 4, 1, 'rgba(255,235,200,0.2)');
      px(ctx, 18 + i * 6, 179 + r * 24 - 2, 4, 1, 'rgba(15,10,8,0.5)');
      px(ctx, 18 + i * 6, 179 + r * 24 - bh + 3, 4, 1, 'rgba(255,235,200,0.12)');
      px(ctx, 18 + i * 6, 179 + r * 24 - bh + 1, 1, 1, 'rgba(255,255,255,0.14)');
    });
  });
  // Objetos.
  px(ctx, 38, 170, 6, 6, '#c9a35a');
  px(ctx, 40, 168, 2, 2, '#e8d7ac');
  px(ctx, 18, 196, 8, 5, '#6d4a63');
  px(ctx, 18, 196, 8, 1, '#8b647f');
  px(ctx, 29, 193, 9, 8, '#2b3648');
  px(ctx, 30, 194, 7, 5, '#45536e');
  px(ctx, 31, 195, 5, 1, '#6d7f9e');
  px(ctx, 42, 220, 4, 8, '#7a5a3a');
  px(ctx, 41, 218, 6, 3, '#8e6b45');
  px(ctx, 41, 218, 6, 1, '#b08a5a');
  // Foto inclinada.
  px(ctx, 20, 211, 7, 6, '#88684a');
  px(ctx, 21, 212, 5, 4, '#2b3a52');
  px(ctx, 22, 213, 2, 2, '#d9b28a');

  // Estantería derecha.
  px(ctx, 450, 218, 28, 66, 'rgba(3,5,10,0.44)');
  px(ctx, 448, 216, 28, 66, '#3a271d');
  px(ctx, 448, 216, 28, 1, '#5a3e2b');
  px(ctx, 450, 219, 24, 60, '#241811');
  px(ctx, 450, 222, 24, 2, '#5b3d2b');
  px(ctx, 450, 246, 24, 2, '#5b3d2b');
  px(ctx, 450, 270, 24, 2, '#5b3d2b');
  px(ctx, 450, 222, 24, 1, '#7a5539');
  px(ctx, 450, 246, 24, 1, '#7a5539');
  px(ctx, 450, 270, 24, 1, '#7a5539');
  for (let r = 0; r < 3; r += 1) {
    for (let i = 0; i < 4; i += 1) {
      const bh = 8 + ((i + r) % 2) * 3;
      const colors = ['#8c3f3b', '#4a6b53', '#6b5a86', '#b98c4e'];
      px(ctx, 452 + i * 5, 243 + r * 24 - bh, 4, bh, colors[(i + r) % 4]);
      px(ctx, 452 + i * 5, 243 + r * 24 - bh, 4, 1, 'rgba(255,235,200,0.16)');
      px(ctx, 452 + i * 5, 243 + r * 24 - 2, 4, 1, 'rgba(15,10,8,0.5)');
    }
  }
  px(ctx, 455, 234, 7, 8, '#c9a35a');
  px(ctx, 456, 235, 5, 6, '#2b2219');
  px(ctx, 458, 236, 1, 3, '#e8d7ac');
  px(ctx, 455, 234, 7, 1, '#e0bd74');
}

function drawRug(ctx: Ctx): void {
  px(ctx, 146, 180, 174, 104, 'rgba(3,5,10,0.32)');

  // Base con esquinas escalonadas.
  px(ctx, 150, 176, 166, 102, '#3a2735');
  px(ctx, 146, 180, 174, 94, '#3a2735');
  px(ctx, 150, 176, 166, 4, '#4c3445');
  px(ctx, 146, 180, 4, 94, '#4c3445');

  // Borde tejido en dos tonos.
  px(ctx, 150, 180, 166, 94, '#5a3d4c');
  px(ctx, 154, 184, 158, 86, '#472f3e');
  px(ctx, 154, 184, 158, 1, '#7d5a45');
  px(ctx, 154, 269, 158, 1, '#7d5a45');
  px(ctx, 154, 184, 1, 86, '#7d5a45');
  px(ctx, 311, 184, 1, 86, '#7d5a45');
  px(ctx, 158, 188, 150, 1, 'rgba(201,163,90,0.28)');
  px(ctx, 158, 265, 150, 1, 'rgba(201,163,90,0.24)');

  // Motivos geométricos del borde.
  for (let i = 0; i < 12; i += 1) {
    px(ctx, 162 + i * 12, 191, 3, 2, i % 2 === 0 ? '#8a6746' : '#6f4a5e');
    px(ctx, 162 + i * 12, 260, 3, 2, i % 2 === 0 ? '#6f4a5e' : '#8a6746');
  }

  // Medallón central.
  const cx = 233;
  const cy = 227;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#6f4a5e';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 30, cy);
  ctx.lineTo(cx, cy + 22);
  ctx.lineTo(cx - 30, cy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(201,163,90,0.3)';
  ctx.stroke();
  ctx.fillStyle = '#8a6746';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx + 20, cy);
  ctx.lineTo(cx, cy + 14);
  ctx.lineTo(cx - 20, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3c2a3c';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 10, cy);
  ctx.lineTo(cx, cy + 7);
  ctx.lineTo(cx - 10, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  px(ctx, cx - 2, cy - 2, 4, 4, '#c9a35a');
  px(ctx, cx - 1, cy - 1, 2, 1, '#f0d090');

  // Motivos y desgaste.
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    px(ctx, cx + Math.cos(angle) * 48 - 1, cy + Math.sin(angle) * 30 - 1, 3, 3, '#7a5a45');
    px(ctx, cx + Math.cos(angle + 0.2) * 40 - 1, cy + Math.sin(angle + 0.2) * 25 - 1, 1, 1, '#9a7a5e');
  }
  for (let i = 0; i < 14; i += 1) {
    px(ctx, 160 + ((i * 31) % 140), 192 + ((i * 19) % 74), 1, 1, 'rgba(235,215,190,0.1)');
  }
  // Zonas desgastadas por el paso.
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#c9b8a0';
  ctx.beginPath();
  ctx.ellipse(206, 236, 34, 22, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Flecos.
  for (let i = 0; i < 16; i += 1) {
    px(ctx, 150 + i * 10, 174, 1, 3, '#6b4f3d');
    px(ctx, 150 + i * 10, 279, 1, 3, '#6b4f3d');
    px(ctx, 151 + i * 10, 280, 1, 1, 'rgba(201,163,90,0.24)');
  }
}

function drawBedBase(ctx: Ctx): void {
  px(ctx, 384, 196, 88, 10, 'rgba(3,5,10,0.48)');

  // Cabecero con capitoné.
  px(ctx, 380, 76, 92, 18, '#33231b');
  px(ctx, 378, 78, 4, 26, '#2a1c15');
  px(ctx, 468, 78, 4, 26, '#2a1c15');
  px(ctx, 382, 78, 88, 15, '#553a27');
  px(ctx, 384, 80, 84, 12, '#4a3122');
  px(ctx, 386, 82, 80, 3, '#63452f');
  px(ctx, 386, 89, 80, 1, '#3a2519');
  for (let i = 0; i < 5; i += 1) {
    px(ctx, 390 + i * 16, 83, 1, 5, 'rgba(30,18,12,0.35)');
    px(ctx, 391 + i * 16, 83, 1, 1, 'rgba(255,225,180,0.1)');
  }
  px(ctx, 380, 76, 4, 4, '#755237');
  px(ctx, 468, 76, 4, 4, '#755237');
  px(ctx, 380, 76, 92, 1, 'rgba(255,225,180,0.1)');

  // Marco y sombra interior.
  px(ctx, 386, 86, 88, 112, '#3c281d');
  px(ctx, 388, 92, 84, 108, '#513724');
  px(ctx, 390, 94, 80, 104, '#5d3f29');
  px(ctx, 390, 94, 80, 1, '#755237');
  px(ctx, 390, 94, 1, 104, 'rgba(255,225,180,0.08)');

  // Colchón y ropa de cama: lino cálido para distinguirlos del ventanal.
  px(ctx, 392, 90, 76, 104, '#3a3f52');
  px(ctx, 393, 91, 74, 101, '#7e7566');
  px(ctx, 394, 92, 72, 98, '#c8bda6');
  px(ctx, 396, 96, 68, 92, '#d3c8b1');
  px(ctx, 396, 96, 68, 1, '#e6dcc6');
  px(ctx, 396, 186, 68, 2, '#a89c84');
  px(ctx, 396, 96, 2, 90, '#b5a991');
  px(ctx, 462, 96, 2, 90, '#b5a991');
  px(ctx, 396, 96, 68, 1, 'rgba(255,250,235,0.5)');
  // Pespunte del colchón.
  px(ctx, 398, 98, 64, 1, 'rgba(180,166,140,0.35)');
  px(ctx, 398, 184, 64, 1, 'rgba(180,166,140,0.3)');

  // Sábana y pliegues.
  for (let i = 0; i < 6; i += 1) {
    px(ctx, 398, 174 + i * 3, 64, 1, `rgba(98,84,64,${0.22 - i * 0.026})`);
  }
  px(ctx, 398, 150, 64, 1, 'rgba(120,104,82,0.22)');
  px(ctx, 420, 118, 1, 64, 'rgba(116,100,78,0.16)');
  px(ctx, 438, 130, 1, 48, 'rgba(116,100,78,0.12)');
  px(ctx, 404, 138, 42, 1, 'rgba(255,250,235,0.18)');
  px(ctx, 408, 158, 30, 1, 'rgba(116,100,78,0.1)');

  // Huella del cuerpo sobre la sábana, visible al levantarse.
  ctx.save();
  ctx.fillStyle = 'rgba(104, 90, 70, 0.14)';
  ctx.beginPath();
  ctx.ellipse(430, 142, 18, 27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  px(ctx, 412, 164, 36, 1, 'rgba(104, 90, 70, 0.18)');
  px(ctx, 408, 170, 12, 1, 'rgba(104, 90, 70, 0.12)');
  px(ctx, 444, 158, 10, 1, 'rgba(104, 90, 70, 0.12)');

  // Almohada principal, esquinas escalonadas y hendidura central.
  px(ctx, 400, 92, 58, 23, 'rgba(52, 44, 36, 0.35)');
  px(ctx, 399, 92, 58, 21, '#b9ae96');
  px(ctx, 400, 93, 56, 19, '#ded4be');
  px(ctx, 402, 94, 52, 16, '#e9e0cc');
  px(ctx, 402, 94, 52, 1, '#f4ecd9');
  px(ctx, 399, 92, 2, 2, '#c8bda6');
  px(ctx, 455, 92, 2, 2, '#c8bda6');
  px(ctx, 399, 111, 2, 2, '#c8bda6');
  px(ctx, 455, 111, 2, 2, '#c8bda6');
  px(ctx, 428, 95, 1, 14, 'rgba(150, 136, 112, 0.3)');
  px(ctx, 406, 100, 18, 1, 'rgba(150, 136, 112, 0.22)');
  px(ctx, 436, 104, 14, 1, 'rgba(150, 136, 112, 0.18)');
  px(ctx, 412, 107, 24, 2, 'rgba(150, 136, 112, 0.14)');
  px(ctx, 404, 97, 20, 1, 'rgba(255,252,244,0.45)');

  // Ribete de la funda: costura perimetral, esquina mullida y etiqueta.
  px(ctx, 400, 112, 56, 1, 'rgba(146,132,108,0.42)');
  px(ctx, 457, 94, 1, 18, 'rgba(146,132,108,0.34)');
  px(ctx, 399, 93, 1, 18, 'rgba(255,252,244,0.2)');
  px(ctx, 401, 111, 8, 1, 'rgba(255,250,236,0.25)');
  px(ctx, 452, 108, 4, 2, '#c4b9a0');
  px(ctx, 453, 108, 2, 1, '#b1a68d');

  // Segundo cojín apoyado contra el cabecero, al fondo.
  px(ctx, 404, 114, 30, 10, 'rgba(70, 60, 48, 0.25)');
  px(ctx, 405, 113, 28, 9, '#b5aa92');
  px(ctx, 406, 114, 26, 7, '#cec3ac');
  px(ctx, 407, 114, 24, 1, '#e0d7c1');

  // Pies de cama y sombra.
  px(ctx, 388, 194, 6, 8, '#2a1a12');
  px(ctx, 466, 194, 6, 8, '#2a1a12');
  px(ctx, 386, 86, 2, 110, '#2a1a12');
  px(ctx, 472, 86, 2, 110, '#2a1a12');
  px(ctx, 388, 194, 6, 1, '#4a3022');
  px(ctx, 466, 194, 6, 1, '#4a3022');

  // Zapatillas bajo la cama.
  px(ctx, 370, 206, 12, 4, '#b9b5a7');
  px(ctx, 370, 209, 12, 1, '#807d73');
  px(ctx, 370, 206, 12, 1, '#d6d2c4');
  px(ctx, 372, 202, 10, 4, '#a9a598');
  px(ctx, 372, 202, 10, 1, '#c7c3b5');
}

function drawDoor(ctx: Ctx, state: BedroomRoomState): void {
  const open = Math.max(0, Math.min(1, state.doorOpen ?? 0));
  const jolt = (state.knockJolt ?? 0) > 0 ? 1 : 0;

  // Sombra arrojada sobre el suelo y junta de la hoja con el marco.
  ctx.save();
  const cast = ctx.createLinearGradient(4, 230, 58, 310);
  cast.addColorStop(0, 'rgba(3,5,10,0.5)');
  cast.addColorStop(1, 'rgba(3,5,10,0)');
  ctx.fillStyle = cast;
  ctx.fillRect(2, 226, 58, 88);
  ctx.restore();

  // Marco exterior con jambas de mayor altura que la hoja: así se lee como
  // un vano real y no como un cuadro apoyado en el suelo.
  px(ctx, 4, 228, 42, 78, '#20140f');
  px(ctx, 6, 230 + jolt, 38, 74, '#4a3124');
  px(ctx, 6, 230 + jolt, 38, 1, '#6d4c34');
  px(ctx, 6, 230 + jolt, 1, 74, 'rgba(255,220,175,0.1)');
  px(ctx, 43, 230 + jolt, 1, 74, '#1a110c');
  px(ctx, 10, 234 + jolt, 30, 66, '#2b1c14');
  // Lintel con moldura.
  px(ctx, 8, 232 + jolt, 34, 3, '#5c4030');
  px(ctx, 8, 232 + jolt, 34, 1, '#7a573c');
  px(ctx, 10, 235 + jolt, 30, 1, 'rgba(12,7,5,0.6)');

  if (open < 0.02) {
    // Hoja cerrada: cuarterones y picaporte.
    px(ctx, 11, 236 + jolt, 28, 62, '#433023');
    px(ctx, 12, 237 + jolt, 26, 60, '#513826');
    px(ctx, 13, 239 + jolt, 24, 24, '#3f2a1e');
    px(ctx, 13, 266 + jolt, 24, 28, '#3f2a1e');
    px(ctx, 15, 241 + jolt, 20, 20, '#4a3123');
    px(ctx, 15, 268 + jolt, 20, 24, '#4a3123');
    px(ctx, 15, 241 + jolt, 20, 1, 'rgba(255,220,175,0.1)');
    px(ctx, 15, 268 + jolt, 20, 1, 'rgba(255,220,175,0.08)');
    px(ctx, 15, 241 + jolt, 1, 20, 'rgba(18,10,7,0.3)');
    px(ctx, 15, 268 + jolt, 1, 24, 'rgba(18,10,7,0.25)');
    px(ctx, 35, 264 + jolt, 3, 3, '#c9a35a');
    px(ctx, 36, 265 + jolt, 1, 1, '#f0d090');
    px(ctx, 37, 262 + jolt, 1, 6, '#8a6b3c');
    // Luz fría bajo la puerta.
    px(ctx, 10, 299, 30, 2, '#1a110c');
    px(ctx, 12, 299, 26, 1, 'rgba(150,190,240,0.32)');
  } else {
    // Portal abierto: el comedor de la casa, cálido y sin lluvia.
    const portal = ctx.createLinearGradient(11, 236, 11, 300);
    portal.addColorStop(0, '#1a110c');
    portal.addColorStop(0.4, '#2c1c12');
    portal.addColorStop(1, '#120b08');
    ctx.fillStyle = portal;
    ctx.fillRect(11, 236, 28, 64);

    // Pared del comedor al fondo, con zócalo y luz de lámpara.
    const farWarm = ctx.createLinearGradient(11, 236, 11, 278);
    farWarm.addColorStop(0, `rgba(120,80,42,${0.5 * open})`);
    farWarm.addColorStop(0.55, `rgba(86,54,28,${0.32 * open})`);
    farWarm.addColorStop(1, 'rgba(40,24,12,0)');
    ctx.fillStyle = farWarm;
    ctx.fillRect(11, 236, 28, 42);
    px(ctx, 11, 262, 28, 1, `rgba(196,140,78,${0.34 * open})`);
    px(ctx, 11, 263, 28, 2, `rgba(48,30,16,${0.55 * open})`);

    // Suelo de tablones del comedor en escorzo, con junta y brillo cálido.
    ctx.save();
    ctx.strokeStyle = `rgba(196,140,86,${0.2 * open})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i += 1) {
      const y = 288 + i * 4;
      ctx.beginPath();
      ctx.moveTo(11, y);
      ctx.lineTo(39, y - i * 0.8);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(28,17,10,${0.34 * open})`;
    for (let i = 0; i < 3; i += 1) {
      const x = 14 + i * 9;
      ctx.beginPath();
      ctx.moveTo(x, 300);
      ctx.lineTo(25 + (x - 25) * 0.35, 272);
      ctx.stroke();
    }
    ctx.restore();

    // Halo cálido de la lámpara del comedor: profundidad sin cielo.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const far = ctx.createRadialGradient(26, 249, 1, 26, 249, 19);
    far.addColorStop(0, `rgba(255,208,140,${0.3 * open})`);
    far.addColorStop(0.55, `rgba(210,150,80,${0.12 * open})`);
    far.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = far;
    ctx.fillRect(11, 236, 28, 64);
    ctx.restore();

    // Jamba interior iluminada y sombra del dintel.
    px(ctx, 11, 236, 1, 64, `rgba(255,214,158,${0.26 * open})`);
    px(ctx, 38, 236, 1, 64, 'rgba(2,3,5,0.62)');
    px(ctx, 11, 236, 28, 3, 'rgba(2,3,5,0.7)');
    px(ctx, 12, 239, 26, 1, `rgba(255,206,150,${0.08 * open})`);

    // Hoja abierta casi de canto, recostada sobre la jamba derecha.
    const leafW = 2 + Math.round(open * 1);
    const lean = Math.round(open * 2);
    px(ctx, 38, 236, leafW + lean, 63, '#33231a');
    px(ctx, 38, 236, 1, 63, '#6a4a31');
    px(ctx, 38 + leafW + lean - 1, 236, 1, 63, '#1a110c');
    px(ctx, 39, 259, 1, 3, '#c9a35a');
    px(ctx, 39, 260, 1, 1, '#f0d090');
    px(ctx, 36, 300, 5, 1, 'rgba(3,6,10,0.5)');

    // Luz cálida que cae al suelo del cuarto.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spill = ctx.createRadialGradient(25, 302, 2, 25, 304, 42);
    spill.addColorStop(0, `rgba(255,206,140,${0.28 * open})`);
    spill.addColorStop(0.55, `rgba(196,132,70,${0.1 * open})`);
    spill.addColorStop(1, 'rgba(120,72,34,0)');
    ctx.fillStyle = spill;
    ctx.fillRect(0, 274, 86, 46);
    ctx.restore();

    // Polvo suspendido en la luz cálida del umbral.
    for (let i = 0; i < 4; i += 1) {
      const px1 = 14 + ((i * 7 + 3) % 24);
      const py1 = 240 + ((i * 11 + state.time * (6 + i)) % 52);
      px(ctx, px1, py1, 1, 1, `rgba(255,224,168,${0.12 * open})`);
    }
  }

  // Umbral de madera gastada, compartido por ambos estados.
  px(ctx, 4, 300, 42, 4, '#33231a');
  px(ctx, 6, 300, 38, 1, '#6a4a32');
  px(ctx, 8, 303, 34, 1, '#1c120d');
  px(ctx, 12, 300, 26, 1, 'rgba(190,214,240,0.08)');

  // Perchero adosado, fuera del vano: tablilla, colgadores y abrigo colgado.
  px(ctx, 50, 222, 24, 6, '#241811');
  px(ctx, 50, 222, 24, 1, '#6a4a31');
  px(ctx, 51, 223, 22, 4, '#4a3223');
  px(ctx, 51, 223, 22, 1, 'rgba(255,214,168,0.12)');
  px(ctx, 54, 228, 1, 4, '#7a5a3a');
  px(ctx, 61, 228, 1, 4, '#7a5a3a');
  px(ctx, 68, 228, 1, 4, '#7a5a3a');
  // Abrigo azul colgado del colgador izquierdo.
  px(ctx, 51, 231, 8, 2, '#4a5e7d');
  px(ctx, 51, 233, 8, 13, '#33445c');
  px(ctx, 51, 233, 8, 1, '#4a5e7d');
  px(ctx, 52, 235, 6, 10, '#2b3a50');
  px(ctx, 52, 235, 1, 10, 'rgba(10,16,28,0.35)');
  px(ctx, 53, 244, 4, 2, '#22304a');
  // Bufanda granate en el colgador derecho.
  px(ctx, 67, 231, 3, 1, '#a05048');
  px(ctx, 67, 232, 3, 11, '#7a3c3a');
  px(ctx, 67, 232, 1, 11, '#a05048');
}

/**
 * Luz cálida de la lámpara de mesita: tiñe pared, cabecero y ropa de cama
 * sin lavar el contraste frío del ventanal ni ocultar el detalle.
 */
function drawLampLight(ctx: Ctx, state: BedroomRoomState): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Halo inmediato de la pantalla.
  const core = ctx.createRadialGradient(367, 116, 2, 367, 116, 26);
  core.addColorStop(0, 'rgba(255,224,160,0.44)');
  core.addColorStop(0.5, 'rgba(255,196,120,0.15)');
  core.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = core;
  ctx.fillRect(335, 84, 66, 66);

  // Derrame sobre la pared, el cabecero y la colcha.
  const wallGlow = ctx.createRadialGradient(367, 108, 8, 367, 108, 96);
  wallGlow.addColorStop(0, 'rgba(255,206,140,0.21)');
  wallGlow.addColorStop(0.55, 'rgba(220,150,86,0.085)');
  wallGlow.addColorStop(1, 'rgba(120,70,30,0)');
  ctx.fillStyle = wallGlow;
  ctx.fillRect(270, 16, 192, 188);

  const bedGlow = ctx.createRadialGradient(394, 132, 4, 394, 132, 80);
  bedGlow.addColorStop(0, 'rgba(255,210,150,0.17)');
  bedGlow.addColorStop(0.6, 'rgba(210,150,96,0.06)');
  bedGlow.addColorStop(1, 'rgba(120,70,30,0)');
  ctx.fillStyle = bedGlow;
  ctx.fillRect(336, 88, 148, 126);

  // Charco cálido en el suelo, con respiración mínima de la llama.
  const flicker = 0.12 + Math.sin(state.time * 2.1) * 0.008 + Math.sin(state.time * 5.7) * 0.004;
  const floorGlow = ctx.createRadialGradient(368, 152, 3, 368, 152, 52);
  floorGlow.addColorStop(0, `rgba(255,196,126,${flicker})`);
  floorGlow.addColorStop(0.6, `rgba(200,132,70,${flicker * 0.4})`);
  floorGlow.addColorStop(1, 'rgba(120,70,30,0)');
  ctx.fillStyle = floorGlow;
  ctx.fillRect(316, 118, 108, 108);
  ctx.restore();
}

function drawPlant(ctx: Ctx, time: number): void {  px(ctx, 448, 304, 26, 8, 'rgba(3,5,10,0.38)');
  px(ctx, 452, 292, 18, 14, '#5b3a28');
  px(ctx, 451, 292, 1, 14, 'rgba(255,220,180,0.1)');
  px(ctx, 468, 292, 2, 14, 'rgba(20,12,8,0.35)');
  px(ctx, 450, 290, 22, 4, '#7a5137');
  px(ctx, 450, 290, 22, 1, '#966645');
  px(ctx, 454, 286, 14, 4, '#3a261b');
  px(ctx, 455, 286, 12, 1, '#2a1a12');
  px(ctx, 452, 302, 18, 2, '#4a2f21');

  for (let i = 0; i < 11; i += 1) {
    const sway = Math.sin(time * 0.7 + i * 1.3) * 1.2;
    const bx = 453 + (i * 5) % 16;
    const by = 270 - (i % 4) * 4;
    px(ctx, bx + sway, by, 3, 16, i % 2 === 0 ? '#2f5a44' : '#244736');
    px(ctx, bx + sway + 2, by + 2, 1, 5, 'rgba(140,210,165,0.25)');
    px(ctx, bx + sway, by, 1, 2, 'rgba(170,230,190,0.18)');
  }
  px(ctx, 456, 280, 2, 8, '#3d6b51');
  px(ctx, 462, 276, 2, 11, '#35604a');
  px(ctx, 458, 272, 2, 7, '#467a5b');
  px(ctx, 459, 272, 1, 2, 'rgba(160,220,180,0.25)');

  // Mochila en el suelo.
  px(ctx, 320, 150, 28, 5, 'rgba(3,5,10,0.38)');
  px(ctx, 322, 130, 24, 24, '#5b3a26');
  px(ctx, 323, 131, 22, 1, '#7a5136');
  px(ctx, 323, 132, 22, 20, '#7a5136');
  px(ctx, 324, 134, 20, 3, '#8f6545');
  px(ctx, 324, 134, 20, 1, '#a97a54');
  px(ctx, 326, 140, 16, 8, '#684429');
  px(ctx, 327, 141, 14, 6, '#734b2d');
  px(ctx, 330, 139, 8, 2, '#b28a4e');
  px(ctx, 330, 139, 8, 1, '#d9b26a');
  px(ctx, 322, 134, 3, 18, '#4a2e1d');
  px(ctx, 343, 134, 3, 18, '#4a2e1d');
  px(ctx, 322, 134, 1, 18, 'rgba(255,220,180,0.06)');
  px(ctx, 323, 144, 3, 2, '#8a6b3c');
  px(ctx, 342, 144, 3, 2, '#8a6b3c');
  px(ctx, 334, 136, 3, 3, '#c9a35a');
  px(ctx, 335, 137, 1, 1, '#f0d090');
  px(ctx, 323, 148, 22, 3, '#4a2e1d');
  px(ctx, 326, 148, 16, 1, '#2f1d12');
  // Parche cosido.
  px(ctx, 326, 137, 5, 4, '#3f5a7a');
  px(ctx, 327, 138, 3, 2, '#5a7a9c');
}

/* =========================================================
   CAPA BASE Y MANTA
   ========================================================= */
export function drawBedroomBase(ctx: Ctx, state: BedroomRoomState): void {
  drawFloor(ctx, state.time);
  drawWall(ctx);
  drawWindow(ctx, state);
  drawWallDecor(ctx, state);
  drawRug(ctx);
  drawWardrobe(ctx);
  drawDesk(ctx, state);
  drawNightstand(ctx);
  drawShelves(ctx);
  drawBedBase(ctx);
  drawDoor(ctx, state);
  drawPlant(ctx, state.time);

  // Chispas de polvo suspendido en la luz del ventanal.
  for (let i = 0; i < 20; i += 1) {
    const x = 198 + ((i * 47 + state.time * (2 + (i % 3))) % 86);
    const y = 84 + ((i * 31 + state.time * (1.4 + (i % 4) * 0.4)) % 64);
    const a = 0.08 + (i % 4) * 0.025 + state.flash * 0.18;
    px(ctx, x, y, 1, 1, `rgba(216,232,255,${a})`);
  }

  // La luz cálida va al final para integrarse sobre los materiales.
  drawLampLight(ctx, state);
}

export function drawBedroomBlanket(ctx: Ctx, state: BedroomRoomState): void {
  const pull = state.blanketPull;
  const fullAlpha = 1 - Math.min(1, Math.max(0, (pull - 0.15) / 0.55));
  const pileAlpha = Math.min(1, Math.max(0, (pull - 0.35) / 0.45));

  if (fullAlpha > 0.01) {
    const top = state.blanketTop;
    const shift = pull * 18;
    const bottom = 191;
    ctx.save();
    ctx.globalAlpha = fullAlpha;

    ctx.beginPath();
    ctx.moveTo(391 + shift * 0.2, top + 2);
    ctx.quadraticCurveTo(427, top - 5, 459 - shift * 0.1, top + 3);
    ctx.lineTo(461, bottom);
    ctx.lineTo(391, bottom);
    ctx.closePath();
    const quilt = ctx.createLinearGradient(392, top, 460, bottom);
    quilt.addColorStop(0, '#3f5b88');
    quilt.addColorStop(0.45, '#4d6c9c');
    quilt.addColorStop(1, '#2f466b');
    ctx.fillStyle = quilt;
    ctx.fill();
    ctx.strokeStyle = 'rgba(25,35,60,0.65)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Embozo y pliegues.
    px(ctx, 394, top + 1, 64, 3, '#6182b4');
    px(ctx, 394, top + 1, 64, 1, '#7c9ccb');
    for (let i = 0; i < 4; i += 1) {
      const fx = 399 + i * 15;
      px(ctx, fx, top + 6, 1, bottom - top - 8, 'rgba(32,48,78,0.34)');
      px(ctx, fx + 1, top + 10 + i * 7, 1, 12, 'rgba(90,120,168,0.5)');
    }
    px(ctx, 400, top + 12, 56, 1, 'rgba(120,150,198,0.32)');
    px(ctx, 404, top + 30, 46, 1, 'rgba(28,42,70,0.28)');
    px(ctx, 398, top + 48, 58, 1, 'rgba(28,42,70,0.22)');
    px(ctx, 392, top + 4, 2, bottom - top - 4, '#293d5e');
    px(ctx, 459, top + 5, 2, bottom - top - 5, '#293d5e');
    px(ctx, 391, bottom - 4, 71, 4, '#2a3f62');
    // Pespunte del embozo.
    px(ctx, 396, top + 4, 60, 1, 'rgba(10,18,32,0.4)');

    // Costuras acolchadas: líneas discontinuas que dan volumen de tela.
    for (let row = 0; row < 3; row += 1) {
      const sy = top + 22 + row * 17;
      for (let sx = 400; sx < 452; sx += 6) {
        px(ctx, sx, sy, 3, 1, 'rgba(26,40,68,0.24)');
        px(ctx, sx + 3, sy + 1, 2, 1, 'rgba(140,170,214,0.16)');
      }
    }
    // Refuerzo lateral del acolchado, visible al doblar la colcha.
    for (let i = 0; i < 5; i += 1) {
      px(ctx, 393, top + 20 + i * 11, 1, 4, 'rgba(20,32,58,0.22)');
      px(ctx, 458, top + 24 + i * 12, 1, 4, 'rgba(20,32,58,0.18)');
    }
    // Luz cálida de la mesita sobre el borde de la colcha.
    px(ctx, 393, top + 8, 2, 34, 'rgba(255,196,132,0.12)');
    px(ctx, 395, top + 10, 1, 26, 'rgba(255,214,158,0.08)');
    ctx.restore();
  }

  if (pileAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = pileAlpha;

    // Edredón retirado y doblado a los pies de la cama: mantiene el volumen
    // de la tela y deja ver la sábana, en lugar de quedar como un bulto suelto.
    ctx.beginPath();
    ctx.moveTo(391, 181);
    ctx.quadraticCurveTo(400, 174, 414, 177);
    ctx.quadraticCurveTo(430, 172, 447, 176);
    ctx.quadraticCurveTo(462, 173, 470, 179);
    ctx.lineTo(472, 194);
    ctx.quadraticCurveTo(461, 199, 445, 197);
    ctx.quadraticCurveTo(425, 202, 406, 198);
    ctx.quadraticCurveTo(395, 197, 390, 191);
    ctx.closePath();
    const duvet = ctx.createLinearGradient(391, 174, 472, 202);
    duvet.addColorStop(0, '#5a7cb0');
    duvet.addColorStop(0.5, '#456391');
    duvet.addColorStop(1, '#2d476e');
    ctx.fillStyle = duvet;
    ctx.fill();
    ctx.strokeStyle = 'rgba(24,34,58,0.65)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pliegues y volúmenes del edredón.
    px(ctx, 394, 179, 72, 2, '#6f90c2');
    px(ctx, 396, 182, 20, 2, 'rgba(120,152,196,0.55)');
    px(ctx, 430, 181, 18, 2, 'rgba(120,152,196,0.5)');
    px(ctx, 456, 180, 12, 2, 'rgba(120,152,196,0.45)');
    for (let i = 0; i < 5; i += 1) {
      const fx = 401 + i * 14;
      px(ctx, fx, 182, 1, 13 - (i % 2) * 3, 'rgba(30,46,76,0.38)');
      px(ctx, fx + 1, 184 + (i % 2) * 2, 1, 8, 'rgba(108,140,188,0.35)');
    }
    px(ctx, 397, 193, 66, 1, 'rgba(28,42,70,0.4)');
    px(ctx, 398, 196, 58, 2, '#2b4268');
    // Borde doblado que cae sobre el pie de la cama.
    px(ctx, 394, 198, 70, 3, '#35517a');
    px(ctx, 398, 201, 62, 2, '#2a3f62');
    px(ctx, 404, 199, 16, 1, '#7092c4');
    px(ctx, 436, 199, 20, 1, '#7092c4');
    px(ctx, 450, 201, 1, 3, 'rgba(24,36,60,0.5)');
    px(ctx, 466, 197, 1, 4, 'rgba(24,36,60,0.45)');
    // Vuelta de forro en la esquina derecha.
    px(ctx, 466, 182, 3, 12, 'rgba(58,82,124,0.55)');
    ctx.restore();
  }
}

/** Sombra proyectada por la manta sobre el colchón. */
export function drawBlanketShadow(ctx: Ctx, state: BedroomRoomState): void {
  px(ctx, 391, state.blanketTop - 1, 70, 3, 'rgba(30,40,60,0.25)');
}
