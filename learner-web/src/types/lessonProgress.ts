// src/types/lessonProgress.ts

export type LearningMode = 'SHADOWING' | 'DICTATION';
export type ProgressStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface ProgressItem {
  bestScore: number;
  latestScore: number;
  attemptCount: number;
  firstCompletedAt: number | null;
  lastPracticedAt: number | null;
}

// DTO chứa tiến độ của 1 chế độ học cụ thể (thay thế cho LessonShadowingProgress cũ)
export interface UserLessonProgress {
  mode: LearningMode;
  status: ProgressStatus;
  progressItems: Record<number, ProgressItem>;
  lessonScore: number | null;
  completedSentenceCount: number;
  totalSentenceCount: number;
  completedAt: number | null;
}

// Wrapper DTO chứa toàn bộ tiến độ của bài học (nằm trong LessonDetailsResponse)
export interface LessonProgressOverview {
  shadowing: UserLessonProgress;
  dictation: UserLessonProgress;
}

export interface ProgressUpdateResponse {
  progress: UserLessonProgress;
  justCompletedLesson: boolean;
}

// (Tùy chọn) Request payload để gửi lên API PUT /process/progress
export interface ProgressUpdateRequest {
  lessonId: number;
  sentenceId: number;
  mode: LearningMode;
  score: number;
}
