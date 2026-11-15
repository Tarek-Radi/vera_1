"use client";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
export function Intro() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (
        sessionStorage.getItem("vera-intro") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      sessionStorage.setItem("vera-intro", "seen");
      setShow(true);
    } catch {
      return;
    }
    const timer = setTimeout(() => setShow(false), 2100);
    return () => clearTimeout(timer);
  }, []);
  return show ? (
    <div className="brand-intro" aria-hidden="true">
      <div>
        <BrandLogo />
        <span>YOUR STYLE. YOUR IDENTITY.</span>
      </div>
    </div>
  ) : null;
}
