export function speakText(text: string, onDone?: () => void, rate = 0.92) {
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

  const KNOWN_MALE = ["Daniel","Arthur","Malcolm","Google UK English Male","Microsoft David","Microsoft Mark","Microsoft George","Microsoft James","Alex","Fred","Ralph","Bruce","Junior"];
  // Natural/neural voices first — these sound genuinely human rather than synthetic
  const FEMALE_ORDER = [
    "Samantha",           // Apple — warm, natural, the gold standard on Mac/iOS
    "Microsoft Aria",     // Neural — very natural American female
    "Microsoft Jenny",    // Neural — clear natural American female
    "Karen",              // Apple Australian — natural
    "Moira",              // Apple Irish — natural
    "Serena",             // Apple UK — natural
    "Google UK English Female",
    "Microsoft Sonia","Microsoft Libby","Microsoft Leah","Microsoft Nora",
    "Microsoft Clara","Microsoft Mia","Microsoft Hazel","Microsoft Zira","Microsoft Susan",
    "Victoria","Fiona","Tessa","Google US English",
  ];
  const pickVoice = () => {
    const v = window.speechSynthesis.getVoices();
    return v.find(x => FEMALE_ORDER.includes(x.name)) ||
      v.find(x => x.lang.startsWith("en-GB") && !KNOWN_MALE.includes(x.name) && !x.name.toLowerCase().includes("male")) ||
      v.find(x => x.lang.startsWith("en-US") && !KNOWN_MALE.includes(x.name) && !x.name.toLowerCase().includes("male")) ||
      v.find(x => x.lang.startsWith("en")    && !KNOWN_MALE.includes(x.name) && !x.name.toLowerCase().includes("male")) ||
      v.find(x => x.lang.startsWith("en"));
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
      utter.pitch  = 1.05;
      utter.volume = 0.95;
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
