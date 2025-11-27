import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md border"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-black" />}
    </button>
  );
};

export default ThemeToggle;
