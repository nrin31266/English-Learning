// src/store/gamificationSlice.ts

import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { IGamificationState } from "@/types/gamification"
import { calculateLevelDetails } from "@/utils/gamificationMemo"

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

  lastActiveDate: null,
  serverDate: null,
  streakAlive: false,
  canIncreaseStreakToday: false,

  xpQueue: [],
}

const gamificationSlice = createSlice({
  name: "gamification",
  initialState,
  reducers: {
    setInitialGamification: (
      state,
      action: PayloadAction<IGamificationState>
    ) => {
      const payload = action.payload

      return {
        ...initialState,
        ...payload,
        xpQueue: payload.xpQueue ?? [],
      }
    },

    gainRewards: (
      state,
      action: PayloadAction<{
        xp: number
        coins: number
        source: string
      }>
    ) => {
      const { xp, coins, source } = action.payload

      const safeXp = Math.max(0, Number(xp) || 0)
      const safeCoins = Math.max(0, Number(coins) || 0)

      if (safeXp <= 0 && safeCoins <= 0) {
        return
      }

      state.totalXp += safeXp
      state.rewardCoins += safeCoins

      const newLevelDetails = calculateLevelDetails(state.totalXp)

      state.level = newLevelDetails.level
      state.xpInCurrentLevel = newLevelDetails.xpInCurrentLevel
      state.xpRequiredForNextLevel = newLevelDetails.xpRequiredForNextLevel
      state.progressPercent = newLevelDetails.progressPercent

      if (safeXp > 0) {
        state.xpQueue.push({
          id: `xp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: safeXp,
          source,
        })
      }
    },

    updateStreak: (
      state,
      action: PayloadAction<{
        currentStreak: number
        longestStreak: number
        lastActiveDate?: string | null
        serverDate?: string | null
        streakAlive?: boolean
        canIncreaseStreakToday?: boolean
      }>
    ) => {
      const {
        currentStreak,
        longestStreak,
        lastActiveDate,
        serverDate,
        streakAlive,
        canIncreaseStreakToday,
      } = action.payload

      state.currentStreak = Math.max(0, Number(currentStreak) || 0)
      state.longestStreak = Math.max(
        state.longestStreak,
        Number(longestStreak) || 0,
        state.currentStreak
      )

      state.lastActiveDate = lastActiveDate ?? state.lastActiveDate
      state.serverDate = serverDate ?? state.serverDate
      state.streakAlive = streakAlive ?? state.streakAlive
      state.canIncreaseStreakToday =
        canIncreaseStreakToday ?? state.canIncreaseStreakToday
    },

    dequeueXp: (state, action: PayloadAction<string>) => {
      state.xpQueue = state.xpQueue.filter(
        (particle) => particle.id !== action.payload
      )
    },
  },
})

export const {
  setInitialGamification,
  gainRewards,
  updateStreak,
  dequeueXp,
} = gamificationSlice.actions

export default gamificationSlice.reducer