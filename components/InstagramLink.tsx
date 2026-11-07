const INSTAGRAM_URL = 'https://www.instagram.com/vera.egbrand/';
export function InstagramLink() {
  return <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="instagram-link group inline-flex items-center gap-3 rounded-full border border-white/25 px-6 py-4 text-[12px] font-medium text-white/90 transition duration-300 hover:border-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white" aria-label="Follow us on Instagram (opens in a new tab)">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg>
    Follow us on Instagram
    <svg className="ml-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>
  </a>;
}
