import handleAPI from "@/apis/handleAPI";
import type { IWordQueueView } from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface WordQueueState {
  wordQueue: {
    data: IWordQueueView | null;
    status: "idle" | "loading" | "succeeded" | "failed";
    pauseOrResumeStatus: "idle" | "loading" | "succeeded" | "failed";
    addWordStatus?: "idle" | "loading" | "succeeded" | "failed";
    error: { code: number | null; message: string | null };
  };
}
const initialState: WordQueueState = {
  wordQueue: {
    data: null,
    status: "idle",
    pauseOrResumeStatus: "idle",
    error: { code: null, message: null },
  },
};

export const handleQueueView = createAsyncThunk(
  "wordQueue/fetchQueueView",
  async (_, { rejectWithValue }) => {
    try {
      const res = await handleAPI<IWordQueueView>({
        endpoint: "/dictionaries/words/queue-view",
        method: "GET",
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
export const handleResumeQueue = createAsyncThunk(
  "wordQueue/resumeQueue",
  async (_, { rejectWithValue }) => {
    try {
      const res = await handleAPI<void>({
        endpoint: "/dictionaries/words/resume-queue",
        method: "POST",
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
export const handlePauseQueue = createAsyncThunk(
  "wordQueue/pauseQueue",
  async (_, { rejectWithValue }) => {
    try {
      const res = await handleAPI<void>({
        endpoint: "/dictionaries/words/pause-queue",
        method: "POST",
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const handleAddWordToQueue = createAsyncThunk(
  "wordQueue/addWordToQueue",
  async (wordKey: string, { rejectWithValue }) => {
    try {
      const res = await handleAPI<string, string>({
        endpoint: "/dictionaries/words",
        method: "POST",
        body: wordKey,
      });
      return res;
    } catch (err) {
      return rejectWithValue(extractError(err));
    }
  }
);
const wordQueueSlide = createSlice({
  name: "wordQueue",
  initialState,
  reducers: {},
    extraReducers: (builder) => {
    builder
      .addCase(handleQueueView.pending, (state) => {
        state.wordQueue.status = "loading";
        state.wordQueue.error = { code: null, message: null };
      })
      .addCase(handleQueueView.fulfilled, (state, action) => {
        state.wordQueue.status = "succeeded";
        state.wordQueue.data = action.payload;
      })
      .addCase(handleQueueView.rejected, (state, action) => {
        state.wordQueue.status = "failed";
        state.wordQueue.error = action.payload as { code: number; message: string };
      })
      .addCase(handleResumeQueue.pending, (state) => {
        state.wordQueue.pauseOrResumeStatus = "loading";
        state.wordQueue.error = { code: null, message: null };
      })
      .addCase(handleResumeQueue.fulfilled, (state) => {
        state.wordQueue.pauseOrResumeStatus = "succeeded";
        state.wordQueue.data!.enabled = true;
      })
      .addCase(handleResumeQueue.rejected, (state, action) => {
        state.wordQueue.pauseOrResumeStatus = "failed";
        state.wordQueue.error = action.payload as { code: number; message: string };
      })
      .addCase(handlePauseQueue.pending, (state) => {
        state.wordQueue.pauseOrResumeStatus = "loading";
        state.wordQueue.error = { code: null, message: null };
      })
      .addCase(handlePauseQueue.fulfilled, (state) => {
        state.wordQueue.pauseOrResumeStatus = "succeeded";
        state.wordQueue.data!.enabled = false;
      })
      .addCase(handlePauseQueue.rejected, (state, action) => {
        state.wordQueue.pauseOrResumeStatus = "failed";
        state.wordQueue.error = action.payload as { code: number; message: string };
      })
      .addCase(handleAddWordToQueue.pending, (state) => {
        state.wordQueue.addWordStatus = "loading";
        state.wordQueue.error = { code: null, message: null };
      })
      .addCase(handleAddWordToQueue.fulfilled, (state) => {
        state.wordQueue.addWordStatus = "succeeded";
      })
      .addCase(handleAddWordToQueue.rejected, (state, action) => {
        state.wordQueue.addWordStatus = "failed";
        state.wordQueue.error = action.payload as { code: number; message: string };
      });
    }
});

export default wordQueueSlide.reducer;
