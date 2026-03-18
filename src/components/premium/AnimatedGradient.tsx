'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedGradientProps {
    /** Colores del gradiente (mínimo 3 recomendado) */
    colors?: string[];
    /** Velocidad de animación en segundos (default: 10) */
    speed?: number;
    /** Blur del gradiente (default: 100) */
    blur?: number;
    /** Opacidad del gradiente (default: 0.5) */
    opacity?: number;
    /** Clase CSS adicional */
    className?: string;
    /** Si es fixed o absolute */
    fixed?: boolean;
}

/**
 * AnimatedGradient - Fondo con gradientes animados estilo Stripe/Linear
 * 
 * Uso básico:
 * <AnimatedGradient />
 * 
 * Personalizado:
 * <AnimatedGradient 
 *   colors={['#ff0080', '#7928ca', '#0070f3']}
 *   speed={15}
 *   opacity={0.3}
 * />
 * 
 * Como fondo de sección:
 * <section className="relative">
 *   <AnimatedGradient fixed={false} />
 *   <div className="relative z-10">Contenido</div>
 * </section>
 */
export function AnimatedGradient({
    colors = ['#ff0080', '#7928ca', '#0070f3', '#00dfd8'],
    speed = 10,
    blur = 100,
    opacity = 0.5,
    className = '',
    fixed = true,
}: AnimatedGradientProps) {
    return (
        <div
            className={`${fixed ? 'fixed' : 'absolute'} inset-0 overflow-hidden -z-10 ${className}`}
            style={{ opacity }}
        >
            {colors.map((color, index) => (
                <motion.div
                    key={index}
                    className="absolute rounded-full opacity-60"
                    style={{
                        background: `radial-gradient(ellipse at center, ${color} 0%, transparent 80%)`,
                        width: '140%',
                        height: '60%',
                        filter: `blur(${blur}px)`,
                    }}
                    animate={{
                        x: [
                            `${Math.random() * 100}%`,
                            `${Math.random() * 100}%`,
                            `${Math.random() * 100}%`,
                            `${Math.random() * 100}%`,
                        ],
                        y: [
                            `${Math.random() * 100}%`,
                            `${Math.random() * 100}%`,
                            `${Math.random() * 100}%`,
                            `${Math.random() * 100}%`,
                        ],
                        scale: [1, 1.2, 0.8, 1],
                    }}
                    transition={{
                        duration: speed + index * 2,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Preset de gradientes para diferentes vibes
 */
export const gradientPresets = {
    // Tech/Startup - Azules y púrpuras
    tech: ['#0070f3', '#7928ca', '#ff0080', '#00dfd8'],

    // Luxury - Dorados y oscuros
    luxury: ['#c9a227', '#8b7355', '#2c1810', '#d4af37'],

    // Nature - Verdes y tierra
    nature: ['#22c55e', '#84cc16', '#365314', '#4ade80'],

    // Sunset - Cálidos
    sunset: ['#f97316', '#ef4444', '#ec4899', '#f59e0b'],

    // Ocean - Azules fríos
    ocean: ['#0ea5e9', '#06b6d4', '#0891b2', '#0284c7'],

    // Minimal - Grises sutiles
    minimal: ['#6b7280', '#9ca3af', '#d1d5db', '#4b5563'],

    // Dark mode - Para fondos oscuros
    dark: ['#1e1b4b', '#312e81', '#3730a3', '#1e3a5f'],
};

/**
 * AnimatedGradientMesh - Versión más compleja con mesh gradient
 */
export function AnimatedGradientMesh({
    className = '',
}: {
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const animate = () => {
            time += 0.005;

            const gradient = ctx.createLinearGradient(
                Math.sin(time) * canvas.width,
                Math.cos(time) * canvas.height,
                Math.cos(time + 1) * canvas.width,
                Math.sin(time + 1) * canvas.height
            );

            gradient.addColorStop(0, `hsl(${(time * 50) % 360}, 70%, 50%)`);
            gradient.addColorStop(0.5, `hsl(${(time * 50 + 120) % 360}, 70%, 50%)`);
            gradient.addColorStop(1, `hsl(${(time * 50 + 240) % 360}, 70%, 50%)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            animationId = requestAnimationFrame(animate);
        };

        resize();
        animate();
        window.addEventListener('resize', resize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 -z-10 opacity-30 ${className}`}
        />
    );
}

export default AnimatedGradient;
