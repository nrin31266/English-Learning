// src/store/activeLessonSlice.ts

import handleAPI from "@/apis/handleAPI";
import type { IAsyncState, IErrorState, ILessonDetailsResponse } from "@/types";
import type { LearningMode, ProgressUpdateResponse } from "@/types/lessonProgress";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ILessonReducer {
  lesson: IAsyncState<ILessonDetailsResponse | null>;
}

const initialState: ILessonReducer = {
  lesson: {
    data: null,
    status: "idle",
    error: { code: null, message: null },
  },
};

// 1. Gộp chung API Fetch
export const fetchLessonById = createAsyncThunk(
  "activeLesson/fetchLessonById",
  async ({ id, mode }: { id: number; mode: LearningMode }, { rejectWithValue }) => {
    try {
      return await handleAPI<ILessonDetailsResponse>({
        endpoint: `/learning-contents/lessons/${id}`,
        method: "GET",
        isAuth: true,
        params: { mode }, // Truyền linh hoạt
      });
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

// 2. Gộp chung API Submit 1 câu
export const submitLessonScore = createAsyncThunk(
  "activeLesson/submitScore",
  async (
    { lessonId, sentenceId, mode, score }: { lessonId: number; sentenceId: number; mode: LearningMode; score: number },
    { rejectWithValue }
  ) => {
    try {
      return await handleAPI<ProgressUpdateResponse>({
        endpoint: `/learning-contents/process/progress`,
        method: "PUT",
        isAuth: true,
        body: { lessonId, sentenceId, mode, score },
      });
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

// 3. Gộp chung API Submit Batch
export const submitBatchLessonScore = createAsyncThunk(
  "activeLesson/submitBatch",
  async (
    { lessonId, sentenceIds, mode, score }: { lessonId: number; sentenceIds: number[]; mode: LearningMode; score: number },
    { rejectWithValue }
  ) => {
    try {
      return await handleAPI({
        endpoint: `/learning-contents/process/progress/batch`,
        method: "PUT",
        isAuth: true,
        body: { lessonId, sentenceIds, mode, score },
      });
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const activeLessonSlice = createSlice({
  name: "activeLesson",
  initialState,
  reducers: {
    resetLessonState: (state) => {
      state.lesson = initialState.lesson;
    },
    
    // 👉 Gộp 2 hàm update cũ thành 1 hàm "tự tính toán" cực mạnh
    updateLocalProgress: (state, action: PayloadAction<{ sentenceId: number; score: number; mode: LearningMode }>) => {
      const { sentenceId, score, mode } = action.payload;
      const data = state.lesson.data;
      
      if (!data || !data.progressOverview) return;

      // Ép kiểu chữ thường để chọc đúng vào 'shadowing' hoặc 'dictation' trong object
      const progressKey = mode.toLowerCase() as 'shadowing' | 'dictation';
      const targetProgress = data.progressOverview[progressKey];
      
      if (!targetProgress) return;

      const previous = targetProgress.progressItems?.[sentenceId];
      targetProgress.progressItems ??= {};
      targetProgress.progressItems[sentenceId] = {
        bestScore: Math.max(previous?.bestScore ?? 0, score),
        latestScore: score,
        attemptCount: (previous?.attemptCount ?? 0) + 1,
        firstCompletedAt: previous?.firstCompletedAt ?? Date.now(),
        lastPracticedAt: Date.now(),
      };
      targetProgress.completedSentenceCount = Object.keys(targetProgress.progressItems).length;
      targetProgress.totalSentenceCount = data.sentences?.length || 0;
      if (targetProgress.totalSentenceCount > 0
          && targetProgress.completedSentenceCount >= targetProgress.totalSentenceCount) {
          targetProgress.status = 'COMPLETED';
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessonById.pending, (state) => {
        state.lesson.status = "loading";
      })
      .addCase(fetchLessonById.fulfilled, (state, action) => {
        state.lesson.status = "succeeded";
        state.lesson.data = action.payload;
      })
      .addCase(fetchLessonById.rejected, (state, action) => {
        state.lesson.status = "failed";
        state.lesson.error = action.payload as IErrorState;
      })
      .addCase(submitLessonScore.rejected, (_state, action) => {
        console.error(`Submit score bị lỗi:`, action.payload);
      })
      .addCase(submitLessonScore.fulfilled, (state, action) => {
        const response = action.payload;
        const mode = response?.progress?.mode?.toLowerCase() as 'shadowing' | 'dictation' | undefined;
        if (mode && state.lesson.data?.progressOverview) {
          state.lesson.data.progressOverview[mode] = response.progress;
        }
      })
      .addCase(submitBatchLessonScore.rejected, (_state, action) => {
        console.error(`Batch sync bị lỗi:`, action.payload);
      });
  },
});

export const { resetLessonState, updateLocalProgress } = activeLessonSlice.actions;
export default activeLessonSlice.reducer;
