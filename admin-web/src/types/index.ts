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
  status: "PENDING_WORDS" | "GENERATING_WORDS" | "PROCESSING_WORDS" | "READY";
  createdAt: string;
}

export interface IVocabWordEntry {
  id: string;
  wordKey: string;
  wordText: string;  // display text with proper casing & diacritics (e.g. "C++", "Node.js", "déjà")
  pos: string;
  order: number;
  wordReady: boolean;
  note?: string;
  wordDetail?: {
    id?: string;
    text: string;
    key?: string;
    summaryVi: string;
    cefrLevel: string;
    phonetics: { us: string; usAudioUrl: string };
    definitions: { definition: string; meaningVi: string; example: string; viExample: string; level: string }[];
  };
  // Context-matched definition (Polysemy resolution from VocabWordEntryResponse)
  contextDefinition?: string;  // EN definition
  contextMeaningVi?: string;   // VI meaning
  contextExample?: string;     // EN Example
  contextViExample?: string;   // VI Example
  contextLevel?: string;       // e.g. "B1"
  subtopicId?: string;         // for delete/reference
  topicId?: string;
}

export interface IVocabSubTopicProgressEvent {
  topicId: string;
  subtopicId: string;
  subtopicTitle: string;
  readyWordCount: number;
  wordCount: number;
  subtopicStatus: string; // PROCESSING_WORDS or READY
}

export interface IVocabSubTopicReadyEvent {
  topicId: string;
  subtopicId: string;
  subtopicTitle: string;
  topicTitle: string;
  topicReady: boolean;
  readyWordCount: number;
  wordCount: number;
  readySubtopicCount: number;
}

export interface IVocabSubtopicsGeneratedEvent {
  topicId: string;
  topicTitle: string;
  subtopicCount: number;
}

export interface IAsyncState<T> {
  data: T;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: IErrorState;
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

export const sourceLanguageOptions = ["en-US", "en-UK"] as const;

export const LessonProcessingStep = [
  "NONE",
  "PROCESSING_STARTED",
  "SOURCE_FETCHED",
  "TRANSCRIBED",
  "NLP_ANALYZED",
  "COMPLETED",
  "FAILED"
] as const;

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

export interface ILessonDto {
  id: number;
  topic: ITopicOption;
  title: string;
  thumbnailUrl: string | null;
  slug: string;
  description: string | null;
  lessonType: typeof LessonType[number];
  processingStep: typeof LessonProcessingStep[number];
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
}

export interface ILessonSentence {
  id: number;
  lessonId: number;
  orderIndex: number;
  textRaw: string;
  textDisplay: string | null;
  translationVi: string | null;
  phoneticUs: string | null;        // ✅ chỉ giữ US, xóa UK
  audioStartMs: number;
  audioEndMs: number;
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
  wordNormalized: string | null;    // ✅ giữ lại
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

export interface ILessonDetailsDto {
  id: number;
  topic: ITopicOption;
  title: string;
  thumbnailUrl: string | null;
  slug: string;
  description: string | null;
  lessonType: typeof LessonType[number];
  processingStep: typeof LessonProcessingStep[number];
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
  sentences: ILessonSentence[];
}

export interface ILessonMinimalDto {
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

export interface IWordQueueView {
  queued: string[];
  processing: string[];
  enabled: boolean;
  recentlyAddedWords: IWord[];
}

export interface IWord {
  id: string;
  displayWord: string;
  isValidWord: boolean;
  wordType: string;
  cefrLevel: string;
  phonetics: IPhonetics;
  definitions: IDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface IPhonetics {
  us: string;
  uk: string;
  audioUs: string;
  audioUk: string;
}

export interface IDefinition {
  type: string;
  definition: string;
  vietnamese: string;
  example: string;
}

export interface ILessonProcessingStepNotifyEvent{
  lessonId: number;
  processingStep: typeof LessonProcessingStep[number];
  aiJobId?: string | null;
  aiMessage?: string | null;
  audioUrl?: string | null;
  sourceReferenceId?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
}