/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar»
 * Renderizador procedural de la habitación de Pixel.
 *
 * Todo se dibuja en capas independientes a 1 px de resolución nativa:
 * suelo, muro, ventana, cortinas, muebles, alfombra, cama y manta. No se usa
 * ninguna imagen de fondo: cada objeto puede recibir interacción en el futuro.
 */

import { BEDROOM_W, BEDROOM_H, BEDROOM_WALL_BOTTOM } from './bedroomData';

export interface BedroomRoomState {
  time: number;
  flash: number;
  curtainSway: number;
  blanketTop: number;
  blanketPull: number;
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

const FLOOR_PLANKS = ['#3a2a23', '#412e25', '#33241f', '#463429', '#38271f', '#4a372b'];

/* =========================================================
   SUELO Y MURO
   ========================================================= */
function drawFloor(ctx: Ctx, time: number): void {
  px(ctx, 0, 0, BEDROOM_W, BEDROOM_H, '#171a26');

  for (let i = 0; i < 21; i += 1) {
    const x = i * 24;
    px(ctx, x, BEDROOM_WALL_BOTTOM, 24, BEDROOM_H - BEDROOM_WALL_BOTTOM, FLOOR_PLANKS[i % FLOOR_PLANKS.length]);
    px(ctx, x + 23, BEDROOM_WALL_BOTTOM, 1, BEDROOM_H - BEDROOM_WALL_BOTTOM, '#201510');
    px(ctx, x, BEDROOM_WALL_BOTTOM, 1, BEDROOM_H - BEDROOM_WALL_BOTTOM, 'rgba(255,205,160,0.035)');

    const offset = (i * 43) % 96;
    for (let y = BEDROOM_WALL_BOTTOM + offset; y < BEDROOM_H; y += 96) {
      px(ctx, x + 1, y, 22, 1, '#251913');
      px(ctx, x + 2, y, 9, 1, 'rgba(255,210,170,0.07)');
    }

    const grainOffset = (i * 29) % 71;
    for (let g = 0; g < 4; g += 1) {
      const gy = BEDROOM_WALL_BOTTOM + ((grainOffset + g * 61) % 236);
      const gx = x + 4 + ((i * 7 + g * 5) % 14);
      px(ctx, gx, gy, 1, 5 + ((i + g) % 6), 'rgba(20,12,9,0.35)');
      px(ctx, gx, gy, 1, 2, 'rgba(255,215,170,0.06)');
    }
  }

  // Sombra de contacto con el muro.
  px(ctx, 0, BEDROOM_WALL_BOTTOM, BEDROOM_W, 5, 'rgba(4,6,12,0.42)');
  px(ctx, 0, BEDROOM_WALL_BOTTOM + 5, BEDROOM_W, 2, 'rgba(4,6,12,0.18)');

  // Charco de luz fría que entra por la ventana.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const pool = ctx.createRadialGradient(241, 116, 8, 241, 128, 168);
  pool.addColorStop(0, 'rgba(78,128,196,0.20)');
  pool.addColorStop(0.45, 'rgba(54,96,160,0.10)');
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
  ctx.restore();
}

function drawWall(ctx: Ctx): void {
  px(ctx, 0, 0, BEDROOM_W, BEDROOM_WALL_BOTTOM, '#242c44');

  const shade = ctx.createLinearGradient(0, 0, 0, BEDROOM_WALL_BOTTOM);
  shade.addColorStop(0, 'rgba(4,7,16,0.46)');
  shade.addColorStop(0.5, 'rgba(6,10,22,0.14)');
  shade.addColorStop(1, 'rgba(10,15,28,0.3)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, BEDROOM_W, BEDROOM_WALL_BOTTOM);

  // Papel de pared con rombos tenues.
  for (let y = 10; y < BEDROOM_WALL_BOTTOM - 8; y += 18) {
    for (let x = 14 + ((y / 18) % 2) * 9; x < BEDROOM_W - 8; x += 18) {
      px(ctx, x, y, 1, 1, 'rgba(190,210,245,0.055)');
      px(ctx, x + 2, y + 1, 1, 1, 'rgba(190,210,245,0.028)');
    }
  }

  // Zócalo.
  px(ctx, 0, 71, BEDROOM_W, 2, '#151b2b');
  px(ctx, 0, 73, BEDROOM_W, 5, '#1b2132');
  px(ctx, 0, 73, BEDROOM_W, 1, 'rgba(178,198,238,0.18)');
  px(ctx, 0, 77, BEDROOM_W, 1, '#0c101c');

  // Esquinas de la habitación.
  px(ctx, 0, 0, 7, BEDROOM_H, '#151726');
  px(ctx, BEDROOM_W - 7, 0, 7, BEDROOM_H, '#141625');
  px(ctx, 6, 0, 1, BEDROOM_H, 'rgba(160,185,230,0.10)');
}

/* =========================================================
   VENTANA Y TORMENTA
   ========================================================= */
function drawWindow(ctx: Ctx, state: BedroomRoomState): void {
  const gx = 189;
  const gy = 14;
  const gw = 104;
  const gh = 54;

  // Marco exterior y sombra proyectada.
  px(ctx, 180, 8, 124, 66, 'rgba(3,5,12,0.5)');
  px(ctx, 183, 10, 118, 64, '#2b2434');
  px(ctx, 181, 10, 2, 64, '#1b1926');
  px(ctx, 301, 10, 2, 64, '#1b1926');

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

  // Lluvia sobre el cristal.
  const rainCount = 46;
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
  for (let i = 0; i < 12; i += 1) {
    const x = gx + 5 + ((i * 29) % (gw - 10));
    const y = gy + 8 + ((i * 17) % (gh - 16));
    px(ctx, x, y, 1, 1, 'rgba(205,230,255,0.34)');
  }
  for (let i = 0; i < 4; i += 1) {
    const drift = (state.time * (3 + i) + i * 17) % 38;
    const x = gx + 20 + i * 22;
    const y = gy + 6 + drift;
    ctx.globalAlpha = 0.16;
    px(ctx, x, y, 1, 6, '#c6e0ff');
    px(ctx, x + 1, y + 6, 1, 2, '#c6e0ff');
    ctx.globalAlpha = 1;
  }

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

  // Travesaños.
  px(ctx, gx + 51, gy, 2, gh, '#2c2536');
  px(ctx, gx, gy + 27, gw, 2, '#2c2536');
  px(ctx, gx + 51, gy, 1, gh, 'rgba(196,214,246,0.2)');
  px(ctx, gx, gy + 27, gw, 1, 'rgba(196,214,246,0.14)');

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

  // Alféizar.
  px(ctx, 180, 69, 124, 4, '#4a3527');
  px(ctx, 180, 69, 124, 1, '#6f5139');
  px(ctx, 180, 73, 124, 2, '#221711');

  drawCurtains(ctx, state);
}

function drawCurtains(ctx: Ctx, state: BedroomRoomState): void {
  const sway = state.curtainSway;
  const time = state.time;

  // Barra y anillas.
  px(ctx, 176, 6, 130, 3, '#33251c');
  px(ctx, 176, 6, 130, 1, '#5d4330');
  px(ctx, 173, 4, 3, 7, '#7a5a3a');
  px(ctx, 306, 4, 3, 7, '#7a5a3a');

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
    fabric.addColorStop(0.5, '#28324e');
    fabric.addColorStop(1, '#171e30');
    ctx.fillStyle = fabric;
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,10,18,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pliegues.
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 3; i += 1) {
      const fx = baseX + dir * (4 + i * 4.5) + wave * i * 0.24;
      ctx.strokeStyle = i % 2 === 0 ? '#3b4a6d' : '#121828';
      ctx.beginPath();
      ctx.moveTo(fx, 12);
      ctx.quadraticCurveTo(fx + dir * 2, 40, fx + wave * 0.6, 74);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
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

  // Póster «GAME ON».
  px(ctx, 118, 19, 54, 56, 'rgba(3,5,12,0.45)');
  px(ctx, 120, 20, 50, 54, '#c9b389');
  px(ctx, 122, 22, 46, 50, '#1e263c');
  px(ctx, 124, 24, 42, 46, '#262f49');
  drawPixelWord(ctx, 'GAME', 127, 28, 2, '#e8d7ac');
  drawPixelWord(ctx, 'ON', 136, 40, 2, '#e05a48');
  // Control.
  px(ctx, 132, 53, 26, 9, '#101522');
  px(ctx, 134, 55, 7, 5, '#38415c');
  px(ctx, 149, 55, 7, 5, '#38415c');
  px(ctx, 141, 57, 8, 2, '#8a93ac');
  px(ctx, 137, 55, 2, 2, '#e05a48');
  px(ctx, 151, 58, 2, 2, '#7fd3e0');
  px(ctx, 120, 20, 50, 1, 'rgba(255,244,214,0.5)');

  // Marco pequeño con arte arcade.
  px(ctx, 296, 17, 42, 38, 'rgba(3,5,12,0.4)');
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
  px(ctx, 298, 18, 38, 1, 'rgba(255,240,206,0.4)');

  // Reloj de pared.
  px(ctx, 356, 22, 22, 22, '#20283c');
  px(ctx, 358, 23, 18, 20, '#8e9ab2');
  px(ctx, 360, 25, 14, 16, '#1a2132');
  px(ctx, 366, 27, 1, 7, '#c9d7ef');
  px(ctx, 367, 33, 5, 1, '#c9d7ef');
  px(ctx, 367, 33, 2, 2, '#e05a48');
  px(ctx, 358, 23, 18, 1, 'rgba(255,255,255,0.25)');
  // Péndulo detenido.
  line(ctx, 367, 42, 367, 46, '#8e9ab2');
  px(ctx, 366, 46, 3, 3, '#c9a35a');

  // Cadenas con plantas colgantes junto a la ventana.
  drawHangingPlant(ctx, 172, 6, t, 0.8);
  drawHangingPlant(ctx, 313, 8, t, 1.1);

  // Cuadro familiar sobre la mesa de noche.
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
  for (let i = 0; i < 7; i += 1) {
    const lx = x - 6 * scale + i * 2 * scale + sway * (i % 2 === 0 ? 0.5 : -0.4);
    const ly = y + 20 * scale + (i % 3) * 3 * scale;
    px(ctx, lx, ly, 2 * scale, 3 * scale, i % 2 === 0 ? '#2f5a44' : '#244736');
    px(ctx, lx + 1, ly, 1, 1, 'rgba(140,210,165,0.35)');
  }
  // Zarcillos que caen.
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
  px(ctx, 20, 15, 74, 130, 'rgba(3,5,10,0.45)');
  px(ctx, 18, 12, 76, 132, '#3a271d');
  px(ctx, 16, 10, 80, 6, '#4d3323');
  px(ctx, 16, 10, 80, 1, '#6b4a31');
  px(ctx, 18, 16, 76, 124, '#452d21');
  px(ctx, 18, 16, 76, 2, '#5c3d2a');

  // Puertas y molduras.
  px(ctx, 22, 20, 32, 114, '#4f3426');
  px(ctx, 58, 20, 32, 114, '#4f3426');
  px(ctx, 54, 20, 3, 114, '#2b1c14');
  px(ctx, 26, 26, 24, 48, '#3f291e');
  px(ctx, 26, 26, 24, 1, 'rgba(245,205,160,0.12)');
  px(ctx, 26, 80, 24, 48, '#3f291e');
  px(ctx, 26, 80, 24, 1, 'rgba(245,205,160,0.1)');
  px(ctx, 62, 26, 24, 48, '#3f291e');
  px(ctx, 62, 26, 24, 1, 'rgba(245,205,160,0.12)');
  px(ctx, 62, 80, 24, 48, '#3f291e');
  px(ctx, 62, 80, 24, 1, 'rgba(245,205,160,0.1)');

  // Tiradores y cerradura.
  px(ctx, 50, 72, 2, 7, '#b28a4e');
  px(ctx, 60, 72, 2, 7, '#b28a4e');
  px(ctx, 49, 73, 4, 2, '#d9b26a');
  px(ctx, 59, 73, 4, 2, '#d9b26a');
  px(ctx, 57, 52, 2, 3, '#20150f');

  // Vetas y desgaste.
  for (let i = 0; i < 6; i += 1) {
    px(ctx, 22 + i * 11, 24 + (i % 3) * 37, 1, 16 + (i % 2) * 8, 'rgba(20,12,8,0.22)');
  }
  px(ctx, 18, 140, 76, 2, '#24160f');

  // Caja y zapatillas apoyadas.
  px(ctx, 106, 128, 22, 13, '#3c2a20');
  px(ctx, 106, 128, 22, 1, '#5a3e2c');
  px(ctx, 110, 134, 14, 1, '#241812');
  px(ctx, 100, 142, 12, 5, '#c7c3b5');
  px(ctx, 100, 145, 12, 2, '#8e8b80');
  px(ctx, 114, 141, 11, 5, '#bdb9ab');
  px(ctx, 114, 144, 11, 2, '#86837a');
}

function drawDesk(ctx: Ctx, state: BedroomRoomState): void {
  // Sombra.
  px(ctx, 180, 118, 132, 6, 'rgba(3,5,10,0.42)');

  // Cuerpo.
  px(ctx, 176, 82, 130, 38, '#38251b');
  px(ctx, 176, 82, 130, 1, 'rgba(255,220,170,0.08)');
  px(ctx, 176, 118, 130, 2, '#22160f');
  px(ctx, 178, 84, 126, 34, '#4a3022');

  // Cajones.
  px(ctx, 182, 88, 50, 12, '#412a1d');
  px(ctx, 182, 102, 50, 12, '#3b251a');
  px(ctx, 184, 90, 46, 8, '#4c3323');
  px(ctx, 184, 104, 46, 8, '#453022');
  px(ctx, 204, 93, 6, 2, '#b28a4e');
  px(ctx, 204, 107, 6, 2, '#b28a4e');
  px(ctx, 182, 88, 50, 1, 'rgba(255,225,180,0.08)');
  px(ctx, 182, 102, 50, 1, 'rgba(255,225,180,0.06)');

  // Tapa.
  px(ctx, 174, 76, 134, 8, '#5b3c28');
  px(ctx, 174, 76, 134, 2, '#7a5537');
  px(ctx, 174, 83, 134, 1, '#2a1a12');

  // Patas ocultas.
  px(ctx, 180, 120, 5, 6, '#2a1a12');
  px(ctx, 300, 120, 5, 6, '#2a1a12');

  // Radio antigua.
  px(ctx, 184, 84, 30, 24, '#2a1b14');
  px(ctx, 185, 85, 28, 22, '#5a3b27');
  px(ctx, 186, 86, 26, 2, '#7b5436');
  px(ctx, 188, 89, 15, 12, '#2a1c16');
  for (let i = 0; i < 5; i += 1) {
    px(ctx, 189, 90 + i * 2, 13, 1, '#6b4a30');
  }
  px(ctx, 205, 89, 6, 6, '#b99256');
  px(ctx, 206, 90, 4, 4, '#d9b974');
  px(ctx, 207, 91, 1, 2, '#2a1c16');
  px(ctx, 205, 98, 6, 2, '#1d130e');
  px(ctx, 206, 98, 1, 2, '#8c6b3f');
  px(ctx, 210, 98, 1, 2, '#8c6b3f');
  // Antena.
  line(ctx, 211, 85, 216, 76, '#8e7a5d');
  px(ctx, 216, 75, 1, 1, '#d9b974');

  // Monitor apagado.
  px(ctx, 221, 78, 56, 29, '#141a28');
  px(ctx, 222, 79, 54, 26, '#1b2232');
  px(ctx, 225, 82, 48, 20, '#080c15');
  px(ctx, 226, 83, 46, 17, '#0b1220');
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
  px(ctx, 271, 88, 1, 1, '#3a2430');
  px(ctx, 246, 106, 7, 5, '#1b2232');
  px(ctx, 240, 110, 19, 3, '#141a28');
  px(ctx, 240, 110, 19, 1, '#2b3448');

  // Torre.
  px(ctx, 282, 82, 17, 31, '#161c29');
  px(ctx, 283, 83, 15, 29, '#232b3c');
  for (let i = 0; i < 4; i += 1) px(ctx, 285, 86 + i * 4, 11, 1, '#111622');
  px(ctx, 285, 104, 5, 1, '#0e131e');
  px(ctx, 294, 104, 2, 2, '#3a2430');

  // Teclado, ratón, cuaderno, taza y auriculares.
  px(ctx, 224, 111, 47, 9, '#1b202c');
  px(ctx, 225, 112, 45, 7, '#2a3143');
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 11; c += 1) {
      px(ctx, 227 + c * 4, 113 + r * 2, 3, 1, '#3c455c');
    }
  }
  px(ctx, 224, 111, 47, 1, 'rgba(190,215,255,0.12)');
  px(ctx, 273, 111, 8, 7, '#1b202c');
  px(ctx, 274, 112, 6, 5, '#2c3345');
  px(ctx, 276, 111, 2, 1, '#4a556d');

  px(ctx, 276, 120, 22, 4, '#844b3d');
  px(ctx, 277, 120, 20, 1, '#a66351');
  px(ctx, 288, 117, 12, 4, '#7c463a');
  px(ctx, 288, 117, 12, 1, '#a66351');
  px(ctx, 298, 120, 2, 1, '#c58c79');

  px(ctx, 216, 108, 9, 10, '#6e4434');
  px(ctx, 217, 109, 7, 8, '#8e5a45');
  px(ctx, 217, 109, 7, 1, '#b77c62');
  px(ctx, 225, 111, 2, 3, '#6e4434');
  px(ctx, 218, 112, 5, 1, 'rgba(255,230,210,0.2)');

  px(ctx, 290, 111, 12, 3, '#141822');
  px(ctx, 291, 108, 10, 4, '#1d2433');
  px(ctx, 292, 108, 8, 1, '#4c5a74');
  px(ctx, 290, 113, 3, 2, '#141822');
  px(ctx, 299, 113, 3, 2, '#141822');

  px(ctx, 240, 86, 5, 2, '#c9a35a');
  px(ctx, 251, 85, 1, 2, '#8a7a5c');

  // Cuaderno y lápiz.
  px(ctx, 286, 122, 16, 5, '#b9b2a0');
  px(ctx, 287, 122, 14, 1, '#d8d2c2');
  px(ctx, 289, 124, 9, 1, '#78746a');
  px(ctx, 268, 122, 2, 5, '#c9a35a');
  px(ctx, 270, 126, 2, 1, '#e8d7ac');

  // Pequeña lámpara de escritorio (apagada).
  px(ctx, 296, 91, 2, 13, '#3a3f4e');
  px(ctx, 292, 104, 10, 2, '#2a2f3c');
  px(ctx, 291, 84, 9, 8, '#2f3648');
  px(ctx, 292, 85, 7, 6, '#3b4358');

  // Polvo iluminado sobre la superficie.
  const dust = 0.12 + state.flash * 0.3;
  for (let i = 0; i < 6; i += 1) {
    px(ctx, 200 + i * 17, 80 + ((i * 7) % 10), 1, 1, `rgba(200,220,255,${dust})`);
  }
}

function drawNightstand(ctx: Ctx): void {
  px(ctx, 350, 96, 36, 36, 'rgba(3,5,10,0.4)');
  px(ctx, 348, 94, 36, 38, '#38251b');
  px(ctx, 346, 92, 40, 5, '#5b3c28');
  px(ctx, 346, 92, 40, 1, '#795537');
  px(ctx, 350, 97, 32, 13, '#4a3122');
  px(ctx, 350, 111, 32, 17, '#422b1e');
  px(ctx, 357, 101, 18, 2, '#b28a4e');
  px(ctx, 367, 113, 8, 1, '#20150f');
  px(ctx, 350, 97, 32, 1, 'rgba(255,225,180,0.08)');

  // Reloj despertador apagado.
  px(ctx, 353, 92, 10, 4, '#1a1f2e');
  px(ctx, 354, 91, 8, 1, '#3d465c');

  // Lámpara apagada.
  px(ctx, 360, 128, 16, 3, '#6e5532');
  px(ctx, 363, 118, 2, 10, '#5b4529');
  px(ctx, 358, 109, 20, 10, '#3b3550');
  px(ctx, 359, 110, 18, 7, '#494263');
  px(ctx, 359, 110, 18, 1, '#5e567d');
  px(ctx, 357, 118, 22, 2, '#2c2841');
  px(ctx, 365, 108, 1, 2, '#6e5532');
  // Interior apenas visible: la lámpara está apagada.
  px(ctx, 361, 112, 4, 3, '#2e2a42');
}

function drawShelves(ctx: Ctx): void {
  // Estantería izquierda.
  px(ctx, 16, 162, 38, 68, 'rgba(3,5,10,0.42)');
  px(ctx, 14, 160, 38, 66, '#3a271d');
  px(ctx, 16, 163, 34, 60, '#241811');
  px(ctx, 16, 166, 34, 2, '#5b3d2b');
  px(ctx, 16, 190, 34, 2, '#5b3d2b');
  px(ctx, 16, 214, 34, 2, '#5b3d2b');
  const books = [
    ['#8c3f3b', '#c9a35a', '#3f5a7a', '#6a4a7c', '#4f6b4a'],
    ['#7c5a3a', '#9b4444', '#3b5e70', '#c9a35a', '#5a3f66'],
    ['#4a6b53', '#8c3f3b', '#6b5a86', '#b98c4e', '#3f4f70'],
  ];
  books.forEach((row, r) => {
    row.forEach((color, i) => {
      const bh = 10 + ((i + r) % 3) * 2;
      px(ctx, 18 + i * 6, 185 + r * 24 - bh, 4, bh, color);
      px(ctx, 18 + i * 6, 185 + r * 24 - bh, 4, 1, 'rgba(255,235,200,0.2)');
    });
  });
  // Objetos.
  px(ctx, 38, 176, 6, 6, '#c9a35a');
  px(ctx, 40, 174, 2, 2, '#e8d7ac');
  px(ctx, 18, 202, 8, 5, '#6d4a63');
  px(ctx, 29, 199, 9, 8, '#2b3648');
  px(ctx, 30, 200, 7, 5, '#45536e');
  px(ctx, 42, 226, 4, 8, '#7a5a3a');
  px(ctx, 41, 224, 6, 3, '#8e6b45');

  // Estantería derecha.
  px(ctx, 450, 218, 28, 66, 'rgba(3,5,10,0.42)');
  px(ctx, 448, 216, 28, 66, '#3a271d');
  px(ctx, 450, 219, 24, 60, '#241811');
  px(ctx, 450, 222, 24, 2, '#5b3d2b');
  px(ctx, 450, 246, 24, 2, '#5b3d2b');
  px(ctx, 450, 270, 24, 2, '#5b3d2b');
  for (let r = 0; r < 3; r += 1) {
    for (let i = 0; i < 4; i += 1) {
      const bh = 8 + ((i + r) % 2) * 3;
      const colors = ['#8c3f3b', '#4a6b53', '#6b5a86', '#b98c4e'];
      px(ctx, 452 + i * 5, 243 + r * 24 - bh, 4, bh, colors[(i + r) % 4]);
    }
  }
  px(ctx, 455, 234, 7, 8, '#c9a35a');
  px(ctx, 456, 235, 5, 6, '#2b2219');
  px(ctx, 458, 236, 1, 3, '#e8d7ac');
}

function drawRug(ctx: Ctx): void {
  px(ctx, 146, 180, 174, 104, 'rgba(3,5,10,0.3)');

  // Base con esquinas escalonadas.
  px(ctx, 150, 176, 166, 102, '#3a2735');
  px(ctx, 146, 180, 174, 94, '#3a2735');
  px(ctx, 150, 176, 166, 4, '#4c3445');
  px(ctx, 146, 180, 4, 94, '#4c3445');

  // Borde tejido.
  px(ctx, 150, 180, 166, 94, '#5a3d4c');
  px(ctx, 154, 184, 158, 86, '#472f3e');
  px(ctx, 154, 184, 158, 1, '#7d5a45');
  px(ctx, 154, 269, 158, 1, '#7d5a45');
  px(ctx, 154, 184, 1, 86, '#7d5a45');
  px(ctx, 311, 184, 1, 86, '#7d5a45');

  // Medallón central.
  const cx = 233;
  const cy = 227;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#6f4a5e';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 30, cy);
  ctx.lineTo(cx, cy + 22);
  ctx.lineTo(cx - 30, cy);
  ctx.closePath();
  ctx.fill();
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

  // Motivos y desgaste.
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    px(ctx, cx + Math.cos(angle) * 48 - 1, cy + Math.sin(angle) * 30 - 1, 3, 3, '#7a5a45');
  }
  for (let i = 0; i < 10; i += 1) {
    px(ctx, 160 + ((i * 31) % 140), 192 + ((i * 19) % 74), 1, 1, 'rgba(235,215,190,0.1)');
  }
  // Flecos.
  for (let i = 0; i < 16; i += 1) {
    px(ctx, 150 + i * 10, 174, 1, 3, '#6b4f3d');
    px(ctx, 150 + i * 10, 279, 1, 3, '#6b4f3d');
  }
}

function drawBedBase(ctx: Ctx): void {
  px(ctx, 384, 196, 88, 9, 'rgba(3,5,10,0.45)');

  // Cabecero.
  px(ctx, 380, 76, 92, 18, '#33231b');
  px(ctx, 378, 78, 4, 26, '#2a1c15');
  px(ctx, 468, 78, 4, 26, '#2a1c15');
  px(ctx, 382, 78, 88, 15, '#553a27');
  px(ctx, 384, 80, 84, 12, '#4a3122');
  px(ctx, 386, 82, 80, 3, '#63452f');
  px(ctx, 386, 89, 80, 1, '#3a2519');
  px(ctx, 380, 76, 4, 4, '#755237');
  px(ctx, 468, 76, 4, 4, '#755237');

  // Marco.
  px(ctx, 386, 86, 88, 112, '#3c281d');
  px(ctx, 388, 92, 84, 108, '#513724');
  px(ctx, 390, 94, 80, 104, '#5d3f29');
  px(ctx, 390, 94, 80, 1, '#755237');

  // Colchón y ropa de cama: lino cálido para distinguirlos del ventanal.
  px(ctx, 392, 90, 76, 104, '#3a3f52');
  px(ctx, 393, 91, 74, 101, '#7e7566');
  px(ctx, 394, 92, 72, 98, '#c8bda6');
  px(ctx, 396, 96, 68, 92, '#d3c8b1');
  px(ctx, 396, 96, 68, 1, '#e6dcc6');
  px(ctx, 396, 186, 68, 2, '#a89c84');
  px(ctx, 396, 96, 2, 90, '#b5a991');
  px(ctx, 462, 96, 2, 90, '#b5a991');

  // Sábana y pliegues.
  for (let i = 0; i < 5; i += 1) {
    px(ctx, 398, 176 + i * 3, 64, 1, `rgba(98,84,64,${0.2 - i * 0.026})`);
  }
  px(ctx, 398, 150, 64, 1, 'rgba(120,104,82,0.22)');
  px(ctx, 420, 118, 1, 64, 'rgba(116,100,78,0.16)');
  px(ctx, 438, 130, 1, 48, 'rgba(116,100,78,0.12)');

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

  // Almohada mullida, con esquinas escalonadas y hendidura central.
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

  // Pies de cama y sombra.
  px(ctx, 388, 194, 6, 8, '#2a1a12');
  px(ctx, 466, 194, 6, 8, '#2a1a12');
  px(ctx, 386, 86, 2, 110, '#2a1a12');
  px(ctx, 472, 86, 2, 110, '#2a1a12');

  // Zapatillas bajo la cama.
  px(ctx, 370, 206, 12, 4, '#b9b5a7');
  px(ctx, 370, 209, 12, 1, '#807d73');
  px(ctx, 370, 206, 12, 1, '#d6d2c4');
  px(ctx, 372, 202, 10, 4, '#a9a598');
}

function drawDoor(ctx: Ctx): void {
  px(ctx, 8, 236, 40, 60, 'rgba(3,5,10,0.35)');
  px(ctx, 8, 238, 38, 56, '#241811');
  px(ctx, 10, 240, 34, 54, '#4a3124');
  px(ctx, 12, 243, 30, 20, '#3d271d');
  px(ctx, 12, 267, 30, 24, '#3d271d');
  px(ctx, 12, 243, 30, 1, 'rgba(255,220,175,0.12)');
  px(ctx, 12, 267, 30, 1, 'rgba(255,220,175,0.09)');
  px(ctx, 14, 245, 26, 16, '#472f22');
  px(ctx, 14, 269, 26, 20, '#472f22');
  px(ctx, 39, 262, 3, 4, '#c9a35a');
  px(ctx, 40, 263, 1, 2, '#2a1c12');
  px(ctx, 10, 292, 34, 2, '#1a110c');
  // Luz fría bajo la puerta.
  px(ctx, 11, 293, 32, 1, 'rgba(150,190,240,0.35)');
  px(ctx, 12, 294, 30, 1, 'rgba(150,190,240,0.12)');

  // Perchero.
  px(ctx, 48, 226, 8, 2, '#3a2a20');
  px(ctx, 51, 228, 2, 12, '#5a3f2c');
  px(ctx, 46, 238, 12, 2, '#5a3f2c');
  px(ctx, 56, 240, 9, 18, '#33445c');
  px(ctx, 56, 240, 9, 2, '#4a5e7d');
  px(ctx, 57, 242, 1, 14, 'rgba(10,16,28,0.3)');
}

function drawPlant(ctx: Ctx, time: number): void {
  px(ctx, 448, 304, 26, 8, 'rgba(3,5,10,0.35)');
  px(ctx, 452, 292, 18, 14, '#5b3a28');
  px(ctx, 450, 290, 22, 4, '#7a5137');
  px(ctx, 450, 290, 22, 1, '#966645');
  px(ctx, 454, 286, 14, 4, '#3a261b');
  for (let i = 0; i < 8; i += 1) {
    const sway = Math.sin(time * 0.7 + i * 1.3) * 1.2;
    const bx = 454 + (i * 5) % 14;
    const by = 270 - (i % 4) * 4;
    px(ctx, bx + sway, by, 3, 16, i % 2 === 0 ? '#2f5a44' : '#244736');
    px(ctx, bx + sway + 2, by + 2, 1, 5, 'rgba(140,210,165,0.25)');
  }
  px(ctx, 456, 280, 2, 8, '#3d6b51');
  px(ctx, 462, 276, 2, 11, '#35604a');
  px(ctx, 458, 272, 2, 7, '#467a5b');

  // Mochila en el suelo.
  px(ctx, 320, 150, 28, 5, 'rgba(3,5,10,0.35)');
  px(ctx, 322, 130, 24, 24, '#5b3a26');
  px(ctx, 323, 132, 22, 20, '#7a5136');
  px(ctx, 324, 134, 20, 3, '#8f6545');
  px(ctx, 326, 140, 16, 8, '#684429');
  px(ctx, 330, 139, 8, 2, '#b28a4e');
  px(ctx, 322, 134, 3, 18, '#4a2e1d');
  px(ctx, 343, 134, 3, 18, '#4a2e1d');

  // Sobre la mesa de noche, el reloj ya está dibujado.
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
  drawDoor(ctx);
  drawPlant(ctx, state.time);

  // Chispas de polvo suspendido en la luz del ventanal.
  for (let i = 0; i < 16; i += 1) {
    const x = 198 + ((i * 47 + state.time * (2 + (i % 3))) % 86);
    const y = 84 + ((i * 31 + state.time * (1.4 + (i % 4) * 0.4)) % 64);
    const a = 0.08 + (i % 4) * 0.025 + state.flash * 0.18;
    px(ctx, x, y, 1, 1, `rgba(216,232,255,${a})`);
  }
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
    ctx.restore();
  }

  if (pileAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = pileAlpha;
    ctx.beginPath();
    ctx.moveTo(436, 196);
    ctx.lineTo(437, 180);
    ctx.quadraticCurveTo(446, 171, 458, 176);
    ctx.quadraticCurveTo(468, 175, 470, 184);
    ctx.lineTo(471, 196);
    ctx.quadraticCurveTo(456, 202, 440, 199);
    ctx.closePath();
    const duvet = ctx.createLinearGradient(436, 171, 471, 203);
    duvet.addColorStop(0, '#5476a8');
    duvet.addColorStop(0.52, '#42608f');
    duvet.addColorStop(1, '#2f4a73');
    ctx.fillStyle = duvet;
    ctx.fill();
    ctx.strokeStyle = 'rgba(24,34,58,0.6)';
    ctx.stroke();

    // Pliegues y volúmenes del edredón.
    px(ctx, 441, 178, 9, 3, '#6f90c2');
    px(ctx, 454, 177, 10, 3, '#6586b8');
    px(ctx, 464, 184, 5, 2, '#5c7cad');
    px(ctx, 439, 182, 2, 10, 'rgba(36,52,82,0.45)');
    px(ctx, 452, 180, 2, 13, 'rgba(30,46,76,0.4)');
    px(ctx, 463, 183, 2, 11, 'rgba(30,46,76,0.35)');
    px(ctx, 446, 190, 18, 1, 'rgba(110,140,190,0.35)');
    px(ctx, 442, 194, 26, 2, '#2c4266');

    // Borde que cae sobre el pie de la cama.
    px(ctx, 440, 200, 30, 5, '#35517a');
    px(ctx, 442, 199, 24, 2, '#7092c4');
    px(ctx, 446, 204, 22, 3, '#2a3f62');
    px(ctx, 452, 202, 1, 4, 'rgba(24,36,60,0.5)');
    px(ctx, 462, 202, 1, 4, 'rgba(24,36,60,0.45)');
    ctx.restore();
  }
}

/** Sombra proyectada por la manta sobre el colchón. */
export function drawBlanketShadow(ctx: Ctx, state: BedroomRoomState): void {
  px(ctx, 391, state.blanketTop - 1, 70, 3, 'rgba(30,40,60,0.25)');
}
