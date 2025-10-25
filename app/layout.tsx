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
  title: "Sora 2 Studio - AI Video Generation with OpenAI Sora 2",
  description: "Create stunning AI-generated videos using OpenAI's Sora 2 API. Generate videos from text prompts, use reference images, and enhance prompts with GPT-4o. Professional video creation tool with history tracking.",
  keywords: ["Sora 2", "AI video generation", "OpenAI", "text to video", "AI video creator", "Sora API", "video generation tool"],
  authors: [{ name: "Sora 2 Studio" }],
  creator: "Sora 2 Studio",
  publisher: "Sora 2 Studio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sora2-studio.vercel.app",
    title: "Sora 2 Studio - AI Video Generation",
    description: "Create stunning AI-generated videos using OpenAI's Sora 2 API. Professional video creation tool with prompt enhancement and history tracking.",
    siteName: "Sora 2 Studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sora 2 Studio - AI Video Generation",
    description: "Create stunning AI-generated videos using OpenAI's Sora 2 API",
    creator: "@openai",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
