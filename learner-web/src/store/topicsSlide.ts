import handleAPI from "@/apis/handleAPI";
import type {
  IHomeLessonResponse,
  ILessonExploreResponse,
  IResumeLearningResponse,
  ITopicSummaryResponse,
} from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export type LessonExplorerFilters = {
  q?: string;
  topicSlug?: string;
  levelGroup?: "ALL" | "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status?: "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  sort?: "newest" | "shortest" | "longest" | "title_asc";
  page?: number;
  size?: number;
};

type State = {
  lessons: IHomeLessonResponse[];
  topics: ITopicSummaryResponse[];
  resumeLearning: IResumeLearningResponse | null;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string;
};

const initialState: State = {
  lessons: [], topics: [], resumeLearning: null, page: 0, size: 12,
  totalElements: 0, totalPages: 0, status: "idle",
};

export const fetchExploreLessons = createAsyncThunk(
  "lessonExplorer/fetchLessons",
  async (filters: LessonExplorerFilters, { rejectWithValue }) => {
    try {
      return await handleAPI<ILessonExploreResponse>({
        endpoint: "/learning-contents/lessons/explore", method: "GET", isAuth: true, params: filters,
      });
    } catch (error) { return rejectWithValue(extractError(error)); }
  },
);

export const fetchTopicOptions = createAsyncThunk("lessonExplorer/fetchTopics", async () =>
  handleAPI<ITopicSummaryResponse[]>({ endpoint: "/learning-contents/topics/active", method: "GET" }),
);

export const fetchResumeLearning = createAsyncThunk("lessonExplorer/fetchResume", async () =>
  handleAPI<IResumeLearningResponse>({ endpoint: "/learning-contents/lessons/resume", method: "GET", isAuth: true, params: { page: 0, size: 10 } }),
);

const slice = createSlice({
  name: "lessonExplorer", initialState, reducers: {},
  extraReducers: (builder) => builder
    .addCase(fetchExploreLessons.pending, (state) => { state.status = "loading"; })
    .addCase(fetchExploreLessons.fulfilled, (state, action) => {
      state.status = "succeeded"; state.lessons = action.payload.data;
      state.page = action.payload.page; state.size = action.payload.size;
      state.totalElements = action.payload.totalElements; state.totalPages = action.payload.totalPages;
    })
    .addCase(fetchExploreLessons.rejected, (state, action) => {
      state.status = "failed"; state.error = (action.payload as { message?: string })?.message;
    })
    .addCase(fetchTopicOptions.fulfilled, (state, action) => { state.topics = action.payload; })
    .addCase(fetchResumeLearning.fulfilled, (state, action) => { state.resumeLearning = action.payload; }),
});

export default slice.reducer;
