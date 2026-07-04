export type LessonReward = { lessonId: string; earnedXp: number; earnedCoins: number };

const cache = new Map<string, LessonReward>();
const listeners = new Map<string, Set<(reward: LessonReward) => void>>();

export function publishLessonReward(reward: LessonReward) {
  cache.set(reward.lessonId, reward);
  listeners.get(reward.lessonId)?.forEach((listener) => listener(reward));
}

export function waitForLessonReward(lessonId: string, timeoutMs = 30000) {
  const cached = cache.get(lessonId);
  if (cached) return Promise.resolve(cached);
  return new Promise<LessonReward | null>((resolve) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      listeners.get(lessonId)?.delete(listener);
    };
    const listener = (reward: LessonReward) => { cleanup(); resolve(reward); };
    const timer = window.setTimeout(() => { cleanup(); resolve(null); }, timeoutMs);
    const current = listeners.get(lessonId) ?? new Set();
    current.add(listener);
    listeners.set(lessonId, current);
  });
}
