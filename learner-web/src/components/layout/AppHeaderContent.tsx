import ProfileNav from './ProfileNav'
import LogoName from '../LogoName'
import SwitchingLanguage from '../SwitchingLanguage'
import Notification from './Notification'
import HeadNav from './HeadNav'
import { Link } from 'react-router-dom'

const AppHeader = () => {
  return (
    <div className='container mx-auto grid grid-cols-[auto_1fr] items-center h-full'>
      {/* <nav className='flex items-center px-4 hover:cursor-pointer'>
        <LogoName fontSize='24px'/>
      </nav> */}
    
      <HeadNav/>
      <div className='flex justify-end px-4 items-center gap-4'>
        
        <SwitchingLanguage/>
        <Notification />
        
        <ProfileNav/>
      </div>
    </div>
  )
}

export default AppHeader