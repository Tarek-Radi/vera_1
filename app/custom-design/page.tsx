import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { promotionalImage } from "../../lib/catalog";
export const metadata = {
  title: "VERA Studio — Custom design coming soon",
  description:
    "Your Style. Your Canvas. Your VERA. A future custom hoodie experience is coming soon.",
  alternates: { canonical: "/custom-design" },
};
export default function CustomDesign() {
  return (
    <section className="custom-page">
      <Image
        src={promotionalImage}
        alt="VERA hoodies, a future canvas for your style"
        fill
        preload
        sizes="100vw"
      />
      <div className="custom-overlay" />
      <div className="custom-page-content">
        <p className="eyebrow">INTRODUCING VERA STUDIO</p>
        <h1>
          DESIGN YOUR
          <br />
          OWN <em>VERA.</em>
        </h1>
        <span className="coming-pill">COMING SOON</span>
        <h2>Your Style. Your Canvas. Your VERA.</h2>
        <p>
          A future space for your ideas, your colours and your expression.
          <br />
          The custom hoodie experience is taking shape.
        </p>
        <Link href="/shop" className="button light">
          <ArrowLeft size={17} /> Back to shop
        </Link>
      </div>
    </section>
  );
}
