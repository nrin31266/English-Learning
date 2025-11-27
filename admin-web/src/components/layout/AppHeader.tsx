import SwitchingLanguage from '../SwitchingLanguage'
import { SidebarTrigger } from '../ui/sidebar'
import HeadNav from './ThemeToggle'
import Notification from './Notification'
import ProfileNav from './ProfileNav'

const AppHeader = () => {
  return (
    <div className='bg-background sticky top-0 z-50 h-16 border-b border grid grid-cols-[auto_1fr]'>
      {/* <nav className='flex items-center px-4 hover:cursor-pointer'>
        <LogoName fontSize='24px'/>
      </nav> */}
      <div className='grid grid-cols-[auto_1fr] items-center px-4 gap-4'>
        <SidebarTrigger className="-ml-1" />
        
          {/* <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb> */}
      </div>
      <div className='flex justify-end px-4 items-center gap-4'>
        <HeadNav/>
        <SwitchingLanguage/>
        <Notification />
        <ProfileNav/>
      </div>
    </div>
  )
}

export default AppHeader