/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar» / «La señal»
 * Escena jugable que continúa la cinemática inicial: Pixel despierta durante
 * la tormenta, recupera el control, escucha una transmisión imposible en su
 * radio, recibe tres golpes en la puerta y conoce al viajero del futuro.
 *
 * Dirección: cámara cinematográfica con acercamientos suaves, fundido desde
 * negro, relámpagos sincronizados con truenos, lluvia sobre el cristal,
 * cortinas que se mueven y una entrega de control sin cortes ni pantallas
 * intermedias. La habitación está construida por capas independientes.
 *
 * De pie, Pixel se dibuja SIEMPRE con `renderPixelVxAce4Dir`: el mismo sprite,
 * escala y anclaje que durante la exploración. No hay una segunda versión del
 * personaje ni cambios de tamaño al recuperar el control.
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
  RADIO_REACTION,
  RADIO_TRANSMISSION,
  bedroomFlashAt,
  getBedroomCamera,
  nearestBedroomInteractable,
  rampBetween,
  smooth01,
} from './bedroom/bedroomData';
import {
  BEDROOM_PIXEL_COLORS,
  bedPixelPaletteFor,
  drawPixelOnBed,
  drawPixelSilhouette,
  type BedPixelPose,
} from './bedroom/bedroomPixel';
import {
  drawBedroomBase,
  drawBedroomBlanket,
} from './bedroom/bedroomRoom';
import { bedroomStormAudio } from './bedroom/bedroomStormAudio';

export interface BedroomStageProps {
  skinColor?: string;
  hairColor?: string;
  shirtColor?: string;
  appearance?: AvatarAppearance;
  onExitToTitle: () => void;
  onWake?: () => void;
  /** Pixel cruza la puerta de su habitación y entra al comedor. */
  onEnterComedor?: () => void;
}

const STAND_X = 427;
const STAND_FEET_Y = 224;
const DOOR_PARK_X = 108;
const DOOR_PARK_Y = 264;

const PIXEL_APPEARANCE: AvatarAppearance = {
  bootColor: '#262b38',
  outfitId: 'classic',
  accessories: [],
  transformationId: null,
  hairStyleId: 'hero',
};

type StoryPhase = 'free' | 'radio' | 'exit';
type DialogueKind = 'object' | 'radio' | 'reaction';

interface BedroomDialogue {
  title: string;
  lines: string[];
  index: number;
  kind: DialogueKind;
  speakers?: string[];
}

interface StoryRuntime {
  phase: StoryPhase;
  t: number;
  radioHeard: boolean;
  doorOpen: number;
  lock: boolean;
  camera: { x: number; y: number; zoom: number } | null;
  /** La transición al comedor ya se disparó. */
  exitStarted: boolean;
}

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
    pose.headY = 124 + k * 36;
    pose.legsVisible = t >= T.scootStart + 0.15;
    pose.legsOut = 1;
    pose.look = k < 0.25 ? -1 : 0;
    return pose;
  }

  pose.upright = 1;
  pose.headY = 160;
  pose.legsVisible = true;
  // Las piernas ya cuelgan: se flexionan las rodillas, nunca se estiran.
  pose.legsOut = 1;
  pose.bend = t < T.legsStart
    ? 0
    : t < T.legsEnd
      ? rampBetween(t, T.legsStart, T.legsEnd)
      : 1;
  if (t >= T.feetDown) {
    // Impulso corto y natural: el mismo cuerpo sube y baja, sin escalar.
    const hop = Math.min(
      1,
      Math.max(0, (t - T.feetDown) / Math.max(0.001, T.standStart + 0.55 - T.feetDown))
    );
    pose.jump = Math.sin(Math.PI * hop);
    pose.bend = 1 - pose.jump * 0.65;
  }
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

export function BedroomStage({
  skinColor,
  hairColor,
  shirtColor,
  appearance,
  onExitToTitle,
  onWake,
  onEnterComedor,
}: BedroomStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerSkin = skinColor || BEDROOM_PIXEL_COLORS.skin;
  const playerHair = hairColor || BEDROOM_PIXEL_COLORS.hair;
  const playerShirt = shirtColor || BEDROOM_PIXEL_COLORS.hood;
  const playerAppearance = appearance ?? PIXEL_APPEARANCE;
  const bedPalette = useMemo(
    () => bedPixelPaletteFor(playerSkin, playerHair, playerShirt),
    [playerSkin, playerHair, playerShirt]
  );
  const [leaving, setLeaving] = useState(false);

  const [phase, setPhase] = useState<'cutscene' | 'play'>('cutscene');
  const [paused, setPaused] = useState(false);
  const [uiTime, setUiTime] = useState(0);
  const [showHints, setShowHints] = useState(false);
  const [nearId, setNearId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<BedroomDialogue | null>(null);
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
    facing: 'left' as VxFacingDirection,
    moving: false,
    anim: 0,
  });
  const cameraRef = useRef({ x: 414, y: 206, zoom: 1.3 });
  const keysRef = useRef<Set<string>>(new Set());
  const dialogueRef = useRef<BedroomDialogue | null>(null);
  const nearRef = useRef<string | null>(null);
  const strikeRef = useRef<{ at: number; power: number } | null>(null);
  const nextStrikeRef = useRef(12 + Math.random() * 8);
  const handoffRef = useRef(false);
  const hintTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const radioActiveRef = useRef(false);
  const mountedRef = useRef(true);
  const storyRef = useRef<StoryRuntime>({
    phase: 'free',
    t: 0,
    radioHeard: false,
    doorOpen: 0,
    lock: false,
    camera: null,
    exitStarted: false,
  });

  const onExitRef = useRef(onExitToTitle);
  onExitRef.current = onExitToTitle;
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;
  const onEnterComedorRef = useRef(onEnterComedor);
  onEnterComedorRef.current = onEnterComedor;
  const leavingRef = useRef(false);

  const openDialogue = useCallback((next: BedroomDialogue | null) => {
    dialogueRef.current = next;
    setDialogue(next);
  }, []);

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
      facing: 'left',
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

  const startRadio = useCallback(() => {
    const story = storyRef.current;
    story.phase = 'radio';
    story.t = 0;
    story.radioHeard = true;
    story.lock = true;
    story.camera = { x: 224, y: 148, zoom: 1.52 };
    radioActiveRef.current = true;
    playerRef.current.facing = 'up';
    playerRef.current.moving = false;
    keysRef.current.clear();
    nearRef.current = null;
    setNearId(null);
    bedroomStormAudio.radioStart();
    openDialogue({
      title: 'RADIO',
      lines: RADIO_TRANSMISSION,
      index: 0,
      kind: 'radio',
    });
  }, [openDialogue]);

  const startDoorExit = useCallback(() => {
    const story = storyRef.current;
    if (story.phase === 'exit') return;
    story.phase = 'exit';
    story.t = 0;
    story.lock = true;
    story.camera = { x: 92, y: 246, zoom: 1.5 };
    story.exitStarted = false;
    radioActiveRef.current = false;
    keysRef.current.clear();
    playerRef.current.facing = 'left';
    playerRef.current.moving = false;
    nearRef.current = null;
    setNearId(null);
    bedroomStormAudio.doorCreak();
  }, []);

  const interact = useCallback(() => {
    if (phaseRef.current !== 'play' || pausedRef.current) return;
    const current = dialogueRef.current;

    if (current) {
      if (current.index < current.lines.length - 1) {
        const nextIndex = current.index + 1;
        if (current.kind === 'radio') {
          bedroomStormAudio.radioTune();
        }
        openDialogue({ ...current, index: nextIndex });
        bedroomStormAudio.tick();
        return;
      }

      openDialogue(null);
      bedroomStormAudio.tick();

      if (current.kind === 'radio') {
        // La señal se corta de golpe y deja un silencio incómodo.
        bedroomStormAudio.radioCut();
        radioActiveRef.current = false;
        if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
        reactionTimerRef.current = window.setTimeout(() => {
          reactionTimerRef.current = null;
          if (!mountedRef.current || phaseRef.current !== 'play') return;
          if (storyRef.current.phase !== 'radio') return;
          openDialogue({
            title: 'PIXEL',
            lines: [RADIO_REACTION],
            index: 0,
            kind: 'reaction',
          });
        }, 520);
        return;
      }

      if (current.kind === 'reaction') {
        const story = storyRef.current;
        story.phase = 'free';
        story.t = 0;
        story.lock = false;
        story.camera = null;
        return;
      }

      return;
    }

    if (!nearRef.current) return;
    const item = BEDROOM_INTERACTABLES.find((entry) => entry.id === nearRef.current);
    if (!item) return;

    if (item.id === 'radio' && !storyRef.current.radioHeard) {
      startRadio();
      return;
    }

    if (item.id === 'door') {
      // No hay nadie al otro lado: Pixel abre la puerta y pasa al comedor.
      startDoorExit();
      return;
    }

    const lines =
      item.id === 'radio'
        ? [
            'Sólo queda estática.',
            '«No confíes en todo lo que escuches por la radio.»',
          ]
        : item.lines;
    openDialogue({ title: item.label, lines, index: 0, kind: 'object' });
    bedroomStormAudio.tick();
  }, [openDialogue, startDoorExit, startRadio]);
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
    mountedRef.current = true;
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
      mountedRef.current = false;
      if (reactionTimerRef.current !== null) {
        window.clearTimeout(reactionTimerRef.current);
        reactionTimerRef.current = null;
      }
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
      if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
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
      const story = storyRef.current;
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

      // Movimiento, historia y cámara jugable.
      let flash = 0;

      if (phaseRef.current === 'play') {
        if (!pausedNow) {
          playClockRef.current += dt;
          story.t += dt;
          const player = playerRef.current;

          /* --- Cruce al comedor ----------------------------------- */
          if (story.phase === 'exit') {
            story.doorOpen = smooth01(story.t / 0.85);
            if (story.t < 1.05) {
              player.x += (DOOR_PARK_X - player.x) * Math.min(1, dt * 5);
              player.y += (DOOR_PARK_Y - player.y) * Math.min(1, dt * 5);
              player.facing = 'left';
              player.moving = true;
            } else {
              player.moving = false;
              player.x = DOOR_PARK_X;
              player.y = DOOR_PARK_Y;
            }
            if (story.t >= 2.05 && !story.exitStarted) {
              story.exitStarted = true;
              if (!leavingRef.current) {
                leavingRef.current = true;
                setLeaving(true);
                window.setTimeout(() => {
                  onEnterComedorRef.current?.();
                }, 420);
              }
            }
          }

          /* --- Movimiento ----------------------------------------- */
          if (!dialogueRef.current && !story.lock) {
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
            player.moving = false;
          }

          if (!story.lock && !dialogueRef.current) {
            const near = nearestBedroomInteractable(
              playerRef.current.x,
              playerRef.current.y
            );
            const nextNear = near ? near.item.id : null;
            if (nextNear !== nearRef.current) {
              nearRef.current = nextNear;
              setNearId(nextNear);
            }
          } else if (nearRef.current !== null) {
            nearRef.current = null;
            setNearId(null);
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

          // Cámara: objetivo narrativo o seguimiento del jugador.
          const cam = cameraRef.current;
          const target =
            story.camera ?? {
              x: playerRef.current.x,
              y: playerRef.current.y - 12,
              zoom: BEDROOM_PLAY_ZOOM,
            };
          const rate = story.camera ? 2.3 : 3.6;
          cam.x += (target.x - cam.x) * Math.min(1, dt * rate);
          cam.y += (target.y - cam.y) * Math.min(1, dt * rate);
          cam.zoom += (target.zoom - cam.zoom) * Math.min(1, dt * rate * 0.85);

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
      const blanketTop = phaseRef.current === 'cutscene' ? 132 + pose.upright * 40 : 176;
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
        doorOpen: story.doorOpen,
        knockJolt: 0,
        radioActive: radioActiveRef.current,
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
            palette: bedPalette,
            appearance: playerAppearance,
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

          // La pose sentada no se desplaza ni se deforma: se disuelve rápido
          // mientras el mismo Pixel salta desde el borde de la cama.
          const seatedAlpha = 1 - smooth01(Math.min(1, standK / 0.14));
          if (seatedAlpha > 0.002) {
            drawPixelOnBed(wctx, {
              ...pose,
              alpha: seatedAlpha,
              legsVisible: true,
              legsOut: 1,
              palette: bedPalette,
              appearance: playerAppearance,
            });
          }

          // Salto corto y natural: los pies bajan desde el colchón hasta el
          // suelo con un pequeño impulso. La escala del sprite no cambia.
          const hopK = Math.min(
            1,
            Math.max(0, (t - BEDROOM_TIMELINE.standStart) / 0.6)
          );
          const hopEase = hopK * hopK * (3 - 2 * hopK);
          const hopLift = Math.sin(Math.PI * hopK) * 4;
          const standFeetY = 207 + (STAND_FEET_Y - 207) * hopEase - hopLift;

          // Contraluz del relámpago, dibujado detrás del sprite real.
          if (t > 26.7 && t < 28.2) {
            const sil = Math.max(0, 1 - Math.abs(t - BEDROOM_TIMELINE.flashSilhouette) / 0.6);
            drawPixelSilhouette(
              wctx,
              STAND_X,
              STAND_FEET_Y,
              0.85 * sil * (0.4 + flash)
            );
          }

          wctx.save();
          wctx.globalAlpha = smooth01(Math.min(1, standK / 0.14));
          renderPixelVxAce4Dir(
            wctx,
            STAND_X,
            standFeetY,
            'left',
            false,
            false,
            worldTime,
            playerSkin,
            playerHair,
            playerShirt,
            { appearance: playerAppearance }
          );
          wctx.restore();
        }
      } else {
        drawBedroomBlanket(wctx, {
          time: worldTime,
          flash,
          curtainSway: 0,
          blanketTop: 176,
          blanketPull: 1,
        });

        const player = playerRef.current;
        renderPixelVxAce4Dir(
          wctx,
          player.x,
          player.y,
          player.facing,
          player.moving,
          false,
          player.anim,
          playerSkin,
          playerHair,
          playerShirt,
          { appearance: playerAppearance }
        );
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
  }, [bedPalette, openDialogue, playerAppearance, playerHair, playerShirt, playerSkin, startDoorExit]);

  const nearItem = useMemo(
    () => (nearId ? BEDROOM_INTERACTABLES.find((item) => item.id === nearId) ?? null : null),
    [nearId]
  );

  const promptAction =
    nearId === 'door' ? 'Abrir la puerta' : nearItem?.action;

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

  const isRadio = dialogue?.kind === 'radio';
  const dialogueSpeaker = dialogue?.speakers?.[dialogue.index] ?? dialogue?.title ?? '';

  return (
    <div className={`bedroom-stage ${isRadio ? 'is-radio' : ''}`} ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="bedroom-canvas"
        role="img"
        aria-label="Habitación de Pixel durante la tormenta"
      />

      <div className="bedroom-atmosphere" aria-hidden="true" />

      {leaving && <div className="comedor-fade-in pointer-events-none fixed inset-0 z-30 bg-[#020614]" aria-hidden="true" />}

      {isRadio && (
        <div className="bedroom-signal" aria-hidden="true">
          <span className="bedroom-signal__scan" />
          <span className="bedroom-signal__ticks" />
        </div>
      )}

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

      {phase === 'play' && !dialogue && !paused && !showHints && nearItem && promptAction && (
        <div className="bedroom-prompt" aria-live="polite">
          <span className="bedroom-key">E</span>
          <span>{promptAction}</span>
        </div>
      )}

      {dialogue && (
        <div
          className={`bedroom-dialogue bedroom-dialogue--${dialogue.kind}`}
          role="dialog"
          aria-live="polite"
        >
          <div className="bedroom-dialogue__head">
            <span className="bedroom-dialogue__name">{dialogueSpeaker}</span>
            {isRadio ? (
              <span className="bedroom-radio-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i />
              </span>
            ) : null}
            <span className="bedroom-dialogue__hint">
              {isRadio ? '87.7 MHz · SEÑAL DÉBIL' : 'HABITACIÓN DE PIXEL'}
            </span>
          </div>
          <p className="bedroom-dialogue__text" key={`${dialogue.title}-${dialogue.index}`}>
            <TypewriterText text={dialogue.lines[dialogue.index]} speed={isRadio ? 54 : 46} />
          </p>
          <div className="bedroom-dialogue__foot">
            <span>
              {dialogue.index < dialogue.lines.length - 1
                ? isRadio
                  ? 'E · Seguir escuchando'
                  : 'E · Continuar'
                : isRadio
                  ? 'E · Cortar la señal'
                  : 'E · Cerrar'}
            </span>
            <button type="button" className="bedroom-dialogue__next" onClick={interact}>
              {dialogue.index < dialogue.lines.length - 1
                ? isRadio
                  ? 'Seguir'
                  : 'Continuar'
                : isRadio
                  ? 'Cortar'
                  : 'Cerrar'}
            </button>
          </div>
        </div>
      )}

      {showHints && phase === 'play' && !paused && !dialogue && (
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
