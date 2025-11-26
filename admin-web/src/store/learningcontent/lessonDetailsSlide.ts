import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  ILessonDto,
  IPageResponse,
  IErrorState,

  ILessonDetailsDto,
  ILessonProcessingStepNotifyEvent,
  IAsyncState,
  ILessonMinimalDto,
} from "@/types";
import handleAPI from "@/apis/handleAPI";
import { extractError } from "@/utils/reduxUtils";

interface LessonDetailsState {
  lessonDetails: IAsyncState<ILessonDetailsDto | null>;
  lessonDetailsMutation: IAsyncState<null> & { type: "re-try" | "stop-ai-processing" | null };
}
const initialState: LessonDetailsState = {
  lessonDetails: {
    data: null,
    status: "idle",
    error: { code: null, message: null },
  },
  lessonDetailsMutation: {
    data: null,
    status: "idle",
    type: null,
    error: { code: null, message: null },
  },
};

export const fetchLessonDetails = createAsyncThunk(
  "lessons/fetchLessons",
  async ({ slug }: { slug: string }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<ILessonDetailsDto>({
        endpoint: `/learning-contents/lessons/${slug}`,
        method: "GET",
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
export const retryLessonGeneration = createAsyncThunk(
  "lessons/retryLessonGeneration",
  async ({ id , isRestart }: { id: number, isRestart: boolean }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<ILessonMinimalDto>({
        endpoint: `/learning-contents/lessons/${id}/re-try`,
        method: "POST",
        isAuth: true,
        params: { isRestart: isRestart }
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

/**
 * POST /learning-contents/admin/lessons/{id}/cancel-ai-processing
 */
export const cancelAiProcessing = createAsyncThunk(
  "lessons/cancelAiProcessing",
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<ILessonMinimalDto>({
        endpoint: `/learning-contents/lessons/${id}/cancel-ai-processing`,
        method: "POST",
        isAuth: true,
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);


export const lessonDetailsSlice = createSlice({
  name: "lessonDetails",
  initialState,
  reducers: {
     updateLessonDetailsFromProcessingEvent: (
      state,
      action: PayloadAction<ILessonProcessingStepNotifyEvent>
    ) => {
      const { lessonId, processingStep, aiJobId, audioUrl, sourceReferenceId, thumbnailUrl, aiMessage } =
        action.payload;
      if (!state.lessonDetails.data) return;

      const lesson = state.lessonDetails.data;
      // update core fields từ event
      if(lesson.id !== lessonId) return;
      if(processingStep !== "FAILED"){
        lesson.processingStep = processingStep;
      }
      if (aiJobId) lesson.aiJobId = aiJobId;
      if (audioUrl) lesson.audioUrl = audioUrl;
      if (sourceReferenceId) lesson.sourceReferenceId = sourceReferenceId;
      if (thumbnailUrl) lesson.thumbnailUrl = thumbnailUrl;
      if (aiMessage) lesson.aiMessage = aiMessage;

      // map step -> status
      if (processingStep === "FAILED") {
        lesson.status = "ERROR";
      } else if (processingStep === "COMPLETED") {
        lesson.status = "READY";
      } else if (processingStep === "NONE") {
        lesson.status = "DRAFT";
      } else {
        lesson.status = "PROCESSING";
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessonDetails.pending, (state) => {
        state.lessonDetails.status = "loading";
        state.lessonDetails.error = { code: null, message: null };
      })
      .addCase(fetchLessonDetails.fulfilled, (state, action) => {
        state.lessonDetails.status = "succeeded";
        state.lessonDetails.data = action.payload;
      })
      .addCase(fetchLessonDetails.rejected, (state, action) => {
        state.lessonDetails.status = "failed";
        state.lessonDetails.error = action.payload as IErrorState;
      })
      .addCase(retryLessonGeneration.pending, (state) => {
        state.lessonDetailsMutation.status = "loading";
        state.lessonDetailsMutation.error = { code: null, message: null };
        state.lessonDetailsMutation.type = "re-try";
      })
      .addCase(retryLessonGeneration.fulfilled, (state, action) => {
        state.lessonDetailsMutation.status = "succeeded";
        if(state.lessonDetails.data && state.lessonDetails.data.id === action.payload.id){
          state.lessonDetails.data.processingStep = "PROCESSING_STARTED";
          state.lessonDetails.data.status = "PROCESSING";
          state.lessonDetails.data.aiMessage = "AI generation has been retried.";
        }
      })
      .addCase(retryLessonGeneration.rejected, (state, action) => {
        state.lessonDetailsMutation.status = "failed";
        state.lessonDetailsMutation.error = action.payload as IErrorState;
      })
      .addCase(cancelAiProcessing.pending, (state) => {
        state.lessonDetailsMutation.status = "loading";
        state.lessonDetailsMutation.error = { code: null, message: null };
        state.lessonDetailsMutation.type = "stop-ai-processing";
      })
      .addCase(cancelAiProcessing.fulfilled, (state, action) => {
        state.lessonDetailsMutation.status = "succeeded";
        if(state.lessonDetails.data && state.lessonDetails.data.id === action.payload.id){
          // state.lessonDetails.data.processingStep = "NONE";
          state.lessonDetails.data.status = "DRAFT";
          state.lessonDetails.data.aiMessage = "AI generation has been cancelled.";
        }
      })
      .addCase(cancelAiProcessing.rejected, (state, action) => {
        state.lessonDetailsMutation.status = "failed";
        state.lessonDetailsMutation.error = action.payload as IErrorState;
      })
      ;
  },
});

export const { updateLessonDetailsFromProcessingEvent} = lessonDetailsSlice.actions;
export default lessonDetailsSlice.reducer;
