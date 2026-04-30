import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
} from '@/components/ui/dropdown-menu'
import KeycloakClient from '@/features/keycloak/keycloak'
import { LogOut, User, LifeBuoy, MessageSquare, Github, ChevronDown } from "lucide-react"
import { useMemo, useState, useEffect } from "react"

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
  const [isOpen, setIsOpen] = useState(false);
  
  const indexImage = useMemo(() => {
    return getIndexFromChar(profile?.firstName?.[0] || '', defaultavatars.length)
  }, [profile?.keyCloakId]);


  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-9 flex items-center gap-2 rounded-lg pl-2 pr-2.5 hover:bg-muted/60 transition-colors focus-visible:ring-1 focus-visible:ring-primary/50"
        >
          <Avatar className="h-6 w-6 border border-border/50 shadow-sm transition-transform hover:scale-105">
            <AvatarImage src={defaultavatars[indexImage]} alt="avatar" />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
              {profile?.firstName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="text-sm font-medium leading-none text-foreground tracking-tight">
              {profile?.firstName}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </span>
        </Button>
      </DropdownMenuTrigger>

      {/* 👉 ÉP z-[100] */}
      <DropdownMenuContent className="w-56 z-[100]" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">
              {profile?.firstName} {profile?.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground mt-1">
              User Account
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer transition-colors">
            <User className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>My Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer transition-colors">
          <Github className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>GitHub</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer transition-colors">
          <LifeBuoy className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Support</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer transition-colors">
          <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>Feedback</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => keycloak.logout()} 
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span className="font-medium">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileNav