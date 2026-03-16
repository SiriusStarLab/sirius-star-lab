import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

type WisdomQuote = {
  text: string;
  source: string;
  tradition: string;
  emoji: string;
};

const WISDOM_QUOTES: WisdomQuote[] = [
  { text: "Peace comes from within. Do not seek it without.", source: "The Buddha", tradition: "Buddhism", emoji: "☸️" },
  { text: "We cannot choose our external circumstances, but we can always choose how we respond to them.", source: "Epictetus", tradition: "Stoicism", emoji: "🏛️" },
  { text: "Love one another as I have loved you.", source: "John 15:12", tradition: "Christianity", emoji: "✝️" },
  { text: "Verily, with every difficulty there is relief.", source: "Quran 94:6", tradition: "Islam", emoji: "☪️" },
  { text: "Do not judge your neighbour until you have stood in their place.", source: "Talmud, Avot 2:5", tradition: "Judaism", emoji: "✡️" },
  { text: "You have a right to perform your duties, but not to the fruits of your actions.", source: "Bhagavad Gita 2:47", tradition: "Hinduism", emoji: "🕉️" },
  { text: "A journey of a thousand miles begins with a single step.", source: "Lao Tzu", tradition: "Taoism", emoji: "☯️" },
  { text: "You have power over your mind, not outside events. Realise this, and you will find strength.", source: "Marcus Aurelius", tradition: "Stoicism", emoji: "🏛️" },
  { text: "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there.", source: "Rumi", tradition: "Sufism", emoji: "🌙" },
  { text: "In the company of the holy, one becomes holy.", source: "Guru Granth Sahib", tradition: "Sikhism", emoji: "🔯" },
  { text: "Know thyself.", source: "Socrates", tradition: "Philosophy", emoji: "🦉" },
  { text: "The mind is everything. What you think, you become.", source: "The Buddha", tradition: "Buddhism", emoji: "☸️" },
  { text: "Ask, and it shall be given you; seek, and ye shall find.", source: "Matthew 7:7", tradition: "Christianity", emoji: "✝️" },
  { text: "The best of people are those who are most beneficial to others.", source: "Prophet Muhammad ﷺ", tradition: "Islam", emoji: "☪️" },
  { text: "Wherever you go, go with all your heart.", source: "Confucius", tradition: "Confucianism", emoji: "🌸" },
  { text: "Be the change you wish to see in the world.", source: "Mahatma Gandhi", tradition: "Hindu Philosophy", emoji: "🕉️" },
  { text: "The unexamined life is not worth living.", source: "Socrates", tradition: "Philosophy", emoji: "🦉" },
  { text: "Silence is the language of God; all else is poor translation.", source: "Rumi", tradition: "Sufism", emoji: "🌙" },
  { text: "Treat others as thou wouldst be treated thyself.", source: "Guru Nanak Dev Ji", tradition: "Sikhism", emoji: "🔯" },
  { text: "The present moment always will have been.", source: "Stoic Meditation", tradition: "Stoicism", emoji: "🏛️" },
  { text: "The noble soul has reverence for itself.", source: "Friedrich Nietzsche", tradition: "Philosophy", emoji: "🦉" },
  { text: "This too shall pass.", source: "Ancient Persian Adage", tradition: "Universal", emoji: "⭐" },
  { text: "The earth does not belong to us — we belong to the earth.", source: "Chief Seattle", tradition: "Indigenous Wisdom", emoji: "🌿" },
  { text: "To live is the rarest thing in the world. Most people just exist.", source: "Oscar Wilde", tradition: "Philosophy", emoji: "🦉" },
  { text: "Your task is not to seek for love, but merely to seek and find all the barriers within yourself that you have built against it.", source: "Rumi", tradition: "Sufism", emoji: "🌙" },
  { text: "When you arise in the morning, think of what a precious privilege it is to be alive — to breathe, to think, to enjoy, to love.", source: "Marcus Aurelius", tradition: "Stoicism", emoji: "🏛️" },
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", source: "Thich Nhat Hanh", tradition: "Buddhism", emoji: "☸️" },
  { text: "You give but little when you give of your possessions. It is when you give of yourself that you truly give.", source: "Kahlil Gibran", tradition: "Mysticism", emoji: "🌙" },
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response.", source: "Viktor Frankl", tradition: "Philosophy", emoji: "🦉" },
  { text: "You alone are enough. You have nothing to prove to anybody.", source: "Maya Angelou", tradition: "Universal", emoji: "⭐" },
  { text: "I beg you… to have patience with everything unresolved in your heart and try to love the questions themselves.", source: "Rainer Maria Rilke", tradition: "Philosophy", emoji: "🦉" },
  { text: "The wound is the place where the light enters you.", source: "Rumi", tradition: "Sufism", emoji: "🌙" },
  { text: "If you are irritated by every rub, how will your mirror be polished?", source: "Rumi", tradition: "Sufism", emoji: "🌙" },
  { text: "We are not human beings having a spiritual experience; we are spiritual beings having a human experience.", source: "Pierre Teilhard de Chardin", tradition: "Mysticism", emoji: "✨" },
  { text: "What you seek is seeking you.", source: "Rumi", tradition: "Sufism", emoji: "🌙" },
  { text: "In every walk with nature, one receives far more than they seek.", source: "John Muir", tradition: "Universal", emoji: "🌿" },
  { text: "The greatest weapon against stress is our ability to choose one thought over another.", source: "William James", tradition: "Philosophy", emoji: "🦉" },
  { text: "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.", source: "Martin Luther King Jr.", tradition: "Universal", emoji: "⭐" },
  { text: "When I let go of what I am, I become what I might be.", source: "Lao Tzu", tradition: "Taoism", emoji: "☯️" },
  { text: "The soul that sees beauty may sometimes walk alone.", source: "Johann Wolfgang von Goethe", tradition: "Philosophy", emoji: "🦉" },
];

function getDailyQuoteIndex(offset = 0): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return (dayOfYear + offset) % WISDOM_QUOTES.length;
}

interface DailyWisdomProps {
  onReflect: (prompt: string) => void;
}

export function DailyWisdom({ onReflect }: DailyWisdomProps) {
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const quote = useMemo(() => WISDOM_QUOTES[getDailyQuoteIndex(offset)], [offset]);

  const handleNext = () => setOffset((o) => o + 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="w-full rounded-2xl bg-gradient-to-br from-primary/5 to-accent/30 border border-border/60 overflow-hidden"
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{quote.emoji}</span>
          <div>
            <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider">A word for today</p>
            <p className="text-xs text-muted-foreground">{quote.tradition}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <motion.div
        initial={false}
        animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        style={{ overflow: "hidden" }}
      >
        <div className="px-5 pb-4 space-y-4">
          <blockquote className="text-sm text-foreground/90 leading-relaxed italic">
            "{quote.text}"
          </blockquote>
          <p className="text-xs text-muted-foreground">— {quote.source}</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onReflect(`I want to sit with this teaching from ${quote.tradition}: "${quote.text}" — ${quote.source}. Help me understand it deeply — what it's really saying, where it came from, and how someone might carry it into their life today.`)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-lg py-2 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Sit with this
            </button>
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-1.5 text-xs font-medium bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 transition-colors"
              title="Another word"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
