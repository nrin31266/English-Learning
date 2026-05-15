import handleAPI from "@/apis/handleAPI";
import type {
  IAdminWord,
  IAdminWordDefinition,
  IAdminWordDetail,
  IApiResponse,
  IAsyncState,
  IPageResponse,
  IWordEntryUsage,
} from "@/types";
import { extractError } from "@/utils/reduxUtils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface IWordPageState extends IAsyncState<IAdminWord[]> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface IDictionaryState {
  words: IWordPageState;
  detail: IAsyncState<IAdminWordDetail | null>;
  usages: IAsyncState<IPageResponse<IWordEntryUsage> | null>;
}

const asyncIdle = <T>(data: T): IAsyncState<T> => ({
  data,
  status: "idle",
  error: { code: null, message: null },
});

const initialWordPage: IWordPageState = {
  ...asyncIdle([]),
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
};

const initialState: IDictionaryState = {
  words: initialWordPage,
  detail: asyncIdle(null),
  usages: asyncIdle(null),
};

const toErrorState = (payload: unknown): IApiResponse<null> => {
  const extracted = extractError(payload);
  return {
    code: extracted.code ?? -1,
    message: extracted.message ?? "Unknown error",
    result: null,
  };
};

const dictionarySlice = createSlice({
  name: "dictionary",
  initialState,
  reducers: {
    clearWordDetail(state) {
      state.detail = asyncIdle(null);
      state.usages = asyncIdle(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminWords.pending, (s) => {
        s.words.status = "loading";
      })
      .addCase(fetchAdminWords.fulfilled, (s, a) => {
        s.words.status = "succeeded";
        s.words.data = a.payload.data;
        s.words.page = a.payload.page;
        s.words.size = a.payload.size;
        s.words.totalElements = a.payload.totalElements;
        s.words.totalPages = a.payload.totalPages;
        s.words.hasNext = a.payload.hasNext;
        s.words.hasPrevious = a.payload.hasPrevious;
      })
      .addCase(fetchAdminWords.rejected, (s, a) => {
        s.words.status = "failed";
        const err = toErrorState(a.payload);
        s.words.error = { code: err.code, message: err.message };
      })
      .addCase(getAdminWordDetail.pending, (s) => {
        s.detail.status = "loading";
      })
      .addCase(getAdminWordDetail.fulfilled, (s, a) => {
        s.detail.status = "succeeded";
        s.detail.data = a.payload;
      })
      .addCase(getAdminWordDetail.rejected, (s, a) => {
        s.detail.status = "failed";
        const err = toErrorState(a.payload);
        s.detail.error = { code: err.code, message: err.message };
      })
      .addCase(fetchWordUsages.pending, (s) => {
        s.usages.status = "loading";
      })
      .addCase(fetchWordUsages.fulfilled, (s, a) => {
        s.usages.status = "succeeded";
        s.usages.data = a.payload;
      })
      .addCase(fetchWordUsages.rejected, (s, a) => {
        s.usages.status = "failed";
        const err = toErrorState(a.payload);
        s.usages.error = { code: err.code, message: err.message };
      })
      .addCase(createAdminWord.fulfilled, (s, a) => {
        s.words.data.unshift(toWordRow(a.payload));
        s.words.totalElements += 1;
      })
      .addCase(updateAdminWord.fulfilled, (s, a) => {
        s.detail.data = a.payload;
        const idx = s.words.data.findIndex((w) => w.id === a.payload.id);
        if (idx >= 0) s.words.data[idx] = toWordRow(a.payload);
      })
      .addCase(updateWordDefinitions.fulfilled, (s, a) => {
        s.detail.data = a.payload;
        const idx = s.words.data.findIndex((w) => w.id === a.payload.id);
        if (idx >= 0) s.words.data[idx] = toWordRow(a.payload);
      })
      .addCase(patchWordDefinition.fulfilled, (s, a) => {
        s.detail.data = a.payload;
        const idx = s.words.data.findIndex((w) => w.id === a.payload.id);
        if (idx >= 0) s.words.data[idx] = toWordRow(a.payload);
      })
      .addCase(regenerateAdminWord.fulfilled, (s, a) => {
        s.detail.data = a.payload;
        const idx = s.words.data.findIndex((w) => w.id === a.payload.id);
        if (idx >= 0) s.words.data[idx] = toWordRow(a.payload);
      })
      .addCase(deleteAdminWord.fulfilled, (s, a) => {
        const id = a.meta.arg;
        s.words.data = s.words.data.filter((w) => w.id !== id);
        s.words.totalElements = Math.max(0, s.words.totalElements - 1);
        if (s.detail.data?.id === id) s.detail = asyncIdle(null);
      });
  },
});

function toWordRow(detail: IAdminWordDetail): IAdminWord {
  return {
    id: detail.id,
    text: detail.text,
    key: detail.key,
    pos: detail.pos,
    status: detail.status,
    summaryVi: detail.summaryVi,
    cefrLevel: detail.cefrLevel,
    phonetics: detail.phonetics,
    definitionCount: detail.definitions?.length ?? detail.definitionCount ?? 0,
    usedEntryCount: detail.usedEntryCount,
    readyEntryCount: detail.readyEntryCount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

export const { clearWordDetail } = dictionarySlice.actions;
export default dictionarySlice.reducer;

const BASE = "/dictionaries/admin/dictionary/words";

export interface IFetchAdminWordsParams {
  q?: string;
  pos?: string;
  status?: string;
  used?: "all" | "used" | "unused";
  deepFields?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ICreateAdminWordRequest {
  wordText: string;
  pos: string;
  context?: string;
}

export interface IUpdateAdminWordRequest {
  text?: string;
  summaryVi?: string;
  phonetics?: {
    uk?: string;
    ukAudioUrl?: string;
    us?: string;
    usAudioUrl?: string;
  };
  cefrLevel?: string;
  isPhrase?: boolean;
  phraseType?: string;
  isValid?: boolean;
  context?: string;
  status?: string;
}

export interface IUpdateDefinitionsRequest {
  definitions: IAdminWordDefinition[];
  syncUsedEntries: boolean;
}

export interface IPatchDefinitionRequest {
  index: number;
  body: {
    definition?: string;
    meaningVi?: string;
    example?: string;
    viExample?: string;
    level?: string;
    syncUsedEntries: boolean;
  };
}

export const fetchAdminWords = createAsyncThunk(
  "dictionary/fetchWords",
  async (params: IFetchAdminWordsParams | undefined, { rejectWithValue }) => {
    try {
      const queryParams: Record<string, string | number | boolean> = {
        page: params?.page ?? 0,
        size: params?.size ?? 20,
        sort: params?.sort ?? "updatedDesc",
      };
      if (params?.q) queryParams.q = params.q;
      if (params?.pos && params.pos !== "ALL") queryParams.pos = params.pos;
      if (params?.status && params.status !== "ALL") queryParams.status = params.status;
      if (params?.used === "used") queryParams.used = true;
      if (params?.used === "unused") queryParams.used = false;
      queryParams.deepFields = !!params?.deepFields;
      return await handleAPI<IPageResponse<IAdminWord>>({ endpoint: BASE, params: queryParams });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const getAdminWordDetail = createAsyncThunk(
  "dictionary/getWordDetail",
  async (wordId: string, { rejectWithValue }) => {
    try {
      return await handleAPI<IAdminWordDetail>({ endpoint: `${BASE}/${wordId}` });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const createAdminWord = createAsyncThunk(
  "dictionary/createWord",
  async (body: ICreateAdminWordRequest, { rejectWithValue }) => {
    try {
      return await handleAPI<IAdminWordDetail>({ endpoint: BASE, method: "POST", body });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const updateAdminWord = createAsyncThunk(
  "dictionary/updateWord",
  async ({ wordId, body }: { wordId: string; body: IUpdateAdminWordRequest }, { rejectWithValue }) => {
    try {
      return await handleAPI<IAdminWordDetail>({ endpoint: `${BASE}/${wordId}`, method: "PUT", body });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const updateWordDefinitions = createAsyncThunk(
  "dictionary/updateDefinitions",
  async ({ wordId, body }: { wordId: string; body: IUpdateDefinitionsRequest }, { rejectWithValue }) => {
    try {
      return await handleAPI<IAdminWordDetail>({ endpoint: `${BASE}/${wordId}/definitions`, method: "PUT", body });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const patchWordDefinition = createAsyncThunk(
  "dictionary/patchDefinition",
  async ({ wordId, payload }: { wordId: string; payload: IPatchDefinitionRequest }, { rejectWithValue }) => {
    try {
      return await handleAPI<IAdminWordDetail>({
        endpoint: `${BASE}/${wordId}/definitions/${payload.index}`,
        method: "PATCH",
        body: payload.body,
      });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const regenerateAdminWord = createAsyncThunk(
  "dictionary/regenerateWord",
  async ({ wordId, clearDefinitions }: { wordId: string; clearDefinitions: boolean }, { rejectWithValue }) => {
    try {
      return await handleAPI<IAdminWordDetail>({
        endpoint: `${BASE}/${wordId}/regenerate`,
        method: "POST",
        body: { clearDefinitions },
      });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const deleteAdminWord = createAsyncThunk(
  "dictionary/deleteWord",
  async (wordId: string, { rejectWithValue }) => {
    try {
      return await handleAPI<string>({ endpoint: `${BASE}/${wordId}`, method: "DELETE" });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);

export const fetchWordUsages = createAsyncThunk(
  "dictionary/fetchUsages",
  async (
    { wordId, page, size, onlyReady }: { wordId: string; page?: number; size?: number; onlyReady?: boolean | null },
    { rejectWithValue }
  ) => {
    try {
      const params: Record<string, string | number | boolean> = {
        page: page ?? 0,
        size: size ?? 10,
      };
      if (onlyReady !== null && onlyReady !== undefined) params.onlyReady = onlyReady;
      return await handleAPI<IPageResponse<IWordEntryUsage>>({
        endpoint: `${BASE}/${wordId}/entries`,
        params,
      });
    } catch (e) {
      return rejectWithValue(extractError(e));
    }
  }
);
