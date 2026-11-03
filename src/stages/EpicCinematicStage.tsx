/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cinemática de apertura de PIXELVERSE: «El reinicio del universo».
 *
 * Siete escenas ilustradas y animadas (época dorada, antagonista, botón
 * rojo, destrucción, universo alterado, habitación de Pixel y transición)
 * con cámara, capas de ambiente, subtítulos escritos y sonido sincronizado.
 *
 * El lienzo 4:3 se ocupa de la imagen. Esta capa React sólo añade el rótulo
 * de escena, los subtítulos y los controles discretos. Al terminar se entrega
 * el control al menú (o a la llegada a Isla Natal en el segundo acto), sin
 * alterar la creación de personaje ni el flujo de inicio existente.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { bgmEngine } from '../audio/bgmEngine';
import { retroAudio } from '../audio/retroAudio';
import { cinematicRebootAudio } from './cinematicRebootAudio';
import {
  CINEMATIC_IMAGE_DURATION_SEC,
  CINEMATIC_IMAGE_SCENES,
  getActiveImageBeatAtTime,
  getImageSceneAt,
} from './cinematicImageTimeline';
import { createCinematicImageWorld } from './cinematicImageWorld';

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function ramp01(value: number): number {
  const c = clamp01(value);
  return c * c * (3 - 2 * c);
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export interface EpicCinematicStageProps {
  runKey: number;
  onComplete: () => void;
  /** Segundo del metraje en el que arranca esta reproducción. */
  startAtSec?: number;
  /** Segundo del metraje en el que termina esta reproducción. */
  endAtSec?: number;
}

export function EpicCinematicStage({
  runKey,
  onComplete,
  startAtSec = 0,
  endAtSec = CINEMATIC_IMAGE_DURATION_SEC,
}: EpicCinematicStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const segmentStartRef = useRef(startAtSec);
  const segmentEndRef = useRef(endAtSec);
  segmentStartRef.current = startAtSec;
  segmentEndRef.current = Math.min(
    CINEMATIC_IMAGE_DURATION_SEC,
    Math.max(startAtSec + 1, endAtSec)
  );

  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => bgmEngine.isMuted());
  const [uiTimeSec, setUiTimeSec] = useState(0);
  const [forcedBeatId, setForcedBeatId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const nextAdvanceRef = useRef(0);
  const advanceSceneRef = useRef<() => void>(() => {});

  const playbackRef = useRef({
    elapsedSec: 0,
    paused: false,
    finished: false,
    lastUiSyncSec: -1,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const unsub = bgmEngine.subscribe((muted) => {
      setIsMuted(muted);
      if (muted) cinematicRebootAudio.stopAll();
    });
    return unsub;
  }, []);

  const finishCinematic = useCallback(() => {
    if (playbackRef.current.finished) return;
    playbackRef.current.finished = true;
    cinematicRebootAudio.stopAll();
    bgmEngine.setDuckFactor(1);
    onCompleteRef.current();
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      playbackRef.current.paused = next;
      if (next) {
        cinematicRebootAudio.stopAll();
      } else {
        cinematicRebootAudio.resetImageTimeline(playbackRef.current.elapsedSec);
      }
      return next;
    });
  }, []);

  // Inicio o repetición del metraje.
  useEffect(() => {
    bgmEngine.setDuckFactor(0);

    const segmentStart = Math.max(
      0,
      Math.min(CINEMATIC_IMAGE_DURATION_SEC - 0.05, segmentStartRef.current)
    );

    playbackRef.current = {
      elapsedSec: segmentStart,
      paused: false,
      finished: false,
      lastUiSyncSec: -1,
    };
    setIsPaused(false);
    setUiTimeSec(segmentStart);
    setForcedBeatId(null);
    nextAdvanceRef.current = 0;

    cinematicRebootAudio.resetImageTimeline(segmentStart);

    const unlockAudio = () => {
      retroAudio.unlock();
      cinematicRebootAudio.unlock();
    };
    unlockAudio();

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      cinematicRebootAudio.stopAll();
      bgmEngine.setDuckFactor(1);
    };
  }, [runKey]);

  // Lienzo, imágenes y cámara.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const world = createCinematicImageWorld(mount, reducedMotion);
    void world.preload();
    let frameId = 0;
    let disposed = false;
    let lastNow = performance.now();

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDelta = Math.max(0.001, Math.min(0.25, (now - lastNow) / 1000));
      lastNow = now;

      const pb = playbackRef.current;
      if (!pb.paused && !pb.finished) {
        pb.elapsedSec += rawDelta;
        cinematicRebootAudio.syncImageTimeline(pb.elapsedSec, false);

        if (Math.abs(pb.elapsedSec - pb.lastUiSyncSec) >= 0.08) {
          pb.lastUiSyncSec = pb.elapsedSec;
          setUiTimeSec(pb.elapsedSec);
        }

        if (pb.elapsedSec >= segmentEndRef.current) {
          world.renderAtTime(segmentEndRef.current, rawDelta);
          finishCinematic();
          return;
        }
      }

      world.renderAtTime(pb.elapsedSec, rawDelta);
      frameId = requestAnimationFrame(tick);
    }

    lastNow = performance.now();
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      world.dispose();
    };
  }, [finishCinematic, reducedMotion]);

  // E o Espacio adelantan el subtítulo/escena; Escape omite la cinemática; P pausa.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Espacio/Enter sobre un control enfocado deben activar ese control
      // (p. ej. «Siguiente escena») y no saltar la secuencia completa.
      const target = event.target;
      const onControl =
        target instanceof HTMLElement &&
        !!target.closest('button, a, input, textarea, select, [role="button"]');
      if (onControl && (event.key === ' ' || event.key === 'Enter')) return;

      if (event.key === ' ' || event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        advanceSceneRef.current();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        finishCinematic();
        return;
      }
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        handleTogglePause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishCinematic, handleTogglePause]);

  const activeBeat = getActiveImageBeatAtTime(uiTimeSec);
  const activeScene = getImageSceneAt(uiTimeSec);
  const words = useMemo(
    () => (activeBeat ? activeBeat.subtitle.split(' ') : []),
    [activeBeat]
  );

  let rawRevealedWords = words.length;
  if (activeBeat && words.length > 0) {
    const span = Math.max(0.6, activeBeat.endSec - activeBeat.startSec);
    const progress = ramp01((uiTimeSec - activeBeat.startSec) / (span * 0.74));
    rawRevealedWords = Math.max(1, Math.ceil(progress * words.length));
  }

  const isTextRevealing =
    !!activeBeat && words.length > 0 && rawRevealedWords < words.length;
  const textForced = !!activeBeat && forcedBeatId === activeBeat.id;
  const revealedWords = textForced ? words.length : rawRevealedWords;

  const nextScene =
    CINEMATIC_IMAGE_SCENES.find(
      (scene) => scene.index === activeScene.index + 1
    ) ?? null;
  const hasNextScene =
    !!nextScene && nextScene.startSec < segmentEndRef.current - 0.05;
  const showNextScene =
    !isPaused && (hasNextScene || (isTextRevealing && !textForced));

  /**
   * Una pulsación completa el subtítulo que se está escribiendo o, si ya está
   * completo, salta al inicio exacto de la escena siguiente. La guarda de
   * tiempo evita que un doble clic consuma dos bloques.
   */
  const handleNextScene = () => {
    const pb = playbackRef.current;
    if (pb.finished || pb.paused) return;
    const now = performance.now();
    if (now - nextAdvanceRef.current < 220) return;
    nextAdvanceRef.current = now;

    if (isTextRevealing && !textForced && activeBeat) {
      setForcedBeatId(activeBeat.id);
      return;
    }
    if (!nextScene || !hasNextScene) return;

    const target = Math.max(segmentStartRef.current, nextScene.startSec);
    pb.elapsedSec = target;
    pb.lastUiSyncSec = -1;
    setForcedBeatId(null);
    setUiTimeSec(target);
    cinematicRebootAudio.resetImageTimeline(target);
  };
  advanceSceneRef.current = handleNextScene;

  const sceneLocalSec = uiTimeSec - activeScene.startSec;
  const sceneTagOpacity = Math.min(
    ramp01(sceneLocalSec / 0.55),
    1 - ramp01((sceneLocalSec - 4.4) / 1.3)
  );

  return (
    <div
      className="cr-stage select-none"
      role="region"
      aria-label="Cinemática de apertura de PIXELVERSE"
    >
      <div ref={mountRef} className="cr-canvas-mount" />
      <div className="cr-atmosphere" aria-hidden="true" />

      {sceneTagOpacity > 0.01 && (
        <div
          className="cr-scene-tag"
          style={{ opacity: sceneTagOpacity }}
          aria-hidden="true"
        >
          <span className="cr-scene-tag__index">
            {ROMAN[activeScene.index - 1] ?? 'I'}
          </span>
          <span className="cr-scene-tag__rule" />
          <span className="cr-scene-tag__label">{activeScene.label}</span>
        </div>
      )}

      {showNextScene && (
        <button
          type="button"
          className="cr-next"
          onClick={handleNextScene}
          onKeyDown={(event) => event.stopPropagation()}
          aria-label="Siguiente escena"
          title="Avanzar subtítulo o escena (E / Espacio)"
        >
          <span>Siguiente escena</span>
          <ChevronRight aria-hidden="true" />
        </button>
      )}

      {activeBeat && (
        <div
          className={`cr-subtitle cr-subtitle--${activeBeat.tone}`}
          aria-live="polite"
        >
          <p className="cr-subtitle__text">
            {words.map((word, index) => (
              <span
                key={`${activeBeat.id}-${index}`}
                className={`cr-word ${index < revealedWords ? 'is-on' : ''}`}
              >
                {word}
                {index < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="cr-controls">
        <button
          type="button"
          onClick={handleTogglePause}
          aria-label="Pausar cinemática"
          title="Pausar (P)"
          className="cr-icon-btn"
        >
          <Pause />
        </button>
        <button
          type="button"
          onClick={() => bgmEngine.toggleMute()}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          className="cr-icon-btn"
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </button>
        <button
          type="button"
          onClick={finishCinematic}
          className="cr-skip"
          title="Omitir cinemática (Esc)"
        >
          <SkipForward />
          <span>Omitir</span>
        </button>
      </div>

      {isPaused && (
        <button
          type="button"
          onClick={handleTogglePause}
          className="cr-pause"
        >
          <span className="cr-pause__badge">
            <Play />
            <span>PAUSA</span>
          </span>
          <span className="cr-pause__hint">P o clic para continuar</span>
        </button>
      )}
    </div>
  );
}
