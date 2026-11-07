import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'VERA — Coming Soon',
  description: 'Something special is on the way. Discover the next chapter of VERA.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
