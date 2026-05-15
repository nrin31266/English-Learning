const PROGRESS_KEY = "vocab_progress";
const SESSION_KEY = "vocab_session";

export interface VocabProgressRecord {
  wordEntryId: string;
  subtopicId: string;
  topicId: string;
  status: "new" | "learning" | "reviewing" | "mastered";
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: number;
  sessionHistory: { mode: string; correct: boolean; timestamp: number }[];
}

export interface VocabSession {
  topicId: string;
  subtopicId: string;
  currentIndex: number;
  mode: string;
  startedAt: number;
  wordEntryIds: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────

function loadAll(): Record<string, VocabProgressRecord> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, VocabProgressRecord>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

// ── Progress ─────────────────────────────────────────────────────────────

export function getProgress(wordEntryId: string): VocabProgressRecord | undefined {
  return loadAll()[wordEntryId];
}

export function getAllProgress(subtopicId: string): VocabProgressRecord[] {
  const all = loadAll();
  return Object.values(all).filter((r) => r.subtopicId === subtopicId);
}

export function updateProgress(record: VocabProgressRecord): void {
  const all = loadAll();
  all[record.wordEntryId] = record;
  saveAll(all);
}

export function recordAnswer(
  wordEntryId: string,
  subtopicId: string,
  topicId: string,
  mode: string,
  correct: boolean
): void {
  const all = loadAll();
  const existing = all[wordEntryId];
  const now = Date.now();

  const record: VocabProgressRecord = existing ?? {
    wordEntryId,
    subtopicId,
    topicId,
    status: "new",
    correctCount: 0,
    wrongCount: 0,
    lastReviewedAt: now,
    sessionHistory: [],
  };

  if (correct) {
    record.correctCount += 1;
    if (record.status === "new") record.status = "learning";
    else if (record.status === "learning" && record.correctCount >= 3) record.status = "reviewing";
    else if (record.status === "reviewing" && record.correctCount >= 6) record.status = "mastered";
  } else {
    record.wrongCount += 1;
    if (record.status === "mastered") record.status = "reviewing";
    else if (record.status === "reviewing") record.status = "learning";
  }

  record.lastReviewedAt = now;
  record.sessionHistory.push({ mode, correct, timestamp: now });
  all[wordEntryId] = record;
  saveAll(all);
}

// ── Session ──────────────────────────────────────────────────────────────

export function saveSession(session: VocabSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): VocabSession | undefined {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export function deleteSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── Batch sync payload ───────────────────────────────────────────────────

export interface SyncPayload {
  wordEntryId: string;
  status: string;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: number;
}

export function buildSyncPayload(records: VocabProgressRecord[]): SyncPayload[] {
  return records.map((r) => ({
    wordEntryId: r.wordEntryId,
    status: r.status,
    correctCount: r.correctCount,
    wrongCount: r.wrongCount,
    lastReviewedAt: r.lastReviewedAt,
  }));
}
