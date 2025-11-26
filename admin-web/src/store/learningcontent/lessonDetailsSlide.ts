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

export const lessonDetailsSlice = createSlice({
  name: "lessonDetails",
  initialState,
  reducers: {
     updateLessonDetailsFromProcessingEvent: (
      state,
      action: PayloadAction<ILessonProcessingStepNotifyEvent>
    ) => {
      const { lessonId, processingStep, aiJobId, audioUrl, sourceReferenceId, thumbnailUrl } =
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
      });
  },
});

export const { updateLessonDetailsFromProcessingEvent} = lessonDetailsSlice.actions;
export default lessonDetailsSlice.reducer;
