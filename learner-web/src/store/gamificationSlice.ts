// src/store/gamificationSlice.ts

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { IGamificationState } from "@/types/gamification";
import { calculateLevelDetails } from "@/utils/gamificationMemo";

const initialState: IGamificationState = {
  userId: "",
  totalXp: 0,
  rewardCoins: 0,
  currentStreak: 0,
  longestStreak: 0,
  level: 1,
  xpInCurrentLevel: 0,
  xpRequiredForNextLevel: 1000,
  rewardGems: 0,
  progressPercent: 0,
  xpQueue: [], // Trạng thái mặc định ban đầu
};

const gamificationSlice = createSlice({
  name: "gamification",
  initialState,
  reducers: {
    // 1. Khi mở app, đổ nguyên cục State đã map từ API vào
    setInitialGamification: (state, action: PayloadAction<IGamificationState>) => {
      return action.payload; // Ghi đè toàn bộ bằng dữ liệu từ Backend
    },

    // 2. KHI HỌC VIÊN KIẾM ĐƯỢC ĐIỂM (Được gọi liên tục)
    gainRewards: (state, action: PayloadAction<{ xp: number; coins: number; source: string }>) => {
      const { xp, coins, source } = action.payload;

      // Cộng dồn điểm và coin
      state.totalXp += xp;
      state.rewardCoins += coins;

      // Tính lại cấp độ mới dựa trên Tổng XP vừa cộng (Dùng hàm lõi)
      const newLevelDetails = calculateLevelDetails(state.totalXp);
      state.level = newLevelDetails.level;
      state.xpInCurrentLevel = newLevelDetails.xpInCurrentLevel;
      state.xpRequiredForNextLevel = newLevelDetails.xpRequiredForNextLevel;
      state.progressPercent = newLevelDetails.progressPercent;

      // 👉 ĐIỂM MẤU CHỐT ĐÂY: Thêm hiệu ứng mới vào CUỐI hàng đợi, KHÔNG GHI ĐÈ
      // Dùng Immer.js (có sẵn trong Redux Toolkit) nên push() an toàn, không mutate state gốc
      state.xpQueue.push({
        id: `xp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: xp,
        source: source,
      });
    },

    // 3. Sau khi Animation bay xong, UI sẽ gọi hàm này để xóa cái hạt XP đó đi
    dequeueXp: (state, action: PayloadAction<string>) => {
      state.xpQueue = state.xpQueue.filter((particle) => particle.id !== action.payload);
    },
  },
});

export const { setInitialGamification, gainRewards, dequeueXp } = gamificationSlice.actions;
export default gamificationSlice.reducer;