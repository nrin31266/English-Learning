// src/pages/components/TopicFilterPanel.tsx

import type { ITopicSummaryResponse } from "@/types"
import { Search, Hash } from "lucide-react"
import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"

type TopicFilterPanelProps = {
  topics: ITopicSummaryResponse[]
}

const TopicFilterPanel = ({ topics }: TopicFilterPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const navigate = useNavigate()

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics
    const lowerQuery = searchQuery.toLowerCase()
    return topics.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) || 
      t.slug.toLowerCase().includes(lowerQuery)
    )
  }, [topics, searchQuery])

  if (topics.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {/* Search Input - Professional & Sharp */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-[14px] font-medium transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
      </div>

      {/* Topics Grid - Solid & High Contrast */}
      <div className="flex flex-wrap gap-2.5">
        {filteredTopics.length > 0 ? (
          filteredTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => navigate(`/topics/${topic.slug}`)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-1.5 transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95"
            >
              <Hash className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[13px] font-bold text-foreground">
                {topic.name}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-extrabold text-muted-foreground group-hover:text-primary">
                {topic.totalLessons || 0}
              </span>
            </button>
          ))
        ) : (
          <p className="text-sm font-medium text-muted-foreground italic">
            No topics found for "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  )
}

export default TopicFilterPanel