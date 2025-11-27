import {
  Github,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Server,
  Heart,
  ExternalLink
} from "lucide-react";

const AppFooterContent = () => {
  return (
    <div className="w-full">
      {/* Main footer content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm text-background/80">
        {/* Column 1 - About for Learners */}
        <div>
          <h3 className="font-semibold text-background mb-3 flex items-center gap-2">
            <Building2 size={18} />
            About MeowTalk for Learners
          </h3>
          <p className="leading-relaxed text-background/70">
            MeowTalk is your personal learning companion — helping you explore courses,
            practice with AI, and track your progress in one simple dashboard.
          </p>
        </div>

        {/* Column 2 - Learning Resources */}
        <div>
          <h3 className="font-semibold text-background mb-3 flex items-center gap-2">
            <BookOpen size={18} />
            Learning Resources
          </h3>
          <ul className="space-y-2">
            <li>
              <a
                className="flex items-center gap-2 hover:text-background transition"
                href="#"
              >
                Course catalog
                <div>
                  <ExternalLink size={14} />
                </div>
              </a>
            </li>
            <li>
              <a
                className="flex items-center gap-2 hover:text-background transition"
                href="#"
              >
                Learning paths
                <div>
                  <ExternalLink size={14} />
                </div>
              </a>
            </li>
            <li>
              <a
                className="flex items-center gap-2 hover:text-background transition"
                href="#"
              >
                Help center
                <div>
                  <ExternalLink size={14} />
                </div>
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3 - Learner Tools (instead of system/admin tools) */}
        <div>
          <h3 className="font-semibold text-background mb-3 flex items-center gap-2">
            <Server size={18} />
            Learner Tools
          </h3>
          <ul className="space-y-2">
            <li>
              <a className="hover:text-background transition" href="/dashboard">
                My dashboard
              </a>
            </li>
            <li>
              <a className="hover:text-background transition" href="/courses">
                My courses
              </a>
            </li>
            <li>
              <a className="hover:text-background transition" href="/progress">
                Progress & achievements
              </a>
            </li>
            <li>
              <a className="hover:text-background transition" href="/community">
                Community & discussions
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4 - Contact */}
        <div>
          <h3 className="font-semibold text-background mb-3">
            Need help?
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <div><Mail size={16} /></div>
              <a
                href="mailto:support@example.com"
                className="hover:text-background"
              >
                Email: nrin31266@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <div><Phone size={16} /></div>
              <a
                href="tel:+123456789"
                className="hover:text-background"
              >
                Phone: +1 234 567 890
              </a>
            </li>
            <li className="flex items-center gap-2">
              <div><Github size={16} /></div>
              <a
                href="https://github.com/your-org"
                className="hover:text-background"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom row */}
      <div className="border-t border-border/40 py-3 text-center text-background/60 text-sm flex items-center justify-center gap-1">
        © {new Date().getFullYear()} MeowTalk — Made with
        <Heart size={14} className="fill-red-500 text-red-500" /> for learners
      </div>
    </div>
  );
};

export default AppFooterContent;
