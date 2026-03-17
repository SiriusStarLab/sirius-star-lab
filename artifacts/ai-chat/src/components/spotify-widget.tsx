import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, ExternalLink, MessageCircle, RefreshCw } from "lucide-react";

type NowPlaying = {
  isPlaying: boolean;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArt: string | null;
  trackUrl: string;
  progressMs: number;
  durationMs: number;
};

type RecentTrack = {
  trackName: string;
  artistName: string;
  albumArt: string | null;
  trackUrl: string;
  playedAt: string;
};

interface SpotifyWidgetProps {
  onAskAbout: (prompt: string) => void;
}

export function SpotifyWidget({ onAskAbout }: SpotifyWidgetProps) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch("/api/openai/spotify/now-playing");
      if (!res.ok) throw new Error("Not connected");
      const data = await res.json();
      setNowPlaying(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch("/api/openai/spotify/recently-played");
      if (res.ok) {
        const data = await res.json();
        setRecentTracks(data.slice(0, 3));
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    fetchRecent();
    const interval = setInterval(fetchNowPlaying, 30000);
    return () => clearInterval(interval);
  }, [fetchNowPlaying, fetchRecent]);

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-card border border-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-accent/60 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-accent/60 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-accent/40 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(142 70% 45% / 0.14), hsl(142 70% 45% / 0.05))",
        border: "1px solid hsl(142 70% 45% / 0.38)",
        boxShadow: "0 0 24px hsl(142 70% 45% / 0.08)"
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Spotify</span>
          <button
            onClick={() => { fetchNowPlaying(); fetchRecent(); }}
            className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {nowPlaying?.isPlaying ? (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 mb-3">
                {nowPlaying.albumArt ? (
                  <img src={nowPlaying.albumArt} alt={nowPlaying.albumName} className="w-14 h-14 rounded-lg object-cover shadow-lg" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Music2 className="w-6 h-6 text-green-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="flex gap-0.5 items-end">
                      {[1,2,3].map(i => (
                        <span key={i} className="w-0.5 bg-green-400 rounded-full animate-pulse" style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                    <span className="text-[10px] text-green-400 font-medium">Now Playing</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{nowPlaying.trackName}</p>
                  <p className="text-xs text-muted-foreground truncate">{nowPlaying.artistName}</p>
                </div>
                <a href={nowPlaying.trackUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>

              {nowPlaying.durationMs > 0 && (
                <div className="w-full bg-white/10 rounded-full h-1 mb-3">
                  <div
                    className="bg-green-400 h-1 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (nowPlaying.progressMs / nowPlaying.durationMs) * 100)}%` }}
                  />
                </div>
              )}

              <button
                onClick={() => onAskAbout(`I'm currently listening to "${nowPlaying.trackName}" by ${nowPlaying.artistName}. Tell me something fascinating about this song, this artist, or what makes this music special.`)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg py-2 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Tell me about this track
              </button>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {recentTracks.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Recently played</p>
                  <div className="space-y-2">
                    {recentTracks.map((track, i) => (
                      <button
                        key={i}
                        onClick={() => onAskAbout(`I was just listening to "${track.trackName}" by ${track.artistName}. Tell me something interesting about this song or this artist.`)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                      >
                        {track.albumArt ? (
                          <img src={track.albumArt} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                            <Music2 className="w-3.5 h-3.5 text-green-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{track.trackName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{track.artistName}</p>
                        </div>
                        <MessageCircle className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Nothing playing right now</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
