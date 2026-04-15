'use client';

import type { PaymentProvider } from '@/lib/payments';

type PaymentProviderSwitchProps = {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
  compact?: boolean;
};

export default function PaymentProviderSwitch({
  value,
  onChange,
  compact = false,
}: PaymentProviderSwitchProps) {
  const options: Array<{ value: PaymentProvider; label: string }> = [
    { value: 'mercadopago', label: 'Mercado Pago' },
    { value: 'zeleri', label: 'Zeleri' },
  ];

  if (compact) {
    return (
      <div
        className="rounded-2xl border px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
              Pasarela de prueba
            </p>
            <p className="text-xs text-white/55">
              Esta selección solo aplica a esta muestra.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-1">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className="h-10 rounded-lg px-3 text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: active ? '#0EA5E9' : 'transparent',
                    color: active ? '#0A0A0F' : 'rgba(255,255,255,0.65)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-8 rounded-2xl border px-4 py-4"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
            Modo Prueba
          </p>
          <p className="text-sm text-white/55">
            Elige temporalmente la pasarela para esta muestra sin cambiar la configuración principal.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-1">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className="h-11 rounded-lg px-4 text-xs font-black uppercase tracking-widest transition-all"
                style={{
                  background: active ? '#0EA5E9' : 'transparent',
                  color: active ? '#0A0A0F' : 'rgba(255,255,255,0.65)',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
