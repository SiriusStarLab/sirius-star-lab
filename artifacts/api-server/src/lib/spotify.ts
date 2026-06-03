export async function getUncachableSpotifyClient(): Promise<never> {
  throw new Error("Spotify integration is not configured on this server.");
}
