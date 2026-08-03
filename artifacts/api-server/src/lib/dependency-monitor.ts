// Dependency Monitor — proactively checks external API health every N minutes
export async function startDependencyMonitor(intervalMinutes = 60): Promise<void> {
  const check = async () => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) console.warn("[DependencyMonitor] OpenRouter returned", res.status);
    } catch {
      console.warn("[DependencyMonitor] OpenRouter unreachable");
    }
  };
  setTimeout(check, 60_000);
  setInterval(check, intervalMinutes * 60 * 1000);
  console.log(`[DependencyMonitor] Started — checking every ${intervalMinutes} minutes`);
}
