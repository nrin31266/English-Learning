import React from 'react'
import LogoName from '../LogoName'
import ProfileNav from './ProfileNav'
import SwitchingLanguage from '../SwitchingLanguage'
import HeadNav from './HeadNav'

const AppHeader = () => {
  return (
    <div className='bg-white sticky top-0 z-50 h-16 border-b border grid grid-cols-[auto_1fr]'>
      <nav className='flex items-center px-4 hover:cursor-pointer'>
        <LogoName fontSize='24px'/>
      </nav>
      <div className='flex justify-end px-4 items-center gap-4'>
        <HeadNav/>
        <SwitchingLanguage/>
        <ProfileNav/>
      </div>
    </div>
  )
}

export default AppHeader