import handleAPI from "@/apis/handleAPI";
import type { IVocabWordEntry } from "@/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  LocalVocabWordProgress,
  ProgressMap,
  ReviewRating,
  VocabLearningMode,
} from "@/features/vocab/components/learning/vocabLearningUtils";

type Status = "idle" | "loading" | "succeeded" | "failed";
type SessionWord = {
  wordId: string;
  rating: ReviewRating;
  completedModes: VocabLearningMode[];
};
type ServerWordProgress = {
  wordId: string;
  reviewRating: ReviewRating;
  masteryScore: number;
  completedModes?: VocabLearningMode[];
  attemptCount: number;
  lastStudiedAt?: string;
  nextReviewAt?: string | null;
};
type ServerProgressResponse = {
  subtopicId: string;
  words: Record<string, ServerWordProgress>;
  learnedCount?: number;
  totalWordCount?: number;
  masteredCount?: number;
  dueReviewCount?: number;
  newCount?: number;
  status?: "NOT_STARTED" | "LEARNING" | "LEARNED";
  sessionId?: string;
  rewardExpected?: boolean;
};

export type VocabProgressDashboard = {
  totalLearnedWords: number;
  totalMasteredWords: number;
  dueReviewWords: number;
  activityByDate: Record<string, number>;
  topics: Array<{
    topicId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    cefrRange?: string;
    subtopicCount: number;
    learnedWords: number;
    totalWords: number;
    dueReviewWords: number;
    masteredCount?: number;
    dueReviewCount?: number;
    newCount?: number;
    status: "IN_PROGRESS" | "COMPLETED";
    learningStatus?: "NOT_STARTED" | "LEARNING" | "LEARNED";
  }>;
  subtopics: Array<{
    subtopicId: string;
    learnedWords: number;
    totalWords: number;
    dueReviewWords: number;
    status: "IN_PROGRESS" | "COMPLETED";
    masteredCount?: number;
    dueReviewCount?: number;
    newCount?: number;
    learningStatus?: "NOT_STARTED" | "LEARNING" | "LEARNED";
  }>;
};
export type VocabReviewQueue = {
  totalDue: number;
  words: IVocabWordEntry[];
  progress: ProgressMap;
};
export type VocabScopedProgress = Pick<
  VocabProgressDashboard,
  "topics" | "subtopics"
>;

const toLocalWordProgress = (
  wordId: string,
  item: ServerWordProgress,
): LocalVocabWordProgress => ({
  wordId,
  seenCount: item.attemptCount || 1,
  completedModes: item.completedModes || [],
  modeScores: {},
  lastMode: item.completedModes?.at(-1),
  lastStudiedAt: item.lastStudiedAt,
  reviewRating: item.reviewRating,
  nextReviewAt: item.nextReviewAt,
  needsReview: ["AGAIN", "HARD", "MEDIUM"].includes(item.reviewRating),
  isDone: item.reviewRating === "DONE",
  masteryScore: Math.min(100, Math.max(0, item.masteryScore || 0)),
});
const toLocalProgress = (response: ServerProgressResponse): ProgressMap =>
  Object.fromEntries(
    Object.entries(response.words || {}).map(([id, item]) => [
      id,
      toLocalWordProgress(id, item),
    ]),
  );
const rejectMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

export const fetchVocabDashboard = createAsyncThunk(
  "vocabProgress/fetchDashboard",
  async (_, { rejectWithValue }) => {
    try {
      return await handleAPI<VocabProgressDashboard>({
        endpoint: "/dictionaries/vocab/progress/dashboard",
      });
    } catch (error) {
      return rejectWithValue(rejectMessage(error));
    }
  },
);
export const fetchVocabProgress = createAsyncThunk(
  "vocabProgress/fetchSubtopic",
  async (subtopicId: string, { rejectWithValue }) => {
    try {
      const response = await handleAPI<ServerProgressResponse>({
        endpoint: `/dictionaries/vocab/subtopics/${subtopicId}/progress`,
      });
      return { subtopicId, progress: toLocalProgress(response) };
    } catch (error) {
      return rejectWithValue(rejectMessage(error));
    }
  },
);
export const fetchScopedVocabProgress = createAsyncThunk(
  "vocabProgress/fetchScoped",
  async (topicIds: string[], { rejectWithValue }) => {
    try {
      return await handleAPI<VocabScopedProgress>({
        endpoint: "/dictionaries/vocab/progress/scoped",
        params: { topicIds },
      });
    } catch (error) {
      return rejectWithValue(rejectMessage(error));
    }
  },
);
export const submitVocabSession = createAsyncThunk(
  "vocabProgress/submitSession",
  async (
    {
      subtopicId,
      sessionId,
      words,
    }: { subtopicId: string; sessionId: string; words: SessionWord[] },
    { rejectWithValue },
  ) => {
    try {
      const response = await handleAPI<ServerProgressResponse>({
        endpoint: `/dictionaries/vocab/subtopics/${subtopicId}/progress/sessions`,
        method: "POST",
        body: { sessionId, words },
      });
      return {
        subtopicId,
        progress: toLocalProgress(response),
        sessionId,
        rewardExpected: !!response.rewardExpected,
      };
    } catch (error) {
      return rejectWithValue(rejectMessage(error));
    }
  },
);
export const fetchVocabReviewQueue = createAsyncThunk(
  "vocabProgress/fetchReviewQueue",
  async (_, { rejectWithValue }) => {
    try {
      const response = await handleAPI<{
        totalDue: number;
        words: Array<{ word: IVocabWordEntry; progress: ServerWordProgress }>;
      }>({ endpoint: "/dictionaries/vocab/progress/review?limit=10" });
      return {
        totalDue: response.totalDue,
        words: response.words.map((item) => item.word),
        progress: Object.fromEntries(
          response.words.map((item) => [
            item.word.id,
            toLocalWordProgress(item.word.id, item.progress),
          ]),
        ) as ProgressMap,
      };
    } catch (error) {
      return rejectWithValue(rejectMessage(error));
    }
  },
);
export const submitVocabReviewSession = createAsyncThunk(
  "vocabProgress/submitReviewSession",
  async (
    { sessionId, words }: { sessionId: string; words: SessionWord[] },
    { rejectWithValue },
  ) => {
    try {
      const response = await handleAPI<ServerProgressResponse>({
        endpoint: "/dictionaries/vocab/progress/review/sessions",
        method: "POST",
        body: { sessionId, words },
      });
      return {
        progress: toLocalProgress(response),
        sessionId,
        rewardExpected: !!response.rewardExpected,
      };
    } catch (error) {
      return rejectWithValue(rejectMessage(error));
    }
  },
);

type State = {
  dashboard: VocabProgressDashboard | null;
  dashboardStatus: Status;
  topicSummaries: VocabProgressDashboard["topics"];
  subtopicSummaries: VocabProgressDashboard["subtopics"];
  progressBySubtopic: Record<string, ProgressMap>;
  reviewQueue: VocabReviewQueue | null;
  reviewStatus: Status;
};
const initialState: State = {
  dashboard: null,
  dashboardStatus: "idle",
  topicSummaries: [],
  subtopicSummaries: [],
  progressBySubtopic: {},
  reviewQueue: null,
  reviewStatus: "idle",
};
const slice = createSlice({
  name: "vocabProgress",
  initialState,
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(fetchVocabDashboard.pending, (state) => {
        state.dashboardStatus = "loading";
      })
      .addCase(fetchVocabDashboard.fulfilled, (state, action) => {
        state.dashboardStatus = "succeeded";
        state.dashboard = action.payload;
      })
      .addCase(fetchVocabDashboard.rejected, (state) => {
        state.dashboardStatus = "failed";
      })
      .addCase(fetchVocabProgress.fulfilled, (state, action) => {
        state.progressBySubtopic[action.payload.subtopicId] =
          action.payload.progress;
      })
      .addCase(fetchScopedVocabProgress.fulfilled, (state, action) => {
        state.topicSummaries = action.payload.topics;
        state.subtopicSummaries = action.payload.subtopics;
      })
      .addCase(submitVocabSession.fulfilled, (state, action) => {
        state.progressBySubtopic[action.payload.subtopicId] =
          action.payload.progress;
      })
      .addCase(fetchVocabReviewQueue.pending, (state) => {
        state.reviewStatus = "loading";
      })
      .addCase(fetchVocabReviewQueue.fulfilled, (state, action) => {
        state.reviewStatus = "succeeded";
        state.reviewQueue = action.payload;
      })
      .addCase(fetchVocabReviewQueue.rejected, (state) => {
        state.reviewStatus = "failed";
        state.reviewQueue = null;
      }),
});
export default slice.reducer;
