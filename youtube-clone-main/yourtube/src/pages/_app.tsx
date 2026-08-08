import Head from "next/head";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

// @ts-ignore
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <Head>
          <title>Your-Tube Clone</title>
        </Head>
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
          <Header />
          <Toaster />
          <div className="flex pb-20 lg:pb-0">
            <Sidebar />
            <div className="min-w-0 flex-1">
              <Component {...pageProps} />
            </div>
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}