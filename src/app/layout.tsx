import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppBackgroundGlow } from "@/components/AppBackgroundGlow";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LumaAI",
  description: "Seu assistente de produtividade e estudos",
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LumaAI",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#090C08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <AppBackgroundGlow />
          {children}
        </Providers>
      </body>
    </html>
  );
}
