// src/store/lessonForShadowingSlide.ts

import handleAPI from "@/apis/handleAPI";
import type {
  IAsyncState,
  IErrorState,
  ILessonDetailsResponse,
} from "@/types";
import { type LessonShadowingProgress, type ShadowingScoreResponse } from "@/types/shadowingProgress";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ILessonReducer {
  lesson: IAsyncState<ILessonDetailsResponse & {
    progress: LessonShadowingProgress
  } | null>;
  completedIds: number[] // ko dung set vi non-serializable
}

const initialState: ILessonReducer = {
  lesson: {
    data: null,
    status: "idle",
    error: {
      code: null,
      message: null,
    },
  },
  completedIds: [] // 👈 Lưu sentenceId đã hoàn thành để UI dễ check
};

// GET /learning-contents/learner/lessons/{slug}
export const fetchLessonBySlug = createAsyncThunk(
  "lessonForShadowing/fetchLessonBySlug",
  async (slug: string, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ILessonDetailsResponse & { progress: LessonShadowingProgress }>({
        endpoint: `/learning-contents/lessons/${slug}`,
        method: "GET",
        isAuth: true,
        params: {
          mode: "SHADOWING",
        }
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

// Submit shadowing score
export const submitShadowingScore = createAsyncThunk(
  "lessonForShadowing/submitShadowingScore",
  async (
    {
      lessonId,
      sentenceId,
      fluencyScore,
      score,
    }: {
      lessonId: number;
      sentenceId: number;
      fluencyScore: number;
      score: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await handleAPI<ShadowingScoreResponse>({
        endpoint: `/learning-contents/process/shadowing/${lessonId}/${sentenceId}`,
        method: "PUT",
        isAuth: true,
        body: {
          fluencyScore,
          score,
        },
      });

      return {
        ...res,
        sentenceId,
        fluencyScore,
        score,
      };
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const lessonForShadowingSlice = createSlice({
  name: "lessonForShadowing",
  initialState,
  reducers: {
    resetLessonState: (state) => {
      state.lesson = initialState.lesson;
      state.completedIds = []; // 👈 RESET
    },
    // 👉 Cập nhật optimistic update khi complete
    updateSentenceCompletion: (state, action: PayloadAction<{ sentenceId: number; completed: boolean, score: number }>) => {
      const { sentenceId, completed, score } = action.payload;
      const progress = state.lesson.data?.progress;

      // Cập nhật completedIds (dùng array)
      if (completed && !state.completedIds.includes(sentenceId)) {
        state.completedIds.push(sentenceId);
      } else if (!completed) {
        state.completedIds = state.completedIds.filter(id => id !== sentenceId);
      }

      // Cập nhật progress nếu có
      if (progress && progress.sentenceAttempts) {
        const attempt = progress.sentenceAttempts.find(a => a.sentenceId === sentenceId);
        if (!attempt) {
          progress.sentenceAttempts.push({
            sentenceId,
            completed,
            bestScore: score,
            id: Date.now(), // Tạm thời dùng timestamp làm id cho attempt mới
            userId: "",
            lessonId: state.lesson.data!.id,
            bestFluency: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          attempt.completed = completed;
          attempt.bestScore = Math.max(attempt.bestScore || 0, score);
        }

        const completedCount = progress.sentenceAttempts.filter(a => a.completed).length;
        progress.completedSentences = completedCount;
        progress.completed = progress.totalSentences > 0 && completedCount >= progress.totalSentences;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessonBySlug.pending, (state) => {
        state.lesson.status = "loading";
        state.lesson.error = { code: null, message: null };
      })
      .addCase(fetchLessonBySlug.fulfilled, (state, action) => {
        state.lesson.status = "succeeded";
        state.lesson.data = action.payload;

        // 👉 KHÔI PHỤC completedIds từ progress (dùng array)
        const progress = action.payload.progress;
        const completed: number[] = [];
        if (progress && progress.sentenceAttempts) {
          progress.sentenceAttempts.forEach(attempt => {
            if (attempt.completed) {
              completed.push(attempt.sentenceId);
            }
          });
        }
        state.completedIds = completed;
      })
      .addCase(fetchLessonBySlug.rejected, (state, action) => {
        state.lesson.status = "failed";
        state.lesson.error = action.payload as IErrorState;
      })
      .addCase(submitShadowingScore.fulfilled, (state, action) => {
        const lesson = state.lesson.data;
        if (!lesson || !lesson.progress) return;

        const {
          sentenceId,
          attemptId,
          attemptCompleted,
          lessonCompleted,
          fluencyScore,
          score,
        } = action.payload;

        // 👉 Cập nhật completedIds (dùng array)
        if (attemptCompleted && !state.completedIds.includes(sentenceId)) {
          state.completedIds.push(sentenceId);
        }

        const progress = lesson.progress;

        if (!progress.sentenceAttempts) {
          progress.sentenceAttempts = [];
        }

        let attempt = progress.sentenceAttempts.find(
          (a) => a.sentenceId === sentenceId
        );

        if (!attempt) {
          attempt = {
            id: attemptId,
            userId: "",
            lessonId: lesson.id,
            sentenceId,
            completed: attemptCompleted,
            bestScore: score,
            bestFluency: fluencyScore,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          progress.sentenceAttempts.push(attempt);
        } else {
          attempt.completed = attemptCompleted;


          if (attempt.bestScore === null || score > attempt.bestScore) {
            attempt.bestScore = score;
            attempt.bestFluency = fluencyScore;
          }

          attempt.updatedAt = new Date().toISOString();
        }

        attempt.completed = attemptCompleted;

        const completedCount = progress.sentenceAttempts.filter(a => a.completed).length;
        progress.completedSentences = completedCount;
        progress.completed = lessonCompleted;
        progress.updatedAt = new Date().toISOString();
      })
      .addCase(submitShadowingScore.rejected, (state, action) => {
        console.error("Submit shadowing score failed:", action.payload);
      });
  },
});

export const { resetLessonState, updateSentenceCompletion } = lessonForShadowingSlice.actions;

export default lessonForShadowingSlice.reducer;