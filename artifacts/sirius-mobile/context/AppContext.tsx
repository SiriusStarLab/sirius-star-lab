import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus, Platform } from "react-native";
import { flushQueue } from "@/lib/resilient-fetch";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { PROFILE_KEY, USER_ID_KEY, fetchSubscription } from "@/lib/api";

export interface AppProfile {
  aiName: string;
  userName: string;
  subscriptionTier: "free" | "plus" | "pro";
  dailyMessageCount: number;
  dailyLimit: number | null;
  canSendMessage: boolean;
}

interface AppContextValue {
  userId: string | null;
  profile: AppProfile;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  reloadUser: () => Promise<void>;
  signOut: () => Promise<void>;
  updateLocalProfile: (updates: Partial<Pick<AppProfile, "aiName" | "userName">>) => Promise<void>;
}

const defaultProfile: AppProfile = {
  aiName: "Sirius",
  userName: "",
  subscriptionTier: "free",
  dailyMessageCount: 0,
  dailyLimit: 30,
  canSendMessage: true,
};

const iosProfile: AppProfile = {
  aiName: "Sirius",
  userName: "",
  subscriptionTier: "free",
  dailyMessageCount: 0,
  dailyLimit: null,
  canSendMessage: true,
};

const AppContext = createContext<AppContextValue>({
  userId: null,
  profile: defaultProfile,
  loading: true,
  refreshProfile: async () => {},
  reloadUser: async () => {},
  signOut: async () => {},
  updateLocalProfile: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AppProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const initUser = useCallback(async () => {
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) {
      setUserId(stored);
    }
    return stored ?? null;
  }, []);

  const refreshProfile = useCallback(async () => {
    const id = userId || (await initUser());
    if (!id) return;
    try {
      const data = await fetchSubscription(id);
      setProfile(data);
    } catch {
      const saved = await AsyncStorage.getItem(PROFILE_KEY);
      if (saved) {
        const local = JSON.parse(saved);
        setProfile(prev => ({ ...prev, aiName: local.aiName ?? prev.aiName, userName: local.userName ?? prev.userName }));
      }
    }
  }, [userId, initUser]);

  const updateLocalProfile = useCallback(async (updates: Partial<Pick<AppProfile, "aiName" | "userName">>) => {
    setProfile(prev => ({ ...prev, ...updates }));
    const saved = await AsyncStorage.getItem(PROFILE_KEY);
    const current = saved ? JSON.parse(saved) : {};
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ ...current, ...updates }));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const id = await initUser();
        if (!id) { setLoading(false); return; }
        const data = await fetchSubscription(id);
        setProfile(data);
      } catch {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        if (saved) {
          const local = JSON.parse(saved);
          setProfile(prev => ({ ...prev, aiName: local.aiName ?? prev.aiName, userName: local.userName ?? prev.userName }));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [initUser]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === "active") {
        refreshProfile();
        // Item A: flush any messages queued while offline or API was recovering
        flushQueue().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [refreshProfile]);

  const reloadUser = useCallback(async () => {
    await initUser();
  }, [initUser]);

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([USER_ID_KEY, PROFILE_KEY, "sirius_apple_user_id", "sirius_lab_auth"]);
    setUserId(null);
    setProfile(defaultProfile);
  }, []);

  return (
    <AppContext.Provider value={{ userId, profile, loading, refreshProfile, reloadUser, signOut, updateLocalProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
