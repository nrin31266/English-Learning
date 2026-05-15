import handleAPI from "@/apis/handleAPI";
import type { IVocabPageResponse, IVocabTopic, IVocabTag } from "@/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface IVocabTopicsState {
  data: IVocabTopic[];
  status: "idle" | "loading" | "succeeded" | "failed";
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const initialState: IVocabTopicsState = {
  data: [],
  status: "idle",
  page: 0,
  size: 12,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

export interface IFetchVocabTopicsParams {
  q?: string;
  tags?: string[];
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const fetchVocabTopics = createAsyncThunk(
  "vocab/fetchTopics",
  async (params: IFetchVocabTopicsParams | undefined, { rejectWithValue }) => {
    try {
      const queryParams: Record<string, unknown> = {};
      if (params?.q) queryParams.q = params.q;
      if (params?.tags && params.tags.length > 0) queryParams.tags = params.tags;
      if (params?.status) queryParams.status = params.status;
      queryParams.activeOnly = true;
      queryParams.page = params?.page ?? 0;
      queryParams.size = params?.size ?? 12;
      queryParams.sort = params?.sort ?? "newest";

      return await handleAPI<IVocabPageResponse<IVocabTopic>>({
        endpoint: "/dictionaries/vocab/topics",
        params: queryParams,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);

export const fetchVocabTags = createAsyncThunk(
  "vocab/fetchTags",
  async (_, { rejectWithValue }) => {
    try {
      return await handleAPI<IVocabTag[]>({
        endpoint: "/dictionaries/vocab-tags",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);

const vocabSlide = createSlice({
  name: "vocab",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVocabTopics.pending, (s) => { s.status = "loading"; })
      .addCase(fetchVocabTopics.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.data = a.payload.data;
        s.page = a.payload.page;
        s.size = a.payload.size;
        s.totalElements = a.payload.totalElements;
        s.totalPages = a.payload.totalPages;
        s.hasNext = a.payload.hasNext;
        s.hasPrevious = a.payload.hasPrevious;
      })
      .addCase(fetchVocabTopics.rejected, (s) => { s.status = "failed"; });
  },
});

export default vocabSlide.reducer;
