'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { ToastItem } from './types';

export function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const tone =
    item.type === 'success'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
      : item.type === 'error'
        ? 'border-red-400/20 bg-red-400/10 text-red-300'
        : 'border-white/10 bg-white/5 text-white/80';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, x: 12 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${tone}`}
    >
      <div className="text-sm font-black uppercase tracking-[0.22em]">{item.type}</div>
      <p className="text-sm font-semibold">{item.message}</p>
      <button onClick={onClose} className="ml-2 text-white/40 hover:text-white">
        ✕
      </button>
    </motion.div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300/80">{eyebrow}</div>
        <h1 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/45">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/30">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-white/35">{hint}</div>
    </div>
  );
}

export function ModuleCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/8 bg-[#10131C]/88 shadow-[0_26px_120px_rgba(0,0,0,0.32)]">
      <div className="border-b border-white/6 px-6 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">{title}</div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}
