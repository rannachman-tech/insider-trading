import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insider Signal — Are insiders buying their own stock?",
  description:
    "Spots real insider buying from SEC filings. Trade it on eToro. Drawn live from EDGAR Form 4 filings, filtered for real conviction, ranked by cluster and accumulation patterns.",
  metadataBase: new URL("https://insidersignal.etoro.com"),
  openGraph: {
    title: "Insider Signal",
    description: "Spots real insider buying from SEC filings. Trade it on eToro.",
    type: "website",
  },
};

// Next.js 14 wants themeColor in the viewport export, not metadata.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d10" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // First-paint OS theme detection — fixed-bug version (real ternary, not the trap one)
  const themeBootstrap = `
    (function () {
      try {
        var stored = localStorage.getItem("iac-theme");
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var mode = stored ? stored : (prefersDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", mode);
      } catch (_) {
        document.documentElement.setAttribute("data-theme", "light");
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
