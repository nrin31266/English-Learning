import handleAPI from "@/apis/handleAPI";
import type { IAsyncState, IPageResponse, IUpdateEntryContextRequest, IVocabSubTopic, IVocabSubTopicProgressEvent, IVocabSubTopicReadyEvent, IVocabSubtopicsGeneratedEvent, IVocabTopic, IVocabWordEntry } from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ITopicsState extends IAsyncState<IVocabTopic[]> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface IVocabState {
  topics: ITopicsState;
  subtopics: IAsyncState<IVocabSubTopic[]>;
  words: IAsyncState<IVocabWordEntry[]>;
  createTopic: IAsyncState<null>;
  activeTopicId: string | null;
  activeSubtopicId: string | null;
}

const asyncIdle = <T>(data: T): IAsyncState<T> => ({
  data,
  status: "idle",
  error: { code: null, message: null },
});

const initialTopicsState: ITopicsState = {
  ...asyncIdle([]),
  page: 0,
  size: 12,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

const initialState: IVocabState = {
  topics: initialTopicsState,
  subtopics: asyncIdle([]),
  words: asyncIdle([]),
  createTopic: asyncIdle(null),
  activeTopicId: null,
  activeSubtopicId: null,
};

const vocabSlice = createSlice({
  name: "vocab",
  initialState,
  reducers: {
    setActiveTopicId(state, action: PayloadAction<string | null>) {
      state.activeTopicId = action.payload;
      state.subtopics = asyncIdle([]);
      state.words = asyncIdle([]);
    },
    setActiveSubtopicId(state, action: PayloadAction<string | null>) {
      state.activeSubtopicId = action.payload;
      state.words = asyncIdle([]);
    },
    // WS: subtopic word processing progress (called for every word ready, not just READY subtopic)
    updateSubtopicFromWs(state, action: PayloadAction<IVocabSubTopicReadyEvent>) {
      const { subtopicId, topicId, topicReady, readyWordCount, wordCount, readySubtopicCount } = action.payload;
      const sub = state.subtopics.data.find((s) => s.id === subtopicId);
      if (sub) {
        sub.readyWordCount = readyWordCount;
        sub.wordCount = wordCount;
        // Subtopic is only READY when all words are accounted for
        if (wordCount > 0 && readyWordCount >= wordCount) {
          sub.status = "READY";
        } else if (sub.status !== "PROCESSING_WORDS" && sub.status !== "READY") {
          sub.status = "PROCESSING_WORDS";
        }
      }
      const topic = state.topics.data.find((t) => t.id === topicId);
      if (topic) {
        topic.readySubtopicCount = readySubtopicCount;
        if (topicReady) topic.status = "READY";
        else if (topic.status !== "PROCESSING") topic.status = "PROCESSING";
      }
    },
    // WS: subtopics generation complete — update topic header, subtopics re-fetched by page
    onSubtopicsGenerated(state, action: PayloadAction<IVocabSubtopicsGeneratedEvent>) {
      const { topicId, subtopicCount, topicDescription } = action.payload;
      const topic = state.topics.data.find((t) => t.id === topicId);
      if (topic) { topic.status = "READY_FOR_WORD_GEN"; topic.subtopicCount = subtopicCount; topic.description = topicDescription; }
    },
    // WS: live subtopic word‑processing progress (0/25 → 5/25 → … → 25/25)
    updateSubtopicProgress(state, action: PayloadAction<IVocabSubTopicProgressEvent>) {
      const { subtopicId, readyWordCount, wordCount, subtopicStatus } = action.payload;
      const sub = state.subtopics.data.find((s) => s.id === subtopicId);
      if (sub) {
        sub.readyWordCount = readyWordCount;
        sub.wordCount = wordCount;
        sub.status = subtopicStatus as IVocabSubTopic["status"];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchVocabTopics
      .addCase(fetchVocabTopics.pending, (s) => { s.topics.status = "loading"; })
      .addCase(fetchVocabTopics.fulfilled, (s, a) => {
        s.topics.status = "succeeded";
        s.topics.data = a.payload.data;
        s.topics.page = a.payload.page;
        s.topics.size = a.payload.size;
        s.topics.totalElements = a.payload.totalElements;
        s.topics.totalPages = a.payload.totalPages;
        s.topics.hasNext = a.payload.hasNext;
        s.topics.hasPrevious = a.payload.hasPrevious;
      })
      .addCase(fetchVocabTopics.rejected, (s, a) => { s.topics.status = "failed"; s.topics.error = a.payload as any; })
      // createVocabTopic
      .addCase(createVocabTopic.pending, (s) => { s.createTopic.status = "loading"; })
      .addCase(createVocabTopic.fulfilled, (s, a) => { s.createTopic.status = "succeeded"; s.topics.data.unshift(a.payload); })
      .addCase(createVocabTopic.rejected, (s, a) => { s.createTopic.status = "failed"; s.createTopic.error = a.payload as any; })
      // generateSubTopics: 202 accepted → immediately show GENERATING_SUBTOPICS in topic row
      .addCase(generateSubTopics.pending, (s, a) => {
        const topicId = a.meta.arg;
        const topic = s.topics.data.find((t) => t.id === topicId);
        if (topic) { topic.status = "GENERATING_SUBTOPICS"; topic.subtopicCount = 0; topic.readySubtopicCount = 0; }
      })
      .addCase(generateSubTopics.fulfilled, (s, a) => {
        // 202 response contains updated VocabTopicResponse with GENERATING_SUBTOPICS status
        const updated = a.payload as IVocabTopic;
        const topic = s.topics.data.find((t) => t.id === updated.id);
        if (topic) Object.assign(topic, updated);
      })
      .addCase(generateSubTopics.rejected, (s, a) => {
        const topicId = a.meta.arg;
        const topic = s.topics.data.find((t) => t.id === topicId);
        if (topic) topic.status = "DRAFT";
      })
      // fetchSubTopics
      .addCase(fetchSubTopics.pending, (s) => { s.subtopics.status = "loading"; })
      .addCase(fetchSubTopics.fulfilled, (s, a) => { s.subtopics.status = "succeeded"; s.subtopics.data = a.payload; })
      .addCase(fetchSubTopics.rejected, (s, a) => { s.subtopics.status = "failed"; s.subtopics.error = a.payload as any; })
      // generateWords: 202 accepted → immediately show GENERATING_WORDS in subtopic row
      .addCase(generateWords.pending, (s, a) => {
        const subtopicId = a.meta.arg;
        const sub = s.subtopics.data.find((st) => st.id === subtopicId);
        if (sub) sub.status = "GENERATING_WORDS";
      })
      .addCase(generateWords.fulfilled, (s, a) => {
        // 202 response contains updated VocabSubTopicResponse
        const updated = a.payload as IVocabSubTopic;
        const sub = s.subtopics.data.find((st) => st.id === updated.id);
        if (sub) Object.assign(sub, updated);
      })
      .addCase(generateWords.rejected, (s, a) => {
        const subtopicId = a.meta.arg;
        const sub = s.subtopics.data.find((st) => st.id === subtopicId);
        if (sub) sub.status = "PENDING_WORDS";
      })
      // updateVocabTopic
      .addCase(updateVocabTopic.fulfilled, (s, a) => {
        const updated = a.payload as IVocabTopic;
        const idx = s.topics.data.findIndex((t) => t.id === updated.id);
        if (idx !== -1) s.topics.data[idx] = updated;
      })
      // deleteVocabTopic
      .addCase(deleteVocabTopic.fulfilled, (s, a) => {
        const topicId = a.meta.arg;
        s.topics.data = s.topics.data.filter((t) => t.id !== topicId);
        if (s.activeTopicId === topicId) {
          s.activeTopicId = null;
          s.subtopics = asyncIdle([]);
          s.words = asyncIdle([]);
        }
      })
      // fetchWords
      .addCase(fetchWords.pending, (s) => { s.words.status = "loading"; })
      .addCase(fetchWords.fulfilled, (s, a) => { s.words.status = "succeeded"; s.words.data = a.payload; })
      .addCase(fetchWords.rejected, (s, a) => { s.words.status = "failed"; s.words.error = a.payload as any; })
      // deleteAllWordsInSubTopic — reset subtopic back to PENDING_WORDS
      .addCase(deleteAllWordsInSubTopic.fulfilled, (s, a) => {
        const subtopicId = a.meta.arg;
        const sub = s.subtopics.data.find((st) => st.id === subtopicId);
        if (sub) {
          sub.wordCount = 0;
          sub.readyWordCount = 0;
          sub.status = "PENDING_WORDS";
        }
        s.words = asyncIdle([]);
      })
      // deleteSubTopic
      .addCase(deleteSubTopic.fulfilled, (s, a) => {
        const subtopicId = a.meta.arg;
        s.subtopics.data = s.subtopics.data.filter((st) => st.id !== subtopicId);
        if (s.activeSubtopicId === subtopicId) {
          s.activeSubtopicId = null;
          s.words = asyncIdle([]);
        }
      })
      // toggleTopicActive
      .addCase(toggleTopicActive.fulfilled, (s, a) => {
        const updated = a.payload as IVocabTopic;
        const idx = s.topics.data.findIndex((t) => t.id === updated.id);
        if (idx !== -1) s.topics.data[idx] = updated;
      })
      // toggleSubtopicActive
      .addCase(toggleSubtopicActive.fulfilled, (s, a) => {
        const updated = a.payload as IVocabSubTopic;
        const idx = s.subtopics.data.findIndex((st) => st.id === updated.id);
        if (idx !== -1) s.subtopics.data[idx] = updated;
      })
      // updateEntryContextManual
      .addCase(updateEntryContextManual.fulfilled, (s, a) => {
        const updated = a.payload as IVocabWordEntry;
        const idx = s.words.data.findIndex((w) => w.id === updated.id);
        if (idx !== -1) s.words.data[idx] = updated;
      })
      // generateSingleMeaningSync
      .addCase(generateSingleMeaningSync.fulfilled, (s, a) => {
        const updated = a.payload as IVocabWordEntry;
        const idx = s.words.data.findIndex((w) => w.id === updated.id);
        if (idx !== -1) s.words.data[idx] = updated;
      });
  },
});

export const { setActiveTopicId, setActiveSubtopicId, updateSubtopicFromWs, onSubtopicsGenerated, updateSubtopicProgress } = vocabSlice.actions;
export default vocabSlice.reducer;

const BASE = "/dictionaries/vocab";

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
      const queryParams: Record<string, any> = {};
      if (params?.q) queryParams.q = params.q;
      if (params?.tags && params.tags.length > 0) queryParams.tags = params.tags;
      if (params?.status) queryParams.status = params.status;
      queryParams.page = params?.page ?? 0;
      queryParams.size = params?.size ?? 12;
      queryParams.sort = params?.sort ?? "newest";

      return await handleAPI<IPageResponse<IVocabTopic>>({
        endpoint: `${BASE}/topics`,
        params: queryParams,
      });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const createVocabTopic = createAsyncThunk("vocab/createTopic", async (body: object, { rejectWithValue }) => {
  try { return await handleAPI<IVocabTopic>({ endpoint: `${BASE}/topics`, method: "POST", body }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

// Fire-and-forget: backend returns 202 immediately with updated topic (GENERATING_SUBTOPICS)
export const generateSubTopics = createAsyncThunk("vocab/genSubtopics", async (topicId: string, { rejectWithValue }) => {
  try { return await handleAPI<IVocabTopic>({ endpoint: `${BASE}/topics/${topicId}/generate-subtopics`, method: "POST" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const fetchSubTopics = createAsyncThunk("vocab/fetchSubtopics", async (topicId: string, { rejectWithValue }) => {
  try { return await handleAPI<IVocabSubTopic[]>({ endpoint: `${BASE}/topics/${topicId}/subtopics` }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

// Fire-and-forget: backend returns 202 immediately with updated subtopic (GENERATING_WORDS)
export const generateWords = createAsyncThunk("vocab/genWords", async (subtopicId: string, { rejectWithValue }) => {
  try { return await handleAPI<IVocabSubTopic>({ endpoint: `${BASE}/subtopics/${subtopicId}/generate-words`, method: "POST" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const fetchWords = createAsyncThunk("vocab/fetchWords", async (subtopicId: string, { rejectWithValue }) => {
  try { return await handleAPI<IVocabWordEntry[]>({ endpoint: `${BASE}/subtopics/${subtopicId}/words` }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const updateVocabTopic = createAsyncThunk("vocab/updateTopic", async ({ topicId, body }: { topicId: string; body: object }, { rejectWithValue }) => {
  try { return await handleAPI<IVocabTopic>({ endpoint: `${BASE}/topics/${topicId}`, method: "PUT", body }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const deleteVocabTopic = createAsyncThunk("vocab/deleteTopic", async (topicId: string, { rejectWithValue }) => {
  try { return await handleAPI<string>({ endpoint: `${BASE}/topics/${topicId}`, method: "DELETE" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const deleteAllWordsInSubTopic = createAsyncThunk("vocab/deleteAllWords", async (subtopicId: string, { rejectWithValue }) => {
  try { return await handleAPI<string>({ endpoint: `${BASE}/subtopics/${subtopicId}/words`, method: "DELETE" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const deleteSubTopic = createAsyncThunk("vocab/deleteSubTopic", async (subtopicId: string, { rejectWithValue }) => {
  try { return await handleAPI<string>({ endpoint: `${BASE}/subtopics/${subtopicId}`, method: "DELETE" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const recalculateTopic = createAsyncThunk("vocab/recalculateTopic", async (topicId: string, { rejectWithValue }) => {
  try { return await handleAPI<string>({ endpoint: `${BASE}/topics/${topicId}/recalculate`, method: "POST" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const toggleTopicActive = createAsyncThunk("vocab/toggleTopicActive", async (topicId: string, { rejectWithValue }) => {
  try { return await handleAPI<IVocabTopic>({ endpoint: `${BASE}/topics/${topicId}/toggle-active`, method: "PUT" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const toggleSubtopicActive = createAsyncThunk("vocab/toggleSubtopicActive", async (subtopicId: string, { rejectWithValue }) => {
  try { return await handleAPI<IVocabSubTopic>({ endpoint: `${BASE}/subtopics/${subtopicId}/toggle-active`, method: "PUT" }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const updateEntryContextManual = createAsyncThunk("vocab/updateEntryContext", async ({ entryId, body }: { entryId: string; body: IUpdateEntryContextRequest }, { rejectWithValue }) => {
  try { return await handleAPI<IVocabWordEntry>({ endpoint: `${BASE}/word-entries/${entryId}/context`, method: "PUT", body }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

export const generateSingleMeaningSync = createAsyncThunk("vocab/generateSingleMeaning", async (entryId: string, { rejectWithValue }) => {
  try { return await handleAPI<IVocabWordEntry>({ endpoint: `${BASE}/word-entries/${entryId}/generate-meaning`, method: "POST", timeout: 30000 }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});
