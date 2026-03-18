'use client';

import { usePathname } from 'next/navigation';
import { Nav } from './Nav';
import { Footer } from './Footer';

export default function ZeusPageFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname === '/prospectos/zeus/admin' || pathname?.startsWith('/prospectos/zeus/admin/');

  return (
    <>
      {!isAdminRoute && <Nav />}
      {children}
      {!isAdminRoute && <Footer />}
    </>
  );
}
