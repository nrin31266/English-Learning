// src/hooks/useGamificationSocket.ts

import { useEffect } from "react"
import { useAppDispatch } from "@/store"
import { gainRewards, updateStreak } from "@/store/gamificationSlice"
import { useWebSocket } from "@/features/ws/providers/WebSockerProvider"

type GamificationSocketEvent = {
  userId: string
  module: "GAMIFICATION"
  actionType: "REWARD_EARNED" | "STREAK_UPDATED" | string
  payload: Record<string, any>
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toBooleanOrUndefined = (value: unknown) => {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

export const useGamificationSocket = () => {
  const stompClient = useWebSocket()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!stompClient?.connected) return

    const subscription = stompClient.subscribe(
      "/user/queue/gamification/alerts",
      (message: any) => {
        try {
          const event = JSON.parse(message.body) as GamificationSocketEvent

          console.log("📥 Received Gamification Socket Event:", event)

          switch (event.actionType) {
            case "REWARD_EARNED": {
              const earnedXp = toNumber(event.payload?.earnedXp)
              const earnedCoins = toNumber(event.payload?.earnedCoins)

              if (earnedXp <= 0 && earnedCoins <= 0) {
                console.warn("⚠️ Invalid REWARD_EARNED payload:", event.payload)
                return
              }

              dispatch(
                gainRewards({
                  xp: earnedXp,
                  coins: earnedCoins,
                  source: "websocket",
                })
              )

              break
            }

            case "STREAK_UPDATED": {
              const currentStreak = toNumber(event.payload?.currentStreak)
              const longestStreak = toNumber(event.payload?.longestStreak)

              dispatch(
                updateStreak({
                  currentStreak,
                  longestStreak,
                  lastActiveDate: event.payload?.lastActiveDate ?? null,
                  serverDate: event.payload?.serverDate ?? null,
                  streakAlive: toBooleanOrUndefined(event.payload?.streakAlive),
                  canIncreaseStreakToday: toBooleanOrUndefined(
                    event.payload?.canIncreaseStreakToday
                  ),
                })
              )

              break
            }

            default:
              console.warn("⚠️ Unhandled Gamification action:", event.actionType)
          }
        } catch (error) {
          console.error("❌ Failed to parse Gamification WebSocket event:", error)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [stompClient, dispatch])
}