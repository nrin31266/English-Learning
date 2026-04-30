import {
  Github,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Server,
  Heart,
  ExternalLink,
  Sparkles
} from "lucide-react";

const AppFooterContent = () => {
  return (
    <div className="w-full bg-background border-t border-border/40">
      {/* Main footer content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm">
        
        {/* Column 1 - About Fluenrin */}
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            About Fluenrin
          </h3>
          <p className="leading-relaxed text-muted-foreground">
            Fluenrin is your personal AI Language Coach — engineered to help you master English through active immersion, 
            precise shadowing, and smart dictation practice.
          </p>
        </div>

        {/* Column 2 - Learning Resources */}
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            Learning Resources
          </h3>
          <ul className="space-y-3 text-muted-foreground">
            <li>
              <a className="flex items-center gap-2 hover:text-primary transition-colors" href="#">
                Course catalog <ExternalLink size={14} />
              </a>
            </li>
            <li>
              <a className="flex items-center gap-2 hover:text-primary transition-colors" href="#">
                Shadowing paths <ExternalLink size={14} />
              </a>
            </li>
            <li>
              <a className="flex items-center gap-2 hover:text-primary transition-colors" href="#">
                Help center <ExternalLink size={14} />
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3 - Learner Tools */}
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Server size={18} className="text-primary" />
            Learner Tools
          </h3>
          <ul className="space-y-3 text-muted-foreground">
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/dashboard">My dashboard</a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/courses">My courses</a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/progress">Progress & achievements</a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/community">Community & discussions</a>
            </li>
          </ul>
        </div>

        {/* Column 4 - Contact */}
        <div>
          <h3 className="font-bold text-foreground mb-4">
            Need support?
          </h3>
          <ul className="space-y-4 text-muted-foreground">
            <li className="flex items-center gap-3 group">
              <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Mail size={16} />
              </div>
              <a href="mailto:nrin31266@gmail.com" className="hover:text-primary transition-colors truncate">
                nrin31266@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-3 group">
              <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <Github size={16} />
              </div>
              <a href="https://github.com/your-org" className="hover:text-primary transition-colors" target="_blank" rel="noreferrer">
                Fluenrin Open Source
              </a>
            </li>
            {/* <li className="flex items-center gap-2 text-xs opacity-70 italic">
               <Sparkles size={12} className="text-amber-500" />
               Built for serious learners.
            </li> */}
          </ul>
        </div>
      </div>

      {/* Bottom row */}
      <div className="border-t border-border/40 py-6 text-center text-muted-foreground text-sm flex flex-col sm:flex-row items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          © {new Date().getFullYear()} <span className="font-bold text-foreground">Fluenrin</span> — Made with
          <Heart size={14} className="fill-red-500 text-red-500 mx-0.5" /> 
          for learners.
        </div>
      </div>
    </div>
  );
};

export default AppFooterContent;