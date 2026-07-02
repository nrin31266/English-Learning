export type VocabSessionReward = { sessionId: string; earnedXp: number; earnedCoins: number };

const cache = new Map<string, VocabSessionReward>();
const listeners = new Map<string, Set<(reward: VocabSessionReward) => void>>();

export function publishVocabSessionReward(reward: VocabSessionReward) {
  cache.set(reward.sessionId, reward);
  listeners.get(reward.sessionId)?.forEach((listener) => listener(reward));
  if (cache.size > 50) cache.delete(cache.keys().next().value as string);
}

export function waitForVocabSessionReward(sessionId: string, timeoutMs = 10_000) {
  const cached = cache.get(sessionId);
  if (cached) return Promise.resolve<VocabSessionReward | null>(cached);
  return new Promise<VocabSessionReward | null>((resolve) => {
    const listener = (reward: VocabSessionReward) => { cleanup(); resolve(reward); };
    const timeout = window.setTimeout(() => { cleanup(); resolve(null); }, timeoutMs);
    const cleanup = () => { window.clearTimeout(timeout); listeners.get(sessionId)?.delete(listener); };
    const set = listeners.get(sessionId) || new Set(); set.add(listener); listeners.set(sessionId, set);
  });
}
