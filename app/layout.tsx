import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "LandUK: AI Relocation Copilot",
  description:
    "An AI assistant for people moving to the UK: visa route guidance, neighbourhood matching, and a cost-of-living calculator, powered by retrieval-augmented generation over official UK government sources.",
};

const NAV_LINKS = [
  { href: "/chat", label: "Ask LandUK" },
  { href: "/neighbourhoods", label: "Neighbourhood matcher" },
  { href: "/cost-of-living", label: "Cost of living" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100`}
      >
        <header className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white text-sm dark:bg-stone-100 dark:text-stone-900">
                UK
              </span>
              LandUK
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-stone-600 dark:text-stone-400">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 dark:border-stone-800 py-6 text-center text-xs text-stone-500 dark:text-stone-400">
          LandUK is a portfolio demo. Figures are illustrative, so always
          verify visa rules and costs on{" "}
          <a
            href="https://www.gov.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-stone-900 dark:hover:text-stone-100"
          >
            gov.uk
          </a>{" "}
          before making decisions.
        </footer>
      </body>
    </html>
  );
}
