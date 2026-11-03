/**
 * Caché de sectores estáticos para mapas dibujados de forma inmediata (Canvas 2D).
 *
 * El mapa se divide en sectores cuadrados de tamaño fijo. Cada sector se pinta
 * una sola vez en un canvas fuera de pantalla y después se compone con un único
 * `drawImage`; el resto del fotograma queda para personajes, PNJ y efectos.
 *
 * - `margin` pinta una franja extra alrededor del sector para que ningún detalle
 *   de una baldosa quede cortado contra el borde. Al componer solo se copia el
 *   interior, así que los sectores contiguos no se solapan ni duplican alfa.
 * - `signature` identifica el estado visual del terreno (atajos abiertos,
 *   puentes reparados…). Si cambia, se descartan los sectores y se rehornean.
 * - `preloadChunks` hornea un anillo extra alrededor del viewport para que los
 *   sectores estén listos antes de asomar por el borde de la pantalla.
 * - La caché es LRU: conserva como máximo `maxChunks` lienzos en memoria.
 *
 * No guarda contenido del juego fuera de cámara ni altera coordenadas: solo es
 * un lienzo temporal de píxeles que se puede reconstruir en cualquier momento.
 */

export type StaticChunkPainter = (
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
) => boolean | void;

export interface StaticChunkCacheOptions {
  /** Lado del sector en píxeles de mundo. */
  chunkSize?: number;
  /** Franja pintada fuera del sector para evitar cortes en los bordes. */
  margin?: number;
  /** Máximo de lienzos mantenidos en memoria. */
  maxChunks?: number;
  /** Anillo de sectores que se hornea por delante del viewport. */
  preloadChunks?: number;
  /** Tiempo máximo por fotograma dedicado a precargar sectores (ms). */
  bakeBudgetMs?: number;
}

interface CachedStaticChunk {
  canvas: HTMLCanvasElement;
  lastUsed: number;
  /** El sector no contiene píxeles: se puede saltar al componer. */
  empty: boolean;
}

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export class StaticChunkCache {
  private readonly chunkSize: number;
  private readonly margin: number;
  private readonly maxChunks: number;
  private readonly preloadChunks: number;
  private readonly bakeBudgetMs: number;
  private readonly chunks = new Map<string, CachedStaticChunk>();
  private signature = '';
  private useStamp = 0;

  constructor(options: StaticChunkCacheOptions = {}) {
    this.chunkSize = Math.max(64, Math.floor(options.chunkSize ?? 512));
    this.margin = Math.max(0, Math.floor(options.margin ?? 8));
    this.maxChunks = Math.max(1, Math.floor(options.maxChunks ?? 24));
    this.preloadChunks = Math.max(0, Math.floor(options.preloadChunks ?? 1));
    this.bakeBudgetMs = Math.max(0, options.bakeBudgetMs ?? 4);
  }

  /** Cantidad de sectores actualmente en memoria (útil para diagnóstico). */
  get size(): number {
    return this.chunks.size;
  }

  /** Descarta todos los sectores; el próximo fotograma los vuelve a pintar. */
  clear(): void {
    this.chunks.clear();
    this.signature = '';
  }

  /**
   * Compone los sectores visibles y prepara el anillo de precarga.
   * `signature` debe reflejar cualquier cambio visual del terreno estático.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    vw: number,
    vh: number,
    signature: string,
    paint: StaticChunkPainter
  ): void {
    if (typeof document === 'undefined') return;

    if (signature !== this.signature) {
      this.signature = signature;
      this.chunks.clear();
    }

    this.useStamp += 1;
    const size = this.chunkSize;
    const x0 = Math.floor(camX / size);
    const y0 = Math.floor(camY / size);
    const x1 = Math.floor((camX + vw - 1) / size);
    const y1 = Math.floor((camY + vh - 1) / size);

    // 1) Sectores visibles: se hornean de inmediato para no dejar huecos,
    //    incluso después de un teletransporte o un cambio brusco de cámara.
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        this.getOrBake(cx, cy, paint, true, Infinity);
      }
    }

    // 2) Composición: solo el interior de cada sector, sin solapar bordes.
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const chunk = this.chunks.get(this.key(cx, cy));
        if (!chunk) continue;
        chunk.lastUsed = this.useStamp;
        if (chunk.empty) continue;
        ctx.drawImage(
          chunk.canvas,
          this.margin,
          this.margin,
          size,
          size,
          cx * size,
          cy * size,
          size,
          size
        );
      }
    }

    // 3) Precarga del anillo siguiente con un presupuesto pequeño por fotograma.
    if (this.preloadChunks > 0) {
      const deadline = now() + this.bakeBudgetMs;
      const px0 = x0 - this.preloadChunks;
      const py0 = y0 - this.preloadChunks;
      const px1 = x1 + this.preloadChunks;
      const py1 = y1 + this.preloadChunks;
      for (let cy = py0; cy <= py1; cy++) {
        for (let cx = px0; cx <= px1; cx++) {
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) continue;
          this.getOrBake(cx, cy, paint, false, deadline);
        }
      }
    }
  }

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  private getOrBake(
    cx: number,
    cy: number,
    paint: StaticChunkPainter,
    required: boolean,
    deadline: number
  ): void {
    const key = this.key(cx, cy);
    const existing = this.chunks.get(key);
    if (existing) {
      existing.lastUsed = this.useStamp;
      return;
    }
    if (!required && now() > deadline) return;

    const size = this.chunkSize;
    const margin = this.margin;
    const canvas = document.createElement('canvas');
    canvas.width = size + margin * 2;
    canvas.height = size + margin * 2;
    const bctx = canvas.getContext('2d');
    if (!bctx) return;
    bctx.imageSmoothingEnabled = false;

    // El pincel dibuja en coordenadas de mundo; el lienzo representa este
    // sector más su margen, así que basta con desplazar el origen.
    bctx.save();
    bctx.translate(margin - cx * size, margin - cy * size);
    let painted: boolean | void = false;
    try {
      painted = paint(
        bctx,
        cx * size - margin,
        cy * size - margin,
        (cx + 1) * size + margin,
        (cy + 1) * size + margin
      );
    } finally {
      bctx.restore();
    }

    this.chunks.set(key, {
      canvas,
      lastUsed: this.useStamp,
      empty: painted === false,
    });
    this.evictIfNeeded();
  }

  private evictIfNeeded(): void {
    while (this.chunks.size > this.maxChunks) {
      let oldestKey = '';
      let oldestStamp = Infinity;
      for (const [key, chunk] of this.chunks) {
        if (chunk.lastUsed < oldestStamp) {
          oldestStamp = chunk.lastUsed;
          oldestKey = key;
        }
      }
      if (!oldestKey) return;
      this.chunks.delete(oldestKey);
    }
  }
}
