/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PIXELVERSE · «El despertar»
 * Motor de audio original para la habitación: lluvia sobre el cristal, viento
 * exterior, zumbido nocturno, truenos con cuerpo y cola, crujidos de madera,
 * ropa y pasos. Todo se sintetiza en WebAudio; no requiere archivos externos.
 */

import { BEDROOM_TIMELINE } from './bedroomData';

type Ctx = AudioContext;

interface Cue {
  at: number;
  fire: () => void;
}

export class BedroomStormAudio {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private started = false;
  private muted = false;
  private fired: Set<number> = new Set();
  private cues: Cue[] = [];
  private stopTimer: number | null = null;
  private radioBus: GainNode | null = null;
  private radioNodes: AudioScheduledSourceNode[] = [];
  private radioFilter: BiquadFilterNode | null = null;

  public isStarted(): boolean {
    return this.started;
  }

  public start(): void {
    if (this.started || typeof window === 'undefined') return;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    this.ctx = ctx;
    this.noiseBuffer = this.buildNoiseBuffer(ctx);

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.72;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 20;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.26;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    this.master = master;
    this.compressor = compressor;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.buildImpulse(ctx);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.5;
    reverb.connect(reverbGain);
    reverbGain.connect(master);
    this.reverb = reverb;
    this.reverbGain = reverbGain;

    this.startAmbience(ctx, master, reverb);
    this.buildCues();

    this.started = true;
    void ctx.resume().catch(() => undefined);
  }

  public unlock(): void {
    if (!this.ctx) {
      this.start();
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.12);
    }
  }

  public sync(t: number): void {
    if (!this.started) return;
    for (let i = 0; i < this.cues.length; i += 1) {
      const cue = this.cues[i];
      if (!this.fired.has(i) && t >= cue.at) {
        this.fired.add(i);
        try {
          cue.fire();
        } catch {
          /* el audio nunca debe interrumpir la escena */
        }
      }
    }
  }

  public rewindCues(t: number): void {
    this.fired.clear();
    for (let i = 0; i < this.cues.length; i += 1) {
      if (this.cues[i].at < t) this.fired.add(i);
    }
  }

  /* =====================================================
     CAPAS CONTINUAS
     ===================================================== */
  private startAmbience(ctx: Ctx, master: GainNode, reverb: ConvolverNode): void {
    const noise = this.noiseBuffer;
    if (!noise) return;

    // Lluvia sobre el cristal: dos bandas filtradas y una capa de gotas.
    const rain = ctx.createBufferSource();
    rain.buffer = noise;
    rain.loop = true;
    const rainHigh = ctx.createBiquadFilter();
    rainHigh.type = 'highpass';
    rainHigh.frequency.value = 780;
    rainHigh.Q.value = 0.4;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.14;
    rain.connect(rainHigh).connect(rainGain).connect(master);
    rain.start(ctx.currentTime, 0.4);
    this.sources.push(rain);

    const rainBody = ctx.createBufferSource();
    rainBody.buffer = noise;
    rainBody.loop = true;
    const rainLow = ctx.createBiquadFilter();
    rainLow.type = 'bandpass';
    rainLow.frequency.value = 1500;
    rainLow.Q.value = 0.55;
    const rainBodyGain = ctx.createGain();
    rainBodyGain.gain.value = 0.055;
    rainBody.connect(rainLow).connect(rainBodyGain).connect(master);
    rainBody.start(ctx.currentTime, 2.1);
    this.sources.push(rainBody);

    // Viento exterior con ráfagas lentas.
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 360;
    windFilter.Q.value = 0.9;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.045;
    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start(ctx.currentTime, 1.2);
    this.sources.push(wind);

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.value = 0.07;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 0.026;
    windLfo.connect(windLfoGain).connect(windGain.gain);
    windLfo.start();
    this.sources.push(windLfo);

    const windSweep = ctx.createOscillator();
    windSweep.type = 'sine';
    windSweep.frequency.value = 0.043;
    const windSweepGain = ctx.createGain();
    windSweepGain.gain.value = 120;
    windSweep.connect(windSweepGain).connect(windFilter.frequency);
    windSweep.start();
    this.sources.push(windSweep);

    // Zumbido de la casa y de la tormenta lejana.
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 48;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.012;
    hum.connect(humGain).connect(master);
    hum.start();
    this.sources.push(hum);

    const hum2 = ctx.createOscillator();
    hum2.type = 'sine';
    hum2.frequency.value = 96.5;
    const hum2Gain = ctx.createGain();
    hum2Gain.gain.value = 0.0035;
    hum2.connect(hum2Gain).connect(master);
    hum2.start();
    this.sources.push(hum2);

    // Ambiente interior: aire muy filtrado.
    const room = ctx.createBufferSource();
    room.buffer = noise;
    room.loop = true;
    const roomFilter = ctx.createBiquadFilter();
    roomFilter.type = 'lowpass';
    roomFilter.frequency.value = 190;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.02;
    room.connect(roomFilter).connect(roomGain);
    roomGain.connect(master);
    roomGain.connect(reverb);
    room.start(ctx.currentTime, 3.0);
    this.sources.push(room);
  }

  /* =====================================================
     EFECTOS PUNTUALES
     ===================================================== */
  private out(): { ctx: Ctx; master: GainNode; reverb: ConvolverNode | null } | null {
    if (!this.ctx || !this.master) return null;
    return { ctx: this.ctx, master: this.master, reverb: this.reverb };
  }

  private noiseSource(ctx: Ctx, duration: number): AudioBufferSourceNode | null {
    if (!this.noiseBuffer) return null;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.start(ctx.currentTime, Math.random() * 3.5);
    window.setTimeout(() => {
      try {
        src.stop();
      } catch {
        /* ya detenido */
      }
    }, Math.ceil((duration + 0.2) * 1000));
    return src;
  }

  public thunder(power = 0.7, delay = 0): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime + delay;
    const p = Math.max(0.1, Math.min(1, power));

    // Cuerpo grave del trueno.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(62, t0);
    osc.frequency.exponentialRampToValueAtTime(27, t0 + 2.1);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, t0);
    oscGain.gain.linearRampToValueAtTime(0.55 * p, t0 + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    osc.connect(oscGain);
    oscGain.connect(master);
    if (reverb) oscGain.connect(reverb);
    osc.start(t0);
    osc.stop(t0 + 2.5);
    this.sources.push(osc);

    // Retumbo de ruido con filtro descendente.
    const rumble = this.noiseSource(ctx, 3.1);
    if (rumble) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(820, t0);
      filter.frequency.exponentialRampToValueAtTime(80, t0 + 2.4);
      filter.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.5 * p, t0 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.9);
      rumble.connect(filter).connect(gain);
      gain.connect(master);
      if (reverb) gain.connect(reverb);
    }

    // Chasquido seco cercano.
    if (p > 0.5) {
      const crack = this.noiseSource(ctx, 0.3);
      if (crack) {
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1400;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(0.22 * p, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        crack.connect(hp).connect(gain);
        gain.connect(master);
        if (reverb) gain.connect(reverb);
      }
    }

    // Sacudida breve de la casa.
    if (p > 0.7) {
      const shake = this.noiseSource(ctx, 0.5);
      if (shake) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 140;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t0 + 0.02);
        gain.gain.linearRampToValueAtTime(0.28 * p, t0 + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        shake.connect(lp).connect(gain);
        gain.connect(master);
      }
    }
  }

  public crack(power = 0.8): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime;
    const src = this.noiseSource(ctx, 0.4);
    if (!src) return;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.34 * power, t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    src.connect(hp).connect(gain);
    gain.connect(master);
    if (reverb) gain.connect(reverb);
  }

  public creak(power = 0.4): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t0);
    osc.frequency.linearRampToValueAtTime(160, t0 + 0.22);
    osc.frequency.linearRampToValueAtTime(185, t0 + 0.38);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 9;
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.value = 8;
    wobble.connect(wobbleGain).connect(osc.frequency);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 2.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.05 * power, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    osc.connect(filter).connect(gain);
    gain.connect(master);
    if (reverb) gain.connect(reverb);
    osc.start(t0);
    osc.stop(t0 + 0.46);
    wobble.start(t0);
    wobble.stop(t0 + 0.46);
    this.sources.push(osc, wobble);
  }

  public cloth(): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master } = out;
    const t0 = ctx.currentTime;
    const src = this.noiseSource(ctx, 0.55);
    if (!src) return;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.linearRampToValueAtTime(1450, t0 + 0.3);
    bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.075, t0 + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.48);
    src.connect(bp).connect(gain).connect(master);
  }

  public footstep(power = 0.5): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t0);
    osc.frequency.exponentialRampToValueAtTime(46, t0 + 0.13);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.16 * power, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.19);
    osc.connect(gain);
    gain.connect(master);
    if (reverb) gain.connect(reverb);
    osc.start(t0);
    osc.stop(t0 + 0.21);
    this.sources.push(osc);

    const scuff = this.noiseSource(ctx, 0.2);
    if (scuff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.055 * power, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      scuff.connect(lp).connect(g).connect(master);
    }
  }

  public tick(): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master } = out;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1180;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.018, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.08);
    this.sources.push(osc);
  }

  /* =====================================================
     RADIO ANALÓGICA, GOLPES Y MÁQUINA TEMPORAL
     ===================================================== */

  /** Enciende el receptor: soplido de banda, zumbido y silbido heterodino. */
  public radioStart(): void {
    const out = this.out();
    if (!out || this.radioBus) return;
    const { ctx, master, reverb } = out;

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 0.45);
    bus.connect(master);
    if (reverb) {
      const send = ctx.createGain();
      send.gain.value = 0.16;
      bus.connect(send);
      send.connect(reverb);
    }
    this.radioBus = bus;

    const noise = this.noiseBuffer;
    if (noise) {
      // Banda de siseo.
      const hiss = ctx.createBufferSource();
      hiss.buffer = noise;
      hiss.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1750;
      bp.Q.value = 0.55;
      const hissGain = ctx.createGain();
      hissGain.gain.value = 0.14;
      hiss.connect(bp).connect(hissGain).connect(bus);
      hiss.start(ctx.currentTime, Math.random() * 2);
      this.radioNodes.push(hiss);
      this.radioFilter = bp;

      // Cuerpo grave del altavoz.
      const body = ctx.createBufferSource();
      body.buffer = noise;
      body.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 330;
      const bodyGain = ctx.createGain();
      bodyGain.gain.value = 0.1;
      body.connect(lp).connect(bodyGain).connect(bus);
      body.start(ctx.currentTime, 1.3);
      this.radioNodes.push(body);

      // Deriva lenta de la señal.
      const drift = ctx.createOscillator();
      drift.type = 'sine';
      drift.frequency.value = 0.16;
      const driftGain = ctx.createGain();
      driftGain.gain.value = 240;
      drift.connect(driftGain).connect(bp.frequency);
      drift.start();
      this.radioNodes.push(drift);
    }

    // Zumbido de red y silbido de portadora.
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 50;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 190;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.012;
    hum.connect(humFilter).connect(humGain).connect(bus);
    hum.start();
    this.radioNodes.push(hum);

    const whistle = ctx.createOscillator();
    whistle.type = 'sine';
    whistle.frequency.value = 1280;
    const whistleGain = ctx.createGain();
    whistleGain.gain.value = 0.006;
    whistle.connect(whistleGain).connect(bus);
    whistle.start();
    this.radioNodes.push(whistle);

    const whistleWobble = ctx.createOscillator();
    whistleWobble.frequency.value = 0.7;
    const whistleWobbleGain = ctx.createGain();
    whistleWobbleGain.gain.value = 22;
    whistleWobble.connect(whistleWobbleGain).connect(whistle.frequency);
    whistleWobble.start();
    this.radioNodes.push(whistleWobble);
  }

  /** Pequeño reajuste de sintonía entre fragmentos del mensaje. */
  public radioTune(): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master } = out;
    const t0 = ctx.currentTime;
    const src = this.noiseSource(ctx, 0.18);
    if (!src) return;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(900, t0);
    bp.frequency.exponentialRampToValueAtTime(2600, t0 + 0.16);
    bp.Q.value = 3.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.07, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    src.connect(bp).connect(gain).connect(master);
    if (this.radioFilter) {
      this.radioFilter.frequency.setTargetAtTime(1300 + Math.random() * 900, t0, 0.08);
    }
  }

  /** La transmisión se corta con una interferencia seca. */
  public radioCut(): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime;

    if (this.radioBus) {
      try {
        this.radioBus.gain.cancelScheduledValues(t0);
        this.radioBus.gain.setValueAtTime(this.radioBus.gain.value, t0);
        this.radioBus.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      } catch {
        /* ignore */
      }
    }

    const burst = this.noiseSource(ctx, 0.4);
    if (burst) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1100;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.3, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      burst.connect(hp).connect(gain);
      gain.connect(master);
      if (reverb) gain.connect(reverb);
    }

    const click = ctx.createOscillator();
    click.type = 'square';
    click.frequency.setValueAtTime(190, t0);
    click.frequency.exponentialRampToValueAtTime(60, t0 + 0.05);
    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.0001, t0);
    clickGain.gain.linearRampToValueAtTime(0.03, t0 + 0.004);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    click.connect(clickGain).connect(master);
    click.start(t0);
    click.stop(t0 + 0.1);
    this.sources.push(click);

    const nodes = this.radioNodes;
    this.radioNodes = [];
    this.radioBus = null;
    this.radioFilter = null;
    window.setTimeout(() => {
      for (const node of nodes) {
        try {
          node.stop();
        } catch {
          /* ignore */
        }
      }
    }, 240);
  }

  /** Golpe grave contra la puerta, con resonancia de madera. */
  public knock(power = 1, delay = 0): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime + delay;
    const p = Math.max(0.2, Math.min(1.2, power));

    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(96, t0);
    thud.frequency.exponentialRampToValueAtTime(38, t0 + 0.22);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.0001, t0);
    thudGain.gain.linearRampToValueAtTime(0.5 * p, t0 + 0.012);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    thud.connect(thudGain);
    thudGain.connect(master);
    if (reverb) thudGain.connect(reverb);
    thud.start(t0);
    thud.stop(t0 + 0.32);
    this.sources.push(thud);

    const wood = this.noiseSource(ctx, 0.3);
    if (wood) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(240, t0);
      bp.frequency.exponentialRampToValueAtTime(150, t0 + 0.18);
      bp.Q.value = 4.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.2 * p, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      wood.connect(bp).connect(gain);
      gain.connect(master);
      if (reverb) gain.connect(reverb);
    }

    // Vibración de la hoja y del marco.
    const rattle = this.noiseSource(ctx, 0.16);
    if (rattle) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0 + 0.015);
      gain.gain.linearRampToValueAtTime(0.035 * p, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      rattle.connect(hp).connect(gain).connect(master);
    }
  }

  public knockSequence(): void {
    this.knock(1, 0);
    this.knock(1.05, 0.36);
    this.knock(1.15, 0.76);
  }

  public doorCreak(): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.linearRampToValueAtTime(82, t0 + 0.7);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 5.5;
    const wobbleGain = ctx.createGain();
    wobbleGain.gain.value = 14;
    wobble.connect(wobbleGain).connect(osc.frequency);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620;
    filter.Q.value = 5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.05, t0 + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
    osc.connect(filter).connect(gain);
    gain.connect(master);
    if (reverb) gain.connect(reverb);
    osc.start(t0);
    osc.stop(t0 + 0.84);
    wobble.start(t0);
    wobble.stop(t0 + 0.84);
    this.sources.push(osc, wobble);
  }

  /** Arranque de la máquina temporal: barrido descendente y cristales. */
  public timeMachine(): void {
    const out = this.out();
    if (!out) return;
    const { ctx, master, reverb } = out;
    const t0 = ctx.currentTime;

    const sweep = ctx.createOscillator();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(960, t0);
    sweep.frequency.exponentialRampToValueAtTime(68, t0 + 1.15);
    const sweepFilter = ctx.createBiquadFilter();
    sweepFilter.type = 'bandpass';
    sweepFilter.frequency.setValueAtTime(1400, t0);
    sweepFilter.frequency.exponentialRampToValueAtTime(180, t0 + 1.2);
    sweepFilter.Q.value = 2.2;
    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(0.0001, t0);
    sweepGain.gain.linearRampToValueAtTime(0.18, t0 + 0.05);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.25);
    sweep.connect(sweepFilter).connect(sweepGain);
    sweepGain.connect(master);
    if (reverb) sweepGain.connect(reverb);
    sweep.start(t0);
    sweep.stop(t0 + 1.3);
    this.sources.push(sweep);

    for (const [freq, level, offset] of [
      [1760, 0.035, 0.01],
      [2380, 0.025, 0.12],
      [3120, 0.018, 0.24],
      [4200, 0.012, 0.36],
    ] as const) {
      const shimmer = ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(freq, t0 + offset);
      shimmer.frequency.exponentialRampToValueAtTime(freq * 0.55, t0 + 1.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.linearRampToValueAtTime(level, t0 + offset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      shimmer.connect(gain);
      gain.connect(master);
      if (reverb) gain.connect(reverb);
      shimmer.start(t0 + offset);
      shimmer.stop(t0 + 1.22);
      this.sources.push(shimmer);
    }

    const air = this.noiseSource(ctx, 1.2);
    if (air) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2400, t0);
      bp.frequency.exponentialRampToValueAtTime(300, t0 + 1.15);
      bp.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
      air.connect(bp).connect(gain);
      gain.connect(master);
      if (reverb) gain.connect(reverb);
    }
  }

  /* =====================================================
     SECUENCIA
     ===================================================== */
  private buildCues(): void {
    const T = BEDROOM_TIMELINE;
    this.cues = [
      { at: T.flashWeak + 0.05, fire: () => this.crack(0.28) },
      { at: T.thunderWeak, fire: () => this.thunder(0.42, 0) },
      { at: T.flashStrong + 0.02, fire: () => this.crack(0.95) },
      { at: T.flashStrong + 0.1, fire: () => this.thunder(1, 0) },
      { at: 14.15, fire: () => this.creak(0.22) },
      { at: T.flashWindow, fire: () => this.crack(0.5) },
      { at: T.flashWindow + 0.16, fire: () => this.thunder(0.68, 0) },
      { at: T.blanketOff, fire: () => this.cloth() },
      { at: T.scootStart + 0.25, fire: () => this.cloth() },
      { at: 22.85, fire: () => this.creak(0.38) },
      { at: T.feetDown, fire: () => this.footstep(0.75) },
      { at: 24.35, fire: () => this.creak(0.2) },
      { at: 24.6, fire: () => this.footstep(0.35) },
      { at: 25.1, fire: () => this.footstep(0.28) },
      { at: T.flashSilhouette, fire: () => this.crack(0.72) },
      { at: T.flashSilhouette + 0.14, fire: () => this.thunder(0.9, 0) },
      { at: 30.0, fire: () => this.thunder(0.3, 0) },
      { at: T.dialogueStart + 0.05, fire: () => this.tick() },
    ];
    this.fired.clear();
  }

  public stop(): void {
    const ctx = this.ctx;
    if (!ctx) {
      this.started = false;
      return;
    }
    if (this.master) {
      try {
        this.master.gain.cancelScheduledValues(ctx.currentTime);
        this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      } catch {
        /* ignore */
      }
    }
    const sources = this.sources;
    const radioNodes = this.radioNodes;
    this.sources = [];
    this.radioNodes = [];
    this.radioBus = null;
    this.radioFilter = null;
    sources.push(...radioNodes);
    this.started = false;
    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.reverb = null;
    this.reverbGain = null;
    this.noiseBuffer = null;
    this.fired.clear();
    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer);
    }
    this.stopTimer = window.setTimeout(() => {
      for (const src of sources) {
        try {
          src.stop();
        } catch {
          /* ignore */
        }
      }
      void ctx.close().catch(() => undefined);
      this.stopTimer = null;
    }, 260);
  }

  /* =====================================================
     BUFFERS
     ===================================================== */
  private buildNoiseBuffer(ctx: Ctx): AudioBuffer {
    const seconds = 6;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let smoothed = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      smoothed = smoothed * 0.62 + white * 0.38;
      data[i] = smoothed * 0.55 + white * 0.2;
    }
    // Gotas nítidas sobre el cristal.
    for (let d = 0; d < 480; d += 1) {
      const start = Math.floor(Math.random() * (length - 80));
      const amp = 0.15 + Math.random() * 0.5;
      for (let j = 0; j < 28; j += 1) {
        data[start + j] += Math.sin(j * 0.75) * amp * Math.exp(-j / 6);
      }
    }
    // Costuras suaves para que el bucle no chasquee.
    const fade = Math.floor(ctx.sampleRate * 0.35);
    for (let i = 0; i < fade; i += 1) {
      const k = i / fade;
      data[i] *= k;
      data[length - 1 - i] *= k;
    }
    return buffer;
  }

  private buildImpulse(ctx: Ctx): AudioBuffer {
    const seconds = 2.3;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i += 1) {
        const k = i / length;
        const decay = Math.pow(1 - k, 2.6);
        data[i] = (Math.random() * 2 - 1) * decay * (ch === 0 ? 0.85 : 0.7);
      }
      // Primeras reflexiones.
      for (let r = 0; r < 6; r += 1) {
        const idx = Math.floor(ctx.sampleRate * (0.02 + r * 0.07 + Math.random() * 0.03));
        if (idx < length) data[idx] += (0.5 - r * 0.06) * (r % 2 === 0 ? 1 : -1);
      }
    }
    return buffer;
  }
}

export const bedroomStormAudio = new BedroomStormAudio();
