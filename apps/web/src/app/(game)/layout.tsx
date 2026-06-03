import "../globals.css";

export default function GameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* このグループ(/game・/tsume)はエンジン(SharedArrayBuffer)を使うため
            COEP:require-corp 下。AdSenseはCOEP非対応でブロックされる上、広告は不要。 */}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
