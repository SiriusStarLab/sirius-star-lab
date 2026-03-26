const USER_ID_KEY = "sirius_user_id";
const OWNER_USER_ID = "garry";

export function getUserId(): string {
  const stored = localStorage.getItem(USER_ID_KEY);
  if (!stored || stored !== OWNER_USER_ID) {
    localStorage.setItem(USER_ID_KEY, OWNER_USER_ID);
  }
  return OWNER_USER_ID;
}
