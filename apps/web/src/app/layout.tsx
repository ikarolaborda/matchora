import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getBranding } from '@matchora/config';
import { DEFAULT_LOCALE } from '@matchora/shared';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import './globals.css';

const branding = getBranding();

export const metadata: Metadata = {
  title: `${branding.appName} — ${branding.tournamentLabel}`,
  description: branding.disclaimer,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LOCALE} className="dark">
      <body className="min-h-screen bg-bg text-text antialiased">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-md focus:top-md focus:z-50 focus:rounded-md focus:bg-surface-raised focus:px-md focus:py-sm"
          >
            Skip to content
          </a>
          <Header />
          <Nav />
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-md py-lg">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
