// src/types/lessonProgress.ts

export type LearningMode = 'SHADOWING' | 'DICTATION';
export type ProgressStatus = 'IN_PROGRESS' | 'COMPLETED';

// DTO chứa tiến độ của 1 chế độ học cụ thể (thay thế cho LessonShadowingProgress cũ)
export interface UserLessonProgress {
  mode: LearningMode;
  status: ProgressStatus;
  completedSentenceIds: number[]; // Backend trả về Set<Long> sẽ parse thành array ở Frontend
  totalCompletedSentences: number;
}

// Wrapper DTO chứa toàn bộ tiến độ của bài học (nằm trong LessonDetailsResponse)
export interface LessonProgressOverview {
  shadowing: UserLessonProgress;
  dictation: UserLessonProgress;
}

// Response từ API khi gọi PUT /process/progress
export interface ProgressUpdateResponse {
  isPassed: boolean;
  sentenceCompleted: boolean;
  lessonCompleted: boolean;
  totalCompletedSentences: number;
}

// (Tùy chọn) Request payload để gửi lên API PUT /process/progress
export interface ProgressUpdateRequest {
  lessonId: number;
  sentenceId: number;
  mode: LearningMode;
  score: number;
}