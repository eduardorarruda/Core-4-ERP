import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, BarChart3, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/api';

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
      const data = await auth.login(email, senha);
      localStorage.setItem('access_token', data.accessToken);
      navigate('/dashboard');
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-surface">
      {/* Left Side: Form Section */}
      <section className="w-full lg:w-[450px] xl:w-[550px] flex flex-col justify-between p-8 md:p-16 bg-surface z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl">
            <Layout className="w-6 h-6 text-on-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tighter text-white">Core 4 ERP</h1>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <header className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Login</h2>
            <p className="text-zinc-500 text-sm">Bem-vindo de volta ao Core 4 ERP.</p>
          </header>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500" htmlFor="email">Email</label>
              <input
                className="w-full bg-surface-low border border-white/5 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                id="email"
                placeholder="nome@empresa.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500" htmlFor="password">Senha</label>
              <input
                className="w-full bg-surface-low border border-white/5 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                id="password"
                placeholder="••••••••"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            {erro && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
                {erro}
              </p>
            )}

            <button
              className="w-full bg-primary hover:opacity-90 text-on-primary font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-primary/10 disabled:opacity-50"
              type="submit"
              disabled={carregando}
            >
              {carregando ? 'Autenticando…' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-zinc-500">
              Não tem uma conta?{' '}
              <a className="text-primary font-semibold hover:underline" href="/register">Cadastre-se</a>
            </p>
          </div>
        </div>

        <footer className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-zinc-600">
          <span>© 2024 Core 4 ERP</span>
        </footer>
      </section>

      {/* Right Side: Hero Section */}
      <section className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-background">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-surface via-surface/95 to-primary/5 z-10"></div>
        </div>

        <div className="relative z-20 max-w-2xl px-12">
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
            className="text-5xl xl:text-7xl font-bold tracking-tighter leading-[1.1] text-white mb-8"
          >
            A Arquiteta da Sua <span className="text-primary italic">Liberdade Financeira</span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <p className="text-lg xl:text-xl text-zinc-400 font-light max-w-lg leading-relaxed">
              Transforme dados complexos em decisões estratégicas com nossa interface modular.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-12">
              <div className="p-6 rounded-xl bg-surface-highest/40 backdrop-blur-md border border-white/5">
                <BarChart3 className="w-8 h-8 text-primary mb-2" />
                <div className="text-sm font-bold uppercase tracking-widest text-white/60 mb-1">Crescimento</div>
                <div className="text-2xl font-bold text-white">+24.8%</div>
              </div>
              <div className="p-6 rounded-xl bg-surface-highest/40 backdrop-blur-md border border-white/5">
                <Wallet className="w-8 h-8 text-secondary mb-2" />
                <div className="text-sm font-bold uppercase tracking-widest text-white/60 mb-1">Capital</div>
                <div className="text-2xl font-bold text-white">R$ 4.2M</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
