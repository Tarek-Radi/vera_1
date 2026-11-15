import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../components/cart/CartProvider";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { brand } from "../config/brand";
export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: "VERA — Wear Your Identity", template: "%s | VERA" },
  description:
    "Discover your style with VERA. Explore hoodies, hijabs and everyday pieces in Egypt. Personal ordering through WhatsApp.",
  openGraph: {
    type: "website",
    siteName: "VERA",
    locale: "en_EG",
    images: [
      {
        url: "/images/hoodies.webp",
        width: 1086,
        height: 1448,
        alt: "VERA hoodie collection",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <CartProvider>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
