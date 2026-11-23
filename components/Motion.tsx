"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function Motion() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (preference.matches || entry.target.getAttribute("data-revealed")) continue;
        entry.target.setAttribute("data-revealed", "true");
        const animation = entry.target.animate(
          [{ opacity: .75, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
          { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: .08 });
    document.querySelectorAll(".section-heading, .identity-copy, .bundle-copy, .product-grid, .collection-grid, .page-heading").forEach(el => observer.observe(el));
    const stop = () => { if (preference.matches) animations.forEach(a => a.cancel()); };
    preference.addEventListener("change", stop);
    return () => { observer.disconnect(); animations.forEach(a => a.cancel()); preference.removeEventListener("change", stop); };
  }, [pathname]);
  return null;
}
