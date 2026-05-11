import {
  BookOpen,
  Building2,
  ExternalLink,
  Github,
  Mail,
  Server
} from "lucide-react";
import { useTranslation } from "react-i18next";

const AppFooterContent = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full bg-background border-t border-border/40">
      {/* Main footer content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm">
        
        {/* Column 1 - About Fluenrin */}
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-primary" />
            {t("footer.aboutTitle")}
          </h3>
          <p className="leading-relaxed text-muted-foreground">
            {t("footer.aboutDesc")}
          </p>
        </div>

        {/* Column 2 - Learning Resources */}
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            {t("footer.resourcesTitle")}
          </h3>
          <ul className="space-y-3 text-muted-foreground">
            <li>
              <a className="flex items-center gap-2 hover:text-primary transition-colors" href="#">
                {t("footer.courseCatalog")} <ExternalLink size={14} />
              </a>
            </li>
            <li>
              <a className="flex items-center gap-2 hover:text-primary transition-colors" href="#">
                {t("footer.shadowingPaths")} <ExternalLink size={14} />
              </a>
            </li>
            <li>
              <a className="flex items-center gap-2 hover:text-primary transition-colors" href="#">
                {t("footer.helpCenter")} <ExternalLink size={14} />
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3 - Learner Tools */}
        <div>
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Server size={18} className="text-primary" />
            {t("footer.toolsTitle")}
          </h3>
          <ul className="space-y-3 text-muted-foreground">
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/dashboard">{t("footer.myDashboard")}</a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/courses">{t("footer.myCourses")}</a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/progress">{t("footer.progress")}</a>
            </li>
            <li>
              <a className="hover:text-primary transition-colors font-medium" href="/community">{t("footer.communityDiscussions")}</a>
            </li>
          </ul>
        </div>

        {/* Column 4 - Contact */}
        <div>
          <h3 className="font-bold text-foreground mb-4">
            {t("footer.supportTitle")}
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
                {t("footer.openSource")}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom row */}
      <div className="border-t border-border/40 py-6 text-center text-muted-foreground text-sm flex flex-col sm:flex-row items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
};

export default AppFooterContent;