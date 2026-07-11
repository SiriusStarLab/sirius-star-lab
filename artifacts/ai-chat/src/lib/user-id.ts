const USER_ID_KEY = "sirius_user_id";

export function getUserId(): string {
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored && stored.length > 4) return stored;
  return "";
}

export function isOwner(): boolean {
  return localStorage.getItem(USER_ID_KEY) === "garry";
}
