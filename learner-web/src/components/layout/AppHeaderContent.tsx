// src/components/layout/AppHeaderContent.tsx
import { SidebarTrigger } from "@/components/ui/sidebar"
import Notification from "./Notification"
import { useAppSelector } from "@/store"
import StreakBadge from "@/components/gamification/StreakBadge"
import CoinBadge from "@/components/gamification/CoinBadge"
import LevelBadge from "@/components/gamification/LevelBadge"

// DATA GIẢ ĐỂ TEST - xóa sau khi có real data
const TEST_MODE = true 

const TEST_DATA = {
  level: 12,
  currentStreak: 36,
  longestStreak: 23,
  rewardCoins: 121221,
  progressPercent: 12,
  xpInCurrentLevel: 3420,
  xpRequiredForNextLevel: 5000,
  totalXp: 28420,
}

const AppHeaderContent = () => {
  const realData = useAppSelector((state) => state.gamification)

  const {
    level,
    currentStreak,
    longestStreak,
    rewardCoins,
    progressPercent,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    totalXp,
  } = TEST_MODE ? TEST_DATA : realData

  return (
    <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* TRÁI: Hamburger */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-2 h-9 w-9 text-muted-foreground transition-all duration-200 hover:text-foreground" />
      </div>

      {/* PHẢI: Gamification Stats */}
      <div className="flex items-center gap-3 sm:gap-5">
        <LevelBadge
          level={level}
          progressPercent={progressPercent}
          xpInCurrentLevel={xpInCurrentLevel}
          xpRequiredForNextLevel={xpRequiredForNextLevel}
          totalXp={totalXp}
        />

        <CoinBadge coins={rewardCoins} />

        <StreakBadge
          streak={currentStreak}
          longestStreak={longestStreak}
        />

        <div className="hidden h-8 w-px bg-border/60 sm:block" />

        <Notification />
      </div>
    </div>
  )
}

export default AppHeaderContent