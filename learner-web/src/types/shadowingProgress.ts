// src/types/shadowingProgress.ts

export interface SentenceShadowingAttempt {
  id: number
  userId: string
  lessonId: number
  sentenceId: number
  completed: boolean
  

  
  // 👉 Điểm cao nhất
  bestScore: number | null
  bestFluency: number | null
  

  
  createdAt: string
  updatedAt: string
}

export interface LessonShadowingProgress {
  id: number
  userId: string
  lessonId: number
  lessonVersion: number
  totalSentences: number
  completedSentences: number
  completed: boolean
  
  sentenceAttempts: SentenceShadowingAttempt[]
  
  createdAt: string
  updatedAt: string
}

// Response từ API khi submit score
export interface ShadowingScoreResponse {
  attemptId: number
  attemptCompleted: boolean
  lessonCompleted: boolean
}

// ❌ XÓA hoàn toàn interface SentenceShadowingScore (vì đã bỏ bảng)