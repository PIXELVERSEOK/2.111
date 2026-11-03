/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «La tormenta en el comedor»
 *
 * Segunda escena jugable del prólogo. Pixel cruza la puerta de su habitación y
 * entra al comedor de la casa mientras la tormenta arrecia. Aquí encuentra el
 * cofre del abuelo (cerrado, con una cerradura de tres discos) y su mochila.
 *
 * El enviado del futuro NO aparece dentro de la casa: la única salida es la
 * puerta principal, que lleva al exterior nocturno de Isla Natal.
 *
 * El comedor está dibujado por capas independientes (ver `comedor/comedorRoom`)
 * y Pixel se dibuja siempre con `renderPixelVxAce4Dir`, el mismo sprite, escala
 * y anclaje que en el resto de la aventura.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { bgmEngine } from '../audio/bgmEngine';
import { retroAudio } from '../audio/retroAudio';
import {
  renderPixelVxAce4Dir,
  type VxFacingDirection,
} from '../avatar/pixelVxAceSprite';
import type { AvatarAppearance } from '../avatar/avatarOptions';
import {
  COMEDOR_BACKPACK_LINES,
  COMEDOR_CHEST_CODE,
  COMEDOR_CHEST_LOCKED_LINES,
  COMEDOR_CHEST_LOCKED_TITLE,
  COMEDOR_CHEST_OBJECTIVE,
  COMEDOR_CHEST_OPEN_LINES,
  COMEDOR_CHEST_READY,
  COMEDOR_ENTRY_SPOT,
  COMEDOR_FLAGS,
  COMEDOR_H,
  COMEDOR_INTERACTABLES,
  COMEDOR_LEVER_OBJECTIVE,
  COMEDOR_MAIN_DOOR,
  COMEDOR_OBJECTIVE,
  COMEDOR_PLAY_SPEED,
  COMEDOR_PLAY_ZOOM,
  COMEDOR_RETURN_SPOT,
  COMEDOR_STORM_LINE_1,
  COMEDOR_STORM_LINE_2,
  COMEDOR_W,
  comedorFlashEnvelope,
  isComedorWalkable,
  nearestComedorInteractable,
  nextComedorStrike,
  smooth01,
  type ComedorInteractable,
} from './comedor/comedorData';
import {
  drawComedorBase,
  drawComedorLighting,
  drawComedorProps,
  type ComedorRoomState,
} from './comedor/comedorRoom';
import { bedroomStormAudio } from './bedroom/bedroomStormAudio';
import { ISLA_NATAL_FLAGS } from '../island/islaNatalData';

export interface ComedorStageProps {
  skinColor?: string;
  hairColor?: string;
  shirtColor?: string;
  appearance?: AvatarAppearance;
  narrativeEvents: string[];
  onRecordNarrativeEvent: (eventId: string) => void;
  onGrantInventoryItems: (itemIds: string[]) => void;
  /** Regresa desde el exterior nocturno de Isla Natal. */
  arriveFromExterior?: boolean;
  /** Cruza la puerta principal hacia Isla Natal. */
  onExitToIslaNatal: () => void;
  onExitToTitle: () => void;
}

const PIXEL_APPEARANCE: AvatarAppearance = {
  bootColor: '#262b38',
  outfitId: 'classic',
  accessories: [],
  transformationId: null,
  hairStyleId: 'hero',
};

type StoryPhase = 'free' | 'storm' | 'exit';

interface StoryRuntime {
  phase: StoryPhase;
  t: number;
  lock: boolean;
  camera: { x: number; y: number; zoom: number } | null;
  doorOpen: number;
  exitStarted: boolean;
  stormStep: number;
  introWalk: number;
}

interface ComedorDialogue {
  title: string;
  speaker: string;
  hint?: string;
  lines: string[];
  index: number;
  tone: 'object' | 'pixel' | 'storm';
  after?: () => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  t: number;
  life: number;
  color: string;
  radius: number;
}

function TypewriterText({
  text,
  speed = 44,
  revealAll = false,
}: {
  text: string;
  speed?: number;
  revealAll?: boolean;
}) {
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

  // E/Espacio completan la frase en curso sin esperar al efecto de tipeo.
  useEffect(() => {
    if (revealAll) setCount(text.length);
  }, [revealAll, text]);

  const shown = revealAll ? text.length : count;
  return (
    <span>
      {text.slice(0, shown)}
      {shown < text.length && <span className="bedroom-caret" aria-hidden="true" />}
    </span>
  );
}

export function ComedorStage({
  skinColor,
  hairColor,
  shirtColor,
  appearance,
  narrativeEvents,
  onRecordNarrativeEvent,
  onGrantInventoryItems,
  arriveFromExterior = false,
  onExitToIslaNatal,
  onExitToTitle,
}: ComedorStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerSkin = skinColor || '#f2c49c';
  const playerHair = hairColor || '#331100';
  const playerShirt = shirtColor || '#00f3ff';
  const playerAppearance = appearance ?? PIXEL_APPEARANCE;

  const [localFlags, setLocalFlags] = useState<string[]>([]);
  const flagSet = useMemo(
    () => new Set([...narrativeEvents, ...localFlags]),
    [narrativeEvents, localFlags]
  );
  const introSeen = flagSet.has(COMEDOR_FLAGS.introSeen);
  const chestOpened =
    flagSet.has(COMEDOR_FLAGS.chestOpened) ||
    flagSet.has(COMEDOR_FLAGS.grandfatherChestOpened);
  const backpackTaken = flagSet.has(COMEDOR_FLAGS.backpack);
  const codeKnown = flagSet.has(COMEDOR_FLAGS.codeKnown);
  const introSeenRef = useRef(introSeen);
  introSeenRef.current = introSeen;
  const chestOpenedRef = useRef(chestOpened);
  chestOpenedRef.current = chestOpened;
  const backpackTakenRef = useRef(backpackTaken);
  backpackTakenRef.current = backpackTaken;
  const codeKnownRef = useRef(codeKnown);
  codeKnownRef.current = codeKnown;
  // Después de disiparse la tormenta en Isla Natal, el comedor muestra el día.
  const daylight = flagSet.has(ISLA_NATAL_FLAGS.stormCleared);
  const daylightRef = useRef(daylight);
  daylightRef.current = daylight;

  const markFlag = useCallback((id: string) => {
    setLocalFlags((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onRecordNarrativeEvent(id);
  }, [onRecordNarrativeEvent]);
  const markFlagRef = useRef(markFlag);
  markFlagRef.current = markFlag;
  const grantItemsRef = useRef(onGrantInventoryItems);
  grantItemsRef.current = onGrantInventoryItems;
  const exitToIslandRef = useRef(onExitToIslaNatal);
  exitToIslandRef.current = onExitToIslaNatal;
  const exitToTitleRef = useRef(onExitToTitle);
  exitToTitleRef.current = onExitToTitle;

  const [phase, setPhase] = useState<'free' | 'storm' | 'exit'>('free');
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => bgmEngine.isMuted());
  const [nearId, setNearId] = useState<string | null>(null);
  const nearRef = useRef<string | null>(null);
  const [dialogue, setDialogue] = useState<ComedorDialogue | null>(null);
  const dialogueRef = useRef<ComedorDialogue | null>(null);
  // Primera pulsación de E/Espacio completa la frase; la siguiente avanza.
  const [dialogueRevealed, setDialogueRevealed] = useState(false);
  const dialogueRevealedRef = useRef(false);
  dialogueRevealedRef.current = dialogueRevealed;
  const [codeOpen, setCodeOpen] = useState(false);
  const codeOpenRef = useRef(false);
  codeOpenRef.current = codeOpen;
  const [digits, setDigits] = useState<string[]>(['', '', '']);
  const [codeError, setCodeError] = useState(false);
  const slotRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [showHints, setShowHints] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [arriveFade, setArriveFade] = useState(true);
  const [objective, setObjective] = useState<string | null>(() => {
    if (!introSeen) return null;
    if (chestOpened) return COMEDOR_LEVER_OBJECTIVE;
    if (codeKnown) return COMEDOR_CHEST_OBJECTIVE;
    return COMEDOR_OBJECTIVE;
  });
  const [chestOpenedLocal, setChestOpenedLocal] = useState(chestOpened);
  const [backpackTakenLocal, setBackpackTakenLocal] = useState(backpackTaken);

  const playerRef = useRef({
    x: arriveFromExterior ? COMEDOR_RETURN_SPOT.x : COMEDOR_ENTRY_SPOT.x,
    y: arriveFromExterior ? COMEDOR_RETURN_SPOT.y : COMEDOR_ENTRY_SPOT.y,
    facing: (arriveFromExterior ? 'left' : 'right') as VxFacingDirection,
    moving: false,
    anim: 0,
  });
  const cameraRef = useRef({
    x: arriveFromExterior ? COMEDOR_MAIN_DOOR.standX : COMEDOR_ENTRY_SPOT.x,
    y: (arriveFromExterior ? COMEDOR_RETURN_SPOT.y : COMEDOR_ENTRY_SPOT.y) - 12,
    zoom: arriveFromExterior ? 1.36 : 1.3,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const storyRef = useRef<StoryRuntime>({
    phase: 'free',
    t: 0,
    lock: true,
    camera: null,
    doorOpen: 0,
    exitStarted: false,
    stormStep: 0,
    introWalk: arriveFromExterior ? 0 : 0.55,
  });
  const leavingRef = useRef(false);
  const chestOpenRef = useRef(chestOpened ? 1 : 0);
  const clockRef = useRef(0);
  const roomTimeRef = useRef(0);
  const strikeRef = useRef<{ at: number; power: number } | null>(null);
  const nextStrikeRef = useRef(11 + Math.random() * 8);
  const stepTimerRef = useRef(0);
  const stormTimerRef = useRef<number | null>(null);
  const hintsTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const sparksRef = useRef<Spark[]>([]);
  const ringsRef = useRef<Ring[]>([]);

  const openDialogue = useCallback((next: ComedorDialogue | null) => {
    dialogueRef.current = next;
    dialogueRevealedRef.current = false;
    setDialogueRevealed(false);
    setDialogue(next);
  }, []);

  const emitSparkles = useCallback((x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 12 + Math.random() * 42;
      const life = 0.6 + Math.random() * 0.9;
      sparksRef.current.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s * 0.6 - 22,
        life,
        maxLife: life,
        color,
        size: Math.random() < 0.4 ? 2 : 1,
      });
    }
    if (sparksRef.current.length > 260) {
      sparksRef.current.splice(0, sparksRef.current.length - 260);
    }
  }, []);

  const pushRing = useCallback((x: number, y: number, color: string, life = 0.8) => {
    ringsRef.current.push({ x, y, t: 0, life, color, radius: 26 });
  }, []);

  /* -------------------------------------------------------------- */
  /* HISTORIA                                                        */
  /* -------------------------------------------------------------- */

  const beginStormSequence = useCallback(() => {
    const story = storyRef.current;
    if (story.phase !== 'free' || introSeenRef.current) return;
    if (dialogueRef.current || codeOpenRef.current) return;
    story.phase = 'storm';
    story.t = 0;
    story.lock = true;
    story.stormStep = 1;
    story.camera = { x: 246, y: 118, zoom: 1.38 };
    keysRef.current.clear();
    const player = playerRef.current;
    player.moving = false;
    player.facing = 'up';
    nearRef.current = null;
    setNearId(null);
    setPhase('storm');
    strikeRef.current = { at: clockRef.current, power: 1 };
    bedroomStormAudio.crack(0.9);
    bedroomStormAudio.thunder(1, 0.04);
    window.dispatchEvent(new CustomEvent('pixelverse-shake'));
    openDialogue({
      title: 'El comedor',
      speaker: 'PIXEL',
      hint: 'EL COMEDOR · LA TORMENTA',
      lines: [COMEDOR_STORM_LINE_1],
      index: 0,
      tone: 'storm',
    });
  }, [openDialogue]);
  const beginStormRef = useRef(beginStormSequence);
  beginStormRef.current = beginStormSequence;

  const finishStormSequence = useCallback(() => {
    const story = storyRef.current;
    story.phase = 'free';
    story.t = 0;
    story.lock = false;
    story.camera = null;
    setPhase('free');
    markFlagRef.current(COMEDOR_FLAGS.introSeen);
    setObjective(
      chestOpenedRef.current
        ? COMEDOR_LEVER_OBJECTIVE
        : codeKnownRef.current
          ? COMEDOR_CHEST_OBJECTIVE
          : COMEDOR_OBJECTIVE
    );
  }, []);

  const closeStormLine = useCallback((step: number) => {
    const story = storyRef.current;
    if (step === 1) {
      story.stormStep = 2;
      if (stormTimerRef.current !== null) window.clearTimeout(stormTimerRef.current);
      stormTimerRef.current = window.setTimeout(() => {
        stormTimerRef.current = null;
        if (!mountedRef.current) return;
        if (storyRef.current.phase !== 'storm') return;
        strikeRef.current = { at: clockRef.current, power: 0.62 };
        bedroomStormAudio.thunder(0.56, 0);
        openDialogue({
          title: 'El comedor',
          speaker: 'PIXEL',
          hint: 'EL COMEDOR · UN TRUENO LEJANO',
          lines: [COMEDOR_STORM_LINE_2],
          index: 0,
          tone: 'storm',
        });
      }, 1700);
      return;
    }
    finishStormSequence();
  }, [finishStormSequence, openDialogue]);

  const startDoorExit = useCallback(() => {
    const story = storyRef.current;
    if (story.phase !== 'free' || leavingRef.current) return;
    story.phase = 'exit';
    story.t = 0;
    story.lock = true;
    story.exitStarted = false;
    story.camera = { x: 414, y: 248, zoom: 1.42 };
    keysRef.current.clear();
    playerRef.current.moving = false;
    nearRef.current = null;
    setNearId(null);
    setPhase('exit');
    bedroomStormAudio.doorCreak();
  }, []);
  const startDoorExitRef = useRef(startDoorExit);
  startDoorExitRef.current = startDoorExit;

  const openChest = useCallback(() => {
    if (chestOpenedRef.current) {
      openDialogue({
        title: 'El cofre del abuelo',
        speaker: 'PIXEL',
        hint: 'EL COMEDOR · COFRE ABIERTO',
        lines: [
          'La tapa quedó abierta. La palanca, la lámpara, la carta y la fotografía ya viajan conmigo.',
          'El cofre del abuelo ya cumplió su parte.',
        ],
        index: 0,
        tone: 'object',
      });
      bedroomStormAudio.tick();
      return;
    }
    if (!codeKnownRef.current) {
      openDialogue({
        title: COMEDOR_CHEST_LOCKED_TITLE,
        speaker: 'PIXEL',
        hint: 'EL COMEDOR · TRES DISCOS',
        lines: COMEDOR_CHEST_LOCKED_LINES,
        index: 0,
        tone: 'object',
      });
      bedroomStormAudio.tick();
      return;
    }
    setDigits(['', '', '']);
    setCodeError(false);
    setCodeOpen(true);
    bedroomStormAudio.tick();
  }, [openDialogue]);

  const submitCode = useCallback(() => {
    const value = digits.join('');
    if (value !== COMEDOR_CHEST_CODE) {
      setCodeError(true);
      bedroomStormAudio.creak(0.42);
      return;
    }
    setCodeOpen(false);
    setCodeError(false);
    setDigits(['', '', '']);
    setChestOpenedLocal(true);
    chestOpenedRef.current = true;
    markFlagRef.current(COMEDOR_FLAGS.chestOpened);
    // El cofre del comedor es ahora el cofre canónico del abuelo: marca la
    // misma bandera que usaba la cabaña antigua y entrega sus recompensas.
    markFlagRef.current(COMEDOR_FLAGS.grandfatherChestOpened);
    grantItemsRef.current([
      'item-palanca-pong',
      'item-carta-abuelo',
      'item-foto-abuelo',
      'item-lampara-fosforo',
    ]);
    setObjective(COMEDOR_LEVER_OBJECTIVE);
    chestOpenRef.current = 0.001;
    retroAudio.chestOpen();
    pushRing(96, 158, '#ffe7a8', 1.1);
    emitSparkles(96, 156, 34, '#ffe7a8');
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      openDialogue({
        title: 'El cofre del abuelo',
        speaker: 'PIXEL',
        hint: 'EL COMEDOR · CERRADURA ABIERTA',
        lines: COMEDOR_CHEST_OPEN_LINES,
        index: 0,
        tone: 'object',
      });
    }, 700);
  }, [digits, emitSparkles, openDialogue, pushRing]);

  const interact = useCallback(() => {
    if (pausedRef.current || leavingRef.current) return;
    if (codeOpenRef.current) return;
    const current = dialogueRef.current;
    if (current) {
      if (current.index < current.lines.length - 1) {
        openDialogue({ ...current, index: current.index + 1 });
        bedroomStormAudio.tick();
        return;
      }
      openDialogue(null);
      bedroomStormAudio.tick();
      if (current.tone === 'storm') {
        closeStormLine(storyRef.current.stormStep);
        return;
      }
      current.after?.();
      return;
    }
    if (storyRef.current.phase !== 'free') return;
    if (!nearRef.current) return;
    const item = COMEDOR_INTERACTABLES.find((entry) => entry.id === nearRef.current);
    if (!item) return;

    if (item.id === 'backpack') {
      if (backpackTakenRef.current) {
        openDialogue({
          title: 'La mochila',
          speaker: 'PIXEL',
          hint: 'EL COMEDOR · EQUIPO LISTO',
          lines: ['La mochila ya está al hombro. Todo lo necesario viaja conmigo.'],
          index: 0,
          tone: 'object',
        });
        bedroomStormAudio.tick();
        return;
      }
      openDialogue({
        title: 'La mochila del abuelo',
        speaker: 'PIXEL',
        hint: 'EL COMEDOR · LA MOCHILA',
        lines: COMEDOR_BACKPACK_LINES,
        index: 0,
        tone: 'object',
        after: () => {
          setBackpackTakenLocal(true);
          backpackTakenRef.current = true;
          markFlagRef.current(COMEDOR_FLAGS.backpack);
          grantItemsRef.current(['item-mochila-explorador', 'item-bitacora-cero']);
          pushRing(138, 168, '#f5d9a0', 0.9);
          emitSparkles(138, 164, 30, '#f5d9a0');
          bedroomStormAudio.cloth();
          retroAudio.achievementUnlock();
        },
      });
      bedroomStormAudio.tick();
      return;
    }

    if (item.id === 'chest') {
      openChest();
      return;
    }

    if (item.id === 'cardoor') {
      if (!introSeenRef.current) {
        beginStormRef.current();
        return;
      }
      startDoorExitRef.current();
      return;
    }

    openDialogue({
      title: item.label,
      speaker: item.label.toUpperCase(),
      hint: 'EL COMEDOR · CASA DE PIXEL',
      lines: item.lines,
      index: 0,
      tone: 'object',
    });
    bedroomStormAudio.tick();
  }, [closeStormLine, emitSparkles, openChest, openDialogue, pushRing]);
  const interactRef = useRef(interact);
  interactRef.current = interact;

  // E/Espacio: completa el texto visible y, en la siguiente pulsación, avanza.
  const advanceDialogueRef = useRef<() => void>(() => {});
  advanceDialogueRef.current = () => {
    if (dialogueRef.current && !dialogueRevealedRef.current) {
      dialogueRevealedRef.current = true;
      setDialogueRevealed(true);
      bedroomStormAudio.tick();
      return;
    }
    interactRef.current();
  };

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

  /* -------------------------------------------------------------- */
  /* AUDIO                                                           */
  /* -------------------------------------------------------------- */
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
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
      unsubscribe();
      bedroomStormAudio.stop();
      bgmEngine.setDuckFactor(1);
    };
  }, []);

  /* -------------------------------------------------------------- */
  /* ENTRADA Y FUNDIDOS                                              */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const fade = window.setTimeout(() => setArriveFade(false), 1100);
    if (hintsTimerRef.current !== null) window.clearTimeout(hintsTimerRef.current);
    hintsTimerRef.current = window.setTimeout(() => setShowHints(false), 6000);
    return () => {
      window.clearTimeout(fade);
      if (hintsTimerRef.current !== null) window.clearTimeout(hintsTimerRef.current);
      if (stormTimerRef.current !== null) {
        window.clearTimeout(stormTimerRef.current);
        stormTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!introSeen) return;
    if (chestOpened) {
      setObjective(COMEDOR_LEVER_OBJECTIVE);
      return;
    }
    setObjective(codeKnown ? COMEDOR_CHEST_OBJECTIVE : COMEDOR_OBJECTIVE);
  }, [chestOpened, codeKnown, introSeen]);

  useEffect(() => {
    if (!codeOpen) return;
    const t = window.setTimeout(() => slotRefs.current[0]?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [codeOpen]);

  /* -------------------------------------------------------------- */
  /* TECLADO                                                         */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const isEditable = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        event.preventDefault();
        if (codeOpenRef.current) {
          setCodeOpen(false);
          setCodeError(false);
          return;
        }
        togglePauseRef.current();
        return;
      }
      if (isEditable(event.target)) return;
      if (pausedRef.current) return;
      if (codeOpenRef.current) return;
      if (key === 'e' || key === 'enter' || key === ' ') {
        event.preventDefault();
        advanceDialogueRef.current();
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

  /* -------------------------------------------------------------- */
  /* LIENZO                                                          */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const world = document.createElement('canvas');
    world.width = COMEDOR_W;
    world.height = COMEDOR_H;
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

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.max(0.001, Math.min(0.05, (now - lastNow) / 1000));
      lastNow = now;
      const pausedNow = pausedRef.current;

      const story = storyRef.current;
      const player = playerRef.current;

      if (!pausedNow) {
        clockRef.current += dt;
        roomTimeRef.current += dt;
        if (story.phase === 'free') {
          story.t += dt;
          if (story.introWalk > 0) {
            story.introWalk = Math.max(0, story.introWalk - dt);
            player.x = Math.min(COMEDOR_ENTRY_SPOT.x + 34, player.x + COMEDOR_PLAY_SPEED * dt * 0.7);
            player.facing = 'right';
            player.moving = true;
            player.anim += dt;
          }
        } else {
          story.t += dt;
        }
      }

      /* --- Secuencia de la tormenta ------------------------------ */
      if (
        !pausedNow &&
        story.phase === 'free' &&
        !introSeenRef.current &&
        story.introWalk <= 0 &&
        roomTimeRef.current > 6.4 &&
        !dialogueRef.current &&
        !codeOpenRef.current
      ) {
        beginStormRef.current();
      }

      /* --- Cruce hacia el exterior ------------------------------- */
      if (story.phase === 'exit') {
        story.doorOpen = smooth01(story.t / 0.8);
        if (story.t < 1.0) {
          const dx = COMEDOR_MAIN_DOOR.standX - player.x;
          const dy = COMEDOR_MAIN_DOOR.standY - player.y;
          const len = Math.hypot(dx, dy);
          if (len > 2) {
            const step = Math.min(len, COMEDOR_PLAY_SPEED * dt);
            player.x += (dx / len) * step;
            player.y += (dy / len) * step;
            player.facing = dx >= 0 ? 'right' : 'left';
            player.moving = true;
            player.anim += dt;
          } else {
            player.moving = false;
            player.facing = 'right';
          }
        } else {
          player.moving = false;
          player.facing = 'right';
        }
        if (story.t >= 2.1 && !story.exitStarted) {
          story.exitStarted = true;
          if (!leavingRef.current) {
            leavingRef.current = true;
            setLeaving(true);
            window.setTimeout(() => {
              exitToIslandRef.current();
            }, 520);
          }
        }
      }

      /* --- Movimiento libre -------------------------------------- */
      if (
        !pausedNow &&
        story.phase === 'free' &&
        story.introWalk <= 0 &&
        !dialogueRef.current &&
        !codeOpenRef.current
      ) {
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
          const stepX = dx * COMEDOR_PLAY_SPEED * dt;
          const stepY = dy * COMEDOR_PLAY_SPEED * dt;
          if (isComedorWalkable(player.x + stepX, player.y)) player.x += stepX;
          if (isComedorWalkable(player.x, player.y + stepY)) player.y += stepY;
          if (Math.abs(dx) > Math.abs(dy)) {
            player.facing = dx > 0 ? 'right' : 'left';
          } else if (dy !== 0) {
            player.facing = dy > 0 ? 'down' : 'up';
          }
          player.anim += dt;
          stepTimerRef.current += dt;
          if (stepTimerRef.current > 0.34) {
            stepTimerRef.current = 0;
            bedroomStormAudio.footstep(0.32);
          }
        } else {
          stepTimerRef.current = 0.34;
        }
        player.moving = moving;
      } else if (story.phase !== 'exit') {
        player.moving = false;
      }

      /* --- Objetivo cercano -------------------------------------- */
      if (
        story.phase === 'free' &&
        story.introWalk <= 0 &&
        !dialogueRef.current &&
        !codeOpenRef.current
      ) {
        const near = nearestComedorInteractable(player.x, player.y);
        const next: string | null = near ? near.item.id : null;
        if (next !== nearRef.current) {
          nearRef.current = next;
          setNearId(next);
        }
      } else if (nearRef.current !== null) {
        nearRef.current = null;
        setNearId(null);
      }

      /* --- Relámpagos de fondo ----------------------------------- */
      if (!pausedNow && !daylightRef.current && story.phase !== 'exit' && clockRef.current > nextStrikeRef.current) {
        const power = 0.42 + Math.random() * 0.44;
        strikeRef.current = { at: clockRef.current, power };
        nextStrikeRef.current = nextComedorStrike(clockRef.current);
        bedroomStormAudio.crack(0.3 * power);
        bedroomStormAudio.thunder(power * 0.8, 0.1);
      }
      let flash = 0;
      if (strikeRef.current) {
        flash = comedorFlashEnvelope(clockRef.current - strikeRef.current.at) * strikeRef.current.power;
      }

      // Apertura de la tapa del cofre.
      if (chestOpenRef.current > 0 && chestOpenRef.current < 1) {
        chestOpenRef.current = Math.min(1, chestOpenRef.current + dt * 0.9);
      }

      // Partículas de recogida.
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 34 * dt;
        s.vx *= 1 - 1.4 * dt;
      }
      for (let i = ringsRef.current.length - 1; i >= 0; i -= 1) {
        ringsRef.current[i].t += dt;
        if (ringsRef.current[i].t >= ringsRef.current[i].life) ringsRef.current.splice(i, 1);
      }

      // Cámara: objetivo narrativo o seguimiento.
      const cam = cameraRef.current;
      const target = story.camera ?? {
        x: player.x,
        y: player.y - 14,
        zoom: COMEDOR_PLAY_ZOOM,
      };
      const rate = story.camera ? 2.4 : 3.8;
      cam.x += (target.x - cam.x) * Math.min(1, dt * rate);
      cam.y += (target.y - cam.y) * Math.min(1, dt * rate);
      cam.zoom += (target.zoom - cam.zoom) * Math.min(1, dt * rate * 0.8);

      const worldTime = clockRef.current;

      /* --- Dibujo del mundo -------------------------------------- */
      const roomState: ComedorRoomState = {
        time: worldTime,
        flash,
        curtainSway:
          Math.sin(worldTime * 0.72) * 0.6 + Math.sin(worldTime * 1.9 + 1.2) * 0.34,
        mainDoorOpen: story.doorOpen,
        chestOpen: chestOpenRef.current,
        vibrate: flash * 0.9 + Math.sin(worldTime * 17) * 0.06 * flash,
        backpackTaken: backpackTakenRef.current || backpackTakenLocal,
        chestOpened: chestOpenedRef.current || chestOpenedLocal,
        daylight: daylightRef.current,
      };

      wctx.clearRect(0, 0, COMEDOR_W, COMEDOR_H);
      drawComedorBase(wctx, roomState);
      drawComedorProps(wctx, roomState, player, () => {
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
      });
      drawComedorLighting(wctx, roomState);

      // Efectos de recogida y apertura.
      for (const s of sparks) {
        const a = Math.max(0, Math.min(1, s.life / s.maxLife));
        wctx.globalAlpha = a;
        wctx.fillStyle = s.color;
        wctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }
      wctx.globalAlpha = 1;
      for (const ring of ringsRef.current) {
        const k = ring.t / ring.life;
        wctx.save();
        wctx.globalAlpha = 1 - k;
        wctx.strokeStyle = ring.color;
        wctx.lineWidth = 1.5;
        wctx.beginPath();
        wctx.ellipse(ring.x, ring.y, ring.radius * (0.3 + k * 1.5), ring.radius * (0.22 + k * 0.9), 0, 0, Math.PI * 2);
        wctx.stroke();
        wctx.restore();
      }

      /* --- Composición en pantalla ------------------------------- */
      const cover = Math.max(cssW / COMEDOR_W, cssH / COMEDOR_H);
      const scale = cover * cam.zoom;
      const srcW = cssW / scale;
      const srcH = cssH / scale;
      let sx = cam.x - srcW / 2;
      let sy = cam.y - srcH / 2;
      sx = Math.max(0, Math.min(COMEDOR_W - srcW, sx));
      sy = Math.max(0, Math.min(COMEDOR_H - srcH, sy));
      const shakePower = Math.max(0, flash - 0.3) * 3;
      if (shakePower > 0.01) {
        sx += Math.sin(worldTime * 71) * shakePower;
        sy += Math.cos(worldTime * 53) * shakePower * 0.8;
      }
      const sourceSx = Math.max(0, Math.min(COMEDOR_W - srcW, sx));
      const sourceSy = Math.max(0, Math.min(COMEDOR_H - srcH, sy));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.drawImage(world, sourceSx, sourceSy, srcW, srcH, 0, 0, cssW, cssH);

      // Destello de tormenta sobre el cristal.
      if (flash > 0.01) {
        const winX = ((246 - sourceSx) / srcW) * cssW;
        const winY = ((54 - sourceSy) / srcH) * cssH;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const glow = ctx.createRadialGradient(winX, winY, 6, winX, winY, Math.max(cssW, cssH) * 0.9);
        glow.addColorStop(0, `rgba(198,224,255,${0.26 * flash})`);
        glow.addColorStop(0.45, `rgba(106,148,214,${0.12 * flash})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.restore();
        ctx.fillStyle = `rgba(222,236,255,${0.08 * flash})`;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      const vignette = ctx.createRadialGradient(
        cssW / 2,
        cssH / 2,
        Math.min(cssW, cssH) * 0.34,
        cssW / 2,
        cssH / 2,
        Math.max(cssW, cssH) * 0.74
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.72, 'rgba(3,6,12,0.18)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.58)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let y = 0; y < cssH; y += 3) {
        ctx.fillRect(0, y, cssW, 1);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [
    backpackTakenLocal,
    chestOpenedLocal,
    playerAppearance,
    playerHair,
    playerShirt,
    playerSkin,
  ]);

  /* -------------------------------------------------------------- */
  /* DERIVADOS DE INTERFAZ                                           */
  /* -------------------------------------------------------------- */
  const nearItem = useMemo<ComedorInteractable | null>(
    () => (nearId ? COMEDOR_INTERACTABLES.find((item) => item.id === nearId) ?? null : null),
    [nearId]
  );

  const promptLabel = useMemo(() => {
    if (!nearItem) return null;
    if (nearItem.id === 'cardoor') return 'Abrir la puerta';
    if (nearItem.id === 'backpack') {
      return backpackTaken || backpackTakenLocal ? 'Revisar la mochila' : 'Recoger la mochila';
    }
    if (nearItem.id === 'chest') {
      if (chestOpened || chestOpenedLocal) return 'Revisar el cofre';
      return codeKnown ? 'Abrir el cofre' : 'Examinar el cofre';
    }
    return nearItem.action;
  }, [backpackTaken, backpackTakenLocal, chestOpened, chestOpenedLocal, codeKnown, nearItem]);

  const dialogueTone = dialogue?.tone ?? 'object';
  const chestOpening = chestOpened || chestOpenedLocal;

  const onDigitChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, '');
    setCodeError(false);
    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < 3; i += 1) next[i] = clean[i] ?? '';
      setDigits(next);
      slotRefs.current[2]?.focus();
      return;
    }
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean.slice(-1);
      return next;
    });
    if (clean) slotRefs.current[Math.min(2, index + 1)]?.focus();
  };

  return (
    <div className="bedroom-stage" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="bedroom-canvas"
        role="img"
        aria-label="Comedor de la casa de Pixel durante la tormenta"
      />
      <div className="bedroom-atmosphere" aria-hidden="true" />

      {arriveFade && (
        <div className="comedor-fade-out pointer-events-none fixed inset-0 z-30 bg-[#020614]" aria-hidden="true" />
      )}
      {leaving && (
        <div className="comedor-fade-in pointer-events-none fixed inset-0 z-30 bg-[#020614]" aria-hidden="true" />
      )}

      <div className="bedroom-tag" style={{ opacity: 1 }} aria-hidden="true">
        <span className="bedroom-tag__index">PRÓLOGO</span>
        <span className="bedroom-tag__rule" />
        <span className="bedroom-tag__label">EL COMEDOR</span>
      </div>

      {objective && !dialogue && !codeOpen && !paused && (
        <div className={`bedroom-objective ${codeKnown && !chestOpening ? 'is-chest' : ''}`} aria-live="polite">
          <span className="bedroom-objective__eyebrow">OBJETIVO</span>
          <p className="bedroom-objective__text">{objective}</p>
        </div>
      )}

      {promptLabel && !dialogue && !codeOpen && !paused && phase === 'free' && (
        <div className="bedroom-prompt" aria-live="polite">
          <span className="bedroom-key">E</span>
          <span>{promptLabel}</span>
        </div>
      )}

      {showHints && phase === 'free' && !paused && !dialogue && !codeOpen && (
        <div className="bedroom-hint" aria-live="polite">
          <span><b>WASD</b> / Flechas · Moverse</span>
          <span><b>E</b> · Interactuar</span>
          <span><b>ESC</b> · Menú</span>
        </div>
      )}

      {codeKnown && !chestOpening && !objective && !dialogue && !codeOpen && (
        <div className="bedroom-hint" aria-live="polite">
          <span>{COMEDOR_CHEST_READY}</span>
        </div>
      )}

      {dialogue && (
        <div
          className={`bedroom-dialogue bedroom-dialogue--${dialogueTone}`}
          role="dialog"
          aria-live="polite"
        >
          <div className="bedroom-dialogue__head">
            <span className="bedroom-dialogue__name">{dialogue.speaker}</span>
            <span className="bedroom-dialogue__hint">{dialogue.hint ?? 'EL COMEDOR · CASA DE PIXEL'}</span>
          </div>
          <p className="bedroom-dialogue__text" key={`${dialogue.title}-${dialogue.index}`}>
            <TypewriterText
              text={dialogue.lines[dialogue.index]}
              speed={dialogue.tone === 'storm' ? 52 : 44}
              revealAll={dialogueRevealed}
            />
          </p>
          <div className="bedroom-dialogue__foot">
            <span>
              {dialogue.index < dialogue.lines.length - 1
                ? 'E / ESPACIO · Continuar'
                : 'E / ESPACIO · Cerrar'}
            </span>
            <button
              type="button"
              className="bedroom-dialogue__next"
              onClick={interact}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {dialogue.index < dialogue.lines.length - 1 ? 'Continuar' : 'Cerrar'}
            </button>
          </div>
        </div>
      )}

      {codeOpen && (
        <div className="comedor-lock-backdrop" role="dialog" aria-modal="true" aria-label="Cerradura del cofre">
          <div className="comedor-lock">
            <p className="comedor-lock__eyebrow">CERRAJURA DE TRES DISCOS</p>
            <h2 className="comedor-lock__title">El cofre del abuelo</h2>
            <p className="comedor-lock__sub">
              Tres discos numerados esperan la combinación. No hay margen para el error.
            </p>
            <div className={`comedor-lock__slots ${codeError ? 'is-error' : ''}`}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    slotRefs.current[index] = el;
                  }}
                  className="comedor-lock__slot"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  value={digit}
                  aria-label={`Cifra ${index + 1}`}
                  onChange={(event) => onDigitChange(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && !digits[index] && index > 0) {
                      slotRefs.current[index - 1]?.focus();
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitCode();
                    }
                  }}
                />
              ))}
            </div>
            {codeError && (
              <p className="comedor-lock__error" aria-live="assertive">
                La combinación no cede.
              </p>
            )}
            <div className="comedor-lock__actions">
              <button
                type="button"
                className="comedor-lock__btn"
                onClick={() => {
                  setCodeOpen(false);
                  setCodeError(false);
                  setDigits(['', '', '']);
                  bedroomStormAudio.tick();
                }}
              >
                Cancelar
              </button>
              <button type="button" className="comedor-lock__btn is-primary" onClick={submitCode}>
                Abrir cofre
              </button>
            </div>
            <p className="comedor-lock__foot">Tres cifras · intro para probar</p>
          </div>
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
            <p className="bedroom-pause__sub">La lluvia golpea los cristales del comedor.</p>
            <div className="bedroom-pause__actions">
              <button type="button" className="bedroom-pause__btn is-primary" onClick={togglePause}>
                Reanudar
              </button>
              <button
                type="button"
                className="bedroom-pause__btn"
                onClick={() => {
                  bedroomStormAudio.stop();
                  exitToTitleRef.current();
                }}
              >
                Menú principal
              </button>
            </div>
            <p className="bedroom-pause__foot">Esc · reanudar</p>
          </div>
        </div>
      )}
    </div>
  );
}
