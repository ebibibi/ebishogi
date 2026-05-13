import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ebishogi - AI将棋学習",
  description:
    "対局中にリアルタイムでAIアシストを受けながら将棋を学べるWebアプリ。候補手の矢印表示、悪手アラート機能搭載。",
  openGraph: {
    title: "ebishogi - AI将棋学習",
    description:
      "対局中にリアルタイムでAIアシストを受けながら将棋を学べるWebアプリ",
    url: "https://shogi.ebisuda.net",
    siteName: "ebishogi",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ebishogi - AI将棋学習",
    description:
      "対局中にリアルタイムでAIアシストを受けながら将棋を学べるWebアプリ",
  },
  metadataBase: new URL("https://shogi.ebisuda.net"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-S7Q6G0HRCV"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-S7Q6G0HRCV');`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
