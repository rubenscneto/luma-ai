import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppBackgroundGlow } from "@/components/AppBackgroundGlow";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LumaAI",
  description: "Seu assistente de produtividade e estudos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LumaAI",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  }
};

export const viewport = {
  themeColor: "#EEF4ED",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AppBackgroundGlow />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
