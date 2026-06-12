// src/utils/gamificationMemo.ts

import type { IUserGamificationResponse, IGamificationState } from "@/types/gamification";

const BASE_XP = 1000;
const XP_INCREMENT = 500;
const MAX_PROGRESSIVE_LV = 30;
const INFINITE_LEVEL_XP = 20000;

const getTotalXpRequiredForLevel30OrLess = (lvl: number): number => {
  if (lvl <= 1) return 0;
  return (lvl - 1) * BASE_XP + ((lvl - 2) * (lvl - 1) / 2) * XP_INCREMENT;
};

const XP_FOR_LEVEL_30 = getTotalXpRequiredForLevel30OrLess(MAX_PROGRESSIVE_LV);

/**
 * 👉 HÀM LÕI TOÁN HỌC: Chỉ nhận vào Tổng XP và tính ra các thông số Level
 * Hàm này dùng chung cho cả lúc Khởi tạo lẫn lúc Cộng điểm (Redux)
 */
export const calculateLevelDetails = (totalXp: number) => {
  let level = 1;
  let xpInCurrentLevel = 0;
  let xpRequiredForNextLevel = BASE_XP;

  if (totalXp < XP_FOR_LEVEL_30) {
    level = Math.floor(Math.sqrt(1 + totalXp / 250) - 1);
    level = Math.max(1, Math.min(MAX_PROGRESSIVE_LV - 1, level));

    const xpFloorForCurrentLevel = getTotalXpRequiredForLevel30OrLess(level);
    xpInCurrentLevel = totalXp - xpFloorForCurrentLevel;
    xpRequiredForNextLevel = BASE_XP + (level - 1) * XP_INCREMENT;
  } else {
    const excessXp = totalXp - XP_FOR_LEVEL_30;
    const additionalLevels = Math.floor(excessXp / INFINITE_LEVEL_XP);
    
    level = MAX_PROGRESSIVE_LV + additionalLevels;
    xpInCurrentLevel = excessXp % INFINITE_LEVEL_XP;
    xpRequiredForNextLevel = INFINITE_LEVEL_XP;
  }

  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpRequiredForNextLevel) * 100));

  return { level, xpInCurrentLevel, xpRequiredForNextLevel, progressPercent };
};

/**
 * Hàm dùng DUY NHẤT 1 LẦN khi vừa lấy dữ liệu từ Backend API (Lúc mở app)
 */
export const mapGamificationData = (raw: IUserGamificationResponse): IGamificationState => {
  const totalXp = Math.max(0, raw.totalXp);
  
  // Gọi hàm lõi để lấy thông số level
  const levelDetails = calculateLevelDetails(totalXp);

  return {
    userId: raw.userId,
    totalXp,
    rewardCoins: raw.rewardCoins,
    currentStreak: raw.currentStreak,
    longestStreak: raw.longestStreak,
    ...levelDetails, // Trải phẳng level, xpInCurrentLevel, v.v. vào đây
    xpQueue: [] as IGamificationState["xpQueue"] // Lúc mới mở app thì queue rỗng là chuẩn
  };
};