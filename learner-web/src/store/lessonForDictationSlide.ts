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

export const fetchLessonBySlugForDictation = createAsyncThunk(
  "lessonForDictation/fetchLessonBySlug",
  async (slug: string, { rejectWithValue }) => {
    try {
      return await handleAPI<ILessonDetailsResponse>({
        endpoint: `/learning-contents/lessons/${slug}`,
        method: "GET",
        isAuth: true,
        params: { mode: "DICTATION" }
      });
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);


export const submitDictationScore = createAsyncThunk(
  "lessonForDictation/submitDictationScore",
  async (
    // 👉 Thêm score vào đây
    { lessonId, sentenceId, score }: { lessonId: number; sentenceId: number; score: number },
    { rejectWithValue }
  ) => {
    try {
      await handleAPI({
        endpoint: `/learning-contents/process/progress`,
        method: "PUT",
        isAuth: true,
        // 👉 Gắn score vào body
        body: { lessonId, sentenceId, mode: "DICTATION", score }, 
      });
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);
export const submitBatchDictationScore = createAsyncThunk(
  "lessonForDictation/submitBatch",
  async (
    { lessonId, sentenceIds, score }: { lessonId: number; sentenceIds: number[]; score: number },
    { rejectWithValue }
  ) => {
    try {
      return await handleAPI({
        endpoint: `/learning-contents/process/progress/batch`, // Endpoint mới
        method: "PUT",
        isAuth: true,
        body: { lessonId, sentenceIds, mode: "DICTATION", score },
      });
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const lessonForDictationSlice = createSlice({
  name: "lessonForDictation",
  initialState,
  reducers: {
    resetLessonState: (state) => {
      state.lesson = initialState.lesson;
    },
    // 👉 UI update trực tiếp vào mảng dictation trong lesson.data
    updateDictationCompletion: (state, action: PayloadAction<{ sentenceId: number }>) => {
      const { sentenceId } = action.payload;
      const data = state.lesson.data;
      const dictationProgress = data?.progressOverview?.dictation;
      
      if (data && dictationProgress) {
         const hasId = dictationProgress.completedSentenceIds.includes(sentenceId);
         
         if (!hasId) {
            // 1. Cập nhật danh sách ID
            dictationProgress.completedSentenceIds.push(sentenceId);
            
            // 2. Cập nhật số lượng
            dictationProgress.totalCompletedSentences = dictationProgress.completedSentenceIds.length;

            // 3. Cập nhật Status dựa trên số lượng câu hiển thị thực tế
            const displayTotal = data.sentences?.length || 0; // Dùng length của mảng đã lọc
            if (displayTotal > 0 && dictationProgress.totalCompletedSentences >= displayTotal) {
              dictationProgress.status = 'COMPLETED';
            } else {
              dictationProgress.status = 'IN_PROGRESS';
            }
         }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessonBySlugForDictation.pending, (state) => {
        state.lesson.status = "loading";
      })
      .addCase(fetchLessonBySlugForDictation.fulfilled, (state, action) => {
        state.lesson.status = "succeeded";
        state.lesson.data = action.payload;
      })
      .addCase(fetchLessonBySlugForDictation.rejected, (state, action) => {
        state.lesson.status = "failed";
        state.lesson.error = action.payload as IErrorState;
      })
      .addCase(submitDictationScore.rejected, (state, action) => {
        console.error("Submit dictation âm thầm bị lỗi:", action.payload);
      }).addCase(submitBatchDictationScore.rejected, (state, action) => {
        console.error("Batch sync dictation bị lỗi:", action.payload);
      });;
  },
});

export const { resetLessonState, updateDictationCompletion } = lessonForDictationSlice.actions;
export default lessonForDictationSlice.reducer;