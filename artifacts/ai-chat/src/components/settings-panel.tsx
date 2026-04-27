import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Brain, User, Save, RotateCcw, Globe, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { isOwner } from "@/lib/user-id";

const LANGUAGES = [
  { value: "auto", label: "Auto-detect (match what I write)" },
  { value: "English", label: "English" },
  { value: "Spanish", label: "Español — Spanish" },
  { value: "French", label: "Français — French" },
  { value: "German", label: "Deutsch — German" },
  { value: "Portuguese", label: "Português — Portuguese" },
  { value: "Italian", label: "Italiano — Italian" },
  { value: "Dutch", label: "Nederlands — Dutch" },
  { value: "Russian", label: "Русский — Russian" },
  { value: "Arabic", label: "العربية — Arabic" },
  { value: "Chinese (Simplified)", label: "中文简体 — Chinese Simplified" },
  { value: "Chinese (Traditional)", label: "中文繁體 — Chinese Traditional" },
  { value: "Japanese", label: "日本語 — Japanese" },
  { value: "Korean", label: "한국어 — Korean" },
  { value: "Hindi", label: "हिन्दी — Hindi" },
  { value: "Bengali", label: "বাংলা — Bengali" },
  { value: "Urdu", label: "اردو — Urdu" },
  { value: "Turkish", label: "Türkçe — Turkish" },
  { value: "Polish", label: "Polski — Polish" },
  { value: "Swedish", label: "Svenska — Swedish" },
  { value: "Norwegian", label: "Norsk — Norwegian" },
  { value: "Danish", label: "Dansk — Danish" },
  { value: "Finnish", label: "Suomi — Finnish" },
  { value: "Czech", label: "Čeština — Czech" },
  { value: "Romanian", label: "Română — Romanian" },
  { value: "Hungarian", label: "Magyar — Hungarian" },
  { value: "Greek", label: "Ελληνικά — Greek" },
  { value: "Hebrew", label: "עברית — Hebrew" },
  { value: "Thai", label: "ภาษาไทย — Thai" },
  { value: "Vietnamese", label: "Tiếng Việt — Vietnamese" },
  { value: "Indonesian", label: "Bahasa Indonesia — Indonesian" },
  { value: "Malay", label: "Bahasa Melayu — Malay" },
  { value: "Filipino", label: "Filipino — Filipino" },
  { value: "Swahili", label: "Kiswahili — Swahili" },
  { value: "Yoruba", label: "Yorùbá — Yoruba" },
  { value: "Zulu", label: "isiZulu — Zulu" },
  { value: "Amharic", label: "አማርኛ — Amharic" },
  { value: "Persian", label: "فارسی — Persian" },
  { value: "Ukrainian", label: "Українська — Ukrainian" },
  { value: "Croatian", label: "Hrvatski — Croatian" },
  { value: "Serbian", label: "Српски — Serbian" },
  { value: "Bulgarian", label: "Български — Bulgarian" },
  { value: "Slovak", label: "Slovenčina — Slovak" },
  { value: "Catalan", label: "Català — Catalan" },
];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { profile, isLoading, isSaving, saveProfile } = useProfile();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const [aiName, setAiName] = useState("");
  const [aiPersonality, setAiPersonality] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("auto");
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);

  const [pinInput, setPinInput] = useState("");
  const [pinState, setPinState] = useState<"idle" | "success" | "error">("idle");
  const [linked, setLinked] = useState(false);

  useEffect(() => { setLinked(isOwner()); }, [isOpen]);

  const handleLinkPin = () => {
    if (pinInput.trim() === "169323") {
      localStorage.setItem("sirius_user_id", "garry");
      setPinState("success");
      setLinked(true);
      setPinInput("");
      setTimeout(() => { setPinState("idle"); window.location.reload(); }, 1200);
    } else {
      setPinState("error");
      setTimeout(() => setPinState("idle"), 2000);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      setAiName(profile.aiName || "Sirius");
      setAiPersonality(profile.aiPersonality || "");
      setPreferredLanguage(profile.preferredLanguage || "auto");
      setDisplayName(profile.displayName || localStorage.getItem("sirius_display_name") || "");
    }
  }, [profile, isLoading]);

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    // Keep localStorage in sync for Star Lab greeting (works without a round-trip)
    if (trimmedName) {
      localStorage.setItem("sirius_display_name", trimmedName);
    } else {
      localStorage.removeItem("sirius_display_name");
    }
    await saveProfile({ displayName: trimmedName, aiName, aiPersonality, preferredLanguage });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setAiName("Sirius");
    setAiPersonality("");
    setPreferredLanguage("auto");
  };

  const memories = profile.memories
    ? profile.memories.split("\n").filter(Boolean)
    : [];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 inset-y-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Your AI</h2>
                  <p className="text-xs text-muted-foreground">Shape your partnership</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close settings">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Your name</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  How should Sirius address you? Used in Star Lab and personal greetings.
                </p>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex, Maya, Dr. Singh..."
                  maxLength={50}
                  className="w-full rounded-xl bg-accent border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Give your AI a name</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  This is how your AI will introduce itself. Pick anything you like.
                </p>
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="e.g. Nova, Sage, Max, Aria..."
                  maxLength={40}
                  className="w-full rounded-xl bg-accent border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Shape their personality</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Describe the character, tone, and style you want. Your AI will make it their own. There are no wrong answers.
                </p>
                <textarea
                  value={aiPersonality}
                  onChange={(e) => setAiPersonality(e.target.value)}
                  placeholder="e.g. Warm and patient, speaks simply, loves jokes and uses lots of emojis. Always encouraging, never rushes me..."
                  rows={5}
                  maxLength={1000}
                  className="w-full rounded-xl bg-accent border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground/60 mt-1 text-right">{aiPersonality.length}/1000</p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Language</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose a fixed language, or leave on auto-detect to let Sirius match whatever language you write in.
                </p>
                <select
                  value={preferredLanguage}
                  onChange={e => setPreferredLanguage(e.target.value)}
                  className="w-full rounded-xl bg-accent border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                {preferredLanguage !== "auto" && (
                  <p className="text-xs text-primary/70 mt-2">
                    Sirius will always respond in {preferredLanguage}, and the voice guides will be spoken in {preferredLanguage} too.
                  </p>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">What your AI remembers about you</h3>
                </div>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 bg-accent/60 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : memories.length === 0 ? (
                  <div className="rounded-xl bg-accent/40 border border-border/50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nothing yet — your AI will start learning about you as you chat. It remembers things like your name, interests, and preferences automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {memories.map((memory, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-accent/40 border border-border/50 px-3 py-2"
                      >
                        <span className="text-primary mt-0.5">·</span>
                        <span className="text-sm text-foreground/80">{memory}</span>
                      </div>
                    ))}
                  </div>
                )}
                {memories.length > 0 && (
                  <p className="text-xs text-muted-foreground/60 mt-3">
                    These memories are built automatically from your conversations and are stored only for you.
                  </p>
                )}
              </section>

              {/* Device link section */}
              <section className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Link this device</h3>
                </div>
                {linked ? (
                  <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/25 px-3 py-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-green-600">Device linked to your account.</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Already have an account? Enter your account PIN to link this device and restore your memory.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Account PIN"
                        value={pinInput}
                        onChange={e => { setPinInput(e.target.value); setPinState("idle"); }}
                        onKeyDown={e => e.key === "Enter" && handleLinkPin()}
                        maxLength={12}
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button
                        size="sm"
                        variant={pinState === "error" ? "destructive" : "outline"}
                        onClick={handleLinkPin}
                        disabled={!pinInput.trim() || pinState === "success"}
                        className="flex items-center gap-1.5"
                      >
                        {pinState === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : pinState === "error" ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                        {pinState === "success" ? "Linked!" : pinState === "error" ? "Incorrect" : "Link"}
                      </Button>
                    </div>
                  </>
                )}
              </section>
            </div>

            <div className="p-6 border-t border-border flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 transition-all",
                  saved && "bg-green-600 hover:bg-green-600"
                )}
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : saved ? "Saved!" : "Save changes"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
