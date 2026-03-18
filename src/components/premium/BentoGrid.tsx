'use client';

import { cn } from '@/lib/utils';

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto", // Removed auto-rows-[18rem] to allow content to dictate height
                className
            )}
        >
            {children}
        </div>
    );
};

import { SpotlightCard } from '@/components/premium/SpotlightCard';

export const BentoGridItem = ({
    className,
    title,
    description,
    header,
    icon,
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
}) => {
    return (
        <SpotlightCard
            className={cn(
                "row-span-1 border border-slate-200 group/bento transition duration-200 shadow-sm hover:shadow-xl p-6 bg-white justify-between flex flex-col space-y-4 h-full", // Added h-full, p-6
                className
            )}
            spotlightColor="rgba(59, 130, 246, 0.4)" // Increased opacity significantly
        >
            {header}
            <div className="group-hover/bento:translate-x-2 transition duration-200">
                {icon}
                <div className="font-sans font-bold text-neutral-800 dark:text-neutral-200 mb-2 mt-2">
                    {title}
                </div>
                <div className="font-sans font-normal text-slate-500 text-xs dark:text-neutral-300">
                    {description}
                </div>
            </div>
        </SpotlightCard>
    );
};
