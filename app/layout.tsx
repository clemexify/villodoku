import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
});

export const metadata: Metadata = {
  title: "Villodoku — le sudoku des villes de France",
  description: "Le puzzle quotidien des villes de France : une nouvelle grille chaque jour.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full antialiased ${baloo.variable}`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
