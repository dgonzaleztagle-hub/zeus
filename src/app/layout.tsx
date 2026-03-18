import './globals.css';
import { GrainTexture } from '@/components/premium/GrainTexture';
import ZeusPageFrame from './components/ZeusPageFrame';

export const metadata = {
  title: 'Asesorías Zeus — Conocimiento Aplicado | HojaCero',
  description: 'Plataforma digital para asesorías profesionales, servicios técnicos y productos digitales en sostenibilidad y tecnología. Arquitectos de la Economía Circular.',
};

export default function ZeusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: '#0A0A0F', color: '#F0F0F0' }}>
      {/* Grain overlay global — anti-plantilla */}
      <GrainTexture opacity={0.06} blendMode="overlay" />
      
      <ZeusPageFrame>{children}</ZeusPageFrame>
    </div>
  );
}
