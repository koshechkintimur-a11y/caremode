import type { Metadata, Viewport } from "next";
import { Nunito, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/ui/PwaRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PixelBackground } from "@/components/PixelBackground";

const nunito = Nunito({
  subsets: ["latin", "cyrillic"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const pixelFont = Press_Start_2P({
  subsets: ["cyrillic", "latin"],
  weight: "400",
  variable: "--font-pixel-var",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareMode — переводчик эмпатии",
  description: "Подсказки, как поддержать свою девушку сегодня. Без догадок и обид.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CareMode" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#FFF8F4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${nunito.variable} ${pixelFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative">
        {/* анти-FOUC: тема применяется до гидрации (роль — из meta sync-role) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('sync-theme');if(!t){var r=document.querySelector('meta[name="sync-role"]');t=r&&r.getAttribute('content')==='PARTNER'?'dark':'light'}var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`,
          }}
        />
        <PwaRegister />
        <PixelBackground />
        <ThemeProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
