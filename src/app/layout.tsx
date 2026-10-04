import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'X-PASS Discover — Step into the company. Do the work. Discover your fit.',
  description:
    'A 2D virtual-company career exploration platform. Join BITE, do real business work, and discover what fits.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
