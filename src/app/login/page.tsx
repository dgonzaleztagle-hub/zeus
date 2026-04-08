'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { createZeusBrowserClient } from '@/lib/admin-auth';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
  const zeusSupabaseAnonKey = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_ANON_KEY;

  if (!zeusSupabaseUrl || !zeusSupabaseAnonKey) {
    throw new Error('Faltan variables ZEUS publicas: NEXT_PUBLIC_ZEUS_SUPABASE_URL y/o NEXT_PUBLIC_ZEUS_SUPABASE_ANON_KEY');
  }

  const supabase = useMemo(() => createZeusBrowserClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nextPath = searchParams.get('next') || '/admin';

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      const role = String(data.user?.user_metadata?.role || '').toLowerCase();
      if (!mounted) return;
      if (role === 'admin' || role === 'master') {
        router.replace(nextPath);
      }
    });

    return () => {
      mounted = false;
    };
  }, [nextPath, router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const role = String(data.user?.user_metadata?.role || '').toLowerCase();
      if (role !== 'admin' && role !== 'master') {
        setError('No tienes permisos de administrador');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      router.push(nextPath);
    } catch {
      setError('Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0F] to-[#1A1A2E] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: 'spring' }}
            className="inline-block"
          >
            <div className="text-5xl mb-4">⚡</div>
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-2">Zeus Admin</h1>
          <p className="text-white/60">Panel de Control</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition-all pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-bold text-[#0A0A0F] transition-all ${
                loading
                  ? 'bg-white/50 cursor-not-allowed'
                  : 'bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 shadow-lg shadow-[#0EA5E9]/20'
              }`}
            >
              {loading ? (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  Iniciando sesión...
                </motion.span>
              ) : (
                'Iniciar Sesión'
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <a
              href="/"
              className="block text-center text-white/60 hover:text-white/80 text-sm transition-colors"
            >
              ← Volver al inicio
            </a>
          </div>
        </motion.div>

        <div className="mt-8 text-center text-white/30 text-xs">
          <p>Solo administradores pueden acceder</p>
        </div>
      </motion.div>

      <div className="fixed inset-0 z-[-1]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#0EA5E9]/5 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl opacity-30"></div>
      </div>
    </div>
  );
}

export default function ZeusLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/50">Cargando login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
