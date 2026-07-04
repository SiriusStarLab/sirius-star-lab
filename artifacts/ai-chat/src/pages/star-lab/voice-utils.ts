let _currentAudio: HTMLAudioElement | null = null;
let _currentAudioUrl: string | null = null;
let _audioUnlocked = false;

// iOS Safari silently stops playing audio from newly-created Audio() elements
// after a handful of them have been instantiated in a session (no error, no
// sound). Reusing a single element for the whole page lifetime avoids this.
function getReusableAudioElement(): HTMLAudioElement {
  if (!_currentAudio) {
    _currentAudio = new Audio();
    _currentAudio.preload = "auto";
  }
  return _currentAudio;
}

// Call this inside a real user-gesture handler (e.g. button tap) so iOS/Chrome
// allow subsequent audio.play() calls that happen after async gaps.
export function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  const a = getReusableAudioElement();
  // Minimal 1-sample silent WAV played at volume 0 — unlocks the browser audio policy
  a.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
  a.volume = 0;
  a.play().catch(() => {});
}

export function stopSpeaking() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.onended = null;
    _currentAudio.onerror = null;
  }
  if (_currentAudioUrl) {
    URL.revokeObjectURL(_currentAudioUrl);
    _currentAudioUrl = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export async function speakText(
  text: string,
  onDone?: () => void,
  _rate = 0.87,
  pin?: string,
) {
  stopSpeaking();
  if (!text?.trim()) { onDone?.(); return; }

  const clean = text.replace(/[*#>`_~]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();

  if (pin) {
    try {
      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const resp = await fetch(`${base}/api/lab/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ text: clean.slice(0, 2000) }),
        signal: AbortSignal.timeout(35_000),
      });
      if (!resp.ok) throw new Error(`TTS ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = getReusableAudioElement();
      audio.pause();
      audio.volume = 1.0;
      audio.src = url;
      _currentAudioUrl = url;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (_currentAudioUrl === url) _currentAudioUrl = null;
        onDone?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (_currentAudioUrl === url) _currentAudioUrl = null;
        onDone?.();
      };
      audio.load();
      await audio.play();
      return;
    } catch (e) {
      console.warn("[TTS] Piper failed, falling back to browser speech:", e);
    }
  }

  _speakBrowser(clean, onDone, _rate);
}

function _speakBrowser(text: string, onDone?: () => void, rate = 0.87) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onDone?.(); return; }
  window.speechSynthesis.cancel();

  const rawSentences = text.match(/[^.!?\n]+(?:[.!?\n]+|$)/g) ?? [text];
  const chunks: string[] = [];
  let buf = "";
  for (const s of rawSentences) {
    const t = s.trim();
    if (!t) continue;
    if (buf && (buf + " " + t).length > 300) { chunks.push(buf); buf = t; }
    else { buf = buf ? buf + " " + t : t; }
  }
  if (buf) chunks.push(buf);
  if (chunks.length === 0) { onDone?.(); return; }

  const KNOWN_MALE = [
    "Daniel","Arthur","Malcolm","Google UK English Male",
    "Microsoft David","Microsoft Mark","Microsoft George","Microsoft James",
    "Alex","Fred","Ralph","Bruce","Junior","Microsoft Ryan","Microsoft Guy",
  ];

  const FEMALE_ORDER = [
    "Microsoft Sonia","Microsoft Libby","Microsoft Maisie","Microsoft Hazel",
    "Google UK English Female","Serena","Moira",
    "Microsoft Aria","Microsoft Jenny","Karen","Samantha",
    "Microsoft Nora","Microsoft Clara","Microsoft Mia","Microsoft Leah",
    "Microsoft Susan","Microsoft Zira","Victoria","Fiona","Tessa","Google US English",
  ];

  const pickVoice = () => {
    const v = window.speechSynthesis.getVoices();
    const byName = v.find(x => FEMALE_ORDER.includes(x.name));
    if (byName) return byName;
    return (
      v.find(x => x.lang.startsWith("en-GB") && !KNOWN_MALE.includes(x.name) && !x.name.toLowerCase().includes("male")) ||
      v.find(x => x.lang.startsWith("en-US") && !KNOWN_MALE.includes(x.name) && !x.name.toLowerCase().includes("male")) ||
      v.find(x => x.lang.startsWith("en")    && !KNOWN_MALE.includes(x.name) && !x.name.toLowerCase().includes("male")) ||
      v.find(x => x.lang.startsWith("en"))
    );
  };

  setTimeout(() => {
    let finished = false;
    const fireOnce = () => { if (finished) return; finished = true; clearInterval(keepAlive); onDone?.(); };
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);
    const totalChars = chunks.reduce((n, c) => n + c.length, 0);
    const globalTimeout = setTimeout(() => fireOnce(), Math.ceil((totalChars / (rate * 14)) * 1000) + 4000);
    let idx = 0;
    const speakNext = () => {
      if (finished) return;
      if (idx >= chunks.length) { clearTimeout(globalTimeout); fireOnce(); return; }
      const chunk = chunks[idx++];
      const utter = new SpeechSynthesisUtterance(chunk);
      utter.rate   = rate;
      utter.pitch  = 1.1;
      utter.volume = 0.97;
      const preferred = pickVoice();
      if (preferred) utter.voice = preferred;
      utter.onend   = () => speakNext();
      utter.onerror = () => speakNext();
      window.speechSynthesis.speak(utter);
    };
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => speakNext();
    } else {
      speakNext();
    }
  }, 80);
}

export function parseSpokenPin(transcript: string): string {
  const wordMap: Record<string, string> = {
    "zero": "0", "oh": "0", "o": "0", "nought": "0",
    "one": "1", "won": "1",
    "two": "2", "to": "2", "too": "2",
    "three": "3", "tree": "3",
    "four": "4", "for": "4", "fore": "4",
    "five": "5",
    "six": "6", "sicks": "6",
    "seven": "7",
    "eight": "8", "ate": "8",
    "nine": "9", "niner": "9",
  };
  const raw = transcript.replace(/\s/g, "");
  const digitRun = raw.match(/\d{4,8}/);
  if (digitRun) return digitRun[0].slice(0, 8);
  const words = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().split(/\s+/);
  const mapped = words.map(w => wordMap[w] ?? (w.match(/^\d$/) ? w : null)).filter(Boolean) as string[];
  return mapped.join("").slice(0, 8);
}
