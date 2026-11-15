import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Camera as Instagram, MessageCircle } from "lucide-react";
import { faqs, informationPages } from "../../config/content";
import { brand, whatsappLink } from "../../config/brand";
import { sizeCharts } from "../../config/policies";
import { categories } from "../../lib/catalog";
const extra: Record<string, string> = {
  faq: "A little clarity.",
  contact: "Let’s talk.",
  "size-guide": "Find your fit.",
};
// This content is generated at build time; unknown slugs must not write the cache.
export const dynamicParams = false;
export function generateStaticParams() {
  return [...Object.keys(informationPages), ...Object.keys(extra)].map(
    (info) => ({ info }),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const { info } = await params;
  return {
    title: informationPages[info]?.title || extra[info] || "Page not found",
    description:
      informationPages[info]?.intro ||
      "Helpful information for your VERA shopping experience.",
    alternates: { canonical: `/${info}` },
  };
}
export default async function Information({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const { info } = await params,
    page = informationPages[info];
  if (!page && !extra[info]) notFound();
  return (
    <div className="info-page page-shell">
      <header className="page-heading">
        <p className="eyebrow">
          {info === "about" ? "WEAR YOUR IDENTITY" : "HERE TO HELP / VERA"}
        </p>
        <h1>{page?.title || extra[info]}</h1>
        <p>
          {page?.intro ||
            (info === "faq"
              ? "Everything you need to know, before you make it yours."
              : info === "contact"
                ? "A personal conversation is always a good place to start."
                : "A little guidance for a confident choice.")}
        </p>
      </header>
      <div className="info-layout">
        <aside className="info-nav">
          <span className="eyebrow">EXPLORE</span>
          {[
            ["About VERA", "about"],
            ["Contact", "contact"],
            ["FAQs", "faq"],
            ["Size guide", "size-guide"],
            ["Shipping & delivery", "shipping"],
            ["Returns & exchanges", "return-policy"],
            ["Terms & conditions", "terms"],
            ["Privacy", "privacy"],
          ].map(([name, slug]) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className={info === slug ? "active" : ""}
            >
              {name}
            </Link>
          ))}
        </aside>
        <div className="prose">
          {page?.sections.map(([heading, text]) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{text}</p>
            </section>
          ))}
          {info === "faq" && (
            <div className="faq-list">
              {faqs.map(([q, a], i) => (
                <details key={q}>
                  <summary>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {q}
                    <span className="faq-plus">+</span>
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          )}
          {info === "contact" && (
            <>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="contact-card"
              >
                <MessageCircle size={28} />
                <div>
                  <h2>WhatsApp</h2>
                  <p>{brand.whatsappDisplay}</p>
                  <span>Orders, sizing, payment & delivery</span>
                </div>
                <ArrowUpRight />
              </a>
              <a
                href={brand.instagram}
                target="_blank"
                rel="noreferrer"
                className="contact-card"
              >
                <Instagram size={28} />
                <div>
                  <h2>Instagram</h2>
                  <p>@vera.egbrand</p>
                  <span>The latest from the world of VERA</span>
                </div>
                <ArrowUpRight />
              </a>
              <section>
                <h2>Online, and here for you.</h2>
                <p>
                  VERA is currently an online-only store. We do not have
                  physical branches. Contact us through our official channels
                  for help with your order.
                </p>
              </section>
            </>
          )}
          {info === "size-guide" && (
            <>
              <section>
                <h2>A good fit starts with the right details.</h2>
                <p>
                  Sizes vary between pieces. Ask VERA for measurements for the
                  exact product code before ordering if a chart has not been
                  published. No body measurements are estimated here.
                </p>
              </section>
              {categories.map((c) => {
                const chart = sizeCharts[c.slug];
                return (
                  <section key={c.slug}>
                    <h2>{c.label}</h2>
                    <p>Size options: {c.sizes.join(" · ")}</p>
                    {chart?.rows.length ? (
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              {chart.columns.map((x) => (
                                <th key={x}>{x}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {chart.rows.map((row, i) => (
                              <tr key={i}>
                                {row.map((x, j) => (
                                  <td key={j}>{x}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="note">
                        Measurements are not yet published. Message VERA with
                        the product code for help choosing your size.
                      </p>
                    )}
                  </section>
                );
              })}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="button"
              >
                Ask about sizing <ArrowUpRight size={16} />
              </a>
            </>
          )}
          {info !== "contact" && (
            <div className="help-callout">
              <h3>Still have a question?</h3>
              <p>Let’s work through the details together.</p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Talk to VERA <ArrowUpRight size={17} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
