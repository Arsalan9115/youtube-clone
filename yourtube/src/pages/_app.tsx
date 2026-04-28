import ThemeController from "@/components/ThemeController";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <ThemeController />
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <title>Your-Tube Clone</title>
        <Header />
        <Toaster />
        <div className="flex pb-20 lg:pb-0">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <Component {...pageProps} />
          </div>
        </div>
        <MobileNav />
      </div>
    </UserProvider>
  );
}
