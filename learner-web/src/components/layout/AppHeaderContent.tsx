import SwitchingLanguage from "../SwitchingLanguage"
import HeadNav from "./HeadNav"
import Notification from "./Notification"
import ProfileNav from "./ProfileNav"
import ThemeToggle from "./ThemeToggle"

const AppHeader = () => {
  return (
    <div className="container mx-auto flex h-full items-center justify-between px-4">
      <HeadNav />

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <SwitchingLanguage />
        <Notification />
        <div className="h-6 w-px bg-border/50 mx-1 sm:mx-2 hidden sm:block" /> {/* Dải phân cách tinh tế */}
        <ProfileNav />
      </div>
    </div>
  )
}

export default AppHeader