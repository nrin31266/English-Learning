import handleAPI from "@/apis/handleAPI";
import type { IVocabSubTopic, IVocabWordEntry } from "@/types";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface IVocabDetailState {
  subtopics: IVocabSubTopic[];
  subtopicsStatus: "idle" | "loading" | "succeeded" | "failed";
  words: IVocabWordEntry[];
  wordsStatus: "idle" | "loading" | "succeeded" | "failed";
  activeSubtopicId: string | null;
}

const initialState: IVocabDetailState = {
  subtopics: [],
  subtopicsStatus: "idle",
  words: [],
  wordsStatus: "idle",
  activeSubtopicId: null,
};

export const fetchSubTopics = createAsyncThunk(
  "vocabDetail/fetchSubTopics",
  async (topicId: string, { rejectWithValue }) => {
    try {
      const res = await handleAPI<IVocabSubTopic[]>({
        endpoint: `/dictionaries/vocab/topics/${topicId}/subtopics`,
        params: { activeOnly: true },
      });
      return res.map((s) => ({
        ...s,
        isActive: (s as { isActive?: boolean; active?: boolean }).isActive
          ?? (s as { active?: boolean }).active
          ?? false,
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);

export const fetchWords = createAsyncThunk(
  "vocabDetail/fetchWords",
  async (subtopicId: string, { rejectWithValue }) => {
    try {
      return await handleAPI<IVocabWordEntry[]>({
        endpoint: `/dictionaries/vocab/subtopics/${subtopicId}/words`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return rejectWithValue(msg);
    }
  }
);

const vocabDetailSlide = createSlice({
  name: "vocabDetail",
  initialState,
  reducers: {
    setActiveSubtopic(state, action) {
      state.activeSubtopicId = action.payload;
    },
    clearDetail(state) {
      state.subtopics = [];
      state.subtopicsStatus = "idle";
      state.words = [];
      state.wordsStatus = "idle";
      state.activeSubtopicId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubTopics.pending, (s) => { s.subtopicsStatus = "loading"; })
      .addCase(fetchSubTopics.fulfilled, (s, a) => {
        s.subtopicsStatus = "succeeded";
        s.subtopics = a.payload;
      })
      .addCase(fetchSubTopics.rejected, (s) => { s.subtopicsStatus = "failed"; })
      .addCase(fetchWords.pending, (s) => { s.wordsStatus = "loading"; })
      .addCase(fetchWords.fulfilled, (s, a) => {
        s.wordsStatus = "succeeded";
        s.words = a.payload;
      })
      .addCase(fetchWords.rejected, (s) => { s.wordsStatus = "failed"; });
  },
});

export const { setActiveSubtopic, clearDetail } = vocabDetailSlide.actions;
export default vocabDetailSlide.reducer;
