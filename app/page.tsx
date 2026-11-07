import { BrandLogo } from '../components/BrandLogo';
import { LaunchBackground } from '../components/LaunchBackground';
import { InstagramLink } from '../components/InstagramLink';
export default function Home() {
  return <main className="launch-page relative isolate flex min-h-svh flex-col overflow-hidden bg-[#061226] text-white">
    <LaunchBackground />
    <header className="relative z-10 flex items-center justify-between px-7 py-8 sm:px-14 sm:py-10">
      <BrandLogo small />
      <div className="flex items-center gap-2.5 text-[9px] font-medium uppercase tracking-[.23em] text-white/65"><span className="h-1 w-1 rounded-full bg-[#99bbdb]" />A new chapter</div>
    </header>
    <section aria-labelledby="launch-heading" className="launch-content relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-12 text-center sm:pb-20">
      <BrandLogo />
      <div className="mt-9 h-9 w-px bg-gradient-to-b from-white/0 via-white/45 to-white/0 sm:mt-11" aria-hidden="true" />
      <p className="mt-7 text-[9px] font-medium uppercase tracking-[.34em] text-[#b3c5dc] sm:text-[10px]">The next chapter is almost here</p>
      <h1 id="launch-heading" className="mt-5 text-[clamp(2.5rem,7.4vw,7rem)] font-extralight leading-[1.08] tracking-[.12em] sm:mt-6">COMING SOON</h1>
      <p className="mt-6 text-[14px] font-light tracking-[.04em] text-[#d0d6e0] sm:text-base">Something special is on the way.</p>
      <div className="mt-11 sm:mt-12"><InstagramLink /></div>
    </section>
    <footer className="relative z-10 mx-7 flex items-center justify-between gap-4 border-t border-white/15 py-6 text-[8px] uppercase tracking-[.2em] text-white/45 sm:mx-14 sm:py-7 sm:text-[9px]">
      <span>© {new Date().getFullYear()} VERA</span><span>Made to be anticipated.</span>
    </footer>
  </main>;
}
