import { useState, useEffect, useCallback } from "react";
import { getUserId } from "@/lib/user-id";

export type UserProfile = {
  userId: string;
  displayName: string;
  aiName: string;
  aiPersonality: string;
  memories: string;
  preferredLanguage: string;
};

const DEFAULT_PROFILE: UserProfile = {
  userId: "",
  displayName: "",
  aiName: "Sirius",
  aiPersonality: "",
  memories: "",
  preferredLanguage: "auto",
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const userId = getUserId();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/openai/profiles/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(async (updates: { displayName?: string; aiName?: string; aiPersonality?: string; preferredLanguage?: string }) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/openai/profiles/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

  return { profile, isLoading, isSaving, saveProfile, refetch: fetchProfile };
}
