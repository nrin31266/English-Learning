// src/components/layout/AppHeaderContent.tsx

import { SidebarTrigger } from "@/components/ui/sidebar"
import Notification from "./Notification"
import { useAppSelector } from "@/store"
import StreakBadge from "@/components/gamification/StreakBadge"
import CoinBadge from "@/components/gamification/CoinBadge"
import GemBadge from "@/components/gamification/GemBadge"
import LevelBadge from "@/components/gamification/LevelBadge"
import { BrandLogo } from "./BrandLogo"
import { useAuth } from "@/features/keycloak/providers/AuthProvider"

const TEST_DATA = {
  level: 12,
  currentStreak: 100,
  longestStreak: 23,
  rewardCoins: 10000050,
  rewardGems: 450324320,
  progressPercent: 12,
  xpInCurrentLevel: 3420,
  xpRequiredForNextLevel: 5000,
  totalXp: 28420,
}

const AppHeaderContent = () => {
  const { profile } = useAuth()
  const realData = useAppSelector((state) => state.gamification)

  const hasProfile = Boolean(profile?.keyCloakId)

  /**
   * DEV giữ TEST_DATA để test UI.
   * Khi có profile thật thì dùng dữ liệu thật từ Redux.
   */
  const displayData = hasProfile ? realData : TEST_DATA

  const {
    level,
    currentStreak,
    longestStreak,
    rewardCoins,
    rewardGems,
    progressPercent,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    totalXp,
  } = displayData

  return (
    <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* TRÁI: Hamburger */}
      <div className="flex items-center gap-2">
        <div className="block md:hidden">
          <BrandLogo onlyIcon={true} />
        </div>

        <SidebarTrigger className="-ml-2 h-9 w-9 text-muted-foreground transition-all duration-200 hover:text-foreground" />
      </div>

      {/* PHẢI */}
      <div className="flex items-center gap-1.5 sm:gap-5">
        {/* Chỉ hiện gamification khi có profile */}
        {hasProfile && (
          <>
            <CoinBadge coins={rewardCoins} />

            <GemBadge gems={rewardGems} />

            <StreakBadge
              streak={currentStreak}
              longestStreak={longestStreak}
            />

            <LevelBadge
              level={level}
              progressPercent={progressPercent}
              xpInCurrentLevel={xpInCurrentLevel}
              xpRequiredForNextLevel={xpRequiredForNextLevel}
              totalXp={totalXp}
            />

            <div className="hidden h-8 w-px bg-border/60 sm:block" />
          </>
        )}

        <Notification />
      </div>
    </div>
  )
}

export default AppHeaderContent