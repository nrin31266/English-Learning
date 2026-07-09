import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  ILessonDto,
  IPageResponse,
  IErrorState,
  ILessonProcessingStepNotifyEvent,
} from "@/types";
import handleAPI from "@/apis/handleAPI";
import { extractError } from "@/utils/reduxUtils";

export interface LessonFilterParams {
  search?: string;
  status?: string;
  topicSlug?: string;
  languageLevel?: string;
  sourceType?: string;
  enableDictation?: string;
  enableShadowing?: string;
  page?: string; // "0-based"
  size?: string;
  sort?: string;
}

interface LessonState {
  lessons: {
    data: IPageResponse<ILessonDto> | null;
    status: "idle" | "loading" | "succeeded" | "failed";
    error: IErrorState;
  };
}

const initialState: LessonState = {
  lessons: {
    data: null,
    status: "idle",
    error: { code: null, message: null },
  },
};

/**
 * Fetch lessons with filters & pagination
 */
export const fetchLessons = createAsyncThunk(
  "lessons/fetchLessons",
  async (filters: LessonFilterParams, { rejectWithValue }) => {
    try {
      const res = await handleAPI<IPageResponse<ILessonDto>>({
        endpoint: "/learning-contents/admin/lessons",
        method: "GET",
        params: filters,
      });
      return {
        ...res,
        data: res.data ?? res.content ?? [],
        page: res.page ?? res.number ?? 0,
        hasNext: res.hasNext ?? ((res.page ?? res.number ?? 0) < res.totalPages - 1),
        hasPrevious: res.hasPrevious ?? ((res.page ?? res.number ?? 0) > 0),
      };
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const lessonSlice = createSlice({
  name: "lessons",
  initialState,
  reducers: {
    updateLessonFromProcessingEvent: (
      state,
      action: PayloadAction<ILessonProcessingStepNotifyEvent>
    ) => {
      const {
        lessonId,
        processingStep,
        aiJobId,
        audioUrl,
        sourceReferenceId,
        thumbnailUrl,
        durationSeconds,
        title,
        slug,
        description,
        languageLevel,
        sourceLanguage,
        sourceLicenseType,
      } =
        action.payload;
      if (!state.lessons.data) return;

      const lessons = state.lessons.data.data ?? state.lessons.data.content ?? [];
      const lesson = lessons.find((l) => l.id === lessonId);
      if (!lesson) return;

      // update core fields từ event
      lesson.processingStep = processingStep;
      if (aiJobId) lesson.aiJobId = aiJobId;
      if (audioUrl) lesson.audioUrl = audioUrl;
      if (sourceReferenceId) lesson.sourceReferenceId = sourceReferenceId;
      if (thumbnailUrl) lesson.thumbnailUrl = thumbnailUrl;
      if (durationSeconds !== null && durationSeconds !== undefined) lesson.durationSeconds = durationSeconds;
      if (title) lesson.title = title;
      if (slug) lesson.slug = slug;
      if (description) lesson.description = description;
      if (languageLevel) lesson.languageLevel = languageLevel as ILessonDto["languageLevel"];
      if (sourceLanguage) lesson.sourceLanguage = sourceLanguage;
      if (sourceLicenseType) lesson.sourceLicenseType = sourceLicenseType;

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
      // ----- FETCH LESSONS -----
      .addCase(fetchLessons.pending, (state) => {
        state.lessons.status = "loading";
        state.lessons.error = { code: null, message: null };
      })
      .addCase(fetchLessons.fulfilled, (state, action) => {
        state.lessons.status = "succeeded";
        state.lessons.data = action.payload;
      })
      .addCase(fetchLessons.rejected, (state, action) => {
        state.lessons.status = "failed";
        state.lessons.error = action.payload as IErrorState;
      });
  },
});
export const { updateLessonFromProcessingEvent } = lessonSlice.actions;

export default lessonSlice.reducer;
