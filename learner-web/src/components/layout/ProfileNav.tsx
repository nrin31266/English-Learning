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
        <a className="flex flex-col items-center cursor-pointer">
          <Avatar className="h-11 w-11">
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

          <span className="text-xs w-24 overflow-clip text-center line-clamp-1 text-muted-foreground">
            {profile?.firstName + " " + profile?.lastName}
          </span>
        </a>
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
