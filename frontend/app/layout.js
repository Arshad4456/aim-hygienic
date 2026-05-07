import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "./lib/clientProviders";
import { BRAND_CONFIG } from "@/src/config/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: BRAND_CONFIG.name,
    template: `%s | ${BRAND_CONFIG.shortName}`,
  },
  description: BRAND_CONFIG.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}