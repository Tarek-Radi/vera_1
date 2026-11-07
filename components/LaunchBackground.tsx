import Image from 'next/image';
export function LaunchBackground() {
  return <div className="launch-background pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <Image src="/images/hoodies.webp" alt="" fill priority sizes="100vw" className="hoodie-image object-cover" />
    <div className="absolute inset-0 bg-[#031127]/65" />
    <div className="background-shading absolute inset-0" />
  </div>;
}
