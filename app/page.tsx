import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  MessageCircle,
  Package,
  Sparkles,
} from "lucide-react";
import { Intro } from "../components/Intro";
import { ProductCard } from "../components/products/ProductCard";
import { products, promotionalImage, bundleImage } from "../lib/catalog";
import { brand } from "../config/brand";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  const arrivals = [...products]
    .sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))
    .slice(0, 4);
  const featuredPants = ["Light Grey", "Black", "Navy"].flatMap((color) =>
    products.filter((p) => p.category === "pants" && p.color === color),
  );
  const featured = [
    ...products.filter((p) => p.featured).slice(0, 4),
    ...featuredPants,
  ].filter((p, index, items) => items.findIndex((item) => item.sku === p.sku) === index);
  return (
    <>
      <Intro />
      <section className="hero">
        <div className="hero-image">
          <Image
            src={promotionalImage}
            alt="The VERA hoodie collection, in signature colours"
            fill
            preload
            sizes="(max-width: 700px) 100vw, 65vw"
          />
        </div>
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow">
            <span /> THE EVERYDAY, REDEFINED
          </p>
          <h1>
            WEAR YOUR
            <br />
            <span>IDENTITY.</span>
          </h1>
          <p className="hero-description">
            {brand.tagline}
            <br />
            Everyday pieces. An expression of you.
          </p>
          <div className="hero-buttons">
            <Link href="/shop" className="button light">
              Shop now <ArrowUpRight size={18} />
            </Link>
            <a href="#collections" className="hero-explore">
              Explore collection <ArrowDown size={16} />
            </a>
          </div>
        </div>
        <div className="hero-bottom">
          <span>01 / THE VERA EDIT</span>
          <span>MADE TO BE YOURS</span>
          <a href="#collections" aria-label="Discover the collections">
            <ArrowDown size={18} />
          </a>
        </div>
        <span className="hero-side">YOUR STYLE. YOUR CANVAS. YOUR VERA.</span>
      </section>
      <div className="brand-strip">
        <span>INDIVIDUAL BY NATURE.</span>
        <span>VERA BY CHOICE.</span>
        <span>INDIVIDUAL BY NATURE.</span>
        <span>VERA BY CHOICE.</span>
      </div>
      <section className="section" id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND WHAT FEELS LIKE YOU</p>
            <h2>
              The collections<span>.</span>
            </h2>
          </div>
          <Link href="/shop" className="text-link">
            Explore all pieces <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="collection-grid">
          <Link href="/collections/hoodies" className="collection-card">
            <Image
              src={
                products.find(
                  (p) => p.color === "Gray" && p.category === "hoodies",
                )?.images[0] || promotionalImage
              }
              alt="VERA hoodie collection"
              fill
              sizes="(max-width: 640px) 100vw, 40vw"
            />
            <div>
              <span>01 / EVERYDAY LAYERS</span>
              <h3>
                Hoodies <ArrowUpRight />
              </h3>
            </div>
          </Link>
          <Link href="/collections/hijabs" className="collection-card">
            <Image
              src={
                products.find(
                  (p) => p.color === "Burgundy" && p.category === "hijabs",
                )?.images[0] || promotionalImage
              }
              alt="Burgundy scarf from the VERA collection"
              fill
              sizes="(max-width: 640px) 100vw, 35vw"
            />
            <div>
              <span>02 / THE FINISHING TOUCH</span>
              <h3>
                Scarves <ArrowUpRight />
              </h3>
            </div>
          </Link>
          <Link
            href="/collections/pants"
            className="collection-card"
          >
            <Image
              src={products.find((p) => p.category === "pants" && p.color === "Light Grey")!.images[0]}
              alt="Light Grey VERA sweatpants from the Pants collection"
              fill
              sizes="(max-width: 640px) 100vw, 35vw"
            />
            <div>
              <span>03 / EVERYDAY COMFORT</span>
              <h3>
                Pants <ArrowUpRight />
              </h3>
            </div>
          </Link>
        </div>
      </section>
      <section className="bundle-campaign" aria-labelledby="bundle-heading">
        <header className="bundle-copy">
          <p className="eyebrow">THE PERFECT MATCH</p>
          <h2 id="bundle-heading">Any Hoodie + Any Pants <span>— 1,000 EGP</span></h2>
          <p className="bundle-value"><del>1,200 EGP</del><span>Save 200 EGP per pair</span></p>
          <p className="bundle-note">Automatically applied in your bag.</p>
        </header>
        <div className="bundle-stage">
        <Link href="/shop" className="bundle-banner" aria-label="Shop the Bundle: any hoodie and pants for 1,000 EGP">
          <Image src={bundleImage} alt="Navy VERA hoodie and sweatpants bundle" width={1671} height={941} sizes="100vw" />
          <span className="bundle-comparison"><del>1,200 EGP</del></span>
        </Link>
        <div className="bundle-reflection" aria-hidden="true">
          <Image src={bundleImage} alt="" width={1671} height={941} sizes="100vw" />
        </div>
        </div>
        <div className="bundle-footer">
          <Link href="/shop" className="button bundle-cta">Shop the Bundle <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>
      {arrivals.length > 0 && (
        <section className="section arrivals">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FRESH IN THE COLLECTION</p>
              <h2>
                Your next favourites<span>.</span>
              </h2>
            </div>
            <Link href="/shop" className="text-link">
              Shop new arrivals <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="product-grid">
            {arrivals.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
      <section className="identity-section">
        <div className="identity-image">
          <Image
            src={
              products.find(
                (p) => p.color === "Black" && p.category === "hoodies",
              )?.images[0] || promotionalImage
            }
            alt="Black VERA hoodie with signature detailing"
            fill
            sizes="(max-width: 700px) 100vw, 50vw"
          />
        </div>
        <div className="identity-copy">
          <p className="eyebrow">MORE THAN WHAT YOU WEAR</p>
          <h2>
            Quiet confidence.
            <br />
            <em>Your own voice.</em>
          </h2>
          <p>{brand.story}</p>
          <Link href="/about" className="text-link">
            This is VERA <ArrowUpRight size={18} />
          </Link>
          <span className="identity-signature">Wear it your way.</span>
        </div>
      </section>
      {featured.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SELECTED BY VERA</p>
              <h2>
                The signature edit<span>.</span>
              </h2>
            </div>
            <Link href="/shop" className="text-link">
              Discover the edit <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </section>
      )}
      <section className="custom-teaser">
        <div>
          <span className="coming-pill">A NEW WAY TO EXPRESS YOURSELF</span>
          <p className="eyebrow">VERA STUDIO / MAKE IT YOURS</p>
          <h2>
            YOUR STYLE.
            <br />
            YOUR CANVAS.
          </h2>
          <p>Choose your hoodie, place your artwork and create a personal request.</p>
          <Link href="/custom-design" className="button light">
            Design your own VERA <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="custom-mark" aria-hidden="true">
          V<span>YOUR VERA.</span>
        </div>
      </section>
      <section className="service-strip">
        <div>
          <Package strokeWidth={1.2} />
          <span>
            Picked by you.<small>Explore our considered collection.</small>
          </span>
        </div>
        <div>
          <MessageCircle strokeWidth={1.2} />
          <span>
            A personal conversation.
            <small>Order & arrange delivery on WhatsApp.</small>
          </span>
        </div>
        <div>
          <Sparkles strokeWidth={1.2} />
          <span>
            Styled your way.<small>Make every piece your own.</small>
          </span>
        </div>
      </section>
      <section className="instagram-banner">
        <span className="eyebrow">THE WORLD OF VERA</span>
        <a href={brand.instagram} target="_blank" rel="noreferrer">
          @vera.egbrand <ArrowUpRight />
        </a>
        <p>Your next outfit starts with a little inspiration.</p>
      </section>
    </>
  );
}
