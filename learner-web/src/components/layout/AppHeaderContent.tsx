// AppHeader.tsx
import SwitchingLanguage from "../SwitchingLanguage"
import HeadNav from "./HeadNav"
import Notification from "./Notification"
import ProfileNav from "./ProfileNav"
import ThemeToggle from "./ThemeToggle"

const AppHeader = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-full items-center justify-between px-2 sm:px-0">
        <HeadNav />

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <SwitchingLanguage />
          <Notification />
          <ProfileNav />
        </div>
      </div>
    </header>
  )
}

export default AppHeader
