// src/components/gamification/GemBadge.tsx

import { Gem } from "lucide-react"
import ResourceBadge from "./ResourceBadge"

interface GemBadgeProps {
  gems: number
  className?: string
}

const GemBadge = ({ gems, className }: GemBadgeProps) => {
  return (
    <ResourceBadge
      value={gems}
      label="Gems"
      unitLabel="gems"
      Icon={Gem}
      textClassName="text-cyan-700 dark:text-cyan-300"
      iconClassName="text-cyan-500 dark:text-cyan-400"
      diffClassName="text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
      tooltipValueClassName="text-cyan-500"
      className={className}
    />
  )
}

export default GemBadge