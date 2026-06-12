// src/utils/gamificationUtils.ts

interface GamificationResult {
  earnedXp: number
  earnedCoins: number
  shouldReward: boolean
}

export const getMultiplierByLevel = (level: string | undefined): number => {
  if (!level) return 1.0
    
  switch (level.toUpperCase()) {
    case "A1":
    case "EASY":
      return 1.0
    case "A2":
      return 1.5
    case "B1":
    case "MEDIUM":
      return 2.0
    case "B2":
      return 2.5 
    case "C1":
    case "HARD":
      return 3.0
    case "C2":
    case "EXPERT":
      return 3.5
    default:
      return 1.0 
  }
}

/**
 *  TIỆN ÍCH CORE: Tính toán phần thưởng Gamification dựa trên độ chênh lệch điểm số và hệ số bài học.
 */
export const calculateEarnedRewards = (
  newScore: number,
  oldHighestScore: number,
  multiplier = 1
): GamificationResult => {
  console.log("Calculating rewards with:", { newScore, oldHighestScore, multiplier })
  
  if (newScore <= oldHighestScore) {
    return {
      earnedXp: 0,
      earnedCoins: 0,
      shouldReward: false,
    }
  }

 // Tính độ chênh lệch tiến bộ cơ bản (Max là 100 điểm)
  const scoreDifference = newScore - oldHighestScore

  // 1. Quy đổi XP: Giới hạn gốc tối đa 100 XP trước, rồi mới nhân hệ số (Bảo vệ logic thăng cấp)
  const baseXp = Math.min(100, scoreDifference) * multiplier
  const earnedXp = Math.max(1, Math.round(baseXp))

  // 2. Quy đổi Coin: Giới hạn gốc tối đa 10 Coin trước, rồi mới nhân hệ số khó
  const baseCoins = Math.min(10, scoreDifference / 10) * multiplier
  const earnedCoins = Math.max(1, Math.floor(baseCoins))

  return {
    earnedXp,
    earnedCoins,
    shouldReward: true,
  }
}