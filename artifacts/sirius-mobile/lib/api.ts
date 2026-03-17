import AsyncStorage from "@react-native-async-storage/async-storage";

export const USER_ID_KEY = "sirius_user_id";
export const PROFILE_KEY = "sirius_profile";

export function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}/api/`;
  }
  return "/api/";
}

export async function getUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export interface UserProfile {
  aiName: string;
  userName: string;
  subscriptionTier: "free" | "plus" | "pro";
  dailyMessageCount: number;
  dailyLimit: number | null;
  canSendMessage: boolean;
}

export async function fetchSubscription(userId: string): Promise<UserProfile> {
  const base = getApiBase();
  const res = await fetch(`${base}subscription/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch subscription");
  const data = await res.json();
  const saved = await AsyncStorage.getItem(PROFILE_KEY);
  const local = saved ? JSON.parse(saved) : {};
  return {
    aiName: local.aiName ?? "Sirius",
    userName: local.userName ?? "",
    subscriptionTier: data.tier ?? "free",
    dailyMessageCount: data.dailyMessageCount ?? 0,
    dailyLimit: data.dailyLimit,
    canSendMessage: data.canSendMessage ?? true,
  };
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const base = getApiBase();
  const res = await fetch(`${base}openai/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function createConversation(title: string): Promise<Conversation> {
  const base = getApiBase();
  const res = await fetch(`${base}openai/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function deleteConversation(id: number): Promise<void> {
  const base = getApiBase();
  await fetch(`${base}openai/conversations/${id}`, { method: "DELETE" });
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageB64?: string;
}

let messageCounter = 0;
export function generateId(): string {
  messageCounter++;
  return `msg-${Date.now()}-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
}
