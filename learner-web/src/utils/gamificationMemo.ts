// src/utils/gamificationMemo.ts
import type { IUserGamificationResponse, IGamificationState } from "@/types/gamification";

const BASE_XP = 1000;
const XP_INCREMENT = 500;
const MAX_PROGRESSIVE_LV = 30;
const INFINITE_LEVEL_XP = 30000;

/**
 *  HÀM LÕI TOÁN HỌC: Dùng vòng lặp (While) trừ dần XP.
 * Chạy cực nhanh, dễ hiểu và KHÔNG BAO GIỜ sai số như tính Căn bậc 2.
 */
export const calculateLevelDetails = (totalXp: number) => {
  let level = 1;
  let remainingXp = totalXp;
  let xpRequiredForNextLevel = BASE_XP;

  // 1. Tính Level cho hệ thống cấp độ lũy tiến (Dưới level 30)
  while (level < MAX_PROGRESSIVE_LV) {
    xpRequiredForNextLevel = BASE_XP + (level - 1) * XP_INCREMENT;

    // Nếu đủ XP để thăng cấp -> Trừ XP đi và lên 1 cấp
    if (remainingXp >= xpRequiredForNextLevel) {
      remainingXp -= xpRequiredForNextLevel;
      level++;
    } else {
      break; // Không đủ XP thăng cấp nữa thì dừng lại
    }
  }

  // 2. Tính Level cho hệ thống Vô cực (Từ 30 trở đi, mỗi cấp 30,000 XP đều đặn)
  if (level >= MAX_PROGRESSIVE_LV) {
    const additionalLevels = Math.floor(remainingXp / INFINITE_LEVEL_XP);
    level = MAX_PROGRESSIVE_LV + additionalLevels;
    
    remainingXp = remainingXp % INFINITE_LEVEL_XP; // Số XP lẻ còn lại của level hiện tại
    xpRequiredForNextLevel = INFINITE_LEVEL_XP;
  }

  const xpInCurrentLevel = remainingXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100)));

  return { level, xpInCurrentLevel, xpRequiredForNextLevel, progressPercent };
};

/**
 * Hàm dùng DUY NHẤT 1 LẦN khi vừa lấy dữ liệu từ Backend API
 */
export const mapGamificationData = (
  raw: IUserGamificationResponse
): IGamificationState => {
  const totalXp = Math.max(0, raw.totalXp)

  const levelDetails = calculateLevelDetails(totalXp)

  return {
    userId: raw.userId,
    totalXp,
    rewardCoins: raw.rewardCoins ?? 0,
    currentStreak: raw.currentStreak ?? 0,
    longestStreak: raw.longestStreak ?? 0,
    rewardGems: raw.rewardGems ?? 0,

    lastActiveDate: raw.lastActiveDate ?? null,
    serverDate: raw.serverDate ?? null,
    streakAlive: raw.streakAlive ?? false,
    canIncreaseStreakToday: raw.canIncreaseStreakToday ?? false,

    ...levelDetails,
    xpQueue: [],
  }
}