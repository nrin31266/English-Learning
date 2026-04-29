import handleAPI from "@/apis/handleAPI";
import type { IAsyncState, IErrorState, ILessonDetailsResponse } from "@/types";
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

export const fetchLessonBySlugForShadowing = createAsyncThunk(
  "lessonForShadowing/fetchLessonBySlug",
  async (slug: string, { rejectWithValue }) => {
    try {
      return await handleAPI<ILessonDetailsResponse>({
        endpoint: `/learning-contents/lessons/${slug}`,
        method: "GET",
        isAuth: true,
        params: { mode: "SHADOWING" }
      });
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

// 👉 API gọi âm thầm (Fire and Forget)
export const submitShadowingScore = createAsyncThunk(
  "lessonForShadowing/submitShadowingScore",
  async (
    { lessonId, sentenceId, score }: { lessonId: number; sentenceId: number; score: number },
    { rejectWithValue }
  ) => {
    try {
      await handleAPI({
        endpoint: `/learning-contents/process/progress`,
        method: "PUT",
        isAuth: true,
        body: { lessonId, sentenceId, mode: "SHADOWING", score },
      });
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
    },
    // 👉 UI update trực tiếp vào mảng trong lesson.data
    updateSentenceCompletion: (state, action: PayloadAction<{ sentenceId: number; completed: boolean }>) => {
      const { sentenceId, completed } = action.payload;
      const data = state.lesson.data;
      const shadowingProgress = data?.progressOverview?.shadowing;
      
      if (data && shadowingProgress) {
        const hasId = shadowingProgress.completedSentenceIds.includes(sentenceId);
        
        // 1. Cập nhật danh sách ID
        if (completed && !hasId) {
          shadowingProgress.completedSentenceIds.push(sentenceId);
        } else if (!completed) {
          shadowingProgress.completedSentenceIds = shadowingProgress.completedSentenceIds.filter(id => id !== sentenceId);
        }
        
        // 2. Cập nhật số lượng hoàn thành
        shadowingProgress.totalCompletedSentences = shadowingProgress.completedSentenceIds.length;

        // 3. Cập nhật Status dựa trên số lượng câu hiển thị thực tế
        const displayTotal = data.sentences?.length || 0; // Dùng length của mảng đã lọc
        if (displayTotal > 0 && shadowingProgress.totalCompletedSentences >= displayTotal) {
          shadowingProgress.status = 'COMPLETED';
        } else {
          shadowingProgress.status = 'IN_PROGRESS';
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessonBySlugForShadowing.pending, (state) => {
        state.lesson.status = "loading";
      })
      .addCase(fetchLessonBySlugForShadowing.fulfilled, (state, action) => {
        state.lesson.status = "succeeded";
        state.lesson.data = action.payload;
      })
      .addCase(fetchLessonBySlugForShadowing.rejected, (state, action) => {
        state.lesson.status = "failed";
        state.lesson.error = action.payload as IErrorState;
      })
      .addCase(submitShadowingScore.rejected, (state, action) => {
        console.error("Submit shadowing score âm thầm bị lỗi:", action.payload);
      });
  },
});

export const { resetLessonState, updateSentenceCompletion } = lessonForShadowingSlice.actions;
export default lessonForShadowingSlice.reducer;