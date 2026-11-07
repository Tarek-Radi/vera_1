import Image from 'next/image';
export function BrandLogo({ small = false }: { small?: boolean }) {
  return <Image src="/images/vera-logo.webp" alt="VERA" width={752} height={224} priority className={small ? 'h-auto w-[76px] opacity-90' : 'brand-logo h-auto w-[190px] sm:w-[248px]'} />;
}
