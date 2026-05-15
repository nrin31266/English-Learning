import type { LessonProgressOverview } from "./lessonProgress"


export interface ITranscriptionResponse {
  id: string
  filename: string
  duration: number
  language: string
  segments: ITranscriptionSegment[]
  full_text: string
  created_at: string
  shadowingResult: IShadowingResult
}

export interface ITranscriptionSegment {
  start: number
  end: number
  text: string
  words: IShadowingWord[]
}

export interface IShadowingWord {
  word: string
  start: number
  end: number
  score: number
}

// 👇 THÊM 2 TYPE NÀY
export type DiffTokenType = "MATCH" | "MISMATCH" | "MISSING" | "EXTRA" | "STRESS_MATCH" | "PUNCT" | "NO_DATA" | "STRESS_WRONG";
export type WordStatus = "CORRECT" | "NEAR" | "WRONG" | "MISSING" | "EXTRA"

export interface IDiffToken {
  type: DiffTokenType
  expected: string | null      // 👈 đổi từ expected_ipa → expected
  actual: string | null        // 👈 đổi từ actual_ipa → actual
  position: number | null
  // Optional fields cho STRESS/PUNCT
  expected_ipa?: string | null
  actual_ipa?: string | null
  stress?: {
    expected: string | null
    actual: string | null
  }
  punct?: {
    expected: string | null
    actual: string | null
  }
}

export interface IPhonemeDiff {
  score: number
  diff_tokens: IDiffToken[]     // 👈 bỏ optional, luôn có (có thể là [])
  expected_ipa: string | null
  actual_ipa: string | null
}

export interface IShadowingWordCompare {
  position: number
  expectedWord: string | null
  recognizedWord: string | null
  expectedNormalized: string | null
  recognizedNormalized: string | null
  status: WordStatus
  score: number
  phonemeDiff: IPhonemeDiff      // 👈 bỏ optional, luôn có
}

export interface IShadowingResult {
  sentenceId: number
  expectedText: string
  recognizedText: string
  totalWords: number
  correctWords: number
  accuracy: number
  weightedAccuracy: number
  fluencyScore: number
  avgPause: number
  speechRate: number
  recognizedWordCount: number
  lastRecognizedPosition: number
  compares: IShadowingWordCompare[]
  phonemeDiff?: IPhonemeDiff | null
}

export interface ILessonSentenceDetailsResponse {
  id: number;
  lessonId: number;
  orderIndex: number;
  textRaw: string;
  textDisplay: string | null;
  translationVi: string | null;
  phoneticUs: string | null;               // ✅ giữ US, xóa UK
  audioStartMs: number;
  audioEndMs: number;
  audioSegmentUrl: string | null;
  aiMetadataJson: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lessonWords: ILessonWordResponse[];
}

export interface ILessonWordResponse {
  id: number;
  sentenceId: number;
  orderIndex: number;
  wordText: string;
  wordNormalized: string | null;           // ✅ giữ lại
  lemma: string | null;
  posTag: string | null;
  entityType: string | null;
  audioStartMs: number | null;
  audioEndMs: number | null;
  hasPunctuation: boolean;
  isClickable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ILessonDetailsResponse {
  id: number;
  topic: ITopicOption;
  title: string;
  thumbnailUrl: string | null;
  slug: string;
  description: string | null;
  lessonType: typeof LessonType[number];
  processingStep: typeof lessonProcessingStep[number];
  languageLevel: typeof cefrLevelOptions[number];
  sourceType: typeof sourceTypeOptions[number];
  sourceUrl: string;
  audioUrl: string | null;
  sourceReferenceId: string | null;
  sourceLanguage: string;
  durationSeconds: number | null;
  totalSentences: number | null;
  status: typeof LessonStatus[number];
  aiJobId: string | null;
  enableDictation: boolean;
  enableShadowing: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  aiMessage: string | null;
  aiMetadataUrl?: string | null;
  sentences: ILessonSentenceDetailsResponse[];
  progressOverview: LessonProgressOverview;  // 👈 thêm trường này để chứa progress của cả bài học
}

export interface ITopicDetailsResponse {
  id: number;
  name: string;
  slug: string;
  updatedAt: string;
  totalLessons: number;
  lessons: IHomeLessonResponse[];
}

export interface ITopicSummaryResponse {
  id: number;
  name: string;
  slug: string;
  updatedAt: string;
  totalLessons: number;
}

export interface IHomeLessonResponse {
  id: number;
  topicSlug: string; // Đã map từ backend
  title: string;
  thumbnailUrl: string | null;
  slug: string;
  languageLevel: typeof cefrLevelOptions[number];
  sourceType: typeof sourceTypeOptions[number];
  durationSeconds: number | null;
  enableDictation: boolean | null;
  enableShadowing: boolean | null;
  
  // 👇 CÁC FIELD MỚI ĐỂ HIỂN THỊ TRẠNG THÁI VÀ PROGRESS BAR TẠI TRANG HOME
  shadowingStatus: string;
  dictationStatus: string;
  shadowingProgressPercent: number;
  dictationProgressPercent: number;
  activeSentenceCount: number;
}

export interface IHomeTopicResponse {
  id: number;
  name: string;
  slug: string;
  lessons: IHomeLessonResponse[];
}

export interface IResumeLessonDto {
  id: number;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  languageLevel: typeof cefrLevelOptions[number];
  sourceType: typeof sourceTypeOptions[number];
  durationSeconds: number | null;
  enableDictation: boolean | null;
  enableShadowing: boolean | null;
  mode: string;
  progressPercent: number;
  activeSentenceCount: number;
}

export interface IResumeLearningResponse {
  totalInProgress: number;
  hasMore: boolean;
  recentLessons: IResumeLessonDto[];
}

export interface IHomeTopicsResponse {
  allTopics: ITopicSummaryResponse[];
  topics: IHomeTopicResponse[];
  resumeLearning: IResumeLearningResponse | null;
}

export interface IUserProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  keyCloakId: string;
}

export type MutationType = "add" | "edit" | "delete" | null;

export const lessonTypeOptions = ["AI_ASSISTED", "TRADITIONAL"] as const;
export const cefrLevelOptions = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const sourceTypeOptions = ["YOUTUBE", "AUDIO_FILE", "OTHER"] as const;
export const sourceTypeSelectOptions = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "AUDIO_FILE", label: "Audio File" },
  { value: "OTHER", label: "Other" },
] as const;

export const lessonProcessingStep = [
  "NONE",
  "PROCESSING_STARTED",
  "SOURCE_FETCHED",
  "TRANSCRIBED",
  "NLP_ANALYZED",
  "COMPLETED",
  "FAILED"
] as const;

export interface IApiResponse<T> {
  result: T;
  message: string;
  code: number;
}

export interface ITopicDto {
  id: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  lessonCount?: number;
}

export interface ITopicOption {
  id: number;
  name: string;
  slug: string;
}

export interface IErrorState {
  code: number | null;
  message: string | null;
}

export interface IAsyncState<T> {
  data: T;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: IErrorState;
}

export const sourceLanguageOptions = ["en-US", "en-UK"] as const;

export const LessonStatus = ["DRAFT", "PROCESSING", "READY", "ERROR"] as const;
export const lessonStatusSelectOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "ERROR", label: "Error" },
] as const;

export const LessonType = ["AI_ASSISTED", "TRADITIONAL"] as const;
export const lessonTypeSelectOptions = [
  { value: "AI_ASSISTED", label: "AI Assisted" },
  { value: "TRADITIONAL", label: "Traditional" },
] as const;

export interface ISortInfo {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
}

export interface IPageableInfo {
  pageNumber: number;
  pageSize: number;
  sort: ISortInfo;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface IPageResponse<T> {
  content: T[];
  pageable: IPageableInfo;
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  sort: ISortInfo;
  empty: boolean;
}

// ── Vocab types (dictionary-service) ─────────────────────────────────────

export interface IVocabTopic {
  id: string;
  title: string;
  description: string;
  tags: string[];
  cefrRange: string;
  estimatedWordCount: number;
  subtopicCount: number;
  readySubtopicCount: number;
  status: "DRAFT" | "GENERATING_SUBTOPICS" | "READY_FOR_WORD_GEN" | "PROCESSING" | "READY";
  isActive: boolean;
  active?: boolean;
  thumbnailUrl?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface IVocabSubTopic {
  id: string;
  topicId: string;
  title: string;
  titleVi: string;
  description: string;
  cefrLevel: string;
  order: number;
  wordCount: number;
  readyWordCount: number;
  status: string;
  isActive: boolean;
  active?: boolean;
  createdAt: string;
}

export interface IVocabWordEntry {
  id: string;
  subtopicId: string;
  topicId: string;
  wordKey: string;
  wordText: string;
  pos: string;
  order: number;
  wordReady: boolean;
  note?: string;
  contextDefinition?: string;
  contextMeaningVi?: string;
  contextExample?: string;
  contextViExample?: string;
  contextLevel?: string;
  wordDetail?: unknown;
}

export interface IVocabTag {
  name: string;
  count: number;
}

/** Matches the custom PageResponse returned by dictionary-service */
export interface IVocabPageResponse<T> {
  data: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}