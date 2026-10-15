import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ADVERSARY.STUDIO",
  description: "Multi-user interactive studio for generating adversarial 2D computational art.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="font-mono bg-void text-neutral-200 antialiased">{children}</body>
    </html>
  );
}
