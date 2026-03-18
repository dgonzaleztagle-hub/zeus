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
  const isAdminRoute = pathname === '/admin' || pathname?.startsWith('/admin/');

  return (
    <>
      {!isAdminRoute && <Nav />}
      {children}
      {!isAdminRoute && <Footer />}
    </>
  );
}
