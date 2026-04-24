import React from "react"

interface BestScoreBadgeProps {
  bestScore: number
}

const BestScoreBadge = ({ bestScore }: BestScoreBadgeProps) => {
  return (
    <div id="ui-best-score" className="absolute top-3 right-3 z-10">
      <div className="bg-background/80 backdrop-blur-md border rounded-md px-2 py-2 text-center">
        <div className="text-[10px] text-muted-foreground mb-1">BEST SCORE</div>

        <div className="flex items-center justify-center gap-1">
          {bestScore >= 95 ? (
            <span className="text-yellow-500 text-sm">🏆</span>
          ) : bestScore >= 80 ? (
            <span className="text-green-500 text-sm">⭐</span>
          ) : (
            <span className="text-muted-foreground text-sm">🎯</span>
          )}

          <span className="text-lg font-bold text-green-600">{Math.round(bestScore)}%</span>
        </div>
      </div>
    </div>
  )
}

export default React.memo(BestScoreBadge)
