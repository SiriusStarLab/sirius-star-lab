export function speakText(text: string, onDone?: () => void, rate = 0.87) {
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

  // Priority order — UK neural voices first for a natural British female sound
  const FEMALE_ORDER = [
    // Microsoft UK neural (best quality on Windows/Edge/Chrome)
    "Microsoft Sonia",          // UK neural — warm, natural British female
    "Microsoft Libby",          // UK neural — clear, friendly British female
    "Microsoft Maisie",         // UK neural — younger British female
    "Microsoft Hazel",          // UK female
    // Google UK voices (good on Chrome/Android)
    "Google UK English Female", // natural British female
    // Apple UK/close accents
    "Serena",                   // Apple UK — natural
    "Moira",                    // Apple Irish — close to British cadence
    // Fallback neural female voices (non-UK but still natural-sounding)
    "Microsoft Aria",           // Neural American female — much better than older voices
    "Microsoft Jenny",          // Neural American female
    "Karen",                    // Apple Australian — natural
    "Samantha",                 // Apple American — warm
    // Older Microsoft female voices
    "Microsoft Nora","Microsoft Clara","Microsoft Mia","Microsoft Leah",
    "Microsoft Susan","Microsoft Zira",
    // Other Apple/Google
    "Victoria","Fiona","Tessa","Google US English",
  ];

  const pickVoice = () => {
    const v = window.speechSynthesis.getVoices();
    // Try exact name match in priority order first
    const byName = v.find(x => FEMALE_ORDER.includes(x.name));
    if (byName) return byName;
    // Prefer any en-GB female voice over en-US
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
