import handleAPI from "@/apis/handleAPI";
import type { IAsyncState, IVocabSubTopic, IVocabSubTopicReadyEvent, IVocabSubtopicsGeneratedEvent, IVocabTopic, IVocabWordEntry } from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface IVocabState {
  topics: IAsyncState<IVocabTopic[]>;
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

const initialState: IVocabState = {
  topics: asyncIdle([]),
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
    // WS: subtopic word processing complete
    updateSubtopicFromWs(state, action: PayloadAction<IVocabSubTopicReadyEvent>) {
      const { subtopicId, topicId, topicReady, readyWordCount, wordCount, readySubtopicCount } = action.payload;
      const sub = state.subtopics.data.find((s) => s.id === subtopicId);
      if (sub) { sub.status = "READY"; sub.readyWordCount = readyWordCount; sub.wordCount = wordCount; }
      const topic = state.topics.data.find((t) => t.id === topicId);
      if (topic) {
        topic.readySubtopicCount = readySubtopicCount;
        if (topicReady) topic.status = "READY";
        else if (topic.status !== "PROCESSING") topic.status = "PROCESSING";
      }
    },
    // WS: subtopics generation complete — update topic header, subtopics re-fetched by page
    onSubtopicsGenerated(state, action: PayloadAction<IVocabSubtopicsGeneratedEvent>) {
      const { topicId, subtopicCount } = action.payload;
      const topic = state.topics.data.find((t) => t.id === topicId);
      if (topic) { topic.status = "READY_FOR_WORD_GEN"; topic.subtopicCount = subtopicCount; }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchVocabTopics
      .addCase(fetchVocabTopics.pending, (s) => { s.topics.status = "loading"; })
      .addCase(fetchVocabTopics.fulfilled, (s, a) => { s.topics.status = "succeeded"; s.topics.data = a.payload; })
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
      // fetchWords
      .addCase(fetchWords.pending, (s) => { s.words.status = "loading"; })
      .addCase(fetchWords.fulfilled, (s, a) => { s.words.status = "succeeded"; s.words.data = a.payload; })
      .addCase(fetchWords.rejected, (s, a) => { s.words.status = "failed"; s.words.error = a.payload as any; });
  },
});

export const { setActiveTopicId, setActiveSubtopicId, updateSubtopicFromWs, onSubtopicsGenerated } = vocabSlice.actions;
export default vocabSlice.reducer;

const BASE = "/dictionaries/vocab";

export const fetchVocabTopics = createAsyncThunk("vocab/fetchTopics", async (_, { rejectWithValue }) => {
  try { return await handleAPI<IVocabTopic[]>({ endpoint: `${BASE}/topics` }); }
  catch (e) { return rejectWithValue(extractError(e)); }
});

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
