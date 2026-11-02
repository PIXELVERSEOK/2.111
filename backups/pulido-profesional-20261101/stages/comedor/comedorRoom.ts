/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · RENDER DEL COMEDOR
 *
 * Pixel-art procedural, sin imágenes de fondo. La sala se compone por capas:
 * suelo, muros con espesor, ventanal nocturno, cortinas, alfombra, muebles
 * ordenados por profundidad, alfarería y luz cálida de la lámpara. Cada objeto
 * tiene su propia sombra de contacto para que el espacio se lea como un lugar
 * habitable y no como una ilustración plana.
 */

import {
  COMEDOR_BEDROOM_DOOR,
  COMEDOR_H,
  COMEDOR_MAIN_DOOR,
  COMEDOR_W,
  COMEDOR_WALL_BOTTOM,
} from './comedorData';

type Ctx = CanvasRenderingContext2D;

export interface ComedorRoomState {
  time: number;
  flash: number;
  curtainSway: number;
  /** 0 cerrada · 1 abierta de par en par. */
  mainDoorOpen: number;
  /** 0 cerrado · 1 tapa levantada. */
  chestOpen: number;
  /** Vibración sutil de la vajilla con los truenos (0..1). */
  vibrate: number;
  backpackTaken: boolean;
  chestOpened: boolean;
  /** La tormenta ya se disipó: el exterior se ve de día y sin lluvia. */
  daylight?: boolean;
}

const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void => {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(w)),
    Math.max(1, Math.round(h))
  );
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

const FLOOR_PLANKS = ['#4a3224', '#53382a', '#432c20', '#59402f', '#3d281e', '#5f4532'];

function grain(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  dark = 'rgba(18,10,6,0.26)',
  light = 'rgba(255,218,172,0.06)'
): void {
  for (let i = 0; i < 6; i += 1) {
    const gx = x + 3 + ((seed * 17 + i * 11) % Math.max(2, w - 5));
    const gy = y + 4 + ((seed * 31 + i * 19) % Math.max(2, h - 7));
    px(ctx, gx, gy, 1, 2 + ((seed + i) % 5), i % 2 === 0 ? dark : light);
  }
}

/* =========================================================
   SUELO
   ========================================================= */
function drawFloor(ctx: Ctx, state: ComedorRoomState): void {
  px(ctx, 0, 0, COMEDOR_W, COMEDOR_H, '#160f0c');

  for (let i = 0; i < 20; i += 1) {
    const x = i * 24;
    px(
      ctx,
      x,
      COMEDOR_WALL_BOTTOM,
      24,
      COMEDOR_H - COMEDOR_WALL_BOTTOM,
      FLOOR_PLANKS[i % FLOOR_PLANKS.length]
    );
    px(ctx, x, COMEDOR_WALL_BOTTOM, 1, COMEDOR_H - COMEDOR_WALL_BOTTOM, 'rgba(255,205,160,0.055)');
    px(ctx, x + 1, COMEDOR_WALL_BOTTOM, 1, COMEDOR_H - COMEDOR_WALL_BOTTOM, 'rgba(255,220,180,0.02)');
    px(ctx, x + 22, COMEDOR_WALL_BOTTOM, 1, COMEDOR_H - COMEDOR_WALL_BOTTOM, 'rgba(9,5,3,0.42)');
    px(ctx, x + 23, COMEDOR_WALL_BOTTOM, 1, COMEDOR_H - COMEDOR_WALL_BOTTOM, '#1b110c');

    // Juntas transversales alternadas y vetas naturales.
    const offset = (i * 41) % 104;
    for (let y = COMEDOR_WALL_BOTTOM + offset; y < COMEDOR_H; y += 104) {
      px(ctx, x + 1, y, 22, 1, '#261812');
      px(ctx, x + 2, y + 1, 20, 1, 'rgba(255,210,170,0.035)');
    }
    grain(ctx, x, COMEDOR_WALL_BOTTOM, 24, 224, i + 2);
    if (i % 5 === 1) {
      const kx = x + 7 + (i % 6) * 2;
      const ky = COMEDOR_WALL_BOTTOM + 52 + ((i * 29) % 150);
      ctx.save();
      ctx.fillStyle = 'rgba(20,11,7,0.42)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 2.6, 1.4, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,222,180,0.06)';
      ctx.fillRect(kx - 2, ky - 1, 5, 1);
      ctx.restore();
    }
  }

  // Sombra de contacto del muro trasero.
  const wallShade = ctx.createLinearGradient(0, COMEDOR_WALL_BOTTOM, 0, COMEDOR_WALL_BOTTOM + 26);
  wallShade.addColorStop(0, 'rgba(3,5,10,0.62)');
  wallShade.addColorStop(0.5, 'rgba(3,5,10,0.24)');
  wallShade.addColorStop(1, 'rgba(3,5,10,0)');
  ctx.fillStyle = wallShade;
  ctx.fillRect(0, COMEDOR_WALL_BOTTOM, COMEDOR_W, 26);

  // Charco frío del ventanal: la tormenta también entra en el suelo.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const spill = ctx.createLinearGradient(0, COMEDOR_WALL_BOTTOM, 0, 250);
  spill.addColorStop(0, `rgba(90,140,190,${0.14 + state.flash * 0.2})`);
  spill.addColorStop(0.55, `rgba(60,100,150,${0.05 + state.flash * 0.09})`);
  spill.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.moveTo(178, COMEDOR_WALL_BOTTOM);
  ctx.lineTo(288, COMEDOR_WALL_BOTTOM);
  ctx.lineTo(322, 252);
  ctx.lineTo(152, 252);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* =========================================================
   MUROS
   ========================================================= */
function drawWalls(ctx: Ctx): void {
  // Muro trasero: papel cálido con listones, zócalo y moldura de corona.
  px(ctx, 0, 0, COMEDOR_W, COMEDOR_WALL_BOTTOM, '#3b2a22');
  for (let x = 0; x < COMEDOR_W; x += 16) {
    px(ctx, x, 0, 1, COMEDOR_WALL_BOTTOM, 'rgba(255,214,164,0.028)');
    px(ctx, x + 1, 0, 1, COMEDOR_WALL_BOTTOM, 'rgba(12,7,5,0.16)');
  }
  // Papel pintado: rombos discretos.
  for (let y = 10; y < 80; y += 14) {
    for (let x = 8 + ((y / 14) % 2) * 8; x < COMEDOR_W; x += 16) {
      px(ctx, x, y, 2, 2, 'rgba(216,178,122,0.075)');
      px(ctx, x + 1, y + 1, 1, 1, 'rgba(255,226,178,0.07)');
    }
  }
  // Listón horizontal y zócalo de madera.
  px(ctx, 0, 78, COMEDOR_W, 3, '#2a1b13');
  px(ctx, 0, 79, COMEDOR_W, 1, '#6b4a30');
  px(ctx, 0, 81, COMEDOR_W, 12, '#4a3324');
  px(ctx, 0, 81, COMEDOR_W, 1, '#795636');
  px(ctx, 0, 88, COMEDOR_W, 1, '#2a1b13');
  px(ctx, 0, 92, COMEDOR_W, 4, '#2c1d14');
  px(ctx, 0, 92, COMEDOR_W, 1, '#6a4a31');
  px(ctx, 0, 95, COMEDOR_W, 1, '#140c08');
  // Moldura superior y sombra de techo.
  px(ctx, 0, 0, COMEDOR_W, 4, '#1b120d');
  px(ctx, 0, 4, COMEDOR_W, 3, '#5a3e2a');
  px(ctx, 0, 7, COMEDOR_W, 2, '#2a1b13');
  const ceiling = ctx.createLinearGradient(0, 0, 0, 22);
  ceiling.addColorStop(0, 'rgba(0,0,0,0.55)');
  ceiling.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, COMEDOR_W, 22);

  // Muros laterales con espesor real. La puerta del dormitorio vive en el
  // izquierdo y la salida principal en el derecho.
  for (const side of ['left', 'right'] as const) {
    const x0 = side === 'left' ? 0 : COMEDOR_W - 56;
    const grad = ctx.createLinearGradient(x0, 0, x0 + 56, 0);
    if (side === 'left') {
      grad.addColorStop(0, '#1a110c');
      grad.addColorStop(0.62, '#3a271b');
      grad.addColorStop(1, '#4a3324');
    } else {
      grad.addColorStop(0, '#4a3324');
      grad.addColorStop(0.38, '#3a271b');
      grad.addColorStop(1, '#1a110c');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x0, 0, 56, COMEDOR_H);
    // Paneles verticales.
    for (let i = 0; i < 4; i += 1) {
      const px0 = x0 + 8 + i * 12;
      px(ctx, px0, 104, 1, 196, 'rgba(255,214,164,0.035)');
      px(ctx, px0 + 9, 104, 1, 196, 'rgba(8,4,2,0.3)');
    }
    // Zócalo del muro lateral.
    const baseX = side === 'left' ? 46 : COMEDOR_W - 52;
    px(ctx, baseX, COMEDOR_WALL_BOTTOM - 12, 6, COMEDOR_H - COMEDOR_WALL_BOTTOM + 12, '#2a1b13');
    px(ctx, baseX, COMEDOR_WALL_BOTTOM - 12, 1, COMEDOR_H - COMEDOR_WALL_BOTTOM + 12, '#6a4a31');
    // Esquina resuelta.
    const cornerX = side === 'left' ? 46 : COMEDOR_W - 52;
    px(ctx, cornerX, 0, 6, COMEDOR_WALL_BOTTOM, '#2a1b13');
    px(ctx, cornerX, 0, 1, COMEDOR_WALL_BOTTOM, '#5a3e2a');
  }
}

/* =========================================================
   VENTANAL NOCTURNO Y CORTINAS
   ========================================================= */
function drawWindow(ctx: Ctx, state: ComedorRoomState): void {
  const x = 174;
  const y = 8;
  const w = 116;
  const h = 82;

  // Marco de madera con profundidad y alféizar.
  px(ctx, x - 8, y - 6, w + 16, h + 16, '#2a1a11');
  px(ctx, x - 6, y - 4, w + 12, h + 12, '#6b4a2e');
  px(ctx, x - 4, y - 2, w + 8, h + 8, '#3c281a');
  px(ctx, x - 2, y, w + 4, h + 4, '#1b120c');

  if (state.daylight) {
    // Cielo diurno, limpio después de la tormenta.
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#5f9ec9');
    sky.addColorStop(0.5, '#8dc0d8');
    sky.addColorStop(1, '#d6e6d4');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    // Nubes altas y livianas.
    for (let i = 0; i < 5; i += 1) {
      const cx = x + 10 + ((i * 41 + state.time * 1.6) % (w - 18));
      const cy = y + 8 + (i % 3) * 12;
      ctx.fillStyle = `rgba(244,250,246,${0.5 + (i % 2) * 0.16})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(206,226,230,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy + 3, 14, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sol alto difuso.
    const sun = ctx.createRadialGradient(x + 84, y + 16, 1, x + 84, y + 16, 22);
    sun.addColorStop(0, 'rgba(255,246,206,0.95)');
    sun.addColorStop(0.4, 'rgba(255,236,168,0.45)');
    sun.addColorStop(1, 'rgba(255,228,150,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(x + 58, y - 8, 54, 54);
    // Bosque lejano verde con calma de pos tormenta.
    px(ctx, x, y + h - 26, w, 26, '#3d5c3e');
    px(ctx, x, y + h - 26, w, 2, '#567a4e');
    for (let i = 0; i < 13; i += 1) {
      const tx = x + 3 + i * 9;
      const th = 10 + ((i * 7) % 12);
      const sway = Math.sin(state.time * 0.8 + i) * 0.8;
      px(ctx, tx + sway, y + h - 18 - th, 2, th, '#2f4a32');
      px(ctx, tx - 2 + sway, y + h - 18 - th + 4, 6, 3, '#3f6240');
      px(ctx, tx - 1 + sway, y + h - 18 - th + 1, 4, 3, '#4c7448');
    }
    px(ctx, x, y + h - 18, w, 1, 'rgba(230,240,206,0.5)');
    px(ctx, x, y + h - 17, w, 2, 'rgba(60,86,58,0.32)');
    // Reflejo cálido del sol en el cristal y ausencia total de lluvia.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const dayGlow = ctx.createLinearGradient(x, y, x + w, y + h);
    dayGlow.addColorStop(0, 'rgba(255,238,190,0.12)');
    dayGlow.addColorStop(0.55, 'rgba(255,244,214,0.04)');
    dayGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = dayGlow;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  } else {
    // Cielo nocturno de tormenta.
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#08111f');
    sky.addColorStop(0.46, '#102337');
    sky.addColorStop(1, '#1b3145');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    // Nubes densas.
    for (let i = 0; i < 6; i += 1) {
      const cx = x + 8 + ((i * 37 + state.time * 3) % (w - 20));
      const cy = y + 10 + (i % 3) * 11;
      ctx.fillStyle = `rgba(44,66,88,${0.35 + (i % 2) * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bosque lejano mecido por el viento.
    px(ctx, x, y + h - 26, w, 26, '#0b1722');
    for (let i = 0; i < 13; i += 1) {
      const tx = x + 3 + i * 9;
      const th = 10 + ((i * 7) % 12);
      const sway = Math.sin(state.time * 1.4 + i) * 1.2;
      px(ctx, tx + sway, y + h - 18 - th, 2, th, '#0a141d');
      px(ctx, tx - 2 + sway, y + h - 18 - th + 4, 6, 3, '#0c1822');
      px(ctx, tx - 1 + sway, y + h - 18 - th + 1, 4, 3, '#0c1822');
    }
    // Línea de suelo y reflejos.
    px(ctx, x, y + h - 18, w, 1, 'rgba(80,124,150,0.3)');

    // Lluvia: rayas finas y rápidas.
    for (let i = 0; i < 34; i += 1) {
      const rx = x + 2 + ((i * 17 + state.time * 58) % (w - 4));
      const ry = y + 2 + ((i * 23 + state.time * 96) % (h - 6));
      px(ctx, rx, ry, 1, 4, `rgba(158,204,232,${0.22 + (i % 3) * 0.07})`);
      px(ctx, rx - 1, ry + 1, 1, 2, 'rgba(158,204,232,0.12)');
    }
    // Destello del relámpago dentro del cristal.
    if (state.flash > 0.02) {
      ctx.fillStyle = `rgba(208,232,255,${0.2 + state.flash * 0.55})`;
      ctx.fillRect(x, y, w, h);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const bolt = ctx.createRadialGradient(x + w * 0.62, y + 24, 2, x + w * 0.62, y + 24, 60);
      bolt.addColorStop(0, `rgba(230,245,255,${0.7 * state.flash})`);
      bolt.addColorStop(0.4, `rgba(120,170,235,${0.22 * state.flash})`);
      bolt.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bolt;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  }

  // Parteluces y reflejos del cristal.
  px(ctx, x + Math.round(w / 2) - 1, y, 2, h, '#3a271a');
  px(ctx, x, y + 30, w, 2, '#3a271a');
  const glassLight = state.daylight ? '255,242,208' : '180,220,245';
  px(ctx, x + 4, y + 3, 1, h - 6, `rgba(${glassLight},0.08)`);
  px(ctx, x + 9, y + 5, 1, h - 12, `rgba(${glassLight},0.05)`);
  for (let i = 0; i < 4; i += 1) {
    px(ctx, x + 12 + i * 27, y + 4 + i * 3, 1, 10 - i, `rgba(${glassLight},0.09)`);
  }

  // Alféizar.
  px(ctx, x - 12, y + h + 4, w + 24, 7, '#3a271a');
  px(ctx, x - 12, y + h + 4, w + 24, 1, '#8a6543');
  px(ctx, x - 12, y + h + 10, w + 24, 2, '#160e09');
  px(ctx, x - 4, y + h + 2, w + 8, 2, 'rgba(220,240,255,0.12)');
  // Maceta pequeña en el alféizar.
  px(ctx, x + 92, y + h - 6, 8, 9, '#7a4a2e');
  px(ctx, x + 91, y + h - 7, 10, 2, '#a86c42');
  px(ctx, x + 94, y + h - 14, 4, 8, '#2f5c3a');
  px(ctx, x + 92, y + h - 12, 3, 4, '#3c7448');
  px(ctx, x + 97, y + h - 13, 3, 5, '#3c7448');
}

function drawCurtains(ctx: Ctx, state: ComedorRoomState): void {
  const sway = state.curtainSway;
  const drawPanel = (x: number, dir: 1 | -1) => {
    const top = 2;
    const bottom = 102;
    const width = 20;
    const shift = sway * 2.2 * dir;
    for (let i = 0; i < 5; i += 1) {
      const foldX = x + i * 4 + (i % 2 === 0 ? shift : -shift * 0.5);
      const shade =
        i % 2 === 0 ? 'rgba(96,46,44,0.96)' : 'rgba(124,62,54,0.94)';
      px(ctx, foldX, top + 2, 4, bottom - top - 4, shade);
      px(ctx, foldX, top + 4, 1, bottom - top - 8, 'rgba(210,132,110,0.24)');
      px(ctx, foldX + 3, top + 6, 1, bottom - top - 12, 'rgba(45,20,18,0.4)');
    }
    // Velo inferior con movimiento.
    px(ctx, x - 1, bottom - 8, width + 3, 2, 'rgba(90,40,38,0.9)');
    px(ctx, x + 2 + shift, bottom - 6, width - 2, 1, 'rgba(148,76,66,0.8)');
    // Barral y anillas.
    px(ctx, x - 3, top, width + 8, 2, '#5c442c');
    for (let i = 0; i < 5; i += 1) {
      px(ctx, x - 1 + i * 5, top - 2, 2, 3, '#8d6a44');
    }
  };
  drawPanel(162, 1);
  drawPanel(288, -1);
}

/* =========================================================
   ALFOMBRA
   ========================================================= */
function drawRug(ctx: Ctx): void {
  const x = 176;
  const y = 176;
  const w = 206;
  const h = 112;
  px(ctx, x - 3, y - 3, w + 6, h + 6, 'rgba(6,4,3,0.4)');
  px(ctx, x, y, w, h, '#5e3028');
  px(ctx, x + 3, y + 3, w - 6, h - 6, '#7a4034');
  px(ctx, x + 6, y + 6, w - 12, h - 12, '#6b352c');
  // Guardas interiores.
  px(ctx, x + 10, y + 10, w - 20, 2, '#c39a5e');
  px(ctx, x + 10, y + h - 12, w - 20, 2, '#c39a5e');
  px(ctx, x + 10, y + 10, 2, h - 20, '#c39a5e');
  px(ctx, x + w - 12, y + 10, 2, h - 20, '#c39a5e');
  px(ctx, x + 14, y + 14, w - 28, 1, '#4b241f');
  px(ctx, x + 14, y + h - 16, w - 28, 1, '#4b241f');
  // Medallón central y rombos.
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(195,154,94,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 34, 24, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 22, 15, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx + 12, cy);
  ctx.lineTo(cx, cy + 10);
  ctx.lineTo(cx - 12, cy);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 8; i += 1) {
    const dx = x + 22 + (i % 4) * 54;
    const dy = y + 26 + Math.floor(i / 4) * 58;
    px(ctx, dx, dy, 3, 3, 'rgba(210,170,104,0.4)');
  }
  // Desgaste y flecos.
  for (let i = 0; i < 10; i += 1) {
    px(ctx, x + 12 + i * 18, y + 4 + (i % 3), 6, 1, 'rgba(32,16,12,0.25)');
  }
  for (let i = 0; i < 12; i += 1) {
    px(ctx, x + 8 + i * 16, y + h, 1, 3, 'rgba(176,138,88,0.35)');
  }
}

/* =========================================================
   PUERTAS
   ========================================================= */
function drawDoorFrame(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  side: 'left' | 'right'
): void {
  px(ctx, x - 5, y - 5, w + 10, h + 10, '#20140d');
  px(ctx, x - 4, y - 4, w + 8, h + 8, '#6d4b2e');
  px(ctx, x - 2, y - 2, w + 4, h + 4, '#3a271a');
  px(ctx, x - 1, y - 1, w + 2, h + 2, '#160e09');
  // Umbral de piedra.
  px(ctx, x - 6, y + h, w + 12, 5, '#6d5a44');
  px(ctx, x - 6, y + h, w + 12, 1, '#a48c6a');
  px(ctx, x - 6, y + h + 4, w + 12, 1, 'rgba(0,0,0,0.45)');
  // Bisagras del lado de la pared.
  const hingeX = side === 'left' ? x + 2 : x + w - 4;
  px(ctx, hingeX, y + 12, 3, 6, '#b08b4a');
  px(ctx, hingeX, y + h - 18, 3, 6, '#b08b4a');
  px(ctx, hingeX, y + 12, 1, 6, '#efd59a');
  px(ctx, hingeX, y + h - 18, 1, 6, '#efd59a');
}

function drawMainDoor(ctx: Ctx, state: ComedorRoomState): void {
  const { x, y, w, h } = COMEDOR_MAIN_DOOR;
  drawDoorFrame(ctx, x, y, w, h, 'right');
  const open = Math.max(0, Math.min(1, state.mainDoorOpen));

  if (open > 0.02) {
    const daylight = Boolean(state.daylight);
    // Portal exterior: tormenta nocturna o día limpio tras la tormenta.
    const portal = ctx.createLinearGradient(x, y, x, y + h);
    if (daylight) {
      portal.addColorStop(0, '#7fb4cf');
      portal.addColorStop(0.5, '#a9cbb8');
      portal.addColorStop(1, '#4d6b3f');
    } else {
      portal.addColorStop(0, '#050b12');
      portal.addColorStop(0.52, '#0a1824');
      portal.addColorStop(1, '#02060a');
    }
    ctx.fillStyle = portal;
    ctx.fillRect(x, y, w, h);
    // Horizonte y sendero.
    px(ctx, x, y + h - 20, w, 1, daylight ? 'rgba(246,232,180,0.5)' : 'rgba(90,130,160,0.3)');
    px(ctx, x, y + h - 10, w, 10, daylight ? '#6d7c4e' : '#131d22');
    // Vegetación mecida por el viento.
    for (let i = 0; i < 7; i += 1) {
      const gx = x + 3 + i * 6;
      const gh = 10 + ((i * 5) % 12);
      const sway = Math.sin(state.time * (daylight ? 1.1 : 2.2) + i) * (daylight ? 1.2 : 2);
      px(ctx, gx + sway, y + h - 12 - gh, 2, gh, daylight ? '#33502f' : '#0b1a18');
      px(ctx, gx - 2 + sway, y + h - 14 - gh, 5, 2, daylight ? '#527a42' : '#0d1f1b');
    }
    if (daylight) {
      // Sol y reflejos secos del sendero.
      const sun = ctx.createRadialGradient(x + w * 0.7, y + 12, 2, x + w * 0.7, y + 12, 26);
      sun.addColorStop(0, 'rgba(255,248,212,0.9)');
      sun.addColorStop(0.45, 'rgba(255,234,168,0.34)');
      sun.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(x + w * 0.7 - 28, y - 12, 56, 56);
      px(ctx, x + 4, y + h - 13, w - 8, 1, 'rgba(232,214,158,0.55)');
      px(ctx, x + 8, y + h - 8, w - 16, 1, 'rgba(60,74,42,0.4)');
    } else {
      // Lluvia visible en el umbral.
      for (let i = 0; i < 14; i += 1) {
        const rx = x + 2 + ((i * 11 + state.time * 52) % (w - 4));
        const ry = y + 3 + ((i * 17 + state.time * 90) % (h - 8));
        px(ctx, rx, ry, 1, 4, 'rgba(170,210,235,0.28)');
      }
    }
    // Hoja abierta recostada sobre el marco.
    const leafW = 5;
    const lean = Math.round(open * 3);
    px(ctx, x + w - leafW - lean, y + 1, leafW, h - 2, '#3a271a');
    px(ctx, x + w - leafW - lean, y + 1, 1, h - 2, '#7b5534');
    px(ctx, x + w - lean - 1, y + 1, 1, h - 2, '#1a110c');
    px(ctx, x + w - 3, y + h / 2 - 2, 2, 3, '#d4aa5c');
    // Luz que cae al suelo: fría con tormenta, cálida con sol.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const spill = ctx.createRadialGradient(x - 4, y + h - 4, 2, x - 20, y + h + 16, 70);
    if (daylight) {
      spill.addColorStop(0, `rgba(255,236,178,${0.28 * open})`);
      spill.addColorStop(0.5, `rgba(214,182,110,${0.1 * open})`);
      spill.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      spill.addColorStop(0, `rgba(120,190,220,${0.24 * open})`);
      spill.addColorStop(0.5, `rgba(60,120,160,${0.1 * open})`);
      spill.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = spill;
    ctx.fillRect(x - 84, y + h - 52, 100, 96);
    ctx.restore();
  } else {
    // Hoja de roble cerrada, con cuarterones y manija de latón.
    px(ctx, x, y, w, h, '#2a1b12');
    px(ctx, x + 2, y + 2, w - 4, h - 4, '#5a3d26');
    px(ctx, x + 2, y + 2, w - 4, 1, '#8a613b');
    px(ctx, x + 2, y + 2, 1, h - 4, '#7c5534');
    for (let i = 0; i < 3; i += 1) {
      const py = y + 8 + i * 22;
      px(ctx, x + 7, py, w - 14, 16, '#4a3120');
      px(ctx, x + 8, py + 1, w - 16, 14, '#63452c');
      px(ctx, x + 8, py + 1, w - 16, 1, '#8a613b');
      px(ctx, x + 8, py + 14, w - 16, 1, '#33200f');
      px(ctx, x + 8, py + 1, 1, 14, '#7c5534');
      px(ctx, x + w - 9, py + 1, 1, 14, '#33200f');
      // Vetas.
      line(ctx, x + 10, py + 5, x + w - 12, py + 5, 'rgba(30,18,10,0.2)');
      line(ctx, x + 10, py + 10, x + w - 14, py + 10, 'rgba(255,222,176,0.05)');
    }
    // Manija y placa.
    px(ctx, x + 7, y + h / 2 - 2, 4, 5, '#b08b4a');
    px(ctx, x + 8, y + h / 2 - 1, 2, 3, '#f0d692');
    px(ctx, x + 5, y + h / 2 - 4, 2, 9, '#6d5326');
    // Sombra de la hoja sobre el umbral.
    px(ctx, x, y + h - 1, w, 2, 'rgba(0,0,0,0.4)');
  }
}

function drawBedroomDoor(ctx: Ctx): void {
  const { x, y, w, h } = COMEDOR_BEDROOM_DOOR;
  drawDoorFrame(ctx, x, y, w, h, 'left');
  px(ctx, x, y, w, h, '#251810');
  px(ctx, x + 2, y + 2, w - 4, h - 4, '#4e3422');
  px(ctx, x + 2, y + 2, w - 4, 1, '#785334');
  px(ctx, x + 2, y + 2, 1, h - 4, '#6d4a2d');
  for (let i = 0; i < 3; i += 1) {
    const py = y + 7 + i * 22;
    px(ctx, x + 6, py, w - 12, 16, '#3f2919');
    px(ctx, x + 7, py + 1, w - 14, 14, '#593c26');
    px(ctx, x + 7, py + 1, w - 14, 1, '#7d5735');
    px(ctx, x + 7, py + 14, w - 14, 1, '#2b1a0f');
  }
  // Manija del lado del comedor.
  px(ctx, x + w - 9, y + h / 2 - 2, 4, 5, '#b08b4a');
  px(ctx, x + w - 8, y + h / 2 - 1, 2, 3, '#f0d692');
  px(ctx, x + w - 6, y + h / 2 - 4, 2, 9, '#6d5326');
  px(ctx, x + 1, y + h - 2, w - 2, 1, 'rgba(0,0,0,0.35)');
}

/* =========================================================
   DECORACIÓN DE PARED
   ========================================================= */
function drawWallDecor(ctx: Ctx, state: ComedorRoomState): void {
  // Cuadro familiar: madera tallada, passe-partout y retrato.
  const px0 = 316;
  const py0 = 18;
  px(ctx, px0 - 3, py0 - 3, 72, 52, '#1b110b');
  px(ctx, px0, py0, 66, 46, '#7a5432');
  px(ctx, px0 + 3, py0 + 3, 60, 40, '#2a1a10');
  px(ctx, px0 + 5, py0 + 5, 56, 36, '#6d7f74');
  // Cielo y campo del retrato.
  const pic = ctx.createLinearGradient(0, py0 + 5, 0, py0 + 41);
  pic.addColorStop(0, '#8ba0a0');
  pic.addColorStop(0.55, '#b9b48c');
  pic.addColorStop(1, '#5e6a4c');
  ctx.fillStyle = pic;
  ctx.fillRect(px0 + 5, py0 + 5, 56, 36);
  px(ctx, px0 + 5, py0 + 30, 56, 11, '#46543c');
  // Tres siluetas familiares.
  px(ctx, px0 + 15, py0 + 17, 6, 13, '#3a2a22');
  px(ctx, px0 + 14, py0 + 14, 8, 6, '#c99a72');
  px(ctx, px0 + 28, py0 + 14, 7, 16, '#4a3428');
  px(ctx, px0 + 27, py0 + 10, 9, 7, '#d2a47c');
  px(ctx, px0 + 41, py0 + 20, 5, 10, '#3a2a22');
  px(ctx, px0 + 40, py0 + 17, 7, 5, '#c99a72');
  // Marco interior y brillo del vidrio.
  px(ctx, px0 + 5, py0 + 5, 56, 1, 'rgba(255,255,255,0.25)');
  px(ctx, px0 + 5, py0 + 5, 1, 36, 'rgba(255,255,255,0.18)');
  line(ctx, px0 + 8, py0 + 38, px0 + 22, py0 + 9, 'rgba(255,255,255,0.08)');
  px(ctx, px0 + 30, py0 + 49, 8, 2, '#b08b4a');

  // Reloj de pared con péndulo inmóvil.
  const cx = 118;
  const cy = 36;
  px(ctx, cx - 13, cy - 13, 26, 26, '#20140c');
  px(ctx, cx - 12, cy - 12, 24, 24, '#7a5432');
  px(ctx, cx - 10, cy - 10, 20, 20, '#d8c8a4');
  px(ctx, cx - 9, cy - 9, 18, 18, '#efe4c8');
  px(ctx, cx - 8, cy - 8, 16, 1, 'rgba(120,96,64,0.4)');
  // Marcas horarias.
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    px(
      ctx,
      cx + Math.cos(a) * 7,
      cy + Math.sin(a) * 7,
      i % 3 === 0 ? 2 : 1,
      1,
      '#4a3a24'
    );
  }
  // Agujas: la hora se detiene un instante y vuelve.
  const stutter = Math.sin(state.time * 0.7) * 0.06 + 0.02;
  const hourA = -Math.PI / 2 + stutter;
  const minA = -Math.PI / 2 + Math.PI * 0.62 + stutter * 0.4;
  line(ctx, cx, cy, cx + Math.cos(hourA) * 5, cy + Math.sin(hourA) * 5, '#332416', 2);
  line(ctx, cx, cy, cx + Math.cos(minA) * 8, cy + Math.sin(minA) * 8, '#332416', 1);
  px(ctx, cx - 1, cy - 1, 2, 2, '#8a6a3a');
  px(ctx, cx - 1, cy + 12, 2, 7, '#7a5432');
  px(ctx, cx - 3, cy + 18, 6, 6, '#c8a868');
  px(ctx, cx - 1, cy + 19, 2, 3, '#f0d692');

  // Dos platos decorativos y un candelabro apagado.
  px(ctx, 288, 26, 14, 14, '#5c6c6a');
  px(ctx, 290, 28, 10, 10, '#8aa09a');
  px(ctx, 292, 30, 6, 6, '#5c6c6a');
  px(ctx, 400, 30, 12, 12, '#6b5a3a');
  px(ctx, 402, 32, 8, 8, '#a48c5a');
  px(ctx, 404, 34, 4, 4, '#6b5a3a');
  px(ctx, 52, 24, 4, 18, '#8a6a3a');
  px(ctx, 49, 22, 10, 3, '#b08b4a');
  px(ctx, 50, 20, 2, 5, '#d8c8a4');
  px(ctx, 56, 20, 2, 5, '#d8c8a4');
}

/* =========================================================
   MUEBLES
   ========================================================= */
function drawSideboard(ctx: Ctx): void {
  const x = 62;
  const y = 96;
  const w = 102;
  const h = 46;
  // Sombra de contacto y zócalo.
  px(ctx, x + 2, y + h, w - 4, 3, 'rgba(0,0,0,0.4)');
  px(ctx, x + 6, y + h + 3, w - 12, 3, 'rgba(0,0,0,0.18)');
  // Cuerpo con canto, tapa y bisel.
  px(ctx, x, y, w, h, '#21140d');
  px(ctx, x + 2, y + 2, w - 4, h - 4, '#5a3a24');
  px(ctx, x + 2, y + 2, w - 4, 1, '#91663d');
  px(ctx, x + 2, y + 2, 1, h - 4, '#7a5432');
  px(ctx, x + w - 3, y + 2, 1, h - 4, '#2c1a0f');
  // Tapa saliente con brillo.
  px(ctx, x - 2, y - 2, w + 4, 3, '#6d4b2e');
  px(ctx, x - 1, y - 2, w + 2, 1, '#a47a4c');
  px(ctx, x + 3, y + 3, w - 6, 1, 'rgba(255,216,168,0.08)');
  // Tres cuerpos con veta y marco.
  const bodyW = Math.floor((w - 10) / 3);
  for (let i = 0; i < 3; i += 1) {
    const bx = x + 4 + i * (bodyW + 1);
    px(ctx, bx, y + 5, bodyW, 15, '#452c1d');
    px(ctx, bx + 1, y + 6, bodyW - 2, 13, '#66452b');
    px(ctx, bx + 1, y + 6, bodyW - 2, 1, '#8d6238');
    px(ctx, bx + 1, y + 18, bodyW - 2, 1, '#33200f');
    px(ctx, bx + 1, y + 6, 1, 12, '#7d5735');
    px(ctx, bx + bodyW - 2, y + 6, 1, 12, '#3a2415');
    for (let g = 0; g < 3; g += 1) {
      px(ctx, bx + 3 + g * 5, y + 9 + (g % 2) * 5, 1, 4, 'rgba(40,22,12,0.22)');
      px(ctx, bx + 4 + g * 5, y + 9 + (g % 2) * 5, 1, 2, 'rgba(255,218,170,0.05)');
    }
    // Tirador de latón con sombra y brillo.
    const hx = bx + Math.floor(bodyW / 2) - 2;
    px(ctx, hx, y + 13, 5, 2, 'rgba(0,0,0,0.25)');
    px(ctx, hx, y + 12, 4, 2, '#b08b4a');
    px(ctx, hx + 1, y + 12, 2, 1, '#f2d992');
    // Puerta inferior con marco y tirador.
    px(ctx, bx, y + 22, bodyW, 19, '#3f2919');
    px(ctx, bx + 1, y + 23, bodyW - 2, 17, '#5a3c26');
    px(ctx, bx + 1, y + 23, bodyW - 2, 1, '#7d5735');
    px(ctx, bx + 1, y + 39, bodyW - 2, 1, '#33200f');
    px(ctx, bx + 3, y + 26, 1, 10, 'rgba(255,214,164,0.05)');
    px(ctx, bx + 3, y + 27, bodyW - 6, 1, 'rgba(40,22,12,0.16)');
    px(ctx, bx + Math.floor(bodyW / 2) - 1, y + 31, 4, 1, 'rgba(0,0,0,0.24)');
    px(ctx, bx + Math.floor(bodyW / 2) - 1, y + 30, 3, 2, '#b08b4a');
    px(ctx, bx + Math.floor(bodyW / 2), y + 30, 1, 1, '#f2d992');
  }
  // Patas con brillo de arista.
  for (const lx of [x + 5, x + w - 9]) {
    px(ctx, lx, y + h - 1, 4, 7, '#2c1a0f');
    px(ctx, lx, y + h - 1, 1, 7, '#5a3c26');
    px(ctx, lx, y + h + 4, 4, 2, 'rgba(0,0,0,0.3)');
  }
  // Superficie: jarra, frutero, dos copas y un candelabro.
  px(ctx, x + 8, y - 1, 9, 3, 'rgba(0,0,0,0.18)');
  px(ctx, x + 8, y - 2, 8, 5, '#7a5a3c');
  px(ctx, x + 9, y - 3, 6, 3, '#b08a62');
  px(ctx, x + 10, y - 4, 2, 2, '#d8b48a');
  px(ctx, x + 11, y - 5, 2, 3, '#d8b48a');
  px(ctx, x + 9, y - 3, 2, 2, '#e0bc8e');
  px(ctx, x + 26, y - 3, 12, 5, '#4c5c5a');
  px(ctx, x + 28, y - 4, 8, 3, '#a48c5a');
  px(ctx, x + 30, y - 5, 4, 2, '#d8b48a');
  px(ctx, x + 30, y - 5, 2, 1, '#f0d8a8');
  px(ctx, x + 27, y - 4, 1, 3, 'rgba(240,220,170,0.2)');
  px(ctx, x + 46, y - 3, 4, 5, '#b8c8c0');
  px(ctx, x + 47, y - 4, 2, 2, '#e8f0e8');
  px(ctx, x + 46, y - 3, 1, 5, 'rgba(240,255,248,0.6)');
  px(ctx, x + 56, y - 3, 4, 5, '#b8c8c0');
  px(ctx, x + 57, y - 4, 2, 2, '#e8f0e8');
  px(ctx, x + 56, y - 3, 1, 5, 'rgba(240,255,248,0.6)');
  px(ctx, x + 72, y - 4, 3, 8, '#8a6a3a');
  px(ctx, x + 72, y - 4, 1, 8, '#c9a45a');
  px(ctx, x + 70, y - 6, 7, 3, '#b08b4a');
  px(ctx, x + 70, y - 6, 7, 1, '#e0c07a');
  px(ctx, x + 70, y - 9, 1, 4, '#d8c8a4');
  px(ctx, x + 76, y - 9, 1, 4, '#d8c8a4');
}

function drawShelf(ctx: Ctx, state: ComedorRoomState): void {
  const x = 326;
  const y = 92;
  const w = 86;
  const h = 50;
  // Sombra de contacto y cuerpo.
  px(ctx, x + 2, y + h, w - 4, 3, 'rgba(0,0,0,0.4)');
  px(ctx, x + 6, y + h + 3, w - 12, 3, 'rgba(0,0,0,0.18)');
  px(ctx, x, y, w, h, '#21140d');
  px(ctx, x + 2, y + 2, w - 4, h - 4, '#4a3020');
  px(ctx, x + 2, y + 2, w - 4, 1, '#8d6238');
  px(ctx, x + 2, y + 2, 1, h - 4, '#7a5432');
  px(ctx, x + w - 3, y + 2, 1, h - 4, '#2c1a0f');
  // Zócalo inferior con moldura.
  px(ctx, x + 1, y + h - 5, w - 2, 3, '#3b2617');
  px(ctx, x + 1, y + h - 5, w - 2, 1, '#6d4b2e');
  // Puertas de vidrio con marco, bisagra y reflejos.
  for (let i = 0; i < 2; i += 1) {
    const gx = x + 5 + i * 39;
    px(ctx, gx, y + 5, 36, 40, '#2a1a10');
    const glass = ctx.createLinearGradient(gx, y + 5, gx + 36, y + 45);
    glass.addColorStop(0, 'rgba(110,150,160,0.32)');
    glass.addColorStop(0.45, 'rgba(44,70,78,0.58)');
    glass.addColorStop(1, 'rgba(20,32,38,0.74)');
    ctx.fillStyle = glass;
    ctx.fillRect(gx + 2, y + 7, 32, 36);
    // Repisa interior y vajilla detrás del vidrio.
    px(ctx, gx + 3, y + 24, 30, 1, 'rgba(120,90,60,0.5)');
    for (let s = 0; s < 3; s += 1) {
      px(ctx, gx + 5, y + 13 + s * 10, 10, 2, 'rgba(220,226,212,0.52)');
      px(ctx, gx + 5, y + 13 + s * 10, 10, 1, 'rgba(250,252,242,0.35)');
      px(ctx, gx + 19, y + 12 + s * 10, 8, 4, 'rgba(190,200,186,0.4)');
      px(ctx, gx + 19, y + 12 + s * 10, 8, 1, 'rgba(236,244,232,0.3)');
      px(ctx, gx + 19, y + 16 + s * 10, 8, 1, 'rgba(0,0,0,0.22)');
    }
    // Brillo del cristal en diagonal y arista inferior.
    line(ctx, gx + 5, y + 38, gx + 16, y + 10, 'rgba(230,248,255,0.16)');
    line(ctx, gx + 9, y + 38, gx + 18, y + 13, 'rgba(230,248,255,0.07)');
    px(ctx, gx + 17, y + 24, 2, 2, '#d4aa5c');
    px(ctx, gx + 17, y + 24, 1, 1, '#f2d992');
    // Marco y tirador.
    px(ctx, gx + 1, y + 5, 1, 40, '#5a3c26');
    px(ctx, gx + 34, y + 5, 1, 40, '#2c1a0f');
    px(ctx, gx + 33, y + 22, 2, 4, '#b08b4a');
    px(ctx, gx + 33, y + 22, 1, 2, '#f2d992');
    px(ctx, gx + 3, y + 44, 30, 1, 'rgba(0,0,0,0.35)');
  }
  // Corona superior y objetos sobre la vitrina.
  px(ctx, x - 2, y - 3, w + 4, 4, '#6d4b2e');
  px(ctx, x - 1, y - 2, w + 2, 1, '#a47a4c');
  px(ctx, x + 2, y + 1, w - 4, 1, 'rgba(255,216,168,0.07)');
  // Reloj de arena y plato.
  px(ctx, x + 10, y - 9, 6, 2, '#8a6a3a');
  px(ctx, x + 10, y - 8, 6, 5, '#b08b4a');
  px(ctx, x + 11, y - 7, 4, 2, '#e8d8a8');
  px(ctx, x + 12, y - 5, 2, 1, '#8a6a3a');
  px(ctx, x + 10, y - 8, 1, 4, '#d8b878');
  px(ctx, x + 30, y - 7, 10, 4, '#5c6a64');
  px(ctx, x + 32, y - 8, 6, 3, '#a4b4ac');
  px(ctx, x + 32, y - 8, 4, 1, '#d0dcd4');
  px(ctx, x + 34, y - 6, 2, 1, 'rgba(120,140,132,0.5)');
  // Luna de tormenta reflejada en el vidrio.
  if (state.flash > 0.05) {
    px(ctx, x + 20, y + 8, 2, 18, `rgba(220,240,255,${0.2 + state.flash * 0.3})`);
    px(ctx, x + 60, y + 8, 1, 18, `rgba(220,240,255,${0.12 + state.flash * 0.24})`);
  }
}

function drawChair(
  ctx: Ctx,
  x: number,
  y: number,
  facing: 'north' | 'south' | 'west' | 'east'
): void {
  const w = 26;
  const h = 22;
  // Sombra de contacto y patas con brillo de arista.
  px(ctx, x - 2, y + h - 1, w + 4, 3, 'rgba(0,0,0,0.34)');
  px(ctx, x, y + h + 2, w, 2, 'rgba(0,0,0,0.16)');
  // Patas.
  px(ctx, x + 2, y + h - 8, 3, 9, '#33200f');
  px(ctx, x + 2, y + h - 8, 1, 9, '#5c3c24');
  px(ctx, x + w - 5, y + h - 8, 3, 9, '#2a1a10');
  px(ctx, x + w - 5, y + h - 8, 1, 9, '#4f3420');
  // Asiento mullido con ribete y remates de latón.
  px(ctx, x, y + 6, w, 11, '#2a1a10');
  px(ctx, x + 1, y + 7, w - 2, 9, '#6b3d2f');
  px(ctx, x + 2, y + 8, w - 4, 7, '#83503c');
  px(ctx, x + 2, y + 8, w - 4, 1, '#a87554');
  px(ctx, x + 3, y + 9, w - 7, 1, 'rgba(255,214,180,0.16)');
  px(ctx, x + 2, y + 14, w - 4, 1, '#4a281f');
  px(ctx, x + 4, y + 12, 2, 1, 'rgba(60,32,24,0.35)');
  px(ctx, x + 18, y + 11, 2, 1, 'rgba(60,32,24,0.28)');
  for (const tx of [x + 3, x + w - 4]) {
    px(ctx, tx, y + 8, 1, 1, '#c9a45a');
    px(ctx, tx, y + 14, 1, 1, '#a8843f');
  }
  // Respaldo según orientación, con marco biselado y cojín.
  if (facing === 'north') {
    px(ctx, x + 2, y - 6, w - 4, 12, '#2a1a10');
    px(ctx, x + 3, y - 5, w - 6, 10, '#5a3528');
    px(ctx, x + 4, y - 4, w - 8, 8, '#6d4030');
    px(ctx, x + 5, y - 4, w - 10, 2, '#8a553c');
    px(ctx, x + 5, y - 4, w - 10, 1, '#a86c4c');
    px(ctx, x + 5, y + 2, w - 10, 1, '#3c2018');
    px(ctx, x + 4, y - 4, 1, 8, '#7a4a38');
    px(ctx, x + w - 5, y - 4, 1, 8, '#47281e');
  } else if (facing === 'south') {
    px(ctx, x + 2, y + 14, w - 4, 12, '#2a1a10');
    px(ctx, x + 3, y + 15, w - 6, 10, '#5a3528');
    px(ctx, x + 4, y + 16, w - 8, 8, '#6d4030');
    px(ctx, x + 5, y + 16, w - 10, 2, '#8a553c');
    px(ctx, x + 5, y + 16, w - 10, 1, '#a86c4c');
    px(ctx, x + 5, y + 22, w - 10, 1, '#3c2018');
    px(ctx, x + 4, y + 16, 1, 8, '#7a4a38');
    px(ctx, x + w - 5, y + 16, 1, 8, '#47281e');
  } else {
    const sideX = facing === 'west' ? x - 4 : x + w - 2;
    px(ctx, sideX, y - 4, 6, 24, '#2a1a10');
    px(ctx, sideX + 1, y - 3, 4, 22, '#5a3528');
    px(ctx, sideX + 2, y - 2, 1, 20, '#8a553c');
    px(ctx, sideX + 1, y - 3, 4, 1, '#7a4a38');
    px(ctx, sideX + 1, y + 18, 4, 1, '#3c2018');
    px(ctx, sideX + 4, y - 3, 1, 22, '#3f241a');
  }
}

function drawTable(ctx: Ctx, state: ComedorRoomState): void {
  const x = 208;
  const y = 182;
  const w = 142;
  const h = 60;
  // Sombra proyectada y patas torneadas.
  px(ctx, x + 3, y + h + 1, w - 4, 4, 'rgba(0,0,0,0.38)');
  px(ctx, x + 10, y + h + 5, w - 16, 4, 'rgba(0,0,0,0.16)');
  for (const lx of [x + 10, x + w - 18]) {
    px(ctx, lx, y + h - 4, 8, 20, '#241610');
    px(ctx, lx + 1, y + h - 3, 2, 18, '#5a3c26');
    px(ctx, lx + 5, y + h - 3, 2, 18, '#3f2919');
    px(ctx, lx + 2, y + h + 2, 1, 12, 'rgba(255,214,164,0.06)');
    px(ctx, lx - 1, y + h + 6, 10, 2, '#2a1a10');
    px(ctx, lx - 1, y + h + 6, 10, 1, '#6a462c');
  }
  // Tablero de madera con canto grueso y bisel.
  px(ctx, x - 2, y - 2, w + 4, h + 4, '#221510');
  px(ctx, x, y, w, h, '#5f4028');
  px(ctx, x + 2, y + 2, w - 4, h - 4, '#795232');
  px(ctx, x + 2, y + 2, w - 4, 1, '#a87848');
  px(ctx, x + 2, y + 2, 1, h - 4, '#92643a');
  px(ctx, x + w - 3, y + 2, 1, h - 4, '#4a2f1a');
  px(ctx, x + 2, y + h - 4, w - 4, 2, '#3a2415');
  // Vetas del tablero y dos nudos visibles en el borde.
  for (let i = 0; i < 7; i += 1) {
    const gy = y + 5 + i * 8;
    line(ctx, x + 6, gy, x + w - 8, gy - (i % 2) * 2, 'rgba(46,26,14,0.22)');
    line(ctx, x + 10, gy + 2, x + w - 14, gy + 1, 'rgba(255,220,170,0.05)');
  }
  for (const [kx, ky] of [
    [x + 8, y + 50],
    [x + w - 12, y + 8],
  ] as const) {
    px(ctx, kx, ky, 4, 2, 'rgba(40,22,12,0.35)');
    px(ctx, kx + 1, ky - 1, 2, 4, 'rgba(40,22,12,0.25)');
    px(ctx, kx, ky - 1, 4, 1, 'rgba(255,214,164,0.06)');
  }
  // Mantel corrido con borde festoneado y bordado.
  const mx = x + 18;
  const my = y + 10;
  px(ctx, mx - 1, my - 1, w - 34, h - 18, 'rgba(0,0,0,0.2)');
  px(ctx, mx, my, w - 36, h - 20, '#7a2f2c');
  px(ctx, mx + 2, my + 2, w - 40, h - 24, '#8d3a34');
  px(ctx, mx + 2, my + 2, w - 40, 1, '#b0564a');
  px(ctx, mx + 2, my + h - 23, w - 40, 1, '#6a2824');
  for (let i = 0; i < 8; i += 1) {
    px(ctx, mx + 3 + i * 12, my + h - 22, 6, 2, 'rgba(60,20,18,0.35)');
    px(ctx, mx + 4 + i * 12, my + 2, 1, 1, 'rgba(240,170,140,0.18)');
  }
  // Hilo de bordado a lo largo del mantel.
  for (let i = 0; i < 11; i += 1) {
    px(ctx, mx + 4 + i * 8, my + 4, 2, 1, 'rgba(232,190,140,0.14)');
    px(ctx, mx + 4 + i * 8, my + h - 26, 2, 1, 'rgba(232,190,140,0.1)');
  }
  // Vajilla y jarra con vibración sutil.
  const jig = Math.round(Math.sin(state.time * 34) * state.vibrate * 0.8);
  // Platos con ala, sombra y migas.
  for (const [pxp, pyp] of [
    [x + 34, y + 26],
    [x + 96, y + 26],
    [x + 34, y + 46],
    [x + 96, y + 46],
  ] as const) {
    px(ctx, pxp + 1, pyp + 5, 14, 2, 'rgba(0,0,0,0.24)');
    px(ctx, pxp, pyp, 14, 6, '#a8a48f');
    px(ctx, pxp + 1, pyp + 1, 12, 4, '#e4dfc8');
    px(ctx, pxp + 2, pyp + 1, 10, 1, '#f4efdc');
    px(ctx, pxp + 3, pyp + 2, 8, 2, '#f8f3e2');
    px(ctx, pxp + 2, pyp + 4, 10, 1, 'rgba(120,112,94,0.28)');
    px(ctx, pxp + 5, pyp + 2, 2, 1, 'rgba(200,160,90,0.6)');
    px(ctx, pxp + 9, pyp + 3, 1, 1, 'rgba(168,110,80,0.5)');
  }
  // Vasos de vidrio con líquido y reflejo.
  for (const [vx, vy] of [
    [x + 54, y + 20],
    [x + 82, y + 44],
  ] as const) {
    px(ctx, vx, vy, 4, 7, 'rgba(150,176,172,0.8)');
    px(ctx, vx + 1, vy + 2, 2, 4, 'rgba(214,232,226,0.45)');
    px(ctx, vx + 1, vy + 5, 2, 1, 'rgba(196,150,90,0.6)');
    px(ctx, vx, vy, 1, 7, 'rgba(236,250,246,0.55)');
    px(ctx, vx + 3, vy + 1, 1, 5, 'rgba(90,120,116,0.45)');
    px(ctx, vx, vy + 7, 4, 1, 'rgba(0,0,0,0.2)');
  }
  // Cubiertos con brillo de metal.
  for (const cx of [x + 54, x + 57]) {
    px(ctx, cx, y + 44, 1, 6, '#b8b09a');
    px(ctx, cx, y + 44, 1, 1, '#e8e0c8');
  }
  px(ctx, x + 60, y + 45, 4, 1, '#c8c0a8');
  px(ctx, x + 60, y + 45, 1, 1, '#f0e8d0');
  // Jarra central de cerámica.
  px(ctx, x + 66 + jig, y + 33, 10, 12, '#7a5a3c');
  px(ctx, x + 67 + jig, y + 34, 8, 10, '#b08a62');
  px(ctx, x + 68 + jig, y + 35, 3, 7, '#d0aa7c');
  px(ctx, x + 68 + jig, y + 39, 2, 2, 'rgba(255,226,180,0.5)');
  px(ctx, x + 75 + jig, y + 36, 3, 5, '#8d6a48');
  px(ctx, x + 75 + jig, y + 35, 2, 1, '#c29a70');
  px(ctx, x + 68 + jig, y + 31, 6, 2, '#d0aa7c');
  px(ctx, x + 68 + jig, y + 31, 6, 1, '#efd0a2');
  px(ctx, x + 70 + jig, y + 30, 2, 2, '#ead2a8');
  px(ctx, x + 66 + jig, y + 44, 10, 1, 'rgba(0,0,0,0.28)');
  // Panera de mimbre y fruta.
  px(ctx, x + 78, y + 30, 14, 6, '#8a663e');
  px(ctx, x + 80, y + 31, 10, 4, '#c49a62');
  for (let i = 0; i < 4; i += 1) {
    px(ctx, x + 80 + i * 3, y + 31, 1, 4, 'rgba(90,58,30,0.4)');
    px(ctx, x + 80, y + 32 + (i % 2), 10, 1, 'rgba(232,198,140,0.2)');
  }
  px(ctx, x + 82, y + 29, 3, 3, '#d8b04a');
  px(ctx, x + 82, y + 29, 1, 1, '#f4d878');
  px(ctx, x + 86, y + 28, 3, 4, '#b04a3a');
  px(ctx, x + 86, y + 28, 1, 1, '#e07860');
  px(ctx, x + 90, y + 30, 2, 2, '#4a7a3a');
  // Candelabro apagado con cera derretida.
  px(ctx, x + 108, y + 30, 3, 12, '#a8843f');
  px(ctx, x + 108, y + 30, 1, 12, '#e0bd72');
  px(ctx, x + 106, y + 42, 7, 2, '#8a6a3a');
  px(ctx, x + 106, y + 42, 7, 1, '#c9a45a');
  px(ctx, x + 107, y + 26, 2, 5, '#e8dcc0');
  px(ctx, x + 110, y + 26, 2, 5, '#e8dcc0');
  px(ctx, x + 107, y + 26, 1, 5, '#fbf4de');
  px(ctx, x + 110, y + 26, 1, 5, '#fbf4de');
  px(ctx, x + 107, y + 30, 1, 2, 'rgba(240,226,190,0.7)');
  px(ctx, x + 110, y + 29, 2, 1, 'rgba(240,226,190,0.6)');
}

function drawChest(ctx: Ctx, state: ComedorRoomState): void {
  const x = 72;
  const y = 150;
  const w = 48;
  const h = 30;
  const open = state.chestOpen > 0.02;
  // Sombra de contacto en dos pasos: apoya el cofre en el suelo.
  px(ctx, x - 2, y + h, w + 4, 2, 'rgba(0,0,0,0.42)');
  px(ctx, x + 1, y + h + 2, w - 2, 3, 'rgba(0,0,0,0.22)');
  // Cuerpo de madera oscura: canto, tablas y bisel.
  px(ctx, x, y + 8, w, h - 8, '#231510');
  px(ctx, x + 1, y + 9, w - 2, h - 10, '#482a1a');
  px(ctx, x + 2, y + 10, w - 4, h - 12, '#5c3823');
  px(ctx, x + 2, y + 10, w - 4, 1, '#7c4e2e');
  px(ctx, x + w - 3, y + 10, 1, h - 12, '#321c11');
  // Tablas verticales con veta y dos nudos.
  for (let i = 0; i < 4; i += 1) {
    const gx = x + 2 + i * 12;
    px(ctx, gx, y + 10, 1, h - 12, 'rgba(28,14,9,0.34)');
    px(ctx, gx + 2, y + 13, 1, h - 17, 'rgba(255,208,158,0.06)');
  }
  line(ctx, x + 4, y + 14, x + w - 6, y + 14, 'rgba(255,214,164,0.09)');
  line(ctx, x + 4, y + 22, x + w - 8, y + 22, 'rgba(0,0,0,0.3)');
  for (const [kx, ky] of [
    [x + 14, y + 19],
    [x + 34, y + 25],
  ] as const) {
    px(ctx, kx, ky, 3, 2, 'rgba(24,12,8,0.4)');
    px(ctx, kx + 1, ky - 1, 1, 4, 'rgba(24,12,8,0.28)');
    px(ctx, kx, ky - 1, 3, 1, 'rgba(255,206,156,0.06)');
  }
  // Golpes y roce del uso: esquinas aclaradas, marcas finas.
  px(ctx, x + 2, y + 9, 3, 1, 'rgba(190,132,84,0.24)');
  px(ctx, x + w - 5, y + h - 4, 3, 1, 'rgba(190,132,84,0.18)');
  px(ctx, x + 20, y + 27, 4, 1, 'rgba(16,8,5,0.32)');
  px(ctx, x + 40, y + 16, 3, 1, 'rgba(16,8,5,0.26)');
  // Tapa: cerrada o abierta.
  if (open) {
    const lift = Math.round(state.chestOpen * 10);
    px(ctx, x - 2, y + 6 - lift, w + 4, 8, '#281710');
    px(ctx, x, y + 7 - lift, w, 6, '#5c3823');
    px(ctx, x + 1, y + 8 - lift, w - 2, 2, '#8a5632');
    px(ctx, x + 2, y + 8 - lift, w - 4, 1, 'rgba(255,220,170,0.16)');
    // Interior: terciopelo en sombra; no se revela el contenido.
    px(ctx, x + 4, y + 8, w - 8, 8, '#150d09');
    px(ctx, x + 6, y + 9, w - 12, 5, '#3a1c1a');
    px(ctx, x + 8, y + 10, w - 16, 2, '#5a2c2a');
    px(ctx, x + 8, y + 10, w - 16, 1, 'rgba(200,110,96,0.18)');
  } else {
    // Tapa abombada: tres franjas claras y sombra de junta.
    px(ctx, x - 2, y + 2, w + 4, 12, '#281710');
    px(ctx, x, y + 3, w, 10, '#5c3823');
    px(ctx, x + 1, y + 4, w - 2, 2, '#8a5632');
    px(ctx, x + 2, y + 4, w - 4, 1, '#b47a4a');
    px(ctx, x + 4, y + 6, w - 10, 1, 'rgba(255,214,164,0.1)');
    px(ctx, x + 1, y + 10, w - 2, 1, '#3a2014');
    px(ctx, x + 1, y + 11, w - 2, 1, 'rgba(0,0,0,0.36)');
  }
  // Bandas de hierro forjado con remaches y brillo de canto.
  for (const bx of [x + 5, x + w - 9]) {
    const by = y + (open ? 6 : 2);
    px(ctx, bx, by, 4, h - 4, '#45423c');
    px(ctx, bx, by, 1, h - 4, '#8f8c82');
    px(ctx, bx + 3, by, 1, h - 4, '#2b2925');
    px(ctx, bx - 1, by + 2, 6, 2, '#6a665e');
    px(ctx, bx + 1, by + 4, 1, 1, '#c8c4b4');
    px(ctx, bx + 1, by + h - 9, 1, 1, '#a8a496');
  }
  // Cantoneras en L: refuerzan las cuatro esquinas del cuerpo.
  for (const [cxr, cyr, sx] of [
    [x + 1, y + 10, 1],
    [x + w - 4, y + 10, -1],
  ] as const) {
    px(ctx, cxr, cyr, 3, 2, '#5a5650');
    px(ctx, sx > 0 ? cxr : cxr - 2, cyr, 5 * Math.abs(sx), 1, '#8f8c82');
    px(ctx, cxr + (sx > 0 ? 0 : 2), cyr, 1, 5, '#6a665e');
  }
  // Cerradura de tres discos: placa, discos, remaches y ojo de llave.
  const lx = x + w / 2 - 8;
  const ly = y + 12;
  px(ctx, lx - 1, ly - 1, 18, 12, '#6a4a1a');
  px(ctx, lx, ly, 16, 10, '#8a6a2a');
  px(ctx, lx + 1, ly + 1, 14, 8, '#c9a45a');
  px(ctx, lx + 1, ly + 1, 14, 1, '#f0d692');
  px(ctx, lx + 1, ly + 8, 14, 1, '#7a5a24');
  for (let i = 0; i < 3; i += 1) {
    px(ctx, lx + 2 + i * 4, ly + 3, 3, 4, '#4a3a1a');
    px(ctx, lx + 3 + i * 4, ly + 3, 1, 4, '#e8d29a');
    px(ctx, lx + 2 + i * 4, ly + 6, 3, 1, 'rgba(0,0,0,0.3)');
  }
  px(ctx, lx + 6, ly + 8, 4, 3, '#6a4a1a');
  px(ctx, lx + 7, ly + 8, 2, 2, '#f0d692');
  px(ctx, lx, ly + 1, 1, 1, '#e8d29a');
  px(ctx, lx + 15, ly + 1, 1, 1, '#e8d29a');
  // Polvo y desgaste.
  for (let i = 0; i < 5; i += 1) {
    px(ctx, x + 6 + i * 8, y + 4 + (i % 3) * 6, 2, 1, 'rgba(220,200,170,0.08)');
  }
}

function drawBackpack(ctx: Ctx): void {
  if (ctx) {
    /* no-op para mantener el orden de capas */
  }
  const x = 126;
  const y = 154;
  // Sombra de contacto blanda.
  px(ctx, x + 1, y + 19, 21, 2, 'rgba(0,0,0,0.4)');
  px(ctx, x + 3, y + 21, 17, 2, 'rgba(0,0,0,0.2)');
  // Correas traseras asomando por los costados.
  px(ctx, x - 1, y + 5, 3, 12, '#4a3824');
  px(ctx, x - 1, y + 5, 1, 12, '#6a5638');
  px(ctx, x + 20, y + 5, 3, 12, '#3a2a1a');
  px(ctx, x + 20, y + 5, 1, 12, '#5a462c');
  // Cuerpo de lona con contorno, volumen y paneles.
  px(ctx, x + 2, y + 2, 18, 18, '#241a10');
  px(ctx, x + 3, y + 3, 16, 16, '#6f5a3a');
  px(ctx, x + 4, y + 4, 14, 14, '#8f7550');
  px(ctx, x + 4, y + 4, 1, 14, '#3a2c1a');
  px(ctx, x + 17, y + 4, 1, 14, '#5a462c');
  px(ctx, x + 4, y + 4, 14, 2, '#b0986c');
  px(ctx, x + 4, y + 15, 14, 2, '#5a462c');
  // Costuras verticales y remates de lona.
  px(ctx, x + 9, y + 5, 1, 9, 'rgba(58,44,26,0.5)');
  px(ctx, x + 16, y + 5, 1, 9, 'rgba(58,44,26,0.32)');
  for (let i = 0; i < 5; i += 1) {
    px(ctx, x + 5, y + 6 + i * 2, 1, 1, 'rgba(232,214,176,0.22)');
    px(ctx, x + 15, y + 6 + i * 2, 1, 1, 'rgba(232,214,176,0.16)');
  }
  // Bolsillos laterales con fuelle y botón.
  px(ctx, x, y + 10, 4, 8, '#5a462c');
  px(ctx, x + 1, y + 11, 2, 6, '#7a6240');
  px(ctx, x + 1, y + 11, 2, 1, '#9c8256');
  px(ctx, x, y + 13, 4, 1, 'rgba(38,28,16,0.5)');
  px(ctx, x + 18, y + 11, 4, 7, '#4a3824');
  px(ctx, x + 19, y + 12, 2, 5, '#6f5a3a');
  px(ctx, x + 19, y + 12, 2, 1, '#8f7550');
  // Solapa con vuelo, pespunte y correas.
  px(ctx, x + 4, y + 8, 14, 5, '#5e4b30');
  px(ctx, x + 5, y + 9, 12, 3, '#a0865c');
  px(ctx, x + 5, y + 9, 12, 1, '#c0a674');
  px(ctx, x + 5, y + 11, 12, 1, '#6a5638');
  for (let i = 0; i < 4; i += 1) {
    px(ctx, x + 6 + i * 3, y + 10, 1, 1, 'rgba(240,226,196,0.26)');
  }
  px(ctx, x + 10, y + 7, 2, 8, '#4a3824');
  px(ctx, x + 10, y + 7, 1, 8, '#6a5638');
  px(ctx, x + 7, y + 2, 2, 5, '#4a3824');
  px(ctx, x + 7, y + 2, 1, 5, '#6a5638');
  px(ctx, x + 16, y + 2, 2, 5, '#4a3824');
  px(ctx, x + 16, y + 2, 1, 5, '#6a5638');
  // Asa superior de tela.
  px(ctx, x + 9, y + 1, 5, 2, '#3a2c1a');
  px(ctx, x + 10, y, 3, 1, '#5a462c');
  // Hebillas de latón con pasador.
  px(ctx, x + 8, y + 10, 2, 2, '#d4aa5c');
  px(ctx, x + 8, y + 10, 1, 1, '#f2d992');
  px(ctx, x + 15, y + 10, 2, 2, '#d4aa5c');
  px(ctx, x + 15, y + 10, 1, 1, '#f2d992');
  // Brújula cosida al frente, con aguja y brillo.
  px(ctx, x + 12, y + 14, 6, 6, '#3a2c1a');
  px(ctx, x + 13, y + 15, 4, 4, '#c8a868');
  px(ctx, x + 13, y + 15, 4, 1, '#ecd29a');
  px(ctx, x + 14, y + 16, 2, 2, '#6a5638');
  px(ctx, x + 15, y + 16, 1, 1, '#b04a3a');
  px(ctx, x + 13, y + 15, 1, 1, '#f6e6b8');
}

function drawPlant(ctx: Ctx, state: ComedorRoomState): void {
  const x = 396;
  const y = 288;
  px(ctx, x - 8, y + 22, 28, 5, 'rgba(0,0,0,0.38)');
  // Maceta de cerámica.
  px(ctx, x - 2, y + 12, 20, 12, '#6b3a2e');
  px(ctx, x - 3, y + 10, 22, 4, '#8a4c3a');
  px(ctx, x - 3, y + 10, 22, 1, '#b06a50');
  px(ctx, x - 1, y + 22, 18, 2, '#4a241c');
  // Hojas largas mecidas por el viento interior.
  for (let i = 0; i < 8; i += 1) {
    const a = -1.2 + i * 0.28;
    const sway = Math.sin(state.time * 1.7 + i * 0.7) * 2.2;
    const len = 14 + (i % 4) * 4;
    px(
      ctx,
      x + 8 + Math.cos(a) * len * 0.35 + sway,
      y + 10 - Math.abs(Math.sin(a)) * len,
      2,
      len * 0.7,
      i % 2 === 0 ? '#2f5c3a' : '#3c7448'
    );
    px(
      ctx,
      x + 8 + Math.cos(a) * len * 0.5 + sway,
      y + 10 - Math.abs(Math.sin(a)) * len * 0.8,
      3,
      2,
      '#4a8454'
    );
  }
}

function drawCoatRack(ctx: Ctx): void {
  const x = 58;
  const y = 214;
  px(ctx, x - 2, y, 14, 3, '#5a3c26');
  px(ctx, x + 4, y + 3, 3, 58, '#4a3020');
  px(ctx, x + 5, y + 3, 1, 58, '#7a5432');
  px(ctx, x - 1, y + 58, 13, 3, '#2a1a10');
  // Abrigo y bufanda.
  px(ctx, x + 1, y + 10, 10, 26, '#2c3a4a');
  px(ctx, x + 2, y + 11, 8, 24, '#3a4c60');
  px(ctx, x + 2, y + 11, 1, 24, '#566c84');
  px(ctx, x + 4, y + 14, 4, 3, '#d8b48a');
  px(ctx, x - 1, y + 12, 3, 10, '#8a2f34');
  px(ctx, x + 10, y + 12, 3, 12, '#8a2f34');
  // Sombrero colgado.
  px(ctx, x + 2, y + 2, 10, 3, '#3a2a1c');
  px(ctx, x + 4, y - 2, 6, 5, '#4a3624');
  px(ctx, x + 4, y - 2, 6, 1, '#6a5032');
}

/* =========================================================
   LUZ
   ========================================================= */
function drawLighting(ctx: Ctx, state: ComedorRoomState): void {
  // Lámpara colgante de latón y su charco cálido.
  const lx = 279;
  const ly = 90;
  px(ctx, lx - 1, 0, 2, 84, '#8a6a3a');
  px(ctx, lx, 0, 1, 84, '#c9a45a');
  // Pantalla.
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.moveTo(lx - 20, ly + 14);
  ctx.lineTo(lx + 20, ly + 14);
  ctx.lineTo(lx + 11, ly);
  ctx.lineTo(lx - 11, ly);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6b4a2e';
  ctx.beginPath();
  ctx.moveTo(lx - 17, ly + 12);
  ctx.lineTo(lx + 17, ly + 12);
  ctx.lineTo(lx + 10, ly + 2);
  ctx.lineTo(lx - 10, ly + 2);
  ctx.closePath();
  ctx.fill();
  px(ctx, lx - 18, ly + 12, 36, 2, '#c9a45a');
  px(ctx, lx - 17, ly + 12, 34, 1, '#efd59a');
  px(ctx, lx - 4, ly + 14, 8, 4, '#ffe7a8');
  px(ctx, lx - 3, ly + 15, 6, 2, '#fff4cf');
  // Halo inmediato del filamento.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const filament = ctx.createRadialGradient(lx, ly + 16, 1, lx, ly + 16, 14);
  filament.addColorStop(0, 'rgba(255,244,207,0.5)');
  filament.addColorStop(0.45, 'rgba(255,220,150,0.18)');
  filament.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = filament;
  ctx.fillRect(lx - 16, ly, 32, 32);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  // Oclusión ambiental en los apoyos: asienta muebles y sillas.
  const tableAO = ctx.createRadialGradient(279, 250, 18, 279, 250, 108);
  tableAO.addColorStop(0, 'rgba(24,12,8,0.34)');
  tableAO.addColorStop(0.6, 'rgba(24,12,8,0.16)');
  tableAO.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tableAO;
  ctx.fillRect(160, 200, 240, 110);
  const wallAO = ctx.createLinearGradient(0, 96, 0, 150);
  wallAO.addColorStop(0, 'rgba(16,8,5,0.28)');
  wallAO.addColorStop(1, 'rgba(16,8,5,0)');
  ctx.fillStyle = wallAO;
  ctx.fillRect(40, 96, 330, 54);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const warm = ctx.createRadialGradient(lx, ly + 22, 4, lx, ly + 22, 150);
  warm.addColorStop(0, 'rgba(255,208,126,0.27)');
  warm.addColorStop(0.4, 'rgba(220,160,90,0.12)');
  warm.addColorStop(1, 'rgba(80,50,20,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(lx - 160, 0, 320, 300);
  // Charco cálido sobre el mantel.
  const tableGlow = ctx.createRadialGradient(275, 212, 6, 275, 212, 86);
  tableGlow.addColorStop(0, 'rgba(255,214,140,0.16)');
  tableGlow.addColorStop(0.55, 'rgba(230,170,100,0.06)');
  tableGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tableGlow;
  ctx.fillRect(185, 178, 180, 76);
  const focus = ctx.createRadialGradient(lx, 210, 8, lx, 210, 110);
  focus.addColorStop(0, 'rgba(255,214,140,0.13)');
  focus.addColorStop(0.6, 'rgba(180,120,60,0.05)');
  focus.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = focus;
  ctx.fillRect(140, 130, 280, 170);
  // Luz del ventanal: fría durante la tormenta, clara y dorada de día.
  if (state.daylight) {
    const sun = ctx.createLinearGradient(0, 96, 0, 280);
    sun.addColorStop(0, 'rgba(255,244,198,0.2)');
    sun.addColorStop(0.55, 'rgba(255,226,160,0.08)');
    sun.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(150, 96, 200, 184);
    const dayPool = ctx.createRadialGradient(232, 220, 6, 232, 220, 92);
    dayPool.addColorStop(0, 'rgba(255,236,178,0.12)');
    dayPool.addColorStop(0.6, 'rgba(220,190,120,0.05)');
    dayPool.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = dayPool;
    ctx.fillRect(140, 140, 190, 140);
  } else {
    const cold = ctx.createLinearGradient(0, 96, 0, 260);
    cold.addColorStop(0, `rgba(96,150,200,${0.11 + state.flash * 0.2})`);
    cold.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cold;
    ctx.fillRect(150, 96, 180, 170);
  }
  ctx.restore();

  // Relámpago: ilumina muebles y paredes desde el ventanal.
  if (state.flash > 0.02 && !state.daylight) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const bolt = ctx.createRadialGradient(230, 50, 6, 230, 50, 300);
    bolt.addColorStop(0, `rgba(210,235,255,${0.5 * state.flash})`);
    bolt.addColorStop(0.45, `rgba(120,170,225,${0.18 * state.flash})`);
    bolt.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bolt;
    ctx.fillRect(0, 0, COMEDOR_W, COMEDOR_H);
    ctx.restore();
    ctx.fillStyle = `rgba(200,225,250,${0.06 * state.flash})`;
    ctx.fillRect(0, 0, COMEDOR_W, COMEDOR_H);
  }

  // Polvo suspendido y motas de humedad.
  for (let i = 0; i < 14; i += 1) {
    const dx = 90 + ((i * 37 + state.time * 4) % 300);
    const dy = 120 + ((i * 53 + Math.sin(state.time * 0.6 + i) * 8) % 160);
    px(ctx, dx, dy, 1, 1, `rgba(255,232,190,${0.05 + (i % 3) * 0.03})`);
  }
}

/* =========================================================
   COMPOSICIÓN
   ========================================================= */
export function drawComedorBase(ctx: Ctx, state: ComedorRoomState): void {
  drawFloor(ctx, state);
  drawWalls(ctx);
  drawWindow(ctx, state);
  drawCurtains(ctx, state);
  drawWallDecor(ctx, state);
  drawRug(ctx);
  drawBedroomDoor(ctx);
  drawMainDoor(ctx, state);
}

interface SortableDraw {
  sortY: number;
  draw: () => void;
}

export function drawComedorProps(
  ctx: Ctx,
  state: ComedorRoomState,
  player: { x: number; y: number },
  drawPlayer: () => void
): void {
  const items: SortableDraw[] = [
    { sortY: 142, draw: () => drawSideboard(ctx) },
    { sortY: 142, draw: () => drawShelf(ctx, state) },
    { sortY: 180, draw: () => drawChest(ctx, state) },
    { sortY: 240, draw: () => drawChair(ctx, 186, 204, 'west') },
    { sortY: 240, draw: () => drawChair(ctx, 350, 204, 'east') },
    { sortY: 190, draw: () => drawChair(ctx, 224, 166, 'north') },
    { sortY: 190, draw: () => drawChair(ctx, 302, 166, 'north') },
    { sortY: 270, draw: () => drawChair(ctx, 224, 246, 'south') },
    { sortY: 270, draw: () => drawChair(ctx, 302, 246, 'south') },
    { sortY: 250, draw: () => drawTable(ctx, state) },
    { sortY: 312, draw: () => drawPlant(ctx, state) },
    { sortY: 272, draw: () => drawCoatRack(ctx) },
    { sortY: player.y + 4, draw: drawPlayer },
  ];
  if (!state.backpackTaken) {
    items.push({ sortY: 182, draw: () => drawBackpack(ctx) });
  }
  items.sort((a, b) => a.sortY - b.sortY);
  for (const item of items) item.draw();
}

export function drawComedorLighting(ctx: Ctx, state: ComedorRoomState): void {
  drawLighting(ctx, state);
}
