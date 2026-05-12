import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ConferenceSettingsProvider } from "@/components/conference-settings-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Conference Platform",
  description: "AI-powered academic conference management"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConferenceSettingsProvider>{children}</ConferenceSettingsProvider>
      </body>
    </html>
  );
}
