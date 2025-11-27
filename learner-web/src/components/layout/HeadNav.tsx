
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
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem className="mr-4">

              {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            EN
          </span>
          <span className="hidden sm:inline text-base font-semibold">
            English Learning
          </span>
        </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link to="/topics" className={`flex flex-wrap ${
                pn.startsWith('/topics') ? 'font-bold! text-white! bg-primary!' : ''
            }`}><div><Notebook className={`
                ${pn.startsWith('/topics') ? 'text-white' : 'text-muted-foreground'}
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
        <NavigationMenuItem className="hidden md:block">
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

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link to={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}