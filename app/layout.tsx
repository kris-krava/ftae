import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Fonts are bundled locally at /public/fonts so production builds don't depend on
// the Google Fonts CDN at build time.
const inter = localFont({
  src: [
    {
      path: '../public/fonts/Inter-Variable.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../public/fonts/Inter-Italic.ttf',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = localFont({
  src: '../public/fonts/PlayfairDisplay-Bold.ttf',
  weight: '700',
  style: 'normal',
  variable: '--font-playfair',
  display: 'swap',
});

const rockSalt = localFont({
  src: '../public/fonts/RockSalt-Regular.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-rock-salt',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Free Trade Art Exchange',
  description: 'An artist-only community, where we trade our original artwork with each other.',
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${rockSalt.variable}`}>
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
