import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// Geist for everyday text, Instrument Serif for the big headings.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Todo App",
  description: "A small todo list built with Next.js and Django REST Framework.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: browser extensions (password managers, Grammarly…)
    // often add attributes to <html>/<body> before React loads. This only hides
    // attribute mismatches on these two tags, not real bugs in our components.
    <html lang="en" className={`${geist.variable} ${serif.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
