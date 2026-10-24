import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/lib/i18n";
import { Suspense } from "react";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YojnaMitra - Find Government Schemes Made for You",
  description:
    "A guide to central and state government welfare schemes, matched to your profile.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-screen flex-col bg-brand-bg font-sans text-slate-800 antialiased">
        <LanguageProvider>
          <Suspense fallback={<div className="h-16" />}>
            <Navbar />
          </Suspense>
          {children}
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}