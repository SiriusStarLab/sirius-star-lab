import { useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

const SCENE_AUDIO: Record<string, string> = {
  hook:   `${BASE}audio/hook.mp3`,
  memory: `${BASE}audio/memory.mp3`,
  modes:  `${BASE}audio/modes.mp3`,
  labs:   `${BASE}audio/labs.mp3`,
  outro:  `${BASE}audio/outro.mp3`,
};

// Delay in ms before audio starts — lets the scene animation appear first
const START_DELAY_MS = 600;

export function useVoiceover(enabled: boolean, sceneKey: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!enabled) return;

    const baseKey = sceneKey.replace(/_r[12]$/, '');
    const src = SCENE_AUDIO[baseKey];
    if (!src) return;

    // Pre-load audio immediately so it's ready when the timer fires
    const audio = new Audio(src);
    audio.volume = 1.0;
    audio.preload = 'auto';
    audioRef.current = audio;

    // Small delay so scene animation is visible before voice starts
    timerRef.current = setTimeout(() => {
      audio.play().catch(() => {});
    }, START_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [enabled, sceneKey]);
}
