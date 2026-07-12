import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

// ─── Musical config ───────────────────────────────────────────────────────────
const BPM = 124;

// D minor chord progression: Dm → Bb → F → C  (2 bars each)
const CHORDS: Record<string, string[]> = {
  Dm: ['D3', 'F3', 'A3', 'D4'],
  Bb: ['Bb2', 'D3', 'F3', 'Bb3'],
  F:  ['F2',  'A2', 'C3', 'F3'],
  C:  ['C3',  'E3', 'G3', 'C4'],
};
const PROGRESSION = ['Dm', 'Dm', 'Bb', 'Bb', 'F', 'F', 'C', 'C']; // 8 bars, loops

// Arp pattern within each chord (index into chord notes, -1 = rest)
const ARP_SEQ = [-1, 2, -1, 3, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 3];

// Kick pattern (16 steps per bar)
const KICK_SEQ = [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0];
// Snare on 2 and 4
const SNARE_SEQ = [0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0];
// Open hi-hat on 8th notes
const HAT_SEQ = [0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1,  0, 1, 0, 1];

let toneInitialized = false;

async function ensureToneStarted() {
  if (!toneInitialized) {
    await Tone.start();
    toneInitialized = true;
  }
}

export function useFuturisticMusic(enabled: boolean) {
  const disposersRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function startMusic() {
      await ensureToneStarted();
      if (cancelled) return;

      Tone.getTransport().bpm.value = BPM;
      Tone.getTransport().stop();
      Tone.getTransport().cancel();

      const disposers: Array<() => void> = [];

      // ── Reverb ─────────────────────────────────────────────────────────────
      const reverb = new Tone.Reverb({ decay: 4.5, wet: 0.45 }).toDestination();
      const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0.3 }).connect(reverb);
      disposers.push(() => { reverb.dispose(); delay.dispose(); });

      // ── Pad synth ──────────────────────────────────────────────────────────
      const pad = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth' as const, count: 3, spread: 25 },
        envelope: { attack: 1.8, decay: 0.5, sustain: 0.85, release: 3.5 },
        volume: -20,
      }).connect(reverb);
      disposers.push(() => pad.dispose());

      // ── Arp synth ──────────────────────────────────────────────────────────
      const arp = new Tone.Synth({
        oscillator: { type: 'triangle' as const },
        envelope: { attack: 0.005, decay: 0.12, sustain: 0.2, release: 0.4 },
        volume: -22,
      }).connect(delay);
      disposers.push(() => arp.dispose());

      // ── Bass synth ─────────────────────────────────────────────────────────
      const bass = new Tone.Synth({
        oscillator: { type: 'sawtooth' as const },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
        filter: { frequency: 700, type: 'lowpass' as const, rolloff: -24 as const },
        volume: -14,
      }).toDestination();
      disposers.push(() => bass.dispose());

      // ── Kick ───────────────────────────────────────────────────────────────
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.07,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 },
        volume: -8,
      }).toDestination();
      disposers.push(() => kick.dispose());

      // ── Snare ──────────────────────────────────────────────────────────────
      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' as const },
        envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.1 },
        volume: -18,
      }).toDestination();
      disposers.push(() => snare.dispose());

      // ── Hi-hat ─────────────────────────────────────────────────────────────
      const hat = new Tone.MetalSynth({
        frequency: 600,
        envelope: { attack: 0.001, decay: 0.04, release: 0.02 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        volume: -26,
      }).toDestination();
      disposers.push(() => hat.dispose());

      // ── Sequencer ──────────────────────────────────────────────────────────
      let barIndex = 0;
      let stepIndex = 0;

      const seq = new Tone.Sequence(
        (time) => {
          const chordName = PROGRESSION[barIndex % PROGRESSION.length];
          const chordNotes = CHORDS[chordName];
          const step = stepIndex % 16;

          // Kick
          if (KICK_SEQ[step]) kick.triggerAttackRelease('C1', '16n', time);
          // Snare
          if (SNARE_SEQ[step]) snare.triggerAttackRelease('16n', time);
          // Hat
          if (HAT_SEQ[step]) hat.triggerAttackRelease('32n', time);

          // Arp
          const arpIdx = ARP_SEQ[step];
          if (arpIdx >= 0 && arpIdx < chordNotes.length) {
            arp.triggerAttackRelease(chordNotes[arpIdx], '16n', time);
          }

          // Bass — on beat 1 of each bar only
          if (step === 0) {
            bass.triggerAttackRelease(Tone.Frequency(chordNotes[0]).transpose(-12).toNote(), '4n', time);
          }

          // Pad chord — on beat 1 of each bar, new chord every 2 bars
          if (step === 0) {
            pad.releaseAll(time);
            pad.triggerAttack(chordNotes.slice(0, 3), time + 0.02);
          }

          // Advance counters
          stepIndex++;
          if (stepIndex % 16 === 0) barIndex++;
        },
        null,
        '16n'
      );
      disposers.push(() => seq.dispose());

      seq.start(0);
      Tone.getTransport().start();

      disposersRef.current = disposers;
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
