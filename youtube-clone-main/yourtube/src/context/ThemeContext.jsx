"use client";

import { createContext, useContext, useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";

const ThemeContext = createContext({ theme: "dark", updateThemeFromRegion: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");

  const updateThemeFromRegion = (selectedState) => {
    // 1. LocalStorage profile check
    const savedProfile = typeof window !== "undefined" ? localStorage.getItem("Profile") : null;
    const user = savedProfile ? JSON.parse(savedProfile) : null;
    
    // 2. User State Check (Parameter > LocalStorage > Default "Tamil Nadu")
    const userState = selectedState || user?.result?.state || user?.state || "Tamil Nadu";
    
    // 3. System Clock Hour Read (Laptop Time)
    const clientHour = new Date().getHours(); 

    // 4. Regional Logic Check (South India + 10 AM to 12 PM Slot)
    const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    const isSouth = southStates.includes(userState);
    const isMorningSlot = clientHour >= 10 && clientHour < 12;

    // Direct Instant Rule Execution
    if (isSouth && isMorningSlot) {
      setTheme("light");
    } else {
      setTheme("dark");
    }

    /* 
    ===================================================================
    🔴 BACKEND SYNC (Temporarily Commented Out for Manual Time Testing)
    Real-time setup par lautne ke liye niche se comments (`/*` & `* /`) hata dein.
    ===================================================================
    
    axiosInstance
      .get(`/user/region?state=${encodeURIComponent(userState)}&clientHour=${clientHour}`)
      .then((res) => {
        if (res.data?.theme) setTheme(res.data.theme);
      })
      .catch(() => {});
    */
  };

  useEffect(() => {
    updateThemeFromRegion();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Inject Dynamic Light Theme Style Block
    let styleTag = document.getElementById("force-light-theme-override");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "force-light-theme-override";
      document.head.appendChild(styleTag);
    }

    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      if (body) {
        body.classList.add("dark");
        body.classList.remove("light");
      }
      styleTag.innerHTML = ""; // Dark Mode me extra CSS clear kar rahe hain
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      if (body) {
        body.classList.add("light");
        body.classList.remove("dark");
      }

      // Hardcoded dark elements ko Light Mode UI me map kar rahe hain
      styleTag.innerHTML = `
        html.light, html.light body, html.light main, 
        html.light div:not([class*="video"]):not([class*="player"]), 
        html.light nav, html.light header, html.light aside, html.light section {
          background-color: #ffffff !important;
          color: #0f0f0f !important;
        }
        html.light h1, html.light h2, html.light h3, html.light h4, 
        html.light p, html.light span, html.light a, html.light button, html.light svg {
          color: #0f0f0f !important;
          fill: currentColor !important;
        }
        html.light input, html.light textarea {
          background-color: #f2f2f2 !important;
          color: #0f0f0f !important;
          border-color: #ccc !important;
        }
      `;
    }
    root.dataset.themeMode = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, updateThemeFromRegion }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);