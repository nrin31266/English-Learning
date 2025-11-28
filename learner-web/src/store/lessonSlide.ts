// src/store/lessonSlide.ts

import handleAPI from "@/apis/handleAPI";
import type {
  IAsyncState,
  IErrorState,
  ILLessonDetailsDto,
} from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface ILessonReducer {
  lesson: IAsyncState<ILLessonDetailsDto | null>;
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
};

// GET /learning-contents/learner/lessons/{slug}
export const fetchLessonBySlug = createAsyncThunk(
  "lesson/fetchLessonBySlug",
  async (slug: string, { rejectWithValue }) => {
    try {
      const data = await handleAPI<ILLessonDetailsDto>({
        endpoint: `/learning-contents/learner/lessons/${slug}`,
        method: "GET",
        isAuth: true,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractError(error));
    }
  }
);

export const lessonSlide = createSlice({
  name: "lesson",
  initialState,
  reducers: {
    // optional: tiện cho việc clear khi unmount page
    resetLessonState: (state) => {
      state.lesson = initialState.lesson;
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
      })
      .addCase(fetchLessonBySlug.rejected, (state, action) => {
        state.lesson.status = "failed";
        state.lesson.error = action.payload as IErrorState;
      });
  },
});

export const { resetLessonState } = lessonSlide.actions;

export default lessonSlide.reducer;
