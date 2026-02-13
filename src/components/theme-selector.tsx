"use client";

import { useTheme } from "@/providers/theme-provider";
import { updateThemePreference } from "@/app/actions/profile";
import { cn } from "@/lib/utils";

export function ThemeSelector({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const handleChange = (newTheme: "dark" | "retro") => {
    setTheme(newTheme);
    updateThemePreference(newTheme);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-xs text-muted-foreground">Theme:</span>
      <select
        value={theme}
        onChange={(e) => handleChange(e.target.value as "dark" | "retro")}
        className="h-8 cursor-pointer rounded border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Select theme"
      >
        <option value="dark">Dark (purple)</option>
        <option value="retro">Retro (mIRC)</option>
      </select>
    </div>
  );
}
