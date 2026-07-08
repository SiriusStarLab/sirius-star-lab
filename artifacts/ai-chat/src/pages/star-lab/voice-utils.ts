let _currentAudio: HTMLAudioElement | null = null;
let _currentAudioUrl: string | null = null;
let _audioUnlocked = false;
let _audioCtx: AudioContext | null = null;
let _currentSource: AudioBufferSourceNode | null = null;

function getReusableAudioElement(): HTMLAudioElement {
  if (!_currentAudio) {
    _currentAudio = new Audio();
    _currentAudio.preload = "auto";
  }
  return _currentAudio;
}

export function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;

  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (Ctx) {
      _audioCtx = new Ctx();
      console.log("[TTS] AudioContext created, state:", _audioCtx.state);
      _audioCtx.resume().then(() => {
        console.log("[TTS] AudioContext resumed, state:", _audioCtx?.state);
      }).catch((e) => {
        console.warn("[TTS] AudioContext resume failed:", e);
      });
    } else {
      console.warn("[TTS] AudioContext not available in this browser");
    }
  } catch (e) {
    console.warn("[TTS] AudioContext creation failed:", e);
    _audioCtx = null;
  }

  // Also unlock the HTMLAudioElement as fallback
  const a = getReusableAudioElement();
  a.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
  a.volume = 0;
  a.play().catch(() => {});
}

export function stopSpeaking() {
  if (_currentSource) {
    try { _currentSource.stop(); } catch {}
    _currentSource.onended = null;
    _currentSource = null;
  }
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
  console.log("[TTS] speakText called, pin:", pin ? "SET" : "MISSING", "audioCtx:", _audioCtx ? _audioCtx.state : "null");

  if (pin) {
    try {
      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
      const url = `${base}/api/lab/tts`;
      console.log("[TTS] Fetching from:", url, "text length:", clean.slice(0, 2000).length);

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-lab-pin": pin },
        body: JSON.stringify({ text: clean.slice(0, 2000) }),
        signal: AbortSignal.timeout(35_000),
      });
      console.log("[TTS] Response:", resp.status, resp.headers.get("content-type"));
      if (!resp.ok) throw new Error(`TTS ${resp.status}: ${await resp.text().catch(() => "")}`);

      const arrayBuf = await resp.arrayBuffer();
      console.log("[TTS] ArrayBuffer size:", arrayBuf.byteLength, "bytes");

      // Prefer AudioContext (bypasses Windows/Edge autoplay policy on HTMLAudioElement)
      if (_audioCtx) {
        try {
          console.log("[TTS] Trying AudioContext, state:", _audioCtx.state);
          if (_audioCtx.state === "suspended") {
            console.log("[TTS] Resuming suspended AudioContext...");
            await _audioCtx.resume();
            console.log("[TTS] AudioContext resumed, state now:", _audioCtx.state);
          }
          const audioBuf = await _audioCtx.decodeAudioData(arrayBuf.slice(0));
          console.log("[TTS] Decoded audio, duration:", audioBuf.duration.toFixed(2), "s");
          const source = _audioCtx.createBufferSource();
          source.buffer = audioBuf;
          source.connect(_audioCtx.destination);
          _currentSource = source;
          source.onended = () => {
            console.log("[TTS] AudioContext playback ended");
            if (_currentSource === source) _currentSource = null;
            onDone?.();
          };
          source.start(0);
          console.log("[TTS] AudioContext playback started");
          return;
        } catch (ctxErr) {
          console.warn("[TTS] AudioContext playback failed:", ctxErr);
        }
      } else {
        console.warn("[TTS] No AudioContext — falling through to HTMLAudioElement");
      }

      // Fallback: HTMLAudioElement
      console.log("[TTS] Trying HTMLAudioElement fallback");
      const blob = new Blob([arrayBuf], { type: "audio/wav" });
      const blobUrl = URL.createObjectURL(blob);
      const audio = getReusableAudioElement();
      audio.pause();
      audio.volume = 1.0;
      audio.src = blobUrl;
      _currentAudioUrl = blobUrl;
      audio.onended = () => {
        URL.revokeObjectURL(blobUrl);
        if (_currentAudioUrl === blobUrl) _currentAudioUrl = null;
        console.log("[TTS] HTMLAudioElement ended");
        onDone?.();
      };
      audio.onerror = (e) => {
        console.warn("[TTS] HTMLAudioElement error:", e);
        URL.revokeObjectURL(blobUrl);
        if (_currentAudioUrl === blobUrl) _currentAudioUrl = null;
        onDone?.();
      };
      audio.load();
      try {
        await audio.play();
        console.log("[TTS] HTMLAudioElement playing");
        return;
      } catch (playErr) {
        console.warn("[TTS] HTMLAudioElement.play() blocked:", playErr);
        URL.revokeObjectURL(blobUrl);
        _currentAudioUrl = null;
      }
    } catch (e) {
      console.warn("[TTS] TTS fetch/decode failed:", e);
    }
  } else {
    console.log("[TTS] No pin — using browser speech synthesis directly");
  }

  console.log("[TTS] Falling back to browser speech synthesis");
  _speakBrowser(clean, onDone, _rate);
}

function _speakBrowser(text: string, onDone?: () => void, rate = 0.87) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("[TTS] Browser speech synthesis not available");
    onDone?.();
    return;
  }
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

  console.log("[TTS] Browser speech — voices available:", window.speechSynthesis.getVoices().length);

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
      if (preferred) {
        utter.voice = preferred;
        console.log("[TTS] Browser speech using voice:", preferred.name);
      } else {
        console.warn("[TTS] No preferred voice found, using default");
      }
      utter.onend   = () => speakNext();
      utter.onerror = (e) => { console.warn("[TTS] Speech utterance error:", e.error); speakNext(); };
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
