import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ConferenceSettingsProvider } from "@/components/conference-settings-provider";
import { getConferencePageMetadata } from "@/lib/conference-site-metadata";

import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getConferencePageMetadata();
  return {
    title,
    description,
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
    }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConferenceSettingsProvider>{children}</ConferenceSettingsProvider>
      </body>
    </html>
  );
}
