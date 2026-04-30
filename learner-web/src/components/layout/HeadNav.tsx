import { 
  BookA, 
  Menu, 
  Notebook, 
  Library, 
  X, 
  ChevronDown,
  Users,
  Trophy,
  MessageCircle,
  Newspaper,
  type LucideIcon // 👉 Thêm dòng này để lấy type của Icon
} from "lucide-react"
import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// 👉 KHAI BÁO TYPE RÕ RÀNG ĐỂ TYPESCRIPT KHÔNG LA LÀNG
type NavChild = {
  name: string;
  path: string;
  description?: string;
  icon?: LucideIcon; // icon là optional (có cũng được, không có cũng được)
};

type NavItem = {
  name: string;
  path?: string; // Nếu có children thì path có thể không cần
  icon: LucideIcon;
  children?: NavChild[];
};

// Ốp type vào data
const NAV_LINKS: NavItem[] = [
  { name: "Topics", path: "/topics", icon: Notebook },
  { name: "Dictionary", path: "/dictionary", icon: BookA },
  { 
    name: "Practice", 
    icon: Library,
    children: [
      { name: "Review Hub", path: "/review", description: "Review your saved words and sentences." },
      { name: "Mock Test", path: "/mock-test", description: "Take a full CEFR standard test." },
      { name: "Grammar", path: "/grammar", description: "Master English grammar rules." },
    ]
  },
  { 
    name: "Community", 
    icon: Users,
    children: [
      { name: "Leaderboard", path: "/leaderboard", icon: Trophy, description: "Compete with other learners globally." },
      { name: "Discussions", path: "/discussions", icon: MessageCircle, description: "Ask questions and share study tips." },
    ]
  },
  { name: "Blog", path: "/blog", icon: Newspaper },
]

const HeadNav = () => {
  const pn = useLocation().pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [expandedMobileMenus, setExpandedMobileMenus] = React.useState<string[]>([]);

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpandedMobileMenus([]);
  }, [pn]);

  const toggleMobileSubmenu = (menuName: string) => {
    setExpandedMobileMenus(prev => 
      prev.includes(menuName) ? prev.filter(n => n !== menuName) : [...prev, menuName]
    );
  };

  return (
    <div className="flex items-center gap-6">
      {/* Logo / Brand */}
      <Link to="/" className="flex items-center gap-2 group">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-black shadow-sm transition-transform group-hover:scale-105">
          FR
        </span>
        <span className="hidden sm:inline text-lg font-bold tracking-tight text-foreground">
          Fluenrin
        </span>
      </Link>

      {/* 💻 DESKTOP NAVIGATION */}
      <nav className="hidden lg:flex items-center gap-1.5">
        {NAV_LINKS.map((link) => {
          const isChildActive = link.children?.some(c => pn.startsWith(c.path));
          const isActive = (link.path && pn.startsWith(link.path)) || (link.path === '/topics' && pn.startsWith('/learn/lessons')) || isChildActive;
          const Icon = link.icon;
          
          return link.children ? (
            <div key={link.name} className="relative group">
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors outline-none",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.name}
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>

              <div className="absolute top-full left-0 mt-1 w-64 opacity-0 invisible -translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                <div className="p-2 rounded-xl border bg-card text-card-foreground shadow-xl flex flex-col gap-1">
                  {link.children.map(child => {
                    const ChildIcon = child.icon; // Đổi tên biến cho gọn
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          "block p-3 rounded-lg hover:bg-muted transition-colors",
                          pn.startsWith(child.path) ? "bg-primary/5" : ""
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {ChildIcon && <ChildIcon className="h-4 w-4 text-muted-foreground" />}
                          <div className={cn("text-sm font-semibold", pn.startsWith(child.path) ? "text-primary" : "text-foreground")}>
                            {child.name}
                          </div>
                        </div>
                        {child.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {child.description}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={link.name}
              to={link.path!}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      {/* 📱 MOBILE MENU TOGGLE */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-muted-foreground"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-expanded={isMobileMenuOpen} // 👉 THÊM ARIA-EXPANDED VÀO ĐÂY ĐỂ TRUYỀN TÍN HIỆU CHO HEADER
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* 📱 MOBILE NAVIGATION PANEL */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 border-b bg-background/95 backdrop-blur-md shadow-xl p-4 lg:hidden z-50 animate-in slide-in-from-top-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const isChildActive = link.children?.some(c => pn.startsWith(c.path));
              const isActive = (link.path && pn.startsWith(link.path)) || (link.path === '/topics' && pn.startsWith('/learn/lessons')) || isChildActive;
              const Icon = link.icon;
              const isExpanded = expandedMobileMenus.includes(link.name);
              
              return link.children ? (
                <div key={link.name} className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleMobileSubmenu(link.name)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive || isExpanded
                        ? "bg-primary/5 text-primary" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {link.name}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                  </button>
                  
                  {isExpanded && (
                    <div className="flex flex-col gap-1 pl-12 pr-4 pb-2 animate-in slide-in-from-top-2 relative z-50">
                      {link.children.map(child => {
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={cn(
                              "flex items-center gap-2 py-2.5 text-sm font-medium transition-colors border-l-2 pl-4",
                              pn.startsWith(child.path) 
                                ? "border-primary text-primary" 
                                : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                            )}
                          >
                            {ChildIcon && <ChildIcon className="h-4 w-4 opacity-70" />}
                            {child.name}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.name}
                  to={link.path!}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.name}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </div>
  )
}

export default HeadNav