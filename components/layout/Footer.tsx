import Link from "next/link";
import { ArrowUpRight, Camera as Instagram } from "lucide-react";
import { BrandLogo } from "../BrandLogo";
import { brand, whatsappLink } from "../../config/brand";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <BrandLogo />
          <p>
            Your style. Your identity.
            <br />
            Your VERA.
          </p>
          <a
            href={brand.instagram}
            target="_blank"
            rel="noreferrer"
            className="social-link"
          >
            <Instagram size={18} /> @vera.egbrand <ArrowUpRight size={16} />
          </a>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/shop">Shop all</Link>
          <Link href="/collections/hoodies">Hoodies</Link>
          <Link href="/collections/hijabs">Scarves</Link>
          <Link href="/collections/pants">Pants</Link>
          <Link href="/custom-design">Custom design</Link>
          <Link href="/about">About VERA</Link>
        </div>
        <div>
          <h2>Here to help</h2>
          <Link href="/contact">Contact us</Link>
          <Link href="/faq">FAQs</Link>
          <Link href="/size-guide">Size guide</Link>
          <Link href="/shipping">Shipping & delivery</Link>
          <Link href="/return-policy">Returns & exchanges</Link>
          <a href={whatsappLink} target="_blank" rel="noreferrer">
            Talk to VERA <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="footer-note">
          <h2>A little more personal.</h2>
          <p>
            Choose your pieces here. We’ll take care of payment and delivery
            details together on WhatsApp.
          </p>
          <a
            href={whatsappLink}
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            Let’s talk <ArrowUpRight size={16} />
          </a>
          <span>ONLINE ONLY · BASED IN EGYPT</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} VERA</span>
        <div>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms & conditions</Link>
        </div>
        <span>EGYPT / EGP</span>
      </div>
    </footer>
  );
}
