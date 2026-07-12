import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

// ─── Musical config ───────────────────────────────────────────────────────────
const BPM = 124;

// D minor chord progression: Dm → Bb → F → C  (2 bars each = 32 steps)
const CHORDS: string[][] = [
  ['D3', 'F3', 'A3', 'D4'],   // Dm
  ['D3', 'F3', 'A3', 'D4'],   // Dm
  ['Bb2', 'D3', 'F3', 'Bb3'], // Bb
  ['Bb2', 'D3', 'F3', 'Bb3'], // Bb
  ['F2', 'A2', 'C3', 'F3'],   // F
  ['F2', 'A2', 'C3', 'F3'],   // F
  ['C3', 'E3', 'G3', 'C4'],   // C
  ['C3', 'E3', 'G3', 'C4'],   // C
];

// Arp: note-index into current chord per 16th step (-1 = rest)
const ARP = [-1, 2, -1, 3, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 3];
// Drums per 16th step
const KICK =  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
const SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
const HAT =   [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1];

// Events array required by Tone.Sequence — just step indices 0-15
const STEPS = Array.from({ length: 16 }, (_, i) => i);

let toneStarted = false;
async function ensureTone() {
  if (!toneStarted) {
    await Tone.start();
    toneStarted = true;
  }
}

export function useFuturisticMusic(enabled: boolean) {
  const disposersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function startMusic() {
      await ensureTone();
      if (cancelled) return;

      Tone.getTransport().bpm.value = BPM;
      Tone.getTransport().stop();
      Tone.getTransport().cancel();

      const d: Array<() => void> = [];

      // ── Effects chain ───────────────────────────────────────────────────────
      const reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).toDestination();
      const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.22, wet: 0.28 }).connect(reverb);
      d.push(() => { reverb.dispose(); delay.dispose(); });

      // ── Pad ─────────────────────────────────────────────────────────────────
      const pad = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 25 } as any,
        envelope: { attack: 1.5, decay: 0.5, sustain: 0.85, release: 3 },
        volume: -21,
      }).connect(reverb);
      d.push(() => pad.dispose());

      // ── Arp ─────────────────────────────────────────────────────────────────
      const arpSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.35 },
        volume: -22,
      }).connect(delay);
      d.push(() => arpSynth.dispose());

      // ── Bass ────────────────────────────────────────────────────────────────
      const bass = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.25, sustain: 0.5, release: 0.3 },
        filter: { frequency: 700, type: 'lowpass', rolloff: -24 } as any,
        volume: -14,
      }).toDestination();
      d.push(() => bass.dispose());

      // ── Kick ────────────────────────────────────────────────────────────────
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.07,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
        volume: -8,
      }).toDestination();
      d.push(() => kick.dispose());

      // ── Snare ───────────────────────────────────────────────────────────────
      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.1 },
        volume: -18,
      }).toDestination();
      d.push(() => snare.dispose());

      // ── Hi-hat ──────────────────────────────────────────────────────────────
      const hat = new Tone.MetalSynth({
        frequency: 600,
        envelope: { attack: 0.001, decay: 0.04, release: 0.02 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -26,
      }).toDestination();
      d.push(() => hat.dispose());

      // ── Sequencer ───────────────────────────────────────────────────────────
      let totalStep = 0;

      const seq = new Tone.Sequence(
        (time, step: number) => {
          const barIndex = Math.floor(totalStep / 16) % CHORDS.length;
          const chord = CHORDS[barIndex];

          if (KICK[step])  kick.triggerAttackRelease('C1', '16n', time);
          if (SNARE[step]) snare.triggerAttackRelease('16n', time);
          if (HAT[step])   hat.triggerAttackRelease('32n', time);

          const arpNote = ARP[step];
          if (arpNote >= 0 && arpNote < chord.length) {
            arpSynth.triggerAttackRelease(chord[arpNote], '16n', time);
          }

          // Bass + pad on bar downbeat
          if (step === 0) {
            bass.triggerAttackRelease(
              Tone.Frequency(chord[0]).transpose(-12).toNote(),
              '4n',
              time
            );
            pad.releaseAll(time);
            pad.triggerAttack(chord.slice(0, 3), time + 0.03);
          }

          totalStep++;
        },
        STEPS,
        '16n'
      );
      d.push(() => seq.dispose());

      seq.start(0);
      Tone.getTransport().start();
      disposersRef.current = d;
    }

    startMusic();

    return () => {
      cancelled = true;
      disposersRef.current.forEach(fn => fn());
      disposersRef.current = [];
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
    };
  }, [enabled]);
}
