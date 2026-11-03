/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar»
 * Escena jugable que continúa la cinemática inicial: Pixel despierta en su
 * habitación durante la tormenta y, al ponerse de pie, recupera el control.
 *
 * Dirección: cámara cinematográfica con acercamientos suaves, fundido desde
 * negro, relámpagos sincronizados con truenos, lluvia sobre el cristal,
 * cortinas que se mueven y una entrega de control sin cortes ni pantallas
 * intermedias. La habitación está construida por capas independientes.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { bgmEngine } from '../audio/bgmEngine';
import {
  renderPixelVxAce4Dir,
  type VxFacingDirection,
} from '../avatar/pixelVxAceSprite';
import type { AvatarAppearance } from '../avatar/avatarOptions';
import {
  BEDROOM_DIALOGUE_LINE,
  BEDROOM_H,
  BEDROOM_INTERACTABLES,
  BEDROOM_PLAY_SPEED,
  BEDROOM_PLAY_ZOOM,
  BEDROOM_SOLIDS,
  BEDROOM_TIMELINE,
  BEDROOM_W,
  BEDROOM_WALK_BOUNDS,
  bedroomFlashAt,
  clamp01,
  getBedroomCamera,
  nearestBedroomInteractable,
  rampBetween,
  smooth01,
} from './bedroom/bedroomData';
import {
  BEDROOM_PIXEL_COLORS,
  drawPixelOnBed,
  drawPixelStandingCustom,
  type BedPixelPose,
} from './bedroom/bedroomPixel';
import {
  drawBedroomBase,
  drawBedroomBlanket,
} from './bedroom/bedroomRoom';
import { bedroomStormAudio } from './bedroom/bedroomStormAudio';

export interface BedroomStageProps {
  onExitToTitle: () => void;
  onWake?: () => void;
}

const STAND_X = 427;
const STAND_FEET_Y = 236;

const PIXEL_APPEARANCE: AvatarAppearance = {
  bootColor: '#262b38',
  outfitId: 'classic',
  accessories: [],
  transformationId: null,
  hairStyleId: 'hero',
};

const PLAYER_SKIN = BEDROOM_PIXEL_COLORS.skin;
const PLAYER_HAIR = BEDROOM_PIXEL_COLORS.hair;
const PLAYER_SHIRT = BEDROOM_PIXEL_COLORS.hood;

function stormEnvelope(age: number): number {
  if (age < 0 || age > 1.6) return 0;
  if (age < 0.045) return 1;
  if (age < 0.1) return 0.16;
  if (age < 0.16) return 0.88;
  if (age < 0.23) return 0.26;
  if (age < 0.31) return 0.52;
  return Math.max(0, 0.4 * Math.exp(-(age - 0.31) * 5.4));
}

function computeBedPose(t: number): BedPixelPose {
  const T = BEDROOM_TIMELINE;
  const breath = Math.sin(t * 1.45) * 0.35;
  const pose: BedPixelPose = {
    time: t,
    headX: STAND_X,
    headY: 112 + breath,
    upright: 0,
    eyesOpen: 0,
    look: 0,
    startle: 0,
    legsOut: 0,
    legsVisible: false,
  };

  if (t < T.stir) {
    pose.headX += Math.sin(t * 0.21) * 0.4;
    pose.headY += Math.sin(t * 0.33) * 0.25;
    return pose;
  }
  if (t < T.startle) {
    const k = rampBetween(t, T.stir, T.startle);
    pose.headX += Math.sin(k * Math.PI) * 1.2;
    pose.headY -= Math.sin(k * Math.PI * 1.1) * 0.9;
    return pose;
  }
  if (t < T.eyesOpen) {
    const k = rampBetween(t, T.startle, T.eyesOpen);
    pose.startle = Math.sin(k * Math.PI * 0.92);
    pose.headY -= pose.startle * 2.4;
    pose.headX -= pose.startle * 0.7;
    return pose;
  }

  pose.eyesOpen = 1;
  pose.startle = Math.max(0, 1 - (t - T.eyesOpen) * 3.1);

  if (t < T.lookAround) {
    pose.look = Math.sin((t - T.eyesOpen) * 5) * 0.55;
    return pose;
  }
  if (t < T.riseStart) {
    pose.look = Math.sin((t - T.lookAround) * 1.55) * 0.95;
    pose.headX += pose.look * 0.5;
    return pose;
  }
  if (t < T.riseEnd) {
    const k = rampBetween(t, T.riseStart, T.riseEnd);
    pose.upright = k * 0.68;
    pose.headY = 112 - k * 3 + breath;
    pose.look = -1;
    return pose;
  }
  if (t < T.blanketOff) {
    const k = rampBetween(t, T.riseEnd, T.windowShotEnd);
    pose.upright = 0.68 + k * 0.32;
    pose.headY = 109 + k * 15 + breath;
    pose.look = -1;
    return pose;
  }
  if (t < T.scootEnd) {
    const k = rampBetween(t, T.scootStart, T.scootEnd);
    pose.upright = 1;
    pose.headY = 124 + k * 30;
    pose.legsVisible = t >= T.scootStart + 0.15;
    pose.legsOut = 0;
    pose.look = k < 0.25 ? -1 : 0;
    return pose;
  }

  pose.upright = 1;
  pose.headY = 154;
  pose.legsVisible = true;
  pose.legsOut = clamp01((t - T.legsStart) / Math.max(0.001, T.legsEnd - T.legsStart));
  return pose;
}

function TypewriterText({ text, speed = 46 }: { text: string; speed?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (!text) return;
    const id = window.setInterval(() => {
      setCount((value) => {
        if (value >= text.length) {
          window.clearInterval(id);
          return value;
        }
        return value + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  return (
    <span>
      {text.slice(0, count)}
      {count < text.length && <span className="bedroom-caret" aria-hidden="true" />}
    </span>
  );
}

export function BedroomStage({ onExitToTitle, onWake }: BedroomStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [phase, setPhase] = useState<'cutscene' | 'play'>('cutscene');
  const [paused, setPaused] = useState(false);
  const [uiTime, setUiTime] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [nearId, setNearId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<{
    title: string;
    lines: string[];
    index: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => bgmEngine.isMuted());

  const elapsedRef = useRef(0);
  const worldTimeRef = useRef(0);
  const playClockRef = useRef(0);
  const phaseRef = useRef<'cutscene' | 'play'>('cutscene');
  const pausedRef = useRef(false);
  const uiSyncRef = useRef(-1);
  const playerRef = useRef({
    x: STAND_X,
    y: STAND_FEET_Y,
    facing: 'down' as VxFacingDirection,
    moving: false,
    anim: 0,
  });
  const cameraRef = useRef({ x: 406, y: 194, zoom: 1.26 });
  const keysRef = useRef<Set<string>>(new Set());
  const dialogueRef = useRef<{ title: string; lines: string[]; index: number } | null>(null);
  const nearRef = useRef<string | null>(null);
  const strikeRef = useRef<{ at: number; power: number } | null>(null);
  const nextStrikeRef = useRef(12 + Math.random() * 8);
  const handoffRef = useRef(false);
  const hintTimerRef = useRef<number | null>(null);

  const onExitRef = useRef(onExitToTitle);
  onExitRef.current = onExitToTitle;
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const exitToTitle = useCallback(() => {
    bedroomStormAudio.stop();
    onExitRef.current();
  }, []);

  const enterPlay = useCallback(() => {
    if (handoffRef.current) return;
    handoffRef.current = true;
    phaseRef.current = 'play';
    setPhase('play');
    elapsedRef.current = BEDROOM_TIMELINE.handoff;
    playClockRef.current = 0;
    playerRef.current = {
      x: STAND_X,
      y: STAND_FEET_Y,
      facing: 'down',
      moving: false,
      anim: 0,
    };
    const endCam = getBedroomCamera(BEDROOM_TIMELINE.handoff);
    cameraRef.current = { x: endCam.x, y: endCam.y, zoom: endCam.zoom };
    setNearId(null);
    nearRef.current = null;
    bedroomStormAudio.rewindCues(BEDROOM_TIMELINE.handoff);
    onWakeRef.current?.();
    setShowHints(true);
    if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    hintTimerRef.current = window.setTimeout(() => setShowHints(false), 7200);
  }, []);

  const enterPlayRef = useRef(enterPlay);
  enterPlayRef.current = enterPlay;

  const togglePause = useCallback(() => {
    setPaused((value) => {
      const next = !value;
      pausedRef.current = next;
      if (next) keysRef.current.clear();
      return next;
    });
  }, []);
  const togglePauseRef = useRef(togglePause);
  togglePauseRef.current = togglePause;

  const interact = useCallback(() => {
    if (phaseRef.current !== 'play' || pausedRef.current) return;
    const current = dialogueRef.current;
    if (current) {
      if (current.index < current.lines.length - 1) {
        const next = { ...current, index: current.index + 1 };
        dialogueRef.current = next;
        setDialogue(next);
        bedroomStormAudio.tick();
      } else {
        dialogueRef.current = null;
        setDialogue(null);
        bedroomStormAudio.tick();
      }
      return;
    }
    if (!nearRef.current) return;
    const item = BEDROOM_INTERACTABLES.find((entry) => entry.id === nearRef.current);
    if (!item) return;
    const next = { title: item.label, lines: item.lines, index: 0 };
    dialogueRef.current = next;
    setDialogue(next);
    bedroomStormAudio.tick();
  }, []);
  const interactRef = useRef(interact);
  interactRef.current = interact;

  const skipScene = useCallback(() => {
    setPaused(false);
    pausedRef.current = false;
    enterPlayRef.current();
  }, []);

  /* =====================================================
     AUDIO
     ===================================================== */
  useEffect(() => {
    bedroomStormAudio.start();
    bedroomStormAudio.setMuted(bgmEngine.isMuted());
    bgmEngine.setDuckFactor(0);

    const unsubscribe = bgmEngine.subscribe((muted) => {
      setIsMuted(muted);
      bedroomStormAudio.setMuted(muted);
    });

    const unlock = () => bedroomStormAudio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      unsubscribe();
      bedroomStormAudio.stop();
      bgmEngine.setDuckFactor(1);
    };
  }, []);

  /* =====================================================
     ENTRADA
     ===================================================== */
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if (key === 'escape') {
        event.preventDefault();
        togglePauseRef.current();
        return;
      }
      if (pausedRef.current) return;

      if (phaseRef.current === 'cutscene') {
        if (key === 'p') {
          event.preventDefault();
          togglePauseRef.current();
        }
        if (key === ' ' || key === 'enter' || key.startsWith('arrow')) {
          event.preventDefault();
        }
        return;
      }

      if (key === 'e' || key === 'enter' || key === ' ') {
        event.preventDefault();
        interactRef.current();
        return;
      }

      if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
        keysRef.current.add(key);
      } else if (key.startsWith('arrow')) {
        event.preventDefault();
        keysRef.current.add(key);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    const clearKeys = () => keysRef.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current !== null) window.clearTimeout(hintTimerRef.current);
    };
  }, []);

  /* =====================================================
     LIENZO Y DIRECCIÓN DE ESCENA
     ===================================================== */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const world = document.createElement('canvas');
    world.width = BEDROOM_W;
    world.height = BEDROOM_H;
    const wctx = world.getContext('2d');
    if (!wctx) return;
    wctx.imageSmoothingEnabled = false;

    let cssW = 0;
    let cssH = 0;
    let dpr = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('resize', resize);

    let frameId = 0;
    let disposed = false;
    let lastNow = performance.now();

    const blockedAt = (x: number, y: number): boolean => {
      if (
        x < BEDROOM_WALK_BOUNDS.x1 ||
        x > BEDROOM_WALK_BOUNDS.x2 ||
        y < BEDROOM_WALK_BOUNDS.y1 ||
        y > BEDROOM_WALK_BOUNDS.y2
      ) {
        return true;
      }
      for (const solid of BEDROOM_SOLIDS) {
        if (
          x + 7 > solid.x &&
          x - 7 < solid.x + solid.w &&
          y + 1 > solid.y &&
          y - 8 < solid.y + solid.h
        ) {
          return true;
        }
      }
      return false;
    };

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.max(0.001, Math.min(0.05, (now - lastNow) / 1000));
      lastNow = now;

      const pausedNow = pausedRef.current;
      if (!pausedNow) {
        worldTimeRef.current += dt;
      }

      // Cronómetro de la puesta en escena.
      if (phaseRef.current === 'cutscene' && !pausedNow) {
        elapsedRef.current = Math.min(
          BEDROOM_TIMELINE.handoff,
          elapsedRef.current + dt
        );
        bedroomStormAudio.sync(elapsedRef.current);
        if (elapsedRef.current >= BEDROOM_TIMELINE.handoff) {
          enterPlayRef.current();
        }
        if (Math.abs(elapsedRef.current - uiSyncRef.current) > 0.08) {
          uiSyncRef.current = elapsedRef.current;
          setUiTime(elapsedRef.current);
        }
      }

      // Movimiento y cámara jugable.
      let flash = 0;
      if (phaseRef.current === 'play') {
        if (!pausedNow) {
          playClockRef.current += dt;
          const player = playerRef.current;
          if (!dialogueRef.current) {
            const keys = keysRef.current;
            const up = keys.has('w') || keys.has('arrowup');
            const down = keys.has('s') || keys.has('arrowdown');
            const left = keys.has('a') || keys.has('arrowleft');
            const right = keys.has('d') || keys.has('arrowright');
            let dx = (right ? 1 : 0) - (left ? 1 : 0);
            let dy = (down ? 1 : 0) - (up ? 1 : 0);
            const moving = dx !== 0 || dy !== 0;
            if (moving) {
              const len = Math.hypot(dx, dy) || 1;
              dx /= len;
              dy /= len;
              const stepX = dx * BEDROOM_PLAY_SPEED * dt;
              const stepY = dy * BEDROOM_PLAY_SPEED * dt;
              if (!blockedAt(player.x + stepX, player.y)) player.x += stepX;
              if (!blockedAt(player.x, player.y + stepY)) player.y += stepY;
              if (Math.abs(dx) > Math.abs(dy)) {
                player.facing = dx > 0 ? 'right' : 'left';
              } else if (dy !== 0) {
                player.facing = dy > 0 ? 'down' : 'up';
              }
              player.anim += dt;
            }
            player.moving = moving;
          } else {
            playerRef.current.moving = false;
          }

          const near = nearestBedroomInteractable(
            playerRef.current.x,
            playerRef.current.y
          );
          const nextNear = near ? near.item.id : null;
          if (nextNear !== nearRef.current) {
            nearRef.current = nextNear;
            setNearId(nextNear);
          }

          // La tormenta sigue viva después de recuperar el control.
          if (playClockRef.current > nextStrikeRef.current) {
            const power = 0.45 + Math.random() * 0.4;
            strikeRef.current = { at: playClockRef.current, power };
            nextStrikeRef.current =
              playClockRef.current + 17 + Math.random() * 12;
            bedroomStormAudio.crack(0.3);
            bedroomStormAudio.thunder(power, 0.35);
          }
          if (strikeRef.current) {
            const age = playClockRef.current - strikeRef.current.at;
            flash = stormEnvelope(age) * strikeRef.current.power;
          }

          // Seguimiento suave de cámara.
          const cam = cameraRef.current;
          const tx = playerRef.current.x;
          const ty = playerRef.current.y - 12;
          cam.x += (tx - cam.x) * Math.min(1, dt * 3.6);
          cam.y += (ty - cam.y) * Math.min(1, dt * 3.6);
          cam.zoom += (BEDROOM_PLAY_ZOOM - cam.zoom) * Math.min(1, dt * 2.2);

          if (Math.abs(playClockRef.current - uiSyncRef.current) > 0.1) {
            uiSyncRef.current = playClockRef.current;
            setUiTime(BEDROOM_TIMELINE.handoff + playClockRef.current);
          }
        }
      } else {
        flash = bedroomFlashAt(elapsedRef.current);
      }

      const t = elapsedRef.current;
      const worldTime = worldTimeRef.current;
      const camera =
        phaseRef.current === 'cutscene'
          ? getBedroomCamera(t)
          : cameraRef.current;

      const pose = computeBedPose(t);
      const blanketTop = phaseRef.current === 'cutscene' ? 132 + pose.upright * 24 : 158;
      const blanketPull =
        phaseRef.current === 'cutscene'
          ? rampBetween(t, BEDROOM_TIMELINE.blanketOff, BEDROOM_TIMELINE.blanketOff + 1.0)
          : 1;

      // --- Mundo dibujado a resolución nativa ---------------------
      wctx.clearRect(0, 0, BEDROOM_W, BEDROOM_H);
      drawBedroomBase(wctx, {
        time: worldTime,
        flash,
        curtainSway:
          Math.sin(worldTime * 0.7) * 0.55 + Math.sin(worldTime * 1.9 + 1.3) * 0.35,
        blanketTop,
        blanketPull,
      });

      if (phaseRef.current === 'cutscene') {
        if (t < BEDROOM_TIMELINE.standStart) {
          const shakeStrenght = Math.max(0, flash - 0.5) * 0.7;
          const blanketState = {
            time: worldTime,
            flash,
            curtainSway: 0,
            blanketTop,
            blanketPull,
          };
          const seated = {
            ...pose,
            startle: pose.startle + shakeStrenght,
          };
          // Al sentarse sobre la cama, el edredón queda por detrás del cuerpo.
          if (pose.legsVisible) {
            drawBedroomBlanket(wctx, blanketState);
            drawPixelOnBed(wctx, seated);
          } else {
            drawPixelOnBed(wctx, seated);
            drawBedroomBlanket(wctx, blanketState);
          }
        } else {
          const standK = rampBetween(
            t,
            BEDROOM_TIMELINE.standStart,
            BEDROOM_TIMELINE.standEnd
          );
          drawBedroomBlanket(wctx, {
            time: worldTime,
            flash,
            curtainSway: 0,
            blanketTop,
            blanketPull: 1,
          });
          // La pose sentada se yergue y desciende al suelo antes de ceder el
          // paso al sprite caminable: así el cambio de silueta no produce fantasma.
          const bedAlpha = 1 - smooth01((standK - 0.62) / 0.38);
          if (bedAlpha > 0.002) {
            drawPixelOnBed(wctx, {
              ...pose,
              headY: pose.headY + standK * 22,
              alpha: bedAlpha,
              legsVisible: true,
              legsOut: 1,
              rise: standK,
            });
          }
          const standAlpha = smooth01((standK - 0.58) / 0.42);
          if (standAlpha > 0.002) {
            drawPixelStandingCustom(
              wctx,
              STAND_X,
              STAND_FEET_Y,
              worldTime,
              standAlpha,
              0,
              (1 - standK) * 0.25
            );
          }
        }
      } else {
        drawBedroomBlanket(wctx, {
          time: worldTime,
          flash,
          curtainSway: 0,
          blanketTop: 158,
          blanketPull: 1,
        });
        const player = playerRef.current;
        const blend = smooth01(playClockRef.current / 0.42);
        if (blend < 0.999) {
          drawPixelStandingCustom(
            wctx,
            player.x,
            player.y,
            worldTime,
            1 - blend,
            0,
            0
          );
        }
        if (blend > 0.001) {
          wctx.save();
          wctx.globalAlpha = blend;
          renderPixelVxAce4Dir(
            wctx,
            player.x,
            player.y,
            player.facing,
            player.moving,
            false,
            player.anim,
            PLAYER_SKIN,
            PLAYER_HAIR,
            PLAYER_SHIRT,
            { appearance: PIXEL_APPEARANCE }
          );
          wctx.restore();
        }
      }

      // --- Cámara: recorte del mundo y escalado nítido -------------
      const cover = Math.max(cssW / BEDROOM_W, cssH / BEDROOM_H);
      const scale = cover * camera.zoom;
      const srcW = cssW / scale;
      const srcH = cssH / scale;
      let sx = camera.x - srcW / 2;
      let sy = camera.y - srcH / 2;
      sx = Math.max(0, Math.min(BEDROOM_W - srcW, sx));
      sy = Math.max(0, Math.min(BEDROOM_H - srcH, sy));

      const shakePower = Math.max(0, flash - 0.28) * 2.6;
      if (shakePower > 0.01) {
        sx += Math.sin(worldTime * 71) * shakePower;
        sy += Math.cos(worldTime * 53) * shakePower * 0.8;
      }
      const sourceSx = Math.max(0, Math.min(BEDROOM_W - srcW, sx));
      const sourceSy = Math.max(0, Math.min(BEDROOM_H - srcH, sy));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.drawImage(
        world,
        sourceSx,
        sourceSy,
        srcW,
        srcH,
        0,
        0,
        cssW,
        cssH
      );

      // --- Luz de tormenta en pantalla -----------------------------
      if (flash > 0.01) {
        const winX = ((241 - sourceSx) / srcW) * cssW;
        const winY = ((41 - sourceSy) / srcH) * cssH;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const glow = ctx.createRadialGradient(
          winX,
          winY,
          8,
          winX,
          winY,
          Math.max(cssW, cssH) * 0.95
        );
        glow.addColorStop(0, `rgba(190,220,255,${0.3 * flash})`);
        glow.addColorStop(0.45, `rgba(96,140,212,${0.14 * flash})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.restore();
        ctx.fillStyle = `rgba(220,236,255,${0.1 * flash})`;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      // --- Viñeta y líneas de exploración del monitor --------------
      const vignette = ctx.createRadialGradient(
        cssW / 2,
        cssH / 2,
        Math.min(cssW, cssH) * 0.3,
        cssW / 2,
        cssH / 2,
        Math.max(cssW, cssH) * 0.72
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.72, 'rgba(2,4,10,0.16)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      for (let y = 0; y < cssH; y += 3) {
        ctx.fillRect(0, y, cssW, 1);
      }

      // --- Fundido de entrada --------------------------------------
      if (phaseRef.current === 'cutscene' && t < BEDROOM_TIMELINE.fadeInEnd) {
        const fade = 1 - smooth01(t / BEDROOM_TIMELINE.fadeInEnd);
        ctx.fillStyle = `rgba(0,0,0,${fade})`;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      // Textura de humedad nocturna muy tenue.
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#9dc7f2';
      ctx.fillRect(0, 0, cssW, 2);
      ctx.restore();

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  const nearItem = useMemo(
    () => (nearId ? BEDROOM_INTERACTABLES.find((item) => item.id === nearId) ?? null : null),
    [nearId]
  );

  const tagOpacity =
    phase === 'cutscene'
      ? Math.min(
          smooth01((uiTime - 1.35) / 0.8),
          1 - smooth01((uiTime - 6.2) / 1.25)
        )
      : 0;

  const showStoryLine =
    phase === 'cutscene' &&
    uiTime >= BEDROOM_TIMELINE.dialogueStart &&
    uiTime <= BEDROOM_TIMELINE.dialogueEnd + 0.1;

  return (
    <div className="bedroom-stage" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="bedroom-canvas"
        role="img"
        aria-label="Habitación de Pixel durante la tormenta"
      />

      <div className="bedroom-atmosphere" aria-hidden="true" />

      <div
        className={`bedroom-letterbox ${phase === 'cutscene' ? 'is-open' : ''}`}
        aria-hidden="true"
      >
        <div className="bedroom-letterbox__bar bedroom-letterbox__bar--top" />
        <div className="bedroom-letterbox__bar bedroom-letterbox__bar--bottom" />
      </div>

      <div className="bedroom-tag" style={{ opacity: tagOpacity }} aria-hidden="true">
        <span className="bedroom-tag__index">PRÓLOGO</span>
        <span className="bedroom-tag__rule" />
        <span className="bedroom-tag__label">EL DESPERTAR</span>
      </div>

      {showStoryLine && (
        <div className="bedroom-story-line" aria-live="polite">
          <span className="bedroom-story-line__name">PIXEL</span>
          <p className="bedroom-story-line__text">
            <TypewriterText text={BEDROOM_DIALOGUE_LINE} speed={58} />
          </p>
        </div>
      )}

      {phase === 'play' && !dialogue && !paused && !showHints && nearItem && (
        <div className="bedroom-prompt" aria-live="polite">
          <span className="bedroom-key">E</span>
          <span>{nearItem.action}</span>
        </div>
      )}

      {dialogue && (
        <div className="bedroom-dialogue" role="dialog" aria-live="polite">
          <div className="bedroom-dialogue__head">
            <span className="bedroom-dialogue__name">{dialogue.title}</span>
            <span className="bedroom-dialogue__hint">HABITACIÓN DE PIXEL</span>
          </div>
          <p className="bedroom-dialogue__text" key={`${dialogue.title}-${dialogue.index}`}>
            <TypewriterText text={dialogue.lines[dialogue.index]} />
          </p>
          <div className="bedroom-dialogue__foot">
            <span>
              {dialogue.index < dialogue.lines.length - 1
                ? 'E · Continuar'
                : 'E · Cerrar'}
            </span>
            <button type="button" className="bedroom-dialogue__next" onClick={interact}>
              {dialogue.index < dialogue.lines.length - 1 ? 'Continuar' : 'Cerrar'}
            </button>
          </div>
        </div>
      )}

      {showHints && phase === 'play' && !paused && (
        <div className="bedroom-hint" aria-live="polite">
          <span><b>WASD</b> / Flechas · Moverse</span>
          <span><b>E</b> · Interactuar</span>
          <span><b>ESC</b> · Menú</span>
        </div>
      )}

      <div className="bedroom-controls">
        <button
          type="button"
          className="bedroom-icon-btn"
          onClick={togglePause}
          aria-label={paused ? 'Reanudar escena' : 'Pausar escena'}
          title={paused ? 'Reanudar (Esc)' : 'Pausa (Esc)'}
        >
          {paused ? <Play /> : <Pause />}
        </button>
        <button
          type="button"
          className="bedroom-icon-btn"
          onClick={() => bgmEngine.toggleMute()}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </button>
      </div>

      {paused && (
        <div className="bedroom-pause" role="dialog" aria-modal="true" aria-label="Pausa">
          <div className="bedroom-pause__card">
            <div className="bedroom-pause__eyebrow">PIXELVERSE · PRÓLOGO</div>
            <h2 className="bedroom-pause__title">Pausa</h2>
            <p className="bedroom-pause__sub">La tormenta sigue ahí fuera.</p>
            <div className="bedroom-pause__actions">
              <button type="button" className="bedroom-pause__btn is-primary" onClick={togglePause}>
                Reanudar
              </button>
              {phase === 'cutscene' && (
                <button type="button" className="bedroom-pause__btn" onClick={skipScene}>
                  <SkipForward />
                  Saltar escena
                </button>
              )}
              <button type="button" className="bedroom-pause__btn" onClick={exitToTitle}>
                Menú principal
              </button>
            </div>
            <p className="bedroom-pause__foot">
              Esc · reanudar · M · sonido
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
