// src/components/gamification/CoinBadge.tsx

import { Coins } from "lucide-react"
import ResourceBadge from "./ResourceBadge"

interface CoinBadgeProps {
  coins: number
  className?: string
}

const CoinBadge = ({ coins, className }: CoinBadgeProps) => {
  return (
    <ResourceBadge
      value={coins}
      label="Balance"
      unitLabel="coins"
      Icon={Coins}
      textClassName="text-amber-700 dark:text-yellow-200"
      iconClassName="text-amber-500 dark:text-yellow-300"
      diffClassName="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
      tooltipValueClassName="text-amber-500"
      className={className}
    />
  )
}

export default CoinBadge