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

type AppHeaderContentProps = {
  showSidebarTrigger?: boolean
}

const AppHeaderContent = ({ showSidebarTrigger = true }: AppHeaderContentProps) => {
  const { profile } = useAuth()
  const gamification = useAppSelector((state) => state.gamification)

  const hasProfile = Boolean(profile?.keyCloakId)

  return (
    <div className="flex h-full w-full items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <div className="block md:hidden">
          <BrandLogo onlyIcon={true} />
        </div>

        {showSidebarTrigger && (
          <SidebarTrigger className="-ml-2 h-9 w-9 text-muted-foreground transition-all duration-200 hover:text-foreground" />
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-5">
        {hasProfile && (
          <>
            <CoinBadge coins={gamification.rewardCoins} />

            <GemBadge gems={gamification.rewardGems} />

            <StreakBadge
              streak={gamification.currentStreak}
              longestStreak={gamification.longestStreak}
              streakAlive={gamification.streakAlive}
              canIncreaseStreakToday={gamification.canIncreaseStreakToday}
              lastActiveDate={gamification.lastActiveDate}
              serverDate={gamification.serverDate}
            />

            <LevelBadge
              level={gamification.level}
              progressPercent={gamification.progressPercent}
              xpInCurrentLevel={gamification.xpInCurrentLevel}
              xpRequiredForNextLevel={gamification.xpRequiredForNextLevel}
              totalXp={gamification.totalXp}
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
