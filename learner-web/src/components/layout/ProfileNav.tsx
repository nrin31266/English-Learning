import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from '@/features/keycloak/providers/AuthProvider'
import { getIndexFromChar } from '@/utils/textUtils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu' // dùng shadcn ui, không dùng radix thô
import { useTranslation } from 'react-i18next'
import KeycloakClient from '@/features/keycloak/keycloak'

const defaultavatars = [
  "defaultavatars/Cat_owl.webp",
  "defaultavatars/Deer_dogs.webp",
  "defaultavatars/Frog_squirrel.webp",
  "defaultavatars/Polar_bear_dog_in_the_snow.webp",
  "defaultavatars/Snow_leopard_caribou.webp",
]

const ProfileNav = () => {
  const { profile } = useAuth();
    const {t} = useTranslation();
    const keycloak = KeycloakClient.getInstance().keycloak;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <a className="flex flex-col items-center cursor-pointer">
          <Avatar className="h-11 w-11">
            <AvatarImage
              
              src={
                defaultavatars[
                  getIndexFromChar(profile?.firstName?.[0] || '', defaultavatars.length)
                ]
              }
              alt="avatar"
            />
            <AvatarFallback>{profile?.firstName?.[0]}</AvatarFallback>
          </Avatar>

          <span className="text-xs w-24 overflow-clip text-center line-clamp-1 text-muted-foreground">
            {profile?.firstName + " " + profile?.lastName}
          </span>
        </a>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>{t('common.myAccount')}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            {t('common.myProfile')}
            
          </DropdownMenuItem>
         
        </DropdownMenuGroup>


      

        <DropdownMenuSeparator />

        <DropdownMenuItem>GitHub</DropdownMenuItem>
        <DropdownMenuItem >{t('common.support')}</DropdownMenuItem>
        <DropdownMenuItem>{t('common.feedback')}</DropdownMenuItem>
        <DropdownMenuItem disabled>API</DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem   onClick={() => keycloak.logout()} className='text-red-500 hover:text-red-700!' >
          {t('common.logout')}
        
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileNav
