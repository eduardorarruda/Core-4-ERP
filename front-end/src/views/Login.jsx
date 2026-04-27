import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/api';
import { PasswordInput } from '../components/ui/FormField';
import { cn } from '../lib/utils';

const inputCls = 'w-full bg-surface-low border border-text-primary/10 rounded-xl px-4 py-3 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none placeholder:text-text-primary/30 text-sm font-body';

const STATS = [
  { label: 'Crescimento', value: '+24.8%', icon: '📈' },
  { label: 'Controle', value: '100%', icon: '🎯' },
  { label: 'Módulos', value: '10+', icon: '⚡' },
  { label: 'Relatórios', value: '∞', icon: '📊' },
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const usuario = await auth.login(email, senha);
      sessionStorage.setItem('usuario', JSON.stringify(usuario));
      navigate('/dashboard');
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-surface">
      {/* Left Side */}
      <section className="w-full lg:w-[450px] xl:w-[550px] flex flex-col justify-between p-8 md:p-16 bg-surface z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center rounded-xl">
            <Layout className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-text-primary font-display">Core 4 ERP</h1>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <motion.header
            className="mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-text-primary mb-2 font-display">Bem-vindo de volta</h2>
            <p className="text-text-primary/50 text-sm font-body">Faça login para acessar o Core 4 ERP.</p>
          </motion.header>

          <form className="space-y-5" onSubmit={handleLogin}>
            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <label className="text-xs font-bold uppercase tracking-widest text-text-primary/60 font-body" htmlFor="email">
                Email
              </label>
              <input
                className={inputCls}
                id="email"
                placeholder="nome@empresa.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </motion.div>

            <motion.div
              className="space-y-1.5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <label className="text-xs font-bold uppercase tracking-widest text-text-primary/60 font-body" htmlFor="password">
                Senha
              </label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
              />
            </motion.div>

            {erro && (
              <motion.p
                className="text-sm text-error bg-error/10 border border-error/20 rounded-xl px-4 py-3"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {erro}
              </motion.p>
            )}

            <motion.button
              className={cn(
                'w-full bg-primary hover:opacity-90 text-on-primary font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2',
              )}
              type="submit"
              disabled={carregando}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Autenticando…
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-8 border-t border-text-primary/5 text-center">
            <p className="text-sm text-text-primary/50">
              Não tem uma conta?{' '}
              <a className="text-primary font-semibold hover:underline" href="/register">Cadastre-se</a>
            </p>
          </div>
        </div>

        <footer className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-text-primary/30">
          <span>© 2026 Core 4 ERP</span>
        </footer>
      </section>

      {/* Right Side */}
      <section className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-surface-low">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

        <div className="relative z-10 max-w-lg px-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block px-3 py-1 mb-6 rounded-full border border-primary/20 bg-primary/5"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Core 4 Intelligence</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl xl:text-6xl font-bold tracking-tighter leading-[1.1] text-text-primary mb-8 font-display"
          >
            A Arquiteta da Sua{' '}
            <span className="text-gradient-primary italic">Liberdade Financeira</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-text-primary/50 font-light max-w-md leading-relaxed mb-12 font-body"
          >
            Transforme dados complexos em decisões estratégicas com nossa interface modular e inteligente.
          </motion.p>

          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.05 }}
                className="p-5 rounded-2xl bg-surface border border-text-primary/5 hover:border-text-primary/10 transition-colors"
              >
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 mb-1 font-body">{stat.label}</div>
                <div className="text-2xl font-bold text-text-primary font-display">{stat.value}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
