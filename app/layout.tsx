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
  title: "LandUK — AI Relocation Copilot",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100`}
      >
        <header className="border-b border-slate-200 dark:border-slate-800">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm">
                UK
              </span>
              LandUK
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          LandUK is a portfolio demo. Figures are illustrative — always verify
          visa rules and costs on{" "}
          <a
            href="https://www.gov.uk"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-indigo-500"
          >
            gov.uk
          </a>{" "}
          before making decisions.
        </footer>
      </body>
    </html>
  );
}
