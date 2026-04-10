import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CO2 Sustainability Model",
    template: "%s · CO2 Sustainability Model",
  },
  description:
    "Estimated avoided CO₂e from device repairs versus replacement, using your LCA device and component data.",
  applicationName: "CO2 Sustainability Model",
  // Favicons: `app/icon.png` + `app/apple-icon.png` (Next injects `<link>` tags). `public/favicon.png` matches for direct `/favicon.png` requests; `next.config` rewrites `/favicon.ico` → `/favicon.png`.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
