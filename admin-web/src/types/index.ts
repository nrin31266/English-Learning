export interface IUserProfile {
  email?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  keyCloakId: string;
}

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

// export interface IAddEditTopicPayload {
//   name: string;
//   description: string;
//   isActive: boolean;
//   color: string; 
// }

export interface IAsyncState<T> {
  data: T;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: IErrorState;
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

export const sourceLanguageOptions = ["en-US", "en-UK"] as const
//  NONE,
//     PROCESSING_STARTED,
//     SOURCE_FETCHED,        // downloaded file / youtube content fetched
//     TRANSCRIBED,           // speech-to-text completed
//     NLP_ANALYZED,          // NLP analysis done (language, CEFR…)
//     POST_PROCESSED,        // alignment and cleanup finished

//     COMPLETED,
//     FAILED
export const LessonProcessingStep = [
  "NONE",
  "PROCESSING_STARTED",
  "SOURCE_FETCHED",
  "TRANSCRIBED",
  "NLP_ANALYZED",
  "COMPLETED",
  "FAILED"
] as const;
  // DRAFT,
  //   PROCESSING,
  //   READY,
  //   ERROR,
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
  processingStep: typeof LessonProcessingStep[number]
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
  processingStep: (typeof LessonProcessingStep)[number];
  aiJobId: string | null;
  aiMessage: string | null;
  audioUrl: string | null;
  sourceReferenceId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}
export interface ILessonSentence {
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

  lessonWords: ILessonWord[];
}
export interface ILessonWord {
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

export interface ILessonDetailsDto {
  id: number
  topic: ITopicOption
  title: string
  thumbnailUrl: string | null
  slug: string
  description: string | null
  lessonType: typeof LessonType[number]
  processingStep: typeof LessonProcessingStep[number]
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
  sentences: ILessonSentence[];
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