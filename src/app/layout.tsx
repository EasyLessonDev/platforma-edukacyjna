import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Ad from "./layout/ad";
import Header from "./layout/Header";
import Footer from "./layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyLesson - Korepetycje online z AI",
  description: "Platforma do korepetycji z inteligentną tablicą, AI i wszystkim czego potrzebujesz do nauki online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Pasek reklamowy NA SAMEJ GÓRZE */}
        <Ad />
        
        {/* Header z logo i menu */}
        <Header />
        
        {/* Główna zawartość strony */}
        <main className="min-h-screen">
          {children}
        </main>
        
        {/* Footer na dole */}
        <Footer />
      </body>
    </html>
  );
}