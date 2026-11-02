/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mundo visual de la cinemática ilustrada de PIXELVERSE.
 *
 * Las nueve ilustraciones entregadas se usan como plano principal. La cámara
 * recorre cada imagen con zooms y desplazamientos suaves; las capas de polvo,
 * lluvia, chispas, destellos de pantalla, anillos de energía y distorsión
 * digital se dibujan encima para dar profundidad sin deformar a los personajes.
 *
 * El lienzo es 960×720 (4:3). La escena 7 se funde a negro para entregar el
 * control al menú, conservando el flujo de inicio existente.
 */

import {
  clamp01,
  hash2,
  lerp,
  mulberry32,
  smoothstep,
} from './cinematicRebootDraw';
import {
  CINEMATIC_IMAGE_DURATION_SEC,
  getImageSceneAt,
  type CinematicImageScene,
} from './cinematicImageTimeline';

const W = 960;
const H = 720;
const TAU = Math.PI * 2;
const ASSET_ROOT = '/assets/pixelverse/cinematic/';

type ImageKey =
  | 'arcadeNight'
  | 'arcadeWide'
  | 'villainLair'
  | 'villainArcade'
  | 'villainInsert'
  | 'button'
  | 'destruction'
  | 'riftSky'
  | 'alteredWide'
  | 'alteredPanel'
  | 'roomPanel'
  | 'room'
  | 'roomBed';

const ASSET_FILES: Record<ImageKey, string> = {
  arcadeNight: 'golden-arcade-night.jpg',
  arcadeWide: 'golden-arcade-wide.jpg',
  villainLair: 'villain-lair.jpg',
  villainArcade: 'villain-arcade.jpg',
  villainInsert: 'villain-insert.jpg',
  button: 'panel-03-button.jpg',
  destruction: 'panel-04-destruction.jpg',
  riftSky: 'rift-sky.jpg',
  alteredWide: 'altered-wide.jpg',
  alteredPanel: 'panel-05-altered.jpg',
  roomPanel: 'panel-06-room.jpg',
  room: 'pixel-room.jpg',
  roomBed: 'room-bed.jpg',
};

interface Camera {
  scale: number;
  fx: number;
  fy: number;
  panX: number;
  panY: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GlowSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  rate: number;
  phase: number;
  strength: number;
}

const GLOWS: Partial<Record<ImageKey, GlowSpec[]>> = {
  arcadeWide: [
    { x: 0.6, y: 0.07, w: 0.22, h: 0.26, color: '96, 196, 255', rate: 2.2, phase: 0.4, strength: 0.5 },
    { x: 0.02, y: 0.25, w: 0.12, h: 0.24, color: '255, 150, 220', rate: 3.1, phase: 1.8, strength: 0.42 },
    { x: 0.81, y: 0.23, w: 0.14, h: 0.24, color: '255, 186, 104', rate: 2.6, phase: 3.1, strength: 0.4 },
    { x: 0.34, y: 0.2, w: 0.1, h: 0.18, color: '120, 220, 255', rate: 4.2, phase: 2.2, strength: 0.34 },
  ],
  arcadeNight: [
    { x: 0.01, y: 0.15, w: 0.14, h: 0.3, color: '255, 96, 180', rate: 2.7, phase: 0.7, strength: 0.55 },
    { x: 0.36, y: 0.16, w: 0.28, h: 0.3, color: '124, 198, 255', rate: 2.1, phase: 2.4, strength: 0.52 },
    { x: 0.65, y: 0.1, w: 0.16, h: 0.3, color: '255, 176, 96', rate: 3.4, phase: 4.1, strength: 0.46 },
    { x: 0.84, y: 0.22, w: 0.12, h: 0.28, color: '170, 140, 255', rate: 2.9, phase: 1.2, strength: 0.4 },
  ],
  villainArcade: [
    { x: 0.03, y: 0.12, w: 0.2, h: 0.3, color: '176, 96, 255', rate: 3.2, phase: 0.2, strength: 0.5 },
    { x: 0.72, y: 0.1, w: 0.2, h: 0.28, color: '80, 170, 255', rate: 2.4, phase: 2.1, strength: 0.48 },
    { x: 0.52, y: 0.32, w: 0.14, h: 0.24, color: '255, 36, 40', rate: 4.6, phase: 3.4, strength: 0.6 },
  ],
  villainLair: [
    { x: 0.34, y: 0.02, w: 0.32, h: 0.6, color: '255, 38, 48', rate: 1.4, phase: 0.9, strength: 0.55 },
    { x: 0.05, y: 0.1, w: 0.18, h: 0.28, color: '150, 90, 255', rate: 3.4, phase: 1.4, strength: 0.42 },
    { x: 0.78, y: 0.12, w: 0.18, h: 0.28, color: '70, 170, 255', rate: 2.6, phase: 3.8, strength: 0.42 },
    { x: 0.68, y: 0.36, w: 0.1, h: 0.16, color: '255, 40, 40', rate: 5.2, phase: 2.2, strength: 0.62 },
  ],
  villainInsert: [
    { x: 0.33, y: 0.03, w: 0.34, h: 0.62, color: '255, 40, 48', rate: 1.8, phase: 1.1, strength: 0.5 },
    { x: 0.04, y: 0.1, w: 0.2, h: 0.32, color: '150, 80, 255', rate: 4.1, phase: 0.4, strength: 0.4 },
    { x: 0.76, y: 0.1, w: 0.2, h: 0.32, color: '76, 160, 255', rate: 3.3, phase: 2.8, strength: 0.4 },
    { x: 0.7, y: 0.38, w: 0.1, h: 0.18, color: '255, 36, 36', rate: 5.4, phase: 1.7, strength: 0.62 },
  ],
  button: [
    { x: 0.2, y: 0.52, w: 0.26, h: 0.3, color: '255, 30, 20', rate: 2.8, phase: 0.5, strength: 0.62 },
    { x: 0.6, y: 0.06, w: 0.37, h: 0.44, color: '255, 46, 36', rate: 3.6, phase: 2.3, strength: 0.42 },
  ],
  destruction: [
    { x: 0.28, y: 0.14, w: 0.44, h: 0.62, color: '255, 104, 128', rate: 1.8, phase: 0.6, strength: 0.55 },
    { x: 0.02, y: 0.55, w: 0.22, h: 0.3, color: '120, 160, 255', rate: 3.2, phase: 1.9, strength: 0.3 },
    { x: 0.74, y: 0.5, w: 0.22, h: 0.34, color: '255, 96, 190', rate: 2.9, phase: 3.4, strength: 0.34 },
  ],
  riftSky: [
    { x: 0.38, y: 0.04, w: 0.26, h: 0.9, color: '255, 84, 122', rate: 2.1, phase: 1.4, strength: 0.5 },
  ],
  alteredPanel: [
    { x: 0.7, y: 0.06, w: 0.24, h: 0.4, color: '146, 184, 255', rate: 0.9, phase: 0.3, strength: 0.34 },
    { x: 0.07, y: 0.18, w: 0.22, h: 0.44, color: '80, 160, 255', rate: 2.4, phase: 2.2, strength: 0.36 },
    { x: 0.62, y: 0.34, w: 0.12, h: 0.2, color: '255, 160, 200', rate: 1.6, phase: 4.0, strength: 0.2 },
  ],
  alteredWide: [
    { x: 0.68, y: 0.02, w: 0.24, h: 0.52, color: '150, 186, 255', rate: 0.8, phase: 1.1, strength: 0.3 },
    { x: 0.13, y: 0.2, w: 0.16, h: 0.5, color: '80, 160, 255', rate: 2.2, phase: 3.0, strength: 0.34 },
  ],
  roomPanel: [
    { x: 0.02, y: 0.34, w: 0.17, h: 0.26, color: '96, 152, 236', rate: 2.4, phase: 0.5, strength: 0.3 },
    { x: 0.18, y: 0.33, w: 0.11, h: 0.34, color: '255, 138, 52', rate: 1.8, phase: 2.2, strength: 0.4 },
    { x: 0.55, y: 0.03, w: 0.41, h: 0.72, color: '92, 148, 240', rate: 1.2, phase: 1.6, strength: 0.16 },
  ],
  room: [
    { x: 0.39, y: 0.61, w: 0.18, h: 0.2, color: '120, 198, 255', rate: 2.8, phase: 0.6, strength: 0.38 },
    { x: 0.81, y: 0.47, w: 0.13, h: 0.24, color: '255, 156, 66', rate: 1.7, phase: 2.4, strength: 0.34 },
    { x: 0.05, y: 0.02, w: 0.4, h: 0.7, color: '84, 140, 230', rate: 1.1, phase: 1.9, strength: 0.16 },
  ],
  roomBed: [
    { x: 0.13, y: 0.22, w: 0.11, h: 0.34, color: '255, 148, 60', rate: 1.9, phase: 1.4, strength: 0.34 },
    { x: 0.54, y: 0.02, w: 0.38, h: 0.9, color: '84, 140, 235', rate: 1.2, phase: 3.2, strength: 0.18 },
    { x: 0.0, y: 0.28, w: 0.15, h: 0.32, color: '110, 180, 255', rate: 2.6, phase: 0.9, strength: 0.22 },
  ],
};

interface DustMote {
  x: number;
  y: number;
  z: number;
  size: number;
  phase: number;
  speed: number;
  warm: boolean;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
}

interface Ember {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  drift: number;
}

function easeInOut(value: number): number {
  const c = clamp01(value);
  return c * c * (3 - 2 * c);
}

function createCamera(
  scale = 1,
  fx = 0.5,
  fy = 0.5,
  panX = 0,
  panY = 0
): Camera {
  return { scale, fx, fy, panX, panY };
}

function coverRect(img: HTMLImageElement, cam: Camera): Rect {
  const base = Math.max(W / img.width, H / img.height) * cam.scale;
  const w = img.width * base;
  const h = img.height * base;
  let x = W / 2 + cam.panX - cam.fx * w;
  let y = H / 2 + cam.panY - cam.fy * h;
  x = Math.min(0, Math.max(W - w, x));
  y = Math.min(0, Math.max(H - h, y));
  return { x, y, w, h };
}

function containRect(img: HTMLImageElement, cam: Camera): Rect {
  const base = Math.min(W / img.width, H / img.height) * cam.scale;
  const w = img.width * base;
  const h = img.height * base;
  return {
    x: W / 2 + cam.panX - cam.fx * w,
    y: H / 2 + cam.panY - cam.fy * h,
    w,
    h,
  };
}

export interface CinematicImageWorld {
  renderAtTime: (elapsedSec: number, deltaSec: number) => void;
  preload: () => Promise<void>;
  dispose: () => void;
}

export function createCinematicImageWorld(
  mount: HTMLElement,
  reducedMotion = false
): CinematicImageWorld {
  const motion = reducedMotion ? 0.4 : 1;
  const rand = mulberry32(20261023);

  const dust: DustMote[] = Array.from({ length: 110 }, () => ({
    x: rand(),
    y: rand(),
    z: 0.25 + rand() * 0.75,
    size: 0.7 + rand() * 2.1,
    phase: rand() * TAU,
    speed: 0.012 + rand() * 0.042,
    warm: rand() < 0.52,
  }));

  const rain: RainDrop[] = Array.from({ length: 86 }, () => ({
    x: rand(),
    y: rand(),
    len: 0.03 + rand() * 0.09,
    speed: 0.34 + rand() * 0.9,
    alpha: 0.18 + rand() * 0.55,
  }));

  const embers: Ember[] = Array.from({ length: 60 }, () => ({
    x: rand(),
    y: rand(),
    size: 0.8 + rand() * 2.6,
    phase: rand() * TAU,
    speed: 0.01 + rand() * 0.055,
    drift: (rand() - 0.5) * 0.06,
  }));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'cinematic-reboot-canvas';
  const ctxMaybe = canvas.getContext('2d', { alpha: false });
  if (!ctxMaybe) {
    mount.appendChild(canvas);
    return {
      renderAtTime: () => {},
      preload: async () => {},
      dispose: () => canvas.remove(),
    };
  }
  const ctx: CanvasRenderingContext2D = ctxMaybe;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  mount.appendChild(canvas);

  const images: Partial<Record<ImageKey, HTMLImageElement>> = {};
  const waits: Promise<void>[] = [];
  (Object.keys(ASSET_FILES) as ImageKey[]).forEach((key) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = ASSET_ROOT + ASSET_FILES[key];
    images[key] = img;
    waits.push(
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve();
          return;
        }
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })
    );
  });

  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 160;
  grainCanvas.height = 160;
  const grainCtx = grainCanvas.getContext('2d');
  if (grainCtx) {
    const image = grainCtx.createImageData(160, 160);
    const grainRand = mulberry32(778899);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.floor(grainRand() * 255);
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = grainRand() < 0.55 ? 8 : 22;
    }
    grainCtx.putImageData(image, 0, 0);
  }

  function ready(key: ImageKey): HTMLImageElement | null {
    const img = images[key];
    if (!img || !img.complete || img.naturalWidth < 8) return null;
    return img;
  }

  function drawCover(
    key: ImageKey,
    cam: Camera,
    alpha = 1,
    filter = ''
  ): Rect | null {
    const img = ready(key);
    if (!img || alpha <= 0.002) return null;
    const rect = coverRect(img, cam);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (filter) ctx.filter = filter;
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return rect;
  }

  function drawContained(
    key: ImageKey,
    cam: Camera,
    alpha = 1
  ): Rect | null {
    const img = ready(key);
    if (!img || alpha <= 0.002) return null;
    // Fondo desenfocado para que el encuadre panorámico no deje vacío.
    const backdrop = coverRect(img, { ...cam, scale: cam.scale * 1.16 });
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.filter = 'blur(26px) brightness(0.42) saturate(1.15)';
    ctx.drawImage(img, backdrop.x, backdrop.y, backdrop.w, backdrop.h);
    ctx.restore();

    const rect = containRect(img, cam);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return rect;
  }

  function drawGlows(
    key: ImageKey,
    rect: Rect,
    time: number,
    alpha: number,
    intensity = 1
  ): void {
    const specs = GLOWS[key];
    if (!specs || alpha <= 0.01) return;
    for (const spec of specs) {
      const cx = rect.x + (spec.x + spec.w * 0.5) * rect.w;
      const cy = rect.y + (spec.y + spec.h * 0.5) * rect.h;
      const radius = Math.max(spec.w * rect.w, spec.h * rect.h) * 0.78;
      const flicker =
        0.66 +
        0.24 * Math.sin(time * spec.rate + spec.phase) +
        0.1 * Math.sin(time * spec.rate * 3.3 + spec.phase * 1.7);
      const a = alpha * spec.strength * intensity * Math.max(0.18, flicker);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = a * 0.55;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `rgba(${spec.color}, 0.9)`);
      gradient.addColorStop(0.45, `rgba(${spec.color}, 0.34)`);
      gradient.addColorStop(1, `rgba(${spec.color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      ctx.globalAlpha = a * 0.18;
      ctx.fillStyle = `rgb(${spec.color})`;
      const sx = rect.x + spec.x * rect.w;
      const sy = rect.y + spec.y * rect.h;
      ctx.fillRect(sx, sy, spec.w * rect.w, spec.h * rect.h);
      ctx.restore();
    }
  }

  function drawDust(time: number, alpha: number, warm = '255, 220, 168', cool = '164, 214, 255'): void {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const mote of dust) {
      const x = ((mote.x + time * mote.speed + 1) % 1) * W;
      const y = (((mote.y - time * mote.speed * 0.55) % 1) + 1) % 1 * H;
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * 0.7 + mote.phase));
      const a = alpha * twinkle * (0.22 + mote.z * 0.32);
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${mote.warm ? warm : cool})`;
      const size = mote.size * (0.7 + mote.z * 0.8);
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  function drawEmbers(time: number, alpha: number): void {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const ember of embers) {
      const x = ((ember.x + Math.sin(time * 0.6 + ember.phase) * ember.drift + 1) % 1) * W;
      const y = (((ember.y - time * ember.speed) % 1) + 1) % 1 * H;
      const flicker = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.8 + ember.phase));
      ctx.globalAlpha = alpha * 0.5 * flicker;
      ctx.fillStyle = 'rgba(255, 132, 72, 1)';
      ctx.fillRect(x, y, ember.size, ember.size);
      ctx.globalAlpha = alpha * 0.24 * flicker;
      ctx.fillStyle = 'rgba(255, 206, 138, 1)';
      ctx.fillRect(x - 1, y - 1, ember.size + 2, ember.size + 2);
    }
    ctx.restore();
  }

  function drawRain(
    time: number,
    clip: Rect | null,
    intensity: number,
    alphaScale = 1
  ): void {
    if (intensity <= 0.01) return;
    ctx.save();
    if (clip) {
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.w, clip.h);
      ctx.clip();
    }
    ctx.strokeStyle = 'rgba(178, 214, 255, 0.72)';
    ctx.lineWidth = 1;
    for (const drop of rain) {
      const x = ((drop.x + time * 0.028 * drop.speed) % 1.08) * W;
      const y = (((drop.y + time * 0.42 * drop.speed) % 1.08)) * H;
      const len = drop.len * H;
      ctx.globalAlpha = drop.alpha * 0.34 * intensity * alphaScale;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len * 0.18, y + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFloorReflection(time: number, alpha: number): void {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const top = H * 0.72;
    const gradient = ctx.createLinearGradient(0, top, 0, H);
    gradient.addColorStop(0, 'rgba(255, 164, 96, 0)');
    gradient.addColorStop(0.35, `rgba(255, 164, 96, ${0.07 * alpha})`);
    gradient.addColorStop(0.62, `rgba(120, 190, 255, ${0.05 * alpha})`);
    gradient.addColorStop(1, 'rgba(40, 20, 60, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, top, W, H - top);
    for (let i = 0; i < 12; i += 1) {
      const y = top + ((i * 37 + time * 9) % (H - top));
      const x = ((i * 149 + time * 14) % (W + 220)) - 110;
      const w = 34 + (i % 4) * 26;
      ctx.globalAlpha = alpha * (0.05 + (i % 3) * 0.02);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 180, 110, 1)' : 'rgba(110, 190, 255, 1)';
      ctx.fillRect(x, y, w, 1.4);
    }
    ctx.restore();
  }

  function drawShockwaves(
    rect: Rect,
    nx: number,
    ny: number,
    age: number,
    color: string
  ): void {
    if (age < 0 || age > 3.4) return;
    const cx = rect.x + nx * rect.w;
    const cy = rect.y + ny * rect.h;
    const base = Math.min(rect.w, rect.h) * 0.1;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i += 1) {
      const p = clamp01((age - i * 0.18) / 2.4);
      if (p <= 0 || p >= 1) continue;
      const radius = base + p * Math.min(rect.w, rect.h) * 0.9;
      ctx.globalAlpha = (1 - p) * 0.42;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, (1 - p) * 5.5);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGlitchSlices(
    key: ImageKey,
    rect: Rect,
    intensity: number,
    time: number
  ): void {
    const img = ready(key);
    if (!img || intensity <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const frame = Math.floor(time * 24);
    for (let i = 0; i < 9; i += 1) {
      const seed = hash2(i * 7 + 1, frame * 3 + 2);
      const sy = hash2(i * 13 + 4, frame + 9);
      const sh = 0.012 + hash2(i * 5 + 8, frame + 3) * 0.05;
      const dx = (seed - 0.5) * 44 * intensity;
      const alpha = (0.16 + hash2(i * 3 + 2, frame + 7) * 0.32) * intensity;
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        img,
        0,
        sy * img.height,
        img.width,
        sh * img.height,
        rect.x + dx,
        rect.y + sy * rect.h,
        rect.w,
        sh * rect.h
      );
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.4 * intensity;
    for (let i = 0; i < 3; i += 1) {
      const y = hash2(i + 11, frame + 4) * H;
      const h = 1 + hash2(i + 2, frame + 8) * 3;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(120, 240, 255, 0.34)' : 'rgba(255, 80, 190, 0.26)';
      ctx.fillRect(0, y, W, h);
    }
    ctx.restore();
  }

  function drawRgbSplit(key: ImageKey, rect: Rect, intensity: number): void {
    const img = ready(key);
    if (!img || intensity <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.16 * intensity;
    ctx.drawImage(img, rect.x - 6 * intensity, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 0.12 * intensity;
    ctx.drawImage(img, rect.x + 6 * intensity, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  function drawGrade(
    color: string,
    alpha: number,
    mode: 'screen' | 'multiply' | 'source-over' = 'source-over'
  ): void {
    if (alpha <= 0.005) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawFog(time: number, alpha: number): void {
    if (alpha <= 0.01) return;
    ctx.save();
    for (let i = 0; i < 5; i += 1) {
      const x = ((time * (9 + i * 4) + i * 260) % (W + 520)) - 260;
      const y = H * (0.58 + (i % 3) * 0.09);
      const radius = 240 + (i % 2) * 160;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(96, 112, 154, ${0.1 * alpha})`);
      gradient.addColorStop(1, 'rgba(96, 112, 154, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  function drawLightning(
    time: number,
    times: number[],
    clip: Rect | null
  ): number {
    let strength = 0;
    let latest = -1;
    for (const strike of times) {
      if (time < strike) continue;
      const decay = Math.exp(-(time - strike) * 5.2);
      if (decay > strength) {
        strength = decay;
        latest = strike;
      }
    }
    if (strength <= 0.008) return 0;

    ctx.save();
    if (clip) {
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.w, clip.h);
      ctx.clip();
    }
    // Ramal principal del relámpago.
    const seed = Math.round(latest * 100);
    const startX = (clip ? clip.x : 0) + (clip ? clip.w : W) * (0.3 + hash2(seed, 3) * 0.4);
    let x = startX;
    let y = (clip ? clip.y : 0) + (clip ? clip.h : H) * 0.02;
    const bottom = (clip ? clip.y + clip.h : H) * 0.96;
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(226, 244, 255, ${0.9 * strength})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 7; i += 1) {
      x += (hash2(seed + i, 7) - 0.5) * 46;
      y = lerp(y, bottom, 1 / (7 - i));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(136, 188, 255, ${0.5 * strength})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();

    drawGrade('rgba(172, 208, 255, 1)', 0.16 * strength, 'screen');
    return strength;
  }

  function drawWindowRain(
    time: number,
    rect: Rect,
    nx: number,
    ny: number,
    nw: number,
    nh: number,
    intensity: number
  ): Rect {
    const clip = {
      x: rect.x + nx * rect.w,
      y: rect.y + ny * rect.h,
      w: nw * rect.w,
      h: nh * rect.h,
    };
    drawRain(time, clip, intensity, 1);
    return clip;
  }

  function drawSceneTagFallback(scene: CinematicImageScene, time: number): void {
    const palettes: Record<string, [string, string]> = {
      'golden-age': ['#2a0f2e', '#ffb45e'],
      antagonist: ['#10001a', '#ff2a44'],
      'red-button': ['#12030a', '#ff2b24'],
      destruction: ['#12001e', '#ff4e8c'],
      'altered-universe': ['#0a0d1c', '#d85a86'],
      'pixel-room': ['#071425', '#ffb05e'],
      transition: ['#03060d', '#7fa6ff'],
    };
    const [a, b] = palettes[scene.id] ?? ['#05070c', '#9fd8ff'];
    const gradient = ctx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, a);
    gradient.addColorStop(1, b);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin(time * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, H * 0.5, W, 1);
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ */
  /* ESCENAS                                                            */
  /* ------------------------------------------------------------------ */

  function drawGoldenAge(time: number): void {
    const drift = easeInOut(time / 8) * motion;
    const nightCam = createCamera(1.02 + drift * 0.1, 0.5, 0.5, 0, 0);
    const wideAlpha = smoothstep(6.5, 8.6, time);
    const nightRect = drawCover('arcadeNight', nightCam, 1);
    if (!nightRect) drawSceneTagFallback(getImageSceneAt(time), time);

    if (nightRect) {
      drawGlows('arcadeNight', nightRect, time, 1 - wideAlpha * 0.8);
    }

    let wideRect: Rect | null = null;
    if (wideAlpha > 0.002) {
      const p = easeInOut((time - 6.5) / 9.5) * motion;
      const wideCam = createCamera(
        1.03 + p * 0.08,
        lerp(0.4, 0.6, p),
        0.5,
        Math.sin(time * 0.5) * 2,
        0
      );
      wideRect = drawCover('arcadeWide', wideCam, wideAlpha);
      if (wideRect) drawGlows('arcadeWide', wideRect, time, wideAlpha);
    }

    drawFloorReflection(time, 0.45 + wideAlpha * 0.55);
    drawDust(time, 0.65, '255, 224, 168', '150, 214, 255');
    drawGrade('rgba(255, 158, 74, 1)', 0.06 + wideAlpha * 0.04, 'screen');

    drawGrade('rgba(0, 0, 0, 1)', Math.max(1 - smoothstep(0, 1.3, time), smoothstep(15.15, 16, time)));
  }

  function drawAntagonist(time: number): void {
    const arcadeCam = createCamera(
      1.02 + easeInOut(time / 8.5) * 0.17 * motion,
      lerp(0.5, 0.57, easeInOut(time / 7.5)),
      0.5,
      0,
      0
    );
    const arcadeRect = drawCover('villainArcade', arcadeCam, 1);
    if (!arcadeRect) drawSceneTagFallback(getImageSceneAt(16 + time), 16 + time);
    if (arcadeRect) drawGlows('villainArcade', arcadeRect, time, 1);

    const lairAlpha = smoothstep(7.1, 8.8, time);
    let lairRect: Rect | null = null;
    if (lairAlpha > 0.002) {
      const p = easeInOut((time - 7.1) / 8.5) * motion;
      const lairCam = createCamera(
        1.04 + p * 0.24,
        lerp(0.5, 0.57, p),
        lerp(0.5, 0.46, p),
        Math.sin(time * 0.4) * 3,
        0
      );
      lairRect = drawCover('villainLair', lairCam, lairAlpha);
      if (lairRect) drawGlows('villainLair', lairRect, time, lairAlpha);
    }

    const insertAlpha =
      smoothstep(10.9, 11.15, time) * (1 - smoothstep(12.6, 12.95, time));
    if (insertAlpha > 0.002) {
      const insertCam = createCamera(
        1 + (time - 10.9) * 0.01,
        0.5,
        0.48,
        0,
        0
      );
      const insertRect = drawCover('villainInsert', insertCam, insertAlpha);
      if (insertRect) drawGlows('villainInsert', insertRect, time, insertAlpha, 1.1);
      if (insertRect) {
        drawGlitchSlices('villainInsert', insertRect, insertAlpha, time);
      }
    }

    const glitch =
      (time > 7.0 && time < 7.6) || (time > 10.9 && time < 11.5) || (time > 12.6 && time < 13.1)
        ? 1
        : 0;
    if (glitch > 0 && lairRect) {
      drawGlitchSlices('villainLair', lairRect, 0.8, time);
    }
    drawDust(time, 0.32, '255, 128, 120', '180, 120, 255');
    drawGrade('rgba(76, 0, 46, 1)', 0.14, 'multiply');
    drawGrade('rgba(150, 0, 50, 1)', 0.05, 'screen');
    drawGrade('rgba(0, 0, 0, 1)', 1 - smoothstep(0, 0.42, time));
  }

  function drawRedButton(time: number): void {
    const focus = easeInOut((time - 1.0) / 5.2) * motion;
    const pressAt = 6.8;
    const afterPress = Math.max(0, time - pressAt);
    const shake = afterPress > 0 ? Math.sin(afterPress * 42) * 9 * Math.exp(-afterPress * 3.1) : 0;
    const cam = createCamera(
      lerp(1.02, 1.42, focus) + smoothstep(pressAt, pressAt + 2.2, time) * 0.08,
      lerp(0.5, 0.34, focus),
      lerp(0.5, 0.64, focus),
      shake,
      Math.cos(afterPress * 37) * 4 * Math.exp(-afterPress * 3.4)
    );
    const rect = drawCover('button', cam, 1);
    if (!rect) {
      drawSceneTagFallback(getImageSceneAt(32 + time), 32 + time);
      return;
    }
    drawGlows('button', rect, time, 1, 1.1);
    if (afterPress > 0) {
      drawShockwaves(rect, 0.35, 0.67, afterPress, 'rgba(255, 72, 52, 1)');
      drawGrade('rgba(255, 48, 26, 1)', 0.18 * Math.exp(-afterPress * 2.3), 'screen');
    }
    drawDust(time, 0.24, '255, 196, 160', '255, 120, 120');
    drawGrade('rgba(120, 0, 20, 1)', 0.1, 'multiply');
    drawGrade('rgba(0, 0, 0, 1)', Math.max(1 - smoothstep(0, 0.35, time), smoothstep(11.3, 12, time)));
  }

  function drawDestruction(time: number): void {
    const pull = easeInOut(time / 4.2) * motion;
    const impact = 4.0;
    const after = Math.max(0, time - impact);
    const shake = after > 0 && after < 4.5 ? Math.sin(after * 33) * 13 * Math.exp(-after * 2.2) : 0;
    const cam = createCamera(
      lerp(1.18, 1.0, pull) + smoothstep(impact, impact + 3.5, time) * 0.05,
      0.5,
      0.49,
      shake,
      Math.cos(after * 29) * 6 * Math.exp(-after * 2.4)
    );
    const rect = drawCover('destruction', cam, 1);
    if (!rect) {
      drawSceneTagFallback(getImageSceneAt(44 + time), 44 + time);
      return;
    }
    drawGlows('destruction', rect, time, 1, 1.1);
    if (after > 0) {
      drawShockwaves(rect, 0.5, 0.49, after, 'rgba(255, 122, 168, 1)');
      drawRgbSplit('destruction', rect, Math.max(0, 1 - after * 0.7));
      drawGlitchSlices('destruction', rect, Math.max(0, 1 - after * 0.55), time);
    }
    drawEmbers(time, 0.85);
    drawDust(time, 0.3, '255, 150, 170', '170, 160, 255');
    drawGrade('rgba(72, 0, 54, 1)', 0.14, 'multiply');
    drawGrade('rgba(255, 60, 120, 1)', 0.07, 'screen');
    drawGrade('rgba(255, 248, 255, 1)', Math.max(0, 1 - Math.abs(time - 8.45) * 5.5) * 0.9);
    drawGrade('rgba(0, 0, 0, 1)', Math.max(1 - smoothstep(0, 0.4, time), smoothstep(13.4, 16, time)));
  }

  function drawAlteredUniverse(time: number): void {
    const riftAlpha = 1 - smoothstep(3.9, 4.8, time);
    if (riftAlpha > 0.002) {
      const cam = createCamera(
        1.12 - easeInOut(time / 5) * 0.08,
        0.5,
        lerp(0.4, 0.58, easeInOut(time / 4.8)),
        0,
        Math.sin(time * 0.5) * 4
      );
      const rect = drawCover('riftSky', cam, riftAlpha, 'blur(0.4px)');
      if (rect) {
        drawGlows('riftSky', rect, time, riftAlpha);
        drawGlitchSlices('riftSky', rect, riftAlpha * 0.55, time);
      }
    }

    const panelAlpha = smoothstep(4.4, 5.1, time) * (1 - smoothstep(9.7, 10.5, time));
    if (panelAlpha > 0.002) {
      const p = easeInOut((time - 4.4) / 6.1) * motion;
      const cam = createCamera(
        1.02 + p * 0.08,
        lerp(0.38, 0.68, p),
        0.52,
        0,
        0
      );
      const rect = drawCover('alteredPanel', cam, panelAlpha);
      if (rect) {
        drawGlows('alteredPanel', rect, time, panelAlpha);
        drawGlitchSlices('alteredPanel', rect, panelAlpha * 0.2, time);
      }
    }

    const wideAlpha = smoothstep(9.8, 10.7, time);
    if (wideAlpha > 0.002) {
      const cam = createCamera(
        1 + easeInOut((time - 9.8) / 4.2) * 0.06,
        0.5,
        0.5,
        0,
        0
      );
      const rect = drawContained('alteredWide', cam, wideAlpha);
      if (rect) drawGlows('alteredWide', rect, time, wideAlpha);
    }

    drawFog(time, 0.9);
    drawEmbers(time, 0.35);
    drawDust(time, 0.28, '255, 176, 190', '160, 190, 255');
    drawGrade('rgba(18, 26, 58, 1)', 0.2, 'multiply');
    drawGrade('rgba(90, 120, 210, 1)', 0.05, 'screen');
    drawGrade('rgba(0, 0, 0, 1)', 1 - smoothstep(0, 1.2, time));
  }

  function drawPixelRoom(time: number): void {
    const deskAlpha = smoothstep(11.4, 12.25, time);
    const pixelPush = easeInOut((time - 1.0) / 8.2) * motion;
    const pixelCam = createCamera(
      1.02 + pixelPush * 0.15,
      lerp(0.5, 0.61, pixelPush),
      lerp(0.5, 0.47, pixelPush),
      Math.sin(time * 0.32) * 1.8,
      0
    );
    const pixelRect = drawCover('roomPanel', pixelCam, 1);
    if (!pixelRect) drawSceneTagFallback(getImageSceneAt(74 + time), 74 + time);
    if (pixelRect) {
      drawGlows('roomPanel', pixelRect, time, 1);
      const windowClip = drawWindowRain(time, pixelRect, 0.56, 0.02, 0.4, 0.9, 1);
      drawLightning(time, [3.5, 8.3, 14.0], windowClip);
    }

    if (deskAlpha > 0.002) {
      const p = easeInOut((time - 11.4) / 6.6) * motion;
      const deskCam = createCamera(
        1.02 + p * 0.18,
        lerp(0.46, 0.36, p),
        lerp(0.5, 0.42, p),
        0,
        0
      );
      const deskRect = drawCover('room', deskCam, deskAlpha);
      if (deskRect) {
        drawGlows('room', deskRect, time, deskAlpha);
        const windowClip = drawWindowRain(time, deskRect, 0.04, 0.02, 0.42, 0.7, deskAlpha);
        drawLightning(time, [3.5, 8.3, 14.0], windowClip);
      }
    }

    drawRain(time, null, 0.17, 1);
    drawDust(time, 0.26, '255, 208, 150', '150, 190, 255');
    drawGrade('rgba(22, 32, 66, 1)', 0.13, 'multiply');
    drawGrade('rgba(255, 150, 70, 1)', 0.03, 'screen');
    drawGrade('rgba(0, 0, 0, 1)', 1 - smoothstep(0, 1.0, time));
  }

  function drawTransition(time: number): void {
    const push = easeInOut(time / 8) * motion;
    const cam = createCamera(
      1.1 + push * 0.34,
      lerp(0.52, 0.35, push),
      lerp(0.47, 0.39, push),
      Math.sin(time * 0.4) * 1.5,
      0
    );
    const rect = drawCover('room', cam, 1);
    if (!rect) {
      drawSceneTagFallback(getImageSceneAt(92 + time), 92 + time);
      return;
    }
    drawGlows('room', rect, time, 1, 1.1);
    const windowClip = drawWindowRain(time, rect, 0.04, 0.02, 0.46, 0.72, 1.15);
    drawRain(time, null, 0.22, 1);
    drawLightning(time, [4.5], windowClip);
    drawEmbers(time, 0.25);
    drawGrade('rgba(10, 16, 42, 1)', 0.18, 'multiply');
    drawGrade(
      'rgba(255, 246, 236, 1)',
      Math.max(0, 1 - Math.abs(time - 7.6) * 1.8) * 0.75
    );
    drawGrade('rgba(0, 0, 0, 1)', smoothstep(9.1, 10.9, time));
  }

  function drawGrainAndVignette(time: number): void {
    const gx = Math.floor(hash2(Math.floor(time * 22), 11) * 160);
    const gy = Math.floor(hash2(Math.floor(time * 22), 12) * 160);
    ctx.save();
    ctx.globalAlpha = 0.34;
    for (let y = -gy; y < H; y += 160) {
      for (let x = -gx; x < W; x += 160) {
        ctx.drawImage(grainCanvas, x, y);
      }
    }
    ctx.restore();

    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, W * 0.66);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, y, W, 1);
    }
  }

  function renderAtTime(elapsedSec: number): void {
    const time = Math.max(0, Math.min(CINEMATIC_IMAGE_DURATION_SEC, elapsedSec));
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    const scene = getImageSceneAt(time);
    switch (scene.id) {
      case 'golden-age':
        drawGoldenAge(time);
        break;
      case 'antagonist':
        drawAntagonist(time - 16);
        break;
      case 'red-button':
        drawRedButton(time - 32);
        break;
      case 'destruction':
        drawDestruction(time - 44);
        break;
      case 'altered-universe':
        drawAlteredUniverse(time - 60);
        break;
      case 'pixel-room':
        drawPixelRoom(time - 74);
        break;
      default:
        drawTransition(time - 92);
        break;
    }

    drawGrainAndVignette(time);

    // Entrada general y salida final.
    if (time < 0.05) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
    }
    drawGrade('rgba(0, 0, 0, 1)', smoothstep(102.7, CINEMATIC_IMAGE_DURATION_SEC, time));
  }

  return {
    renderAtTime,
    preload: () => Promise.all(waits).then(() => undefined),
    dispose: () => {
      canvas.remove();
    },
  };
}
