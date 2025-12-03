import SwitchingLanguage from '../SwitchingLanguage'
import HeadNav from './HeadNav'
import Notification from './Notification'
import ProfileNav from './ProfileNav'
import ThemeToggle from './ThemeToggle'

const AppHeader = () => {
  return (
    <div className='container mx-auto grid grid-cols-[auto_1fr] items-center h-full'>
      {/* <nav className='flex items-center px-4 hover:cursor-pointer'>
        <LogoName fontSize='24px'/>
      </nav> */}
    
      <HeadNav/>
      <div className='flex justify-end px-4 items-center gap-4'>
        <ThemeToggle/>
        <SwitchingLanguage/>
        <Notification />
        
        <ProfileNav/>
      </div>
    </div>
  )
}

export default AppHeader