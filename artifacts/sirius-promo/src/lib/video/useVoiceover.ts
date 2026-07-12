import { useEffect, useRef } from 'react';

const SCENE_NARRATION: Record<string, string> = {
  hook:   "Every other AI forgets you. Sirius never does.",
  memory: "Your goals, your breakthroughs, your voice — remembered forever. ChatGPT forgets. Claude forgets. Sirius doesn't.",
  modes:  "Nine specialist minds. One AI. Built for exactly how you want to think.",
  labs:   "Not a chatbot. A co-founder. Build real projects in Star Lab. Track your dreams in Dream Lab.",
  outro:  "Nine modes. Remembers everything. Builds real things. Sirius. Start free today.",
};

export function useVoiceover(enabled: boolean, sceneKey: string) {
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const baseKey = sceneKey.replace(/_r[12]$/, '');
    const text = SCENE_NARRATION[baseKey];
    if (!text) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.88;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('google uk english female') ||
      v.name.toLowerCase().includes('karen') ||
      v.lang === 'en-GB'
    );
    if (preferred) utter.voice = preferred;

    utterRef.current = utter;
    window.speechSynthesis.speak(utter);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [enabled, sceneKey]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);
}
