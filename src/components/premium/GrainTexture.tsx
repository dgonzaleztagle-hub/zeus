'use client';

import { useEffect, useRef } from 'react';

interface GrainTextureProps {
    /** Opacidad del grain (0.0 - 1.0) */
    opacity?: number;
    /** Si el grain se mueve sutilmente */
    animated?: boolean;
    /** Velocidad de animación en FPS */
    fps?: number;
    /** Mezcla: normal, overlay, soft-light, multiply */
    blendMode?: 'normal' | 'overlay' | 'soft-light' | 'multiply';
    /** Clase CSS adicional */
    className?: string;
    /** Color del grain */
    color?: 'light' | 'dark' | 'colored';
}

/**
 * GrainTexture - Overlay de textura granulada estilo film/premium
 * 
 * Uso básico (overlay global):
 * <GrainTexture />
 * 
 * Personalizado:
 * <GrainTexture 
 *   opacity={0.15}
 *   animated={true}
 *   blendMode="overlay"
 * />
 * 
 * Como overlay de sección:
 * <section className="relative">
 *   <GrainTexture opacity={0.2} />
 *   <div className="relative z-10">Contenido</div>
 * </section>
 */
export function GrainTexture({
    opacity = 0.1,
    animated = false,
    fps = 24,
    blendMode = 'overlay',
    className = '',
    color = 'light',
}: GrainTextureProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const generateNoise = () => {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const value = Math.random() * 255;

                if (color === 'light') {
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                } else if (color === 'dark') {
                    data[i] = 255 - value;
                    data[i + 1] = 255 - value;
                    data[i + 2] = 255 - value;
                } else {
                    // Colored - subtle warm tint
                    data[i] = value;
                    data[i + 1] = value * 0.95;
                    data[i + 2] = value * 0.9;
                }
                data[i + 3] = 255;
            }

            ctx.putImageData(imageData, 0, 0);
        };

        resize();
        generateNoise();

        let animationId: number;
        let lastFrame = 0;
        const frameInterval = 1000 / fps;

        const animate = (timestamp: number) => {
            if (timestamp - lastFrame >= frameInterval) {
                generateNoise();
                lastFrame = timestamp;
            }
            animationId = requestAnimationFrame(animate);
        };

        if (animated) {
            animationId = requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, [animated, fps, color]);

    const blendModeClass = {
        normal: 'mix-blend-normal',
        overlay: 'mix-blend-overlay',
        'soft-light': 'mix-blend-soft-light',
        multiply: 'mix-blend-multiply',
    };

    return (
        <canvas
            ref={canvasRef}
            className={`fixed inset-0 pointer-events-none z-[999] ${blendModeClass[blendMode]} ${className}`}
            style={{ opacity }}
            aria-hidden="true"
        />
    );
}

/**
 * SVG Grain Filter - Alternativa ligera solo con CSS
 * Para usar cuando el canvas es muy pesado
 */
export function SVGGrainFilter({
    opacity = 0.1,
    className = '',
}: {
    opacity?: number;
    className?: string;
}) {
    return (
        <>
            <svg className="hidden">
                <filter id="grain-filter">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.80"
                        numOctaves="4"
                        stitchTiles="stitch"
                    />
                    <feColorMatrix type="saturate" values="0" />
                </filter>
            </svg>
            <div
                className={`fixed inset-0 pointer-events-none z-[999] ${className}`}
                style={{
                    filter: 'url(#grain-filter)',
                    opacity,
                    mixBlendMode: 'overlay',
                }}
                aria-hidden="true"
            />
        </>
    );
}

export default GrainTexture;
