import {  BellRing} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"

const Notification = () => {
  const unreadCount = 99

  return (
    <div>
        <Button
          type="button"
          variant="ghost"
          className="relative"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <BellRing className="size-4"/>
          <span className="sr-only">Open notifications</span>
          {unreadCount > 0 && (
            <Badge
              className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums absolute -top-2 -right-2"
              variant="destructive"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
    </div>
  )
}

export default Notification