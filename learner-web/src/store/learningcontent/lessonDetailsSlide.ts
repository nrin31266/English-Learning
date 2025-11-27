import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  IErrorState,

  ILessonDetailsDto,
  ILessonProcessingStepNotifyEvent,
  IAsyncState,
  ILessonMinimalDto,
  ILessonDto,
  IEditLessonPayload,
} from "@/types";
import handleAPI from "@/apis/handleAPI";
import { extractError } from "@/utils/reduxUtils";

interface LessonDetailsState {
  lessonDetails: IAsyncState<ILessonDetailsDto | null>;
  lessonDetailsMutation: IAsyncState<null> & { type: "re-try" | "stop-ai-processing" | "publish" | "update" | "delete" | null };
  sentenceMutation: IAsyncState<string | null> & { type: "mark-active-inactive" | null };
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
  sentenceMutation: {
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

export const reloadLessonDetails = createAsyncThunk(
  "lessons/reloadLessonDetails",
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
export const publishLesson = createAsyncThunk(
  "lessons/publishLesson",
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<ILessonDto>({
        endpoint: `/learning-contents/lessons/${id}/publish`,
        method: "POST",
        isAuth: true,
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
export const unpublishLesson = createAsyncThunk(
  "lessons/unpublishLesson",
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<ILessonDto>({
        endpoint: `/learning-contents/lessons/${id}/unpublish`,
        method: "POST",
        isAuth: true,
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
export const deleteLesson = createAsyncThunk(
  "lessons/deleteLesson",
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<null>({
        endpoint: `/learning-contents/lessons/${id}`,
        method: "DELETE",
        isAuth: true,
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
export const updateLesson = createAsyncThunk(
  "lessons/updateLesson",
  async ({ id, data }: { id: number, data: IEditLessonPayload }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<ILessonDto>({
        endpoint: `/learning-contents/lessons/${id}`,
        method: "PUT",
        isAuth: true,
        body: data,
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const markSentenceActiveInactive = createAsyncThunk(
  "lessons/markSentenceActiveInactive",
  async ({ id, active }: { id: number, active: boolean }, { rejectWithValue }) => {
    try {
      const res = await handleAPI<null>({
        endpoint: `/learning-contents/sentences/${id}/mark-active-inactive`,
        method: "POST",
        isAuth: true,
        params: { active: active }
      });
      return active ? "active" : "inactive";
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
      const { lessonId, processingStep, aiJobId, audioUrl, sourceReferenceId, thumbnailUrl, aiMessage, durationSeconds } =
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
      if (durationSeconds !== null) lesson.durationSeconds = durationSeconds;

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
      .addCase(reloadLessonDetails.pending, (state) => {
        state.lessonDetails.error = { code: null, message: null };
      })
      .addCase(reloadLessonDetails.fulfilled, (state, action) => {
        state.lessonDetails.data = action.payload;
      })
      .addCase(reloadLessonDetails.rejected, (state, action) => {
        state.lessonDetails.error = action.payload as IErrorState;
      })
      .addCase(publishLesson.pending, (state) => {
        state.lessonDetailsMutation.status = "loading";
        state.lessonDetailsMutation.error = { code: null, message: null };
        state.lessonDetailsMutation.type = "publish";
      })
      .addCase(publishLesson.fulfilled, (state, action) => {
        state.lessonDetailsMutation.status = "succeeded";
        if(state.lessonDetails.data && state.lessonDetails.data.id === action.meta.arg.id){
          state.lessonDetails.data.publishedAt = new Date().toLocaleString();
        }
      })
      .addCase(publishLesson.rejected, (state, action) => {
        state.lessonDetailsMutation.status = "failed";
        state.lessonDetailsMutation.error = action.payload as IErrorState;
      })
      .addCase(unpublishLesson.pending, (state) => {
        state.lessonDetailsMutation.status = "loading";
        state.lessonDetailsMutation.error = { code: null, message: null };
        state.lessonDetailsMutation.type = "publish";
      })
      .addCase(unpublishLesson.fulfilled, (state, action) => {
        state.lessonDetailsMutation.status = "succeeded";
        if(state.lessonDetails.data && state.lessonDetails.data.id === action.meta.arg.id){
          state.lessonDetails.data.publishedAt = null;
        }
      })
      .addCase(unpublishLesson.rejected, (state, action) => {
        state.lessonDetailsMutation.status = "failed";
        state.lessonDetailsMutation.error = action.payload as IErrorState;
      })
      .addCase(updateLesson.pending, (state) => {
        state.lessonDetailsMutation.status = "loading";
        state.lessonDetailsMutation.error = { code: null, message: null };
        state.lessonDetailsMutation.type = "update";
      })
      .addCase(updateLesson.fulfilled, (state, action) => {
        state.lessonDetailsMutation.status = "succeeded";
        if(state.lessonDetails.data && state.lessonDetails.data.id === action.payload.id){
          state.lessonDetails.data.title = action.payload.title;
          state.lessonDetails.data.description = action.payload.description;
          state.lessonDetails.data.languageLevel = action.payload.languageLevel;
          state.lessonDetails.data.sourceLanguage = action.payload.sourceLanguage;
          state.lessonDetails.data.thumbnailUrl = action.payload.thumbnailUrl;
          state.lessonDetails.data.enableDictation = action.payload.enableDictation;
          state.lessonDetails.data.enableShadowing = action.payload.enableShadowing;
        }
      })
      .addCase(updateLesson.rejected, (state, action) => {
        state.lessonDetailsMutation.status = "failed";
        state.lessonDetailsMutation.error = action.payload as IErrorState;
      })
      .addCase(deleteLesson.pending, (state) => {
        state.lessonDetailsMutation.status = "loading";
        state.lessonDetailsMutation.error = { code: null, message: null };
        state.lessonDetailsMutation.type = "delete";
      })
      .addCase(deleteLesson.fulfilled, (state, action) => {
        state.lessonDetailsMutation.status = "succeeded";
        state.lessonDetails.data = null;
      })
      .addCase(deleteLesson.rejected, (state, action) => {
        state.lessonDetailsMutation.status = "failed";
        state.lessonDetailsMutation.error = action.payload as IErrorState;
      })
      .addCase(markSentenceActiveInactive.pending, (state, action) => {
        state.sentenceMutation.status = "loading";
        state.sentenceMutation.error = { code: null, message: null };
        state.sentenceMutation.type = "mark-active-inactive";
        state.sentenceMutation.data = action.meta.arg.id.toString();
      })
      .addCase(markSentenceActiveInactive.fulfilled, (state, action) => {
        state.sentenceMutation.status = "succeeded";
        const sentenceId = action.meta.arg.id;
        const isActive = action.meta.arg.active;
        if(state.lessonDetails.data){
          const sentence = state.lessonDetails.data.sentences.find(s => s.id === sentenceId);
          if(sentence){
            sentence.isActive = isActive;
          }
        }
      })
      .addCase(markSentenceActiveInactive.rejected, (state, action) => {
        state.sentenceMutation.status = "failed";
        state.sentenceMutation.error = action.payload as IErrorState;
      })
      ;
  },
});

export const { updateLessonDetailsFromProcessingEvent} = lessonDetailsSlice.actions;
export default lessonDetailsSlice.reducer;
