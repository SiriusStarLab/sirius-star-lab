import { useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;

const SCENE_AUDIO: Record<string, string> = {
  hook:   `${BASE}audio/hook.mp3`,
  memory: `${BASE}audio/memory.mp3`,
  modes:  `${BASE}audio/modes.mp3`,
  labs:   `${BASE}audio/labs.mp3`,
  outro:  `${BASE}audio/outro.mp3`,
};

export function useVoiceover(enabled: boolean, sceneKey: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (!enabled) return;

    const baseKey = sceneKey.replace(/_r[12]$/, '');
    const src = SCENE_AUDIO[baseKey];
    if (!src) return;

    const audio = new Audio(src);
    audio.volume = 1.0;
    audioRef.current = audio;

    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [enabled, sceneKey]);
}
