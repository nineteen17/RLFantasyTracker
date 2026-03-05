import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import MobileMenu from "@/components/ui/mobile-menu";
import DesktopNav from "@/components/ui/desktop-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Footy Break Evens",
  description: "Player stats, value metrics, and team analysis",
  icons: {
    icon: "/stadium-250301_akk_1546-1.jpg",
    shortcut: "/stadium-250301_akk_1546-1.jpg",
    apple: "/stadium-250301_akk_1546-1.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-bg`}
      >
        <QueryProvider>
          <Suspense>
            <MobileMenu />
            <DesktopNav />
          </Suspense>

          <main className="mx-auto max-w-[1600px] px-4 pb-20 pt-24 sm:px-6 md:pt-28 lg:px-8">
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
