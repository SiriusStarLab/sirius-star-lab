export function getApiBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalised = base.endsWith("/") ? base : `${base}/`;
  return `${normalised}api/`;
}
