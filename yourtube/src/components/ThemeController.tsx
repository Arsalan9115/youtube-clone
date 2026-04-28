"use client";

import { useEffect } from "react";

import { useUser } from "@/lib/AuthContext";
import { resolveThemeMode } from "@/lib/themeRules";

export default function ThemeController() {
  const { loginMeta, user } = useUser();

  useEffect(() => {
    const applyTheme = () => {
      const htmlElement = document.documentElement;
      const mode = resolveThemeMode(
        loginMeta?.state || user?.state || "",
        loginMeta?.loggedInAt
      );

      htmlElement.classList.toggle("dark", mode === "dark");
      htmlElement.dataset.themeMode = mode;
    };

    applyTheme();
  }, [loginMeta?.loggedInAt, loginMeta?.state, user?.state]);

  return null;
}
