"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeSelector } from "@/components/theme-selector";

interface SettingsAppearanceSectionProps {
  initialTheme: "dark" | "retro";
}

export function SettingsAppearanceSection(_props: SettingsAppearanceSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose your theme. Your preference is saved across devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ThemeSelector className="items-center gap-2" />
      </CardContent>
    </Card>
  );
}
