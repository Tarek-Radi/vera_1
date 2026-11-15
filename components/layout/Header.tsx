"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, ShoppingBag, Menu, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "../BrandLogo";
import { useCart } from "../cart/CartProvider";
import { CartContents } from "../cart/CartContents";
import { Modal } from "../ui/Modal";
import { navLinks, whatsappLink } from "../../config/brand";
export function Header() {
  const path = usePathname(),
    cart = useCart();
  const [menu, setMenu] = useState(false),
    [scrolled, setScrolled] = useState(false),
    [search, setSearch] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const transparent = path === "/" && !scrolled;
  return (
    <>
      <div className="announcement">
        <span>YOUR STYLE. YOUR IDENTITY.</span>
        <a href={whatsappLink} target="_blank" rel="noreferrer">
          A personal shopping experience <ArrowUpRight size={12} />
        </a>
        <span>EGYPT · EGP</span>
      </div>
      <header className={`site-header ${transparent ? "transparent" : ""}`}>
        <Link href="/" aria-label="VERA home" className="header-brand">
          <BrandLogo small />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map(([name, href]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
            >
              {name}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Search products"
            onClick={() => setSearch(true)}
          >
            <Search size={20} />
          </button>
          <button
            className="icon-button bag-button"
            aria-label={`Open shopping bag, ${cart.items.reduce((n, x) => n + x.quantity, 0)} items`}
            onClick={() => cart.setOpen(true)}
          >
            <ShoppingBag size={20} />
            <span>{cart.items.reduce((n, x) => n + x.quantity, 0)}</span>
          </button>
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => setMenu(true)}
          >
            <Menu size={23} />
          </button>
        </div>
      </header>
      <Modal
        title="Explore VERA"
        open={menu}
        onClose={() => setMenu(false)}
        className="drawer"
      >
        <nav className="mobile-nav">
          {navLinks.map(([name, href]) => (
            <Link href={href} key={href} onClick={() => setMenu(false)}>
              {name}
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </nav>
      </Modal>
      <Modal
        title="Find your next favourite"
        open={search}
        onClose={() => setSearch(false)}
      >
        <form
          action="/shop"
          className="search-form"
          onSubmit={() => setSearch(false)}
        >
          <label htmlFor="site-search">
            Search by name, colour, category or product code
          </label>
          <div className="input-button">
            <input
              id="site-search"
              name="q"
              placeholder="Try “black hoodie”"
              autoComplete="off"
            />
            <button className="button" type="submit">
              Search
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        title="Your bag"
        open={cart.open}
        onClose={() => cart.setOpen(false)}
        className="drawer cart-drawer"
      >
        {cart.open && <CartContents compact />}
      </Modal>
    </>
  );
}
