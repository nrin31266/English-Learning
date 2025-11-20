import {  BellRing} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
const Notification = () => {
  return (
    <div>
        <Button variant="ghost" className="relative">
          <BellRing className="size-4"/>
          <Badge
          className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums absolute -top-2 -right-2" variant="destructive"
        >
          99
        </Badge>
        </Button>
    </div>
  )
}

export default Notification