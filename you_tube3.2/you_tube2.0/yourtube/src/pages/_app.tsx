import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "next-themes";
import OtpModal from "@/components/OtpModal";

export default function App({ Component, pageProps }: AppProps) {
  return (
    // attribute="class" toggles a "dark" class on <html>, which Tailwind's
    // dark: variants key off of. defaultTheme="system" respects the OS
    // preference the first time, then next-themes persists whatever the
    // user picks in localStorage automatically.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <UserProvider>
        <div className="min-h-screen bg-background text-foreground transition-colors">
          <title>Your-Tube Clone</title>
          <Header />
          <Toaster />
          <OtpModal />
          <div className="flex">
            <Sidebar />
            <Component {...pageProps} />
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}
