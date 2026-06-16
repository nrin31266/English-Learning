// src/types/gamification.ts
export interface IGamificationState {
  userId: string
  totalXp: number
  rewardCoins: number
  rewardGems: number

  currentStreak: number
  longestStreak: number
  lastActiveDate?: string | null

  serverDate?: string | null
  streakAlive: boolean
  canIncreaseStreakToday: boolean

  level: number
  xpInCurrentLevel: number
  xpRequiredForNextLevel: number
  progressPercent: number

  xpQueue: {
    id: string
    amount: number
    source: string
  }[]
}
export interface IXPParticle {
  id: string;     // Mã định danh duy nhất (UUID hoặc Timestamp kết hợp Random) để quản lý vòng đời Component
  amount: number; // Số lượng điểm kinh nghiệm (XP) được cộng vào
  source: string; // Nguồn kích hoạt phần thưởng (ví dụ: "Dictation", "Shadowing", "Vocabulary")
}

export interface IUserGamificationResponse {
  userId: string
  totalXp: number
  rewardCoins: number
  rewardGems: number
  currentStreak: number
  longestStreak: number
  lastActiveDate?: string | null

  serverDate?: string | null
  streakAlive?: boolean
  canIncreaseStreakToday?: boolean
}