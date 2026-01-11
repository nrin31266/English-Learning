
import * as React from "react"
import { BookA, CircleCheckIcon, CircleHelpIcon, CircleIcon, Notebook } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Link, useLocation } from "react-router-dom"

const HeadNav = () => {
    const isMobile = useIsMobile();
    const pn = useLocation().pathname;
  return (
    <NavigationMenu viewport={isMobile} className="relative flex gap-2">
             {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            EN
          </span>
          <span className="hidden sm:inline text-base font-semibold">
            English Learning
          </span>
        </Link>
      <NavigationMenuList className={`${isMobile ? 'p-4 top-6 absolute flex flex-wrap border rounded-md shadow bg-background z-20 justify-start ' : ''} `}>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link to="/topics" className={`flex flex-wrap ${
                pn.startsWith('/topics') || pn.startsWith('/learn/lessons') ? 'font-bold! text-white! bg-primary!' : ''
            }`}><div><Notebook className={`
                ${pn.startsWith('/topics') || pn.startsWith('/learn/lessons') ? 'text-white' : 'text-muted-foreground'}
            `}/></div> Topics</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link to="/dictionary" className={`flex flex-wrap ${
                pn.startsWith('/dictionary') ? 'font-bold! text-white! bg-primary!' : ''
            }`}><div><BookA className={`
                ${pn.startsWith('/dictionary') ? 'text-white' : 'text-muted-foreground'}
            `}/></div> Dictionary</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink  asChild className={navigationMenuTriggerStyle()}>
            <Link to="/review" className={`flex flex-wrap ${
                pn.startsWith('/review') ? 'font-bold! text-white! bg-primary!' : ''
            }`}>Review</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem >
          <NavigationMenuTrigger className={
            pn.startsWith('/settings') ? 'font-bold! text-white! bg-primary!' : ''
          }>More</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[300px] gap-4">
              <li>
                <NavigationMenuLink asChild>
                  <Link to="/settings">
                    <div className="font-medium">Settings</div>
                    <div className="text-muted-foreground">
                      Browse all settings in the library.
                    </div>
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link to="/documentation">
                    <div className="font-medium">Documentation</div>
                    <div className="text-muted-foreground">
                        Learn how to use the components in your project.
                    </div>
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link to="#">
                    <div className="font-medium">Blog</div>
                    <div className="text-muted-foreground">
                      Read our latest blog posts.
                    </div>
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export default HeadNav
