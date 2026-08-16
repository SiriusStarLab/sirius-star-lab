const USER_ID_KEY = "sirius_user_id";

export function getUserId(): string {
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored && stored.length > 4) return stored;

  const newId = "u_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  localStorage.setItem(USER_ID_KEY, newId);
  return newId;
}

export function isOwner(): boolean {
  return localStorage.getItem(USER_ID_KEY) === "garry";
}
