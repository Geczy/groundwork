import { useAtomValue, useSetAtom } from "jotai";
import { MoonIcon, SunIcon } from "lucide-react";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";

import { themeAtom, toggleThemeAtom } from "./theme.state";

export const ThemeToggle = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const toggleTheme = useSetAtom(toggleThemeAtom);

  const label =
    theme === "light" ? "Switch to dark theme" : "Switch to light theme";

  return (
    <Button
      aria-label={label}
      onClick={toggleTheme}
      size="icon-sm"
      title={label}
      type="button"
      variant="ghost"
    >
      {theme === "light" ? (
        <MoonIcon aria-hidden="true" />
      ) : (
        <SunIcon aria-hidden="true" />
      )}
    </Button>
  );
};
