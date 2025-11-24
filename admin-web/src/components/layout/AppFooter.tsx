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

import { useTranslation } from "react-i18next";

const AppFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full border-t bg-white">
      <div className="max-w-screen-2xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm text-gray-600">

        {/* Column 1 - About */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Building2 size={18} />
            {t("footer.aboutTitle")}
          </h3>
          <p className="text-gray-500 leading-relaxed">
            {t("footer.aboutDescription")}
          </p>
        </div>

        {/* Column 2 - Resources */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen size={18} />
            {t("footer.resourcesTitle")}
          </h3>
          <ul className="space-y-2">
            <li>
              <a className="flex items-center gap-2 hover:text-gray-900 transition" href="#">
                {t("footer.documentation")} <div>
                  <ExternalLink size={14} />
                </div>
              </a>
            </li>
            <li>
              <a className="flex items-center gap-2 hover:text-gray-900 transition" href="#">
                {t("footer.apiReference")} <div>
                  <ExternalLink size={14} />
                </div>
              </a>
            </li>
            <li>
              <a className="flex items-center gap-2 hover:text-gray-900 transition" href="#">
                {t("footer.developerGuides")} <div>
                  <ExternalLink size={14} />
                </div>
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3 - System Tools */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Server size={18} />
            {t("footer.systemToolsTitle")}
          </h3>
          <ul className="space-y-2">
            <li>
              <a className="hover:text-gray-900 transition" href="/system/health">
                {t("footer.healthCheck")}
              </a>
            </li>
            <li>
              <a className="hover:text-gray-900 transition" href="/system/queues">
                {t("footer.queueMonitor")}
              </a>
            </li>
            <li>
              <a className="hover:text-gray-900 transition" href="/system/logs">
                {t("footer.logsViewer")}
              </a>
            </li>
            <li>
              <a className="hover:text-gray-900 transition" href="/system/ai-jobs">
                {t("footer.aiJobs")}
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4 - Contact */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            {t("footer.contactTitle")}
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <div><Mail size={16} /></div>
              <a href="mailto:support@example.com" className="hover:text-gray-900">
                {t("footer.email")}: nrin31266@gmail.com
              </a>
            </li>
            <li className="flex items-center gap-2">
              <div><Phone size={16} /></div>
              <a href="tel:+123456789" className="hover:text-gray-900">
                {t("footer.phone")}: +1 234 567 890
              </a>
            </li>
            <li className="flex items-center gap-2">
              <div><Github size={16} /></div>
              <a
                href="https://github.com/your-org"
                className="hover:text-gray-900"
                target="_blank"
              >
                {t("footer.github")}
              </a>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom row */}
      <div className="border-t py-3 text-center text-gray-500 text-sm flex items-center justify-center gap-1">
        © {new Date().getFullYear()} MeowTalk — {t("footer.madeWith")}
        <Heart size={14} className="text-red-500" /> {t("footer.byTeam")}
      </div>
    </footer>
  );
};

export default AppFooter;
