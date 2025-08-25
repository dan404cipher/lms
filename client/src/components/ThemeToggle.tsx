import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ThemeToggleProps {
  variant?: "icon" | "button";
  className?: string;
}

const ThemeToggle = ({ variant = "icon", className = "" }: ThemeToggleProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }
  };

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className={`h-8 w-8 p-0 hover:bg-muted/50 ${className}`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        onClick={toggleTheme}
        className={`justify-start ${className}`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4 mr-2" />
        ) : (
          <Moon className="h-4 w-4 mr-2" />
        )}
        {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </Button>
    </motion.div>
  );
};

export default ThemeToggle;
