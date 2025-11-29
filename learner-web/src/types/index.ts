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

export interface IShadowingResult {
  sentenceId: number
  expectedText: string
  recognizedText: string
  totalWords: number
  correctWords: number
  accuracy: number
  weightedAccuracy: number
  recognizedWordCount: number
  lastRecognizedPosition: number
  compares: IShadowingWordCompare[]
}

export interface IShadowingWordCompare {
  position: number
  expectedWord: string
  recognizedWord: string
  expectedNormalized: string
  recognizedNormalized: string
  status: "CORRECT" | "NEAR" | "WRONG" | "MISSING" | "EXTRA"
  score: number
}


export interface ILLessonSentence {
  id: number;
  lessonId: number;

  orderIndex: number;

  textRaw: string;
  textDisplay: string | null;
  translationVi: string | null;

  phoneticUk: string | null;
  phoneticUs: string | null;

  audioStartMs: number 
  audioEndMs: number 
  audioSegmentUrl: string | null;

  aiMetadataJson: string | null;

  isActive: boolean;

  createdAt: string;
  updatedAt: string;

  lessonWords: ILLessonWord[];
}
// ILessonWord
export interface ILLessonWord {
  id: number;
  sentenceId: number;
  orderIndex: number;
  wordText: string;
  wordLower: string | null;
  wordNormalized: string | null;
  wordSlug: string | null;
  startCharIndex: number | null;
  endCharIndex: number | null;
  audioStartMs: number | null;
  audioEndMs: number | null;
  isPunctuation: boolean;
  isClickable: boolean;
  createdAt: string;
  updatedAt: string;
}
// LLessonDetailsDto
export interface ILLessonDetailsDto {
  id: number
  topic: ITopicOption
  title: string
  thumbnailUrl: string | null
  slug: string
  description: string | null
  lessonType: typeof LessonType[number]
  processingStep: typeof lessonProcessingStep[number]
  languageLevel: typeof cefrLevelOptions[number]
  sourceType: typeof sourceTypeOptions[number]
  sourceUrl: string
  audioUrl: string | null
  sourceReferenceId: string | null
  sourceLanguage: string
  durationSeconds: number | null
  totalSentences: number | null
  status: typeof LessonStatus[number]
  aiJobId: string | null
  enableDictation: boolean
  enableShadowing: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  aiMessage: string | null
  aiMetadataUrl?: string | null
  sentences: ILLessonSentence[];
}

// LTopicResponse
export interface ILTopicResponse{
  id: number
  name: string
  slug: string
  updatedAt: string // ISO datetime string, ví dụ "2025-11-28T10:20:30"
  totalLessons: number
  lessons: ILHomeLessonResponse[]
}


// ActiveTopicMinimalResponse
export interface IActiveTopicMinimalResponse {
  id: number
  name: string
  slug: string
  updatedAt: string // ISO datetime string, ví dụ "2025-11-28T10:20:30"
  totalLessons: number
}

// LHomeLessonResponse
export interface ILHomeLessonResponse {
  id: number
  topicSlug: string
  title: string
  thumbnailUrl: string | null
  slug: string
  languageLevel: typeof cefrLevelOptions[number]
  sourceType: typeof sourceTypeOptions[number]
  durationSeconds: number | null
  enableDictation: boolean | null
  enableShadowing: boolean | null
}

// LHomeTopicResponse
export interface ILHomeTopicResponse {
  id: number
  name: string
  slug: string
  lessons: ILHomeLessonResponse[]
}

// LHomeResponse
export interface ILHomeResponse {
  allTopics: IActiveTopicMinimalResponse[]
  topics: ILHomeTopicResponse[]
}

export interface IUserProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  keyCloakId: string;
}
export type MutationType = "add" | "edit" | "delete" | null;
export const lessonTypeOptions = ["AI_ASSISTED", "TRADITIONAL"] as const
export const cefrLevelOptions = ["A1", "A2", "B1", "B2", "C1", "C2"] as const
export const sourceTypeOptions = ["YOUTUBE", "AUDIO_FILE", "OTHER"] as const
export const sourceTypeSelectOptions = [
  { value: "YOUTUBE", label: "YouTube" },
  { value: "AUDIO_FILE", label: "Audio File" },
  { value: "OTHER", label: "Other" },
] as const
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
  color: string | null; // nếu color có thể null từ backend
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
  lessonCount?: number; // Số lượng bài học trong chủ đề này
}

export interface ITopicOption{
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



export const sourceLanguageOptions = ["en-US", "en-UK"] as const



export const LessonStatus = [
  "DRAFT",
  "PROCESSING",
  "READY",
  "ERROR"
] as const;
export const lessonStatusSelectOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "ERROR", label: "Error" },
] as const;


export const LessonType = [
  "AI_ASSISTED",
  "TRADITIONAL"
] as const;
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

export interface IPageResponse <T> {
  content: T[];
  pageable: IPageableInfo;
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; // page number
  first: boolean;
  numberOfElements: number;
  sort: ISortInfo;
  empty: boolean;
}

export interface ILessonDto {
  id: number
  topic: ITopicOption
  title: string
  thumbnailUrl: string | null
  slug: string
  description: string | null
  lessonType: typeof LessonType[number]
  processingStep: typeof lessonProcessingStep[number]
  languageLevel: typeof cefrLevelOptions[number]
  sourceType: typeof sourceTypeOptions[number]
  sourceUrl: string
  audioUrl: string | null
  sourceReferenceId: string | null
  sourceLanguage: string
  durationSeconds: number | null
  totalSentences: number | null
  status: typeof LessonStatus[number]
  aiJobId: string | null
  enableDictation: boolean
  enableShadowing: boolean
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}
export interface ILessonProcessingStepNotifyEvent {
  lessonId: number;
  processingStep: (typeof lessonProcessingStep)[number];
  aiJobId: string | null;
  aiMessage: string | null;
  audioUrl: string | null;
  sourceReferenceId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

export interface ILessonMinimalDto{
  id: number;
  slug: string;
  title: string;
}

export interface IEditLessonPayload {
  title: string;
  description: string | null;
  languageLevel: typeof cefrLevelOptions[number];
  sourceLanguage: string;
  thumbnailUrl: string | null;
  enableDictation: boolean;
  enableShadowing: boolean;
}