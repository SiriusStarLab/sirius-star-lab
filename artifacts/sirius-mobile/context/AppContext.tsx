import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus, Platform } from "react-native";
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
  updateLocalProfile: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AppProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const initUser = useCallback(async () => {
    const OWNER_ID = "garry";
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (!stored || stored !== OWNER_ID) {
      await AsyncStorage.setItem(USER_ID_KEY, OWNER_ID);
    }
    setUserId(OWNER_ID);
    return OWNER_ID;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (Platform.OS === "ios") {
      const saved = await AsyncStorage.getItem(PROFILE_KEY);
      if (saved) {
        const local = JSON.parse(saved);
        setProfile(prev => ({ ...iosProfile, aiName: local.aiName ?? prev.aiName, userName: local.userName ?? prev.userName }));
      }
      return;
    }
    const id = userId || (await initUser());
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
      await initUser();
      if (Platform.OS === "ios") {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        if (saved) {
          const local = JSON.parse(saved);
          setProfile({ ...iosProfile, aiName: local.aiName ?? iosProfile.aiName, userName: local.userName ?? iosProfile.userName });
        } else {
          setProfile(iosProfile);
        }
        setLoading(false);
        return;
      }
      try {
        const id = await initUser();
        const data = await fetchSubscription(id);
        setProfile(data);
      } catch {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        if (saved) {
          const local = JSON.parse(saved);
          setProfile(prev => ({ ...prev, ...local }));
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
      }
    });
    return () => subscription.remove();
  }, [refreshProfile]);

  return (
    <AppContext.Provider value={{ userId, profile, loading, refreshProfile, updateLocalProfile }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
