import type { Metadata } from "next";
import { Jost, Lato } from "next/font/google";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "PlimPost - Gere posts profissionais para Instagram com IA",
  description: "Crie imagens e legendas prontas para Instagram em segundos. Design profissional, texto autêntico e pronto para publicar.",
  icons: {
    icon: "/icon.svg",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://plimpost.com"),
  openGraph: {
    title: "PlimPost - Gere posts profissionais para Instagram",
    description: "Crie imagens e legendas prontas para Instagram em segundos.",
    url: "https://plimpost.com",
    siteName: "PlimPost",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" style={{ colorScheme: 'light' }}>
      <head>
        <meta name="color-scheme" content="light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8037402836299749"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className={`${jost.variable} ${lato.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
