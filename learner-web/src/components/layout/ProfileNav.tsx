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

import KeycloakClient from '@/features/keycloak/keycloak'
import { useMemo } from "react"

const defaultavatars = [
  "/defaultavatars/Cat_owl.webp",
  "/defaultavatars/Deer_dogs.webp",
  "/defaultavatars/Frog_squirrel.webp",
  "/defaultavatars/Polar_bear_dog_in_the_snow.webp",
  "/defaultavatars/Snow_leopard_caribou.webp",
]

const ProfileNav = () => {
  const { profile } = useAuth();
    const keycloak = KeycloakClient.getInstance().keycloak;
  const indexImage = useMemo(() => {
    return getIndexFromChar(profile?.firstName?.[0] || '', defaultavatars.length)
  }, [profile?.keyCloakId]);


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Open profile menu" className="flex items-center gap-2 sm:flex-col sm:gap-0 cursor-pointer">
          <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
            <AvatarImage
              
              src={
                defaultavatars[
                  indexImage
                ]
              }
              alt="avatar"
            />
            <AvatarFallback>{profile?.firstName?.[0]}</AvatarFallback>
          </Avatar>

          <span className="hidden sm:block text-xs w-24 overflow-clip text-center line-clamp-1 text-muted-foreground">
            {profile?.firstName + " " + profile?.lastName}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            My Profile
            
          </DropdownMenuItem>
         
        </DropdownMenuGroup>


      

        <DropdownMenuSeparator />

        <DropdownMenuItem>GitHub</DropdownMenuItem>
        <DropdownMenuItem >Support</DropdownMenuItem>
        <DropdownMenuItem>Feedback</DropdownMenuItem>
        <DropdownMenuItem disabled>API</DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem   onClick={() => keycloak.logout()} className='text-red-500 hover:text-red-700!' >
          Logout
        
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileNav
