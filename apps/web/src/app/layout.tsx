import type { Metadata, Viewport } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getCurrentUser } from '@/lib/session';
import { SITE_URL } from '@/lib/config';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Voyago — Hotel booking demo',
    template: '%s · Voyago',
  },
  description:
    'Voyago is a portfolio travel booking platform. Search demo hotel inventory across six ' +
    'Indian cities, book a stay and run simulated payments and refunds.',
  openGraph: {
    type: 'website',
    siteName: 'Voyago',
    title: 'Voyago — Hotel booking demo',
    description: 'A portfolio travel booking platform with simulated inventory and payments.',
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0F766E',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <SiteHeader user={user} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
